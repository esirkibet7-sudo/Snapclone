import { Video, VideoFormat, SearchFilter, ProviderLinkResult, VideoCategory } from '../types/video';
import { personalization, KENYA_INTERESTS } from './personalization';

/**
 * Provider integration reconstructed from the supplied SnapTube APK.
 * The APK exposes the production service families below. We intentionally
 * do not copy authentication material, device identifiers, or private keys.
 */
const DEFAULT_API = 'http://192.168.1.156:5000';
const ENV_BASE = process.env.EXPO_PUBLIC_SNAPTUBE_API_BASE;
const API_BASE = (ENV_BASE || DEFAULT_API).replace(/\/$/, '');
const SIMPLE_API = (process.env.EXPO_PUBLIC_SNAPTUBE_SIMPLE_API_BASE || DEFAULT_API).replace(/\/$/, '');

const routes = {
  search: '/v2/video/search',
  video: '/v2/video',
  simpleList: '/video/simple/list',
  playable: '/union-fe/playable/',
  searchHome: '/list/search/home',
  home: '/list/youtube/home',
  trending: '/list/youtube/feed/trending',
  similar: '/list/feed/video/similar',
  sync: '/list/video/sync',
  channels: '/list/youtube/channels',
  channel: '/list/youtube/channel',
  channelVideos: '/list/youtube/channel/videos',
  channelPlaylists: '/list/youtube/channel/playlists',
  playlist: '/list/youtube/playlist',
  comments: '/youtube/comment',
  commentReplies: '/list/youtube/comment/replies',
  subscription: '/list/youtube/subscription/videos',
  history: '/list/youtube/history',
  watchLater: '/list/youtube/watchlater',
  music: '/list/youtube/music',
  sites: '/list/sites',
};

type AnyRecord = Record<string, any>;

export interface ContentProvider {
  search(query: string, filter?: SearchFilter): Promise<Video[]>;
  getDetails(id: string): Promise<Video | null>;
  resolveStream(id: string, format: VideoFormat): Promise<string | null>;
  resolveStreamWithQuality(id: string, format: VideoFormat, purpose?: 'playback' | 'download'): Promise<{ url: string; resolvedFormat: VideoFormat } | null>;
  resolveUrl(url: string): Promise<ProviderLinkResult>;
  home(tab?: SearchFilter): Promise<Video[]>;
  homePaged(tab?: SearchFilter, page?: number): Promise<Video[]>;
  similar(id: string): Promise<Video[]>;
}

