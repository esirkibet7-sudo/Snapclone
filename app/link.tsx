import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { contentProvider } from '../src/services/provider';
import { downloadManager } from '../src/services/downloadManager';
import { Video, VideoFormat } from '../src/types/video';

type DownloadOption = {
  id: VideoFormat;
  label: string;
  tag: string;
  kind: 'video' | 'audio';
};

const VIDEO_OPTIONS: DownloadOption[] = [
  { id: 'video_360',  label: '360p',         tag: 'SD',    kind: 'video' },
  { id: 'video_480',  label: '480p',         tag: 'SD',    kind: 'video' },
  { id: 'video_720',  label: '720p HD',      tag: 'HD',    kind: 'video' },
  { id: 'video_1080', label: '1080p FHD',    tag: 'FHD',   kind: 'video' },
  { id: 'video_1440', label: '1440p 2K',     tag: '2K',    kind: 'video' },
  { id: 'video_2160', label: '2160p 4K',     tag: '4K',    kind: 'video' },
];

const AUDIO_OPTIONS: DownloadOption[] = [
  { id: 'audio_128', label: 'MP3 128 kbps', tag: 'Good',  kind: 'audio' },
  { id: 'audio_192', label: 'MP3 192 kbps', tag: 'Great', kind: 'audio' },
  { id: 'audio_320', label: 'MP3 320 kbps', tag: 'Best',  kind: 'audio' },
];

