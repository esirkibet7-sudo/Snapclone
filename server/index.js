const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const FFMPEG_PATH = path.resolve(__dirname, '../node_modules/ffmpeg-static/ffmpeg.exe');
const DOWNLOADS_CACHE_DIR = path.resolve(__dirname, '../temp_downloads');

if (!fs.existsSync(DOWNLOADS_CACHE_DIR)) {
  fs.mkdirSync(DOWNLOADS_CACHE_DIR, { recursive: true });
}

// In-memory cache for video info (5-minute TTL)
const infoCache = new Map();

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '—';
  const s = Math.round(Number(seconds));
  const m = Math.floor(s / 60);
  const remaining = s % 60;
  return `${m}:${String(remaining).padStart(2, '0')}`;
}

function formatViews(views) {
  if (!views || isNaN(views)) return '—';
  const n = Number(views);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// Map yt-search video to frontend Video format
function mapYtsVideo(v, category = 'video') {
  return {
    id: v.videoId || v.url,
    title: v.title,
    channel: v.author?.name || 'Unknown Channel',
    channelId: v.author?.url,
    thumbnail: v.thumbnail || v.image || '',
    duration: v.timestamp || formatDuration(v.seconds),
    views: formatViews(v.views),
    published: v.ago || '',
    category: category,
    description: v.description || '',
    sourceUrl: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
    isLive: Boolean(v.live),
  };
}

// Run yt-dlp to extract detailed JSON
function getLiveVideoDetails(videoIdOrUrl) {
  return new Promise((resolve, reject) => {
    const url = videoIdOrUrl.startsWith('http')
      ? videoIdOrUrl
      : `https://www.youtube.com/watch?v=${videoIdOrUrl}`;

    const cacheKey = url;
    const cached = infoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return resolve(cached.data);
    }

    const args = [
      '-m',
      'yt_dlp',
      '-J',
      '--no-playlist',
      '--no-warnings',
      '--ffmpeg-location',
      FFMPEG_PATH,
      url,
    ];

    execFile('python', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('yt-dlp error:', stderr || err.message);
        return reject(new Error(stderr || err.message));
      }
      try {
        const data = JSON.parse(stdout);
        infoCache.set(cacheKey, { timestamp: Date.now(), data });
        resolve(data);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

// Parse yt-dlp formats into frontend VideoFormatOption list
function extractAvailableFormats(rawInfo, baseUrl) {
  const formats = rawInfo.formats || [];
  const result = [];
  const seenQualities = new Set();

  // Find best available audio
  const hasAudioFormats = formats.filter(f => f.acodec && f.acodec !== 'none');

  // Video qualities mapping
  const qualityTargets = [
    { id: 'video_2160', label: '2160p 4K', height: 2160, kind: 'video' },
    { id: 'video_1440', label: '1440p 2K', height: 1440, kind: 'video' },
    { id: 'video_1080', label: '1080p HD', height: 1080, kind: 'video' },
    { id: 'video_720', label: '720p HD', height: 720, kind: 'video' },
    { id: 'video_480', label: '480p', height: 480, kind: 'video' },
    { id: 'video_360', label: '360p', height: 360, kind: 'video' },
    { id: 'video_240', label: '240p', height: 240, kind: 'video' },
    { id: 'video_144', label: '144p', height: 144, kind: 'video' },
  ];

  for (const target of qualityTargets) {
    // Check if any video format matches or is close to this height
    const match = formats.find(f => f.vcodec && f.vcodec !== 'none' && f.height === target.height);
    if (match && !seenQualities.has(target.id)) {
      seenQualities.add(target.id);
      const isDirect = match.acodec && match.acodec !== 'none';
      const sizeMb = match.filesize
        ? `${(match.filesize / (1024 * 1024)).toFixed(1)} MB`
        : match.filesize_approx
        ? `~${(match.filesize_approx / (1024 * 1024)).toFixed(1)} MB`
        : target.label.includes('HD') ? 'Full HD' : 'Standard';

      result.push({
        id: target.id,
        label: target.label,
        size: sizeMb,
        kind: 'video',
        isDirect,
        directUrl: isDirect ? match.url : undefined,
      });
    }
  }

  // Audio options
  if (hasAudioFormats.length > 0) {
    result.push({
      id: 'audio_128',
      label: 'MP3 128 kbps',
      size: 'High Audio',
      kind: 'audio',
    });
    result.push({
      id: 'audio_192',
      label: 'MP3 192 kbps',
      size: 'HQ Audio',
      kind: 'audio',
    });
    result.push({
      id: 'audio_320',
      label: 'MP3 320 kbps',
      size: 'Ultra Audio',
      kind: 'audio',
    });
  }

  return result;
}

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'snapclone-backend', time: new Date().toISOString() });
});