export class SnapTubeProvider implements ContentProvider {
  private feedSeeds: Partial<Record<SearchFilter, number>> = {};
  private async request(base: string, path: string, params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') query.set(k, String(v)); });
    const url = `${base}${path}${query.toString() ? `?${query}` : ''}`;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Snapclone/1.0' },
      });
      if (!response.ok) throw new Error(`Provider request failed (${response.status})`);
      return await response.json();
    } catch (err) {
      if (base.includes('192.168.') && !base.includes('localhost')) {
        const fallbackUrl = url.replace(/http:\/\/192\.168\.\d+\.\d+:5000/, 'http://localhost:5000');
        try {
          const fbRes = await fetch(fallbackUrl, {
            headers: { Accept: 'application/json', 'User-Agent': 'Snapclone/1.0' },
          });
          if (fbRes.ok) return await fbRes.json();
        } catch {}
      }
      throw err;
    }
  }

  async search(query: string, filter: SearchFilter = 'all'): Promise<Video[]> {
    const raw = await this.request(API_BASE, routes.search, {
      q: query, query, keyword: query, type: filter === 'all' ? undefined : filter, page: 1,
    });
    return normalizeVideos(raw).filter(v => filter === 'all' || v.category === filter || (filter === 'video' && v.category === 'video'));
  }

  async home(tab: SearchFilter = 'all'): Promise<Video[]> {
    return this.homePaged(tab, 1);
  }

  async homePaged(tab: SearchFilter = 'all', page: number = 1): Promise<Video[]> {
    const year = new Date().getFullYear();
    const scores = await personalization.getEffectiveScores();
    const interests = Object.entries(scores as Record<string, number>)
      .filter(([, score]) => score >= 0.35)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => KENYA_INTERESTS.find(x => x.id === id)?.label.toLowerCase());
    const focused = interests.filter(Boolean);
    const pageKeywords: Record<string, string[]> = {
      all: [
        ...focused.map(topic => `${topic} Kenya`),
        `trending Kenya ${year}`, `viral videos Africa ${year}`, `popular videos this week`,
        `new creators Kenya ${year}`, `most watched videos today`,
      ],
      music: [
        ...focused.filter(topic => /music|gospel|dance/.test(topic!)).map(topic => `${topic} music Kenya`),
        `new Kenyan music ${year}`, `gengetone and afrobeats ${year}`, `Kenyan gospel songs ${year}`,
        `East African music videos ${year}`, `viral African songs ${year}`, `new music videos this week`,
      ],
      shorts: [
        ...focused.map(topic => `${topic} shorts`),
        'Kenyan comedy shorts', 'football skills shorts', 'African dance shorts', 'funny animal shorts',
        'quick cooking shorts', 'viral technology shorts', 'popular YouTube shorts today',
        'African creators short videos', 'new comedy clips shorts',
      ],
      live: ['live Kenya now', 'Kenya live news', 'African live music', 'live football today', 'live events today'],
    };
    const keywords = [...new Set(pageKeywords[tab] ?? pageKeywords.all)];
    if (page === 1 || this.feedSeeds[tab] === undefined) {
      this.feedSeeds[tab] = Math.floor(Math.random() * keywords.length);
    }
    const keyword = keywords[(this.feedSeeds[tab]! + page - 1) % keywords.length];
    const route = '/list/youtube/home';
    const raw = await this.request(API_BASE, route, { page, tab: tab === 'all' ? undefined : tab, q: keyword, refresh: Date.now() }).catch(() => null);
    const videos = normalizeVideos(raw ?? {}).filter(v => tab === 'all' || v.category === tab);
    return videos;
  }

  async getDetails(id: string): Promise<Video | null> {
    const raw = await this.request(API_BASE, routes.video, { id, videoId: id, url: id });
    const video = normalizeVideos(raw)[0];
    if (video) return video;
    return normalizeVideo(raw);
  }

  async resolveStream(id: string, format: VideoFormat): Promise<string | null> {
    return (await this.resolveStreamWithQuality(id, format))?.url ?? null;
  }

  async resolveStreamWithQuality(id: string, format: VideoFormat, purpose: 'playback' | 'download' = 'download'): Promise<{ url: string; resolvedFormat: VideoFormat } | null> {
    try {
      const raw = await this.request(API_BASE, routes.video, { id, videoId: id, format, quality: format, type: format.startsWith('audio_') ? 'audio' : 'video', purpose });
      if (raw && typeof raw === 'object') {
        const url = raw.streamUrl || raw.directUrl;
        if (url) {
          const height = Number(raw.resolvedHeight);
          const resolvedFormat = Number.isFinite(height) && height > 0 && format.startsWith('video_')
            ? `video_${height}` as VideoFormat
            : format;
          return { url, resolvedFormat };
        }
      }
      const direct = findMediaUrl(raw);
      if (direct) return { url: direct, resolvedFormat: format };
    } catch {}

    // Playback must not fall back to a long-running download/mux request.
    if (purpose === 'playback') return null;

    // Direct download/stream endpoint on backend
    return { url: `${API_BASE}/api/download?id=${encodeURIComponent(id)}&format=${encodeURIComponent(format)}`, resolvedFormat: format };
  }

  async resolveUrl(url: string): Promise<ProviderLinkResult> {
    try {
      const raw = await this.request(API_BASE, '/api/resolve', { url });
      if (raw?.provider === 'spotify') {
        const video = normalizeVideo(raw.video);
        return { kind: 'audio', provider: 'Spotify', downloadable: false, title: video?.title ?? raw.title, video: video ?? undefined };
      }
      const video = normalizeVideo(raw?.video) ?? normalizeVideos(raw)[0];
      if (video) return { kind: 'video', provider: raw?.provider, downloadable: raw?.downloadable !== false, title: video.title, video };
    } catch {}
    try {
      const raw = await this.request(API_BASE, routes.video, { url });
      const video = normalizeVideos(raw)[0];
      if (video) return { kind: video.category === 'music' ? 'audio' : 'video', provider: 'Media extractor', downloadable: true, title: video.title, video };
    } catch {}
    if (/spotify\.com|spotify\.link/i.test(url)) {
      return { kind: 'audio', provider: 'Spotify', downloadable: false, title: 'Spotify link' };
    }
    return { kind: 'unknown', title: url };
  }

  async similar(id: string): Promise<Video[]> {
    const raw = await this.request(API_BASE, routes.similar, { id, videoId: id });
    return normalizeVideos(raw);
  }
}