export default function LinkImport() {
  const params = useLocalSearchParams<{ url?: string }>();
  const [url, setUrl] = useState(params.url || '');
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<Video | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [downloading, setDownloading] = useState<VideoFormat | null>(null);
  const [metadataOnly, setMetadataOnly] = useState(false);

  // Auto-resolve if a URL was passed via clipboard
  useEffect(() => {
    if (params.url) {
      setUrl(params.url);
    }
  }, [params.url]);

  const resolve = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setResolved(null);
    setMetadataOnly(false);
    try {
      const result = await contentProvider.resolveUrl(url.trim());
      setMetadataOnly(result.downloadable === false);
      if (result.video) {
        setResolved(result.video);
        setSheetOpen(true);
      } else {
        // Still show the sheet with the URL even if we only have title
        setResolved({
          id: url.trim(),
          title: result.title || url.trim(),
          channel: 'Unknown',
          thumbnail: '',
          duration: '',
          views: '',
          published: '',
          category: 'video',
          isLive: false,
        });
        setSheetOpen(true);
      }
    } catch {
      // Even on error, show download sheet so user can pick format
      setResolved({
        id: url.trim(),
        title: url.trim(),
        channel: 'Unknown',
        thumbnail: '',
        duration: '',
        views: '',
        published: '',
        category: 'video',
        isLive: false,
      });
      setSheetOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const startDownload = async (opt: DownloadOption) => {
    if (!resolved) return;
    setDownloading(opt.id);
    try {
      const sourceId = resolved.sourceUrl || resolved.id;
      const streamUrl = await contentProvider.resolveStream(sourceId, opt.id);
      const suffix = opt.kind === 'audio' ? `${opt.label}` : `${opt.label}`;
      await downloadManager.enqueue({
        id: `${resolved.id}-${opt.id}-${Date.now()}`,
        title: `${resolved.title} (${suffix})`,
        url: streamUrl ?? undefined,
        type: opt.kind,
        format: opt.id,
        videoId: sourceId,
      });
      setSheetOpen(false);
      router.push('/downloads');
    } catch {}
    setDownloading(null);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={25} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Download link</Text>
        <View style={{ width: 25 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="link" size={44} color="#ff1744" />
        </View>

        <Text style={styles.heading}>Paste a video or music link</Text>
        <Text style={styles.sub}>
          Paste any supported URL — YouTube, SoundCloud, and more.{'\n'}
          Choose to download as <Text style={styles.highlight}>MP4</Text> or <Text style={styles.highlight}>MP3</Text>.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://…"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={resolve}
            returnKeyType="go"
          />
          {url.length > 0 && (
            <Pressable style={styles.clearBtn} onPress={() => setUrl('')}>
              <MaterialIcons name="close" size={18} color="#777" />
            </Pressable>
          )}
        </View>

        <Pressable disabled={busy || !url.trim()} onPress={resolve} style={[styles.button, (!url.trim()) && styles.buttonDisabled]}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <>
                <MaterialIcons name="search" size={21} color="#fff" />
                <Text style={styles.buttonText}>Analyze &amp; Download</Text>
              </>
          }
        </Pressable>

        {/* Quick tip chips */}
        <View style={styles.chips}>
          {['YouTube', 'SoundCloud', 'Vimeo', 'TikTok'].map(s => (
            <View key={s} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Download options sheet ── */}
      <Modal
        transparent
        visible={sheetOpen}
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} />
        <View style={styles.sheet}>
          {/* Video preview */}
          {resolved && (
            <View style={styles.previewRow}>
              {resolved.thumbnail ? (
                <Image source={{ uri: resolved.thumbnail }} style={styles.previewThumb} />
              ) : (
                <View style={[styles.previewThumb, styles.previewThumbPlaceholder]}>
                  <MaterialIcons name="link" size={28} color="#E53935" />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle} numberOfLines={2}>{resolved.title}</Text>
                <Text style={styles.previewChannel}>{resolved.channel}</Text>
              </View>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {metadataOnly ? (
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info-outline" size={18} color="#E53935" />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Spotify provides track details here. Audio downloading is unavailable for this link.</Text>
              </View>
            ) : <>
            {/* MP4 section */}
            <View style={styles.sectionHeader}>
              <MaterialIcons name="video-file" size={18} color="#E53935" />
              <Text style={styles.sectionTitle}>Download as MP4</Text>
            </View>
            <View style={styles.optionGrid}>
              {VIDEO_OPTIONS.map(opt => (
                <Pressable
                  key={opt.id}
                  style={styles.optionChip}
                  onPress={() => startDownload(opt)}
                  disabled={downloading !== null}
                >
                  {downloading === opt.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Text style={styles.optionLabel}>{opt.label}</Text>
                        <View style={styles.optionTag}>
                          <Text style={styles.optionTagText}>{opt.tag}</Text>
                        </View>
                      </>
                  }
                </Pressable>
              ))}
            </View>

            {/* MP3 section */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <MaterialIcons name="audiotrack" size={18} color="#E53935" />
              <Text style={styles.sectionTitle}>Download as MP3</Text>
            </View>
            <View style={styles.optionGrid}>
              {AUDIO_OPTIONS.map(opt => (
                <Pressable
                  key={opt.id}
                  style={[styles.optionChip, styles.optionChipAudio]}
                  onPress={() => startDownload(opt)}
                  disabled={downloading !== null}
                >
                  {downloading === opt.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Text style={styles.optionLabel}>{opt.label}</Text>
                        <View style={[styles.optionTag, styles.optionTagAudio]}>
                          <Text style={styles.optionTagText}>{opt.tag}</Text>
                        </View>
                      </>
                  }
                </Pressable>
              ))}
            </View>

            {/* Also open in player */}
            {resolved && (
              <Pressable
                style={styles.watchBtn}
                onPress={() => {
                  setSheetOpen(false);
                  router.replace({ pathname: '/video/[id]', params: { id: resolved.id, title: resolved.title, thumbnail: resolved.thumbnail, channel: resolved.channel } });
                }}
              >
                <MaterialIcons name="play-circle-filled" size={20} color="#fff" />
                <Text style={styles.watchBtnText}>Watch / Stream</Text>
              </Pressable>
            )}
            </>}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b0d' },
  header: {
    height: 70, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 19, fontWeight: '800' },

  content:  { padding: 22, alignItems: 'center' },
  iconWrap: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: '#21161b', alignItems: 'center', justifyContent: 'center', marginTop: 30,
  },
  heading: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 22, textAlign: 'center' },
  sub: { color: '#666', textAlign: 'center', lineHeight: 22, marginTop: 10, maxWidth: 330 },
  highlight: { color: '#ff1744', fontWeight: '700' },

  inputRow: {
    width: '100%', height: 54, borderRadius: 16,
    backgroundColor: '#18181c', marginTop: 26,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a30',
  },
  input: {
    flex: 1, color: '#fff', paddingHorizontal: 16,
    fontSize: 14,
  },
  clearBtn: { padding: 12 },

  button: {
    marginTop: 12, width: '100%', height: 52, borderRadius: 14,
    backgroundColor: '#ff1744', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  buttonDisabled: { backgroundColor: '#4a1a1f' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  chips: { flexDirection: 'row', gap: 8, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1a1a20', borderRadius: 20, borderWidth: 1, borderColor: '#2a2a35' },
  chipText: { color: '#666', fontSize: 12, fontWeight: '600' },

  // Sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#17171b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '80%',
  },

  previewRow: { flexDirection: 'row', gap: 12, marginBottom: 20, alignItems: 'center' },
  previewThumb: { width: 90, height: 56, borderRadius: 10, backgroundColor: '#111' },
  previewThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1e' },
  previewInfo: { flex: 1, gap: 4 },
  previewTitle: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 19 },
  previewChannel: { color: '#888', fontSize: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:  { color: '#fff', fontWeight: '800', fontSize: 15 },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: {
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#202028', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#2e2e38', minWidth: '28%',
  },
  optionChipAudio: { backgroundColor: '#1a1020', borderColor: '#3a1a2a' },
  optionLabel:    { color: '#eee', fontWeight: '700', fontSize: 13 },
  optionTag:      { backgroundColor: '#E53935', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  optionTagAudio: { backgroundColor: '#9c27b0' },
  optionTagText:  { color: '#fff', fontSize: 10, fontWeight: '800' },

  watchBtn: {
    marginTop: 20, backgroundColor: '#1d2030', borderRadius: 14,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#2a3050',
  },
  watchBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