// 2. Search endpoint (/v2/video/search and /api/search)
app.get(['/v2/video/search', '/api/search'], async (req, res) => {
  const q = req.query.q || req.query.query || req.query.keyword || '';
  const filter = req.query.type || 'all';

  if (!q) {
    return res.json([]);
  }

  try {
    const searchTerms = filter === 'music' ? `${q} music` : filter === 'shorts' ? `${q} shorts` : q;
    const r = await yts(searchTerms);
    const videos = (r.videos || []).slice(0, 30);
    const category = filter === 'all' ? 'video' : filter;
    const mapped = videos.map(v => mapYtsVideo(v, category));
    res.json(mapped);
  } catch (err) {
    console.error('Search failure:', err);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// 3. Home & Category Feeds
app.get(['/list/youtube/home', '/list/youtube/feed/trending', '/list/youtube/music'], async (req, res) => {
  const path = req.path;
  const tab = req.query.tab || (path.includes('music') ? 'music' : 'all');

  try {
    let query = 'trending popular';
    let cat = 'video';
    if (tab === 'music') {
      query = 'top music hits 2026';
      cat = 'music';
    } else if (tab === 'shorts') {
      query = 'trending youtube shorts';
      cat = 'shorts';
    } else if (tab === 'live') {
      query = 'live stream now';
      cat = 'live';
    }

    const r = await yts(query);
    const videos = (r.videos || []).slice(0, 25);
    const mapped = videos.map(v => mapYtsVideo(v, cat));
    res.json(mapped);
  } catch (err) {
    console.error('Home feed error:', err);
    res.json([]);
  }
});

// 4. Video Details & Format Resolution (/v2/video and /api/video)
app.get(['/v2/video', '/api/video'], async (req, res) => {
  const id = req.query.id || req.query.videoId || req.query.url;
  const requestedFormat = req.query.format || req.query.quality;

  if (!id) {
    return res.status(400).json({ error: 'Missing id or url parameter' });
  }

  try {
    const raw = await getLiveVideoDetails(id);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formats = extractAvailableFormats(raw, baseUrl);

    // If a specific stream/format was requested
    if (requestedFormat) {
      const streamUrl = `${baseUrl}/api/download?id=${encodeURIComponent(raw.id)}&format=${encodeURIComponent(requestedFormat)}`;
      return res.json({
        id: raw.id,
        title: raw.title,
        streamUrl,
        formats,
      });
    }

    const videoObj = {
      id: raw.id,
      title: raw.title,
      channel: raw.uploader || raw.channel || 'Unknown',
      channelId: raw.channel_id,
      thumbnail: raw.thumbnail || '',
      duration: formatDuration(raw.duration),
      views: formatViews(raw.view_count),
      published: raw.upload_date ? `${raw.upload_date.slice(0, 4)}-${raw.upload_date.slice(4, 6)}-${raw.upload_date.slice(6, 8)}` : '',
      category: raw.categories?.includes('Music') ? 'music' : 'video',
      description: raw.description || '',
      sourceUrl: raw.webpage_url || `https://www.youtube.com/watch?v=${raw.id}`,
      formats,
    };

    // Also support array return format if frontend expects normalizeVideos(raw)
    res.json([videoObj]);
  } catch (err) {
    console.error('Video details error:', err);
    res.status(404).json({ error: 'Video not found or unavailable', message: err.message });
  }
});

// 5. Direct Stream / Muxed Download Endpoint (/api/download and /v2/video/stream)
app.get(['/api/download', '/v2/video/stream'], async (req, res) => {
  const id = req.query.id || req.query.videoId;
  const format = req.query.format || 'video_360';

  if (!id) {
    return res.status(400).send('Missing video ID');
  }

  try {
    const raw = await getLiveVideoDetails(id);
    const videoUrl = raw.webpage_url || `https://www.youtube.com/watch?v=${id}`;
    const safeTitle = (raw.title || 'video').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60);

    const isAudio = format.startsWith('audio_');
    const targetHeight = format.replace('video_', '');

    // Check if there is an existing combined format that doesn't need muxing (like 360p or 720p)
    if (!isAudio) {
      const combined = (raw.formats || []).find(
        f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none' && String(f.height) === targetHeight && f.url
      );
      if (combined && combined.url) {
        // Direct stream available, redirect or stream directly
        return res.redirect(combined.url);
      }
    }

    // If muxing or audio conversion is needed:
    // Run yt-dlp streaming to stdout through ffmpeg
    if (isAudio) {
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
      res.setHeader('Content-Type', 'audio/mpeg');

      const ytdlProc = spawn('python', [
        '-m',
        'yt_dlp',
        '-f',
        'bestaudio',
        '--extract-audio',
        '--audio-format',
        'mp3',
        '--audio-quality',
        format === 'audio_320' ? '320K' : format === 'audio_192' ? '192K' : '128K',
        '--ffmpeg-location',
        FFMPEG_PATH,
        '-o',
        '-',
        videoUrl,
      ]);

      ytdlProc.stdout.pipe(res);
      ytdlProc.stderr.on('data', d => {
        // Log stderr for diagnostics
        const str = d.toString();
        if (str.includes('ERROR')) console.error('[yt-dlp audio]:', str);
      });
      req.on('close', () => ytdlProc.kill());
    } else {
      // Video + Audio muxed into MP4 container
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_${targetHeight}p.mp4"`);
      res.setHeader('Content-Type', 'video/mp4');

      const ytdlProc = spawn('python', [
        '-m',
        'yt_dlp',
        '-f',
        `bestvideo[height<=${targetHeight}]+bestaudio/best[height<=${targetHeight}]/best`,
        '--merge-output-format',
        'mp4',
        '--ffmpeg-location',
        FFMPEG_PATH,
        '-o',
        '-',
        videoUrl,
      ]);

      ytdlProc.stdout.pipe(res);
      ytdlProc.stderr.on('data', d => {
        const str = d.toString();
        if (str.includes('ERROR')) console.error('[yt-dlp video]:', str);
      });
      req.on('close', () => ytdlProc.kill());
    }
  } catch (err) {
    console.error('Download stream error:', err);
    if (!res.headersSent) {
      res.status(500).send(`Download failed: ${err.message}`);
    }
  }
});

// Start listening
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Snapclone backend active on http://0.0.0.0:${PORT}`);
  console.log(`Local testing: http://localhost:${PORT}/health`);
  console.log(`LAN address: http://192.168.1.156:${PORT}/health`);
});