export const contentProvider: ContentProvider = new SnapTubeProvider();

function normalizeVideos(raw: any): Video[] {
  const candidates: any[] = [];
  collectArrays(raw, candidates);
  if (Array.isArray(raw)) candidates.push(raw);
  const flattened = candidates.flatMap(a => a).filter(Boolean);
  const seen = new Set<string>();
  const result: Video[] = [];
  for (const item of flattened) {
    const v = normalizeVideo(item);
    if (v && !seen.has(v.id)) { seen.add(v.id); result.push(v); }
  }
  return result;
}

function collectArrays(value: any, out: any[]) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { out.push(value); value.slice(0, 100).forEach(x => collectArrays(x, out)); return; }
  Object.values(value).slice(0, 80).forEach(x => collectArrays(x, out));
}

function normalizeVideo(item: any): Video | null {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.id ?? item.videoId ?? item.aweme_id ?? item.key ?? item.contentId ?? item.url ?? '').trim();
  const title = String(item.title ?? item.name ?? item.videoTitle ?? item.desc ?? '').trim();
  const thumbnail = String(item.thumbnail ?? item.thumbnailUrl ?? item.cover ?? item.coverUrl ?? item.pic ?? item.image ?? '').trim();
  if (!id || !title) return null;
  const category = inferCategory(item);
  return {
    id, title,
    channel: String(item.channel ?? item.author ?? item.uploader ?? item.channelName ?? item.owner?.name ?? 'Unknown').trim(),
    channelId: item.channelId ?? item.authorId ?? item.owner?.id,
    thumbnail,
    duration: formatDuration(item.duration ?? item.durationMs ?? item.length),
    views: formatCount(item.views ?? item.viewCount ?? item.playCount),
    published: String(item.published ?? item.publishTime ?? item.createdAt ?? '').trim(),
    category,
    description: item.description ?? item.descText ?? item.summary,
    sourceUrl: item.sourceUrl ?? item.webUrl ?? item.url,
    isLive: Boolean(item.isLive ?? item.live ?? item.liveNow ?? category === 'live'),
    formats: Array.isArray(item.formats) ? item.formats : undefined,
  };
}

function inferCategory(item: AnyRecord): VideoCategory {
  const text = `${item.type ?? ''} ${item.category ?? ''} ${item.tab ?? ''}`.toLowerCase();
  if (item.isLive || item.live || text.includes('live')) return 'live';
  if (text.includes('short')) return 'shorts';
  if (text.includes('music') || text.includes('audio')) return 'music';
  return 'video';
}

function findMediaUrl(value: any): string | null {
  const urls: string[] = [];
  walk(value, urls);
  const preferred = urls.find(u => /\.(m3u8|mp4|webm|m4a|mp3)(\?|$)/i.test(u)) || urls.find(u => /^(https?):\/\//.test(u));
  return preferred ?? null;
}

function walk(value: any, urls: string[]) {
  if (urls.length > 100 || value == null) return;
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) { urls.push(value); return; }
  if (Array.isArray(value)) { value.slice(0, 100).forEach(x => walk(x, urls)); return; }
  if (typeof value === 'object') Object.values(value).slice(0, 100).forEach(x => walk(x, urls));
}

function formatCount(value: any): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function formatDuration(value: any): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const seconds = n > 10000 ? Math.round(n / 1000) : Math.round(n);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
