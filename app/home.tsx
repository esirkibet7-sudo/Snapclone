import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SearchBar } from '../src/components/SearchBar';
import { VideoCard } from '../src/components/VideoCard';
import { SkeletonList } from '../src/components/SkeletonCard';
import { contentProvider } from '../src/services/provider';
import { Video } from '../src/types/video';
import { readClipboardUrl } from '../src/services/clipboardLinks';
import { personalization, inferTopicsFromVideo } from '../src/services/personalization';
import { recommendationEngine } from '../src/services/recommendationEngine';

const TABS = [
  { label: 'Live',    value: 'live',   icon: 'live-tv'    as const },
  { label: 'Shorts',  value: 'shorts', icon: 'movie'      as const },
  { label: 'Music',   value: 'music',  icon: 'music-note' as const },
  { label: 'For You', value: 'all',    icon: 'whatshot'   as const },
];

const NOT_INTERESTED_REASONS = [
  { id: 'not_interested',    label: 'Not interested' },
  { id: 'dont_like_topic',   label: "Don't like this topic" },
  { id: 'dont_like_creator', label: "Don't like this creator" },
  { id: 'already_seen',      label: 'Already seen it' },
  { id: 'too_repetitive',    label: 'Too repetitive' },
];

export default function Home() {
  const [tabIndex, setTabIndex] = useState(3);
  const [videos, setVideos]     = useState<Video[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const [niVideo, setNiVideo]   = useState<Video | null>(null);
  const swipeX  = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(3)).current;
  const tab = TABS[tabIndex];

  const animateTab = (index: number) =>
    Animated.spring(tabAnim, { toValue: index, useNativeDriver: false, tension: 130, friction: 9 }).start();

  const changeTab = useCallback((index: number) => { setTabIndex(index); animateTab(index); }, []);

  const load = useCallback(async (pg = 1, replace = true) => {
    if (pg === 1) { if (replace) setLoading(true); else setRefreshing(true); }
    else setLoadingMore(true);
    try {
      let list: Video[] = [];
      if (tab.value === 'all') {
        try {
          const raw = typeof (contentProvider as any).homePaged === 'function'
            ? await (contentProvider as any).homePaged('all', pg)
            : await contentProvider.home('all');
          const candidates: Video[] = Array.isArray(raw) ? raw : [];
          if (pg === 1) recommendationEngine.clearSession();
          list = await recommendationEngine.rankVideos(candidates);
          if (list.length === 0) list = candidates;
        } catch {
          list = await contentProvider.home('all').catch(() => []);
        }
      } else {
        const data = typeof (contentProvider as any).homePaged === 'function'
          ? await (contentProvider as any).homePaged(tab.value, pg)
          : await contentProvider.home(tab.value as any);
        list = Array.isArray(data) ? data : [];
      }
      if (pg === 1) setVideos(list);
      else setVideos(prev => { const ids = new Set(prev.map(v => v.id)); return [...prev, ...list.filter(v => !ids.has(v.id))]; });
      setHasMore(list.length >= 8);
      setPage(pg);
    } catch { if (pg === 1) setVideos([]); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [tab.value]);

  useEffect(() => { setVideos([]); setPage(1); setHasMore(true); load(1, true); }, [tabIndex]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderMove: (_, g) => {
        const dx = (tabIndex === 0 && g.dx > 0) ? g.dx * 0.1 : (tabIndex === TABS.length - 1 && g.dx < 0) ? g.dx * 0.1 : g.dx * 0.18;
        swipeX.setValue(dx);
      },
      onPanResponderRelease: (_, g) => {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }).start();
        if (g.dx < -50 && tabIndex < TABS.length - 1) setTabIndex(i => { const n = i + 1; animateTab(n); return n; });
        else if (g.dx > 50 && tabIndex > 0) setTabIndex(i => { const p = i - 1; animateTab(p); return p; });
      },
    })
  ).current;

  const onEndReached = () => { if (!loadingMore && hasMore && !loading) load(page + 1, false); };
  const underlineLeft = tabAnim.interpolate({ inputRange: TABS.map((_, i) => i), outputRange: TABS.map((_, i) => `${(i / TABS.length) * 100}%` as any) });

  const handleNotInterested = async (reason: string) => {
    if (!niVideo) return;
    const topics = inferTopicsFromVideo(niVideo.title, niVideo.channel, niVideo.category);
    await personalization.recordNegativeFeedback(niVideo.id, topics, niVideo.channelId ?? niVideo.channel, reason);
    if (reason === 'dont_like_creator' && niVideo.channelId) await personalization.muteCreator(niVideo.channelId);
    setVideos(prev => prev.filter(v => v.id !== niVideo.id));
    setNiVideo(null);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Kenya<Text style={styles.logoAccent}>Tube</Text></Text>
          <Text style={styles.sub}>VIDEO • MUSIC • DOWNLOADS</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={async () => {
            const u = await readClipboardUrl();
            if (u) router.push({ pathname: '/link', params: { url: u } });
            else Alert.alert('No link', 'Copy a supported media URL first.');
          }}>
            <MaterialIcons name="link" size={21} color="#ccc" />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => router.push('/downloads')}>
            <MaterialIcons name="file-download" size={22} color="#ccc" />
          </Pressable>
        </View>
      </View>

      <SearchBar onSubmit={(q) => { personalization.recordSearch(q).catch(() => {}); router.push({ pathname: '/search', params: { q } }); }} />

      <View style={styles.tabBar}>
        {TABS.map((t, i) => {
          const isActive = tabIndex === i;
          return (
            <Pressable key={t.value} onPress={() => changeTab(i)} style={[styles.tab, isActive && styles.activeTab]}>
              <MaterialIcons name={t.icon} size={15} color={isActive ? '#E53935' : '#3a3a45'} />
              <Text style={[styles.tabText, isActive && styles.activeText]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tabUnderlineTrack}>
        <Animated.View style={[styles.tabUnderline, { left: underlineLeft, width: `${100 / TABS.length}%` as any }]} />
      </View>

      <Animated.View style={[styles.swipeArea, { transform: [{ translateX: swipeX }] }]} {...panResponder.panHandlers}>
        {loading ? (
          <View style={styles.skeletonWrap}><SkeletonList count={7} /></View>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={v => v.id}
            renderItem={({ item }) => (
              <VideoCard
                video={item}
                onPress={() => router.push({ pathname: '/video/[id]', params: { id: item.id, title: item.title, channel: item.channel, thumbnail: item.thumbnail, duration: item.duration, views: item.views, published: item.published, category: item.category, isLive: item.isLive ? '1' : '0' } })}
                onLongPress={() => setNiVideo(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, false)} tintColor="#E53935" colors={['#E53935']} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><SkeletonList count={3} /></View> : null}
            ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="cloud-off" size={40} color="#444" /><Text style={styles.emptyText}>No content right now.{'\n'}Pull down to refresh.</Text></View>}
          />
        )}
      </Animated.View>

      <BottomNav active="home" />

      <Modal transparent visible={!!niVideo} animationType="slide" onRequestClose={() => setNiVideo(null)}>
        <Pressable style={styles.niBackdrop} onPress={() => setNiVideo(null)}>
          <View style={styles.niSheet}>
            <View style={styles.niHandle} />
            <Text style={styles.niTitle} numberOfLines={2}>{niVideo?.title}</Text>
            <Text style={styles.niSub}>Why are you not interested?</Text>
            {NOT_INTERESTED_REASONS.map(r => (
              <Pressable key={r.id} style={styles.niRow} onPress={() => handleNotInterested(r.id)}>
                <MaterialIcons name="block" size={18} color="#E53935" />
                <Text style={styles.niRowText}>{r.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.niCancel} onPress={() => setNiVideo(null)}>
              <Text style={styles.niCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function BottomNav({ active }: { active: string }) {
  const items = [
    { id: 'home',      label: 'Home',      icon: 'home'       as const, path: '/home' },
    { id: 'music',     label: 'Music',     icon: 'music-note' as const, path: '/music' },
    { id: 'downloads', label: 'Downloads', icon: 'download'   as const, path: '/downloads' },
    { id: 'settings',  label: 'Settings',  icon: 'settings'   as const, path: '/settings' },
  ];
  return (
    <View style={styles.nav}>
      {items.map(x => (
        <Pressable key={x.id} style={styles.navItem} onPress={() => router.push(x.path as any)}>
          {active === x.id && <View style={styles.navActiveBar} />}
          <MaterialIcons name={x.icon} size={23} color={active === x.id ? '#E53935' : '#555'} />
          <Text style={[styles.navText, active === x.id && styles.navActive]}>{x.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b0d' },
  header: { height: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#171719' },
  logo: { color: '#f0f0f0', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  logoAccent: { color: '#E53935' },
  sub: { color: '#3a3a3f', fontSize: 8, letterSpacing: 1.8, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#191920', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#28282e' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 2, gap: 2 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  activeTab: { backgroundColor: '#1d1d22' },
  tabText: { color: '#3a3a45', fontSize: 12, fontWeight: '600' },
  activeText: { color: '#fff', fontWeight: '800' },
  tabUnderlineTrack: { height: 2, backgroundColor: '#17171c', marginHorizontal: 10, borderRadius: 2, position: 'relative', marginBottom: 2, overflow: 'hidden' },
  tabUnderline: { position: 'absolute', height: 2, backgroundColor: '#E53935', borderRadius: 2 },
  swipeArea: { flex: 1 },
  skeletonWrap: { padding: 14 },
  listContent: { padding: 14, paddingBottom: 130 },
  footerLoader: { paddingHorizontal: 0, paddingBottom: 20 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyText: { color: '#4a4a55', textAlign: 'center', lineHeight: 22, fontSize: 14 },
  nav: { position: 'absolute', bottom: 30, left: 14, right: 14, height: 60, backgroundColor: '#111115', borderRadius: 20, borderWidth: 1, borderColor: '#222228', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 25 },
  navItem: { alignItems: 'center', gap: 2, flex: 1, position: 'relative', paddingTop: 4 },
  navActiveBar: { position: 'absolute', top: -1, width: 20, height: 3, backgroundColor: '#E53935', borderRadius: 2 },
  navText: { color: '#484850', fontSize: 10, fontWeight: '500' },
  navActive: { color: '#E53935', fontWeight: '700' },
  niBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  niSheet: { backgroundColor: '#141418', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, paddingTop: 12, paddingHorizontal: 20 },
  niHandle: { width: 36, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  niTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  niSub: { color: '#666', fontSize: 12, marginBottom: 16 },
  niRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e1e24' },
  niRowText: { color: '#ddd', fontSize: 14 },
  niCancel: { marginTop: 16, alignItems: 'center', paddingVertical: 14, backgroundColor: '#1e1e24', borderRadius: 14 },
  niCancelText: { color: '#888', fontSize: 14, fontWeight: '600' },
});
