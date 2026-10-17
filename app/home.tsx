import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
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

// Tab order as requested: Live → Shorts → Music → For You
const TABS = [
  { label: 'Live',    value: 'live',   icon: 'live-tv'       as const },
  { label: 'Shorts',  value: 'shorts', icon: 'movie'         as const },
  { label: 'Music',   value: 'music',  icon: 'music-note'    as const },
  { label: 'For You', value: 'all',    icon: 'whatshot'      as const },
];

export default function Home() {
  const [tabIndex, setTabIndex] = useState(3); // default: For You
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Animated values for Tinder-style swipe
  const swipeX = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(3)).current; // tracks tabIndex for underline

  const tab = TABS[tabIndex];

  // Animate underline to new tab
  const animateTab = (index: number) => {
    Animated.spring(tabAnim, {
      toValue: index,
      useNativeDriver: false,
      tension: 130,
      friction: 9,
    }).start();
  };

  const changeTab = useCallback((index: number) => {
    setTabIndex(index);
    animateTab(index);
  }, []);

  const load = useCallback(async (pg = 1, replace = true) => {
    if (pg === 1) {
      if (replace) setLoading(true);
      else setRefreshing(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const data = typeof (contentProvider as any).homePaged === 'function'
        ? await (contentProvider as any).homePaged(tab.value, pg)
        : await contentProvider.home(tab.value as any);
      const list: Video[] = Array.isArray(data) ? data : [];
      if (pg === 1) {
        setVideos(list);
      } else {
        setVideos(prev => {
          const ids = new Set(prev.map(v => v.id));
          return [...prev, ...list.filter(v => !ids.has(v.id))];
        });
      }
      setHasMore(list.length >= 8);
      setPage(pg);
    } catch {
      if (pg === 1) setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [tab.value]);

  useEffect(() => {
    setVideos([]);
    setPage(1);
    setHasMore(true);
    load(1, true);
  }, [tabIndex]);

  // Tinder-style PanResponder with spring snap
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderMove: (_, g) => {
        // Resist at boundaries
        const isAtLeft  = tabIndex === 0;
        const isAtRight = tabIndex === TABS.length - 1;
        const dx = isAtLeft && g.dx > 0 ? g.dx * 0.1
                 : isAtRight && g.dx < 0 ? g.dx * 0.1
                 : g.dx * 0.18;
        swipeX.setValue(dx);
      },
      onPanResponderRelease: (_, g) => {
        // Spring back
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }).start();

        const threshold = 50;
        if (g.dx < -threshold && tabIndex < TABS.length - 1) {
          // Swipe left → next tab
          setTabIndex(i => {
            const next = i + 1;
            animateTab(next);
            return next;
          });
        } else if (g.dx > threshold && tabIndex > 0) {
          // Swipe right → previous tab
          setTabIndex(i => {
            const prev = i - 1;
            animateTab(prev);
            return prev;
          });
        }
      },
    })
  ).current;

  const onEndReached = () => {
    if (!loadingMore && hasMore && !loading) load(page + 1, false);
  };

  // Animated underline position
  const underlineLeft = tabAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => `${(i / TABS.length) * 100}%` as any),
  });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Kenya<Text style={styles.logoAccent}>Tube</Text></Text>
          <Text style={styles.sub}>VIDEO • MUSIC • DOWNLOADS</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconButton}
            onPress={async () => {
              const u = await readClipboardUrl();
              if (u) router.push({ pathname: '/link', params: { url: u } });
              else Alert.alert('No link', 'Copy a supported media URL first.');
            }}
          >
            <MaterialIcons name="link" size={21} color="#ccc" />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => router.push('/downloads')}>
            <MaterialIcons name="file-download" size={22} color="#ccc" />
          </Pressable>
        </View>
      </View>

      <SearchBar onSubmit={(q) => router.push({ pathname: '/search', params: { q } })} />

      {/* Tinder-style tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => {
          const isActive = tabIndex === i;
          return (
            <Pressable
              key={t.value}
              onPress={() => changeTab(i)}
              style={[styles.tab, isActive && styles.activeTab]}
            >
              <MaterialIcons
                name={t.icon}
                size={15}
                color={isActive ? '#E53935' : '#3a3a45'}
              />
              <Text style={[styles.tabText, isActive && styles.activeText]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Animated underline */}
      <View style={styles.tabUnderlineTrack}>
        <Animated.View
          style={[
            styles.tabUnderline,
            { left: underlineLeft, width: `${100 / TABS.length}%` },
          ]}
        />
      </View>

      {/* Content area (swipeable) */}
      <Animated.View
        style={[styles.swipeArea, { transform: [{ translateX: swipeX }] }]}
        {...panResponder.panHandlers}
      >
        {loading ? (
          <View style={styles.skeletonWrap}>
            <SkeletonList count={7} />
          </View>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={v => v.id}
            renderItem={({ item }) => (
              <VideoCard
                video={item}
                onPress={() =>
                  router.push({
                    pathname: '/video/[id]',
                    params: {
                      id: item.id,
                      title: item.title,
                      channel: item.channel,
                      thumbnail: item.thumbnail,
                      duration: item.duration,
                      views: item.views,
                      published: item.published,
                      category: item.category,
                      isLive: item.isLive ? '1' : '0',
                    },
                  })
                }
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(1, false)}
                tintColor="#E53935"
                colors={['#E53935']}
              />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <SkeletonList count={3} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialIcons name="cloud-off" size={40} color="#444" />
                <Text style={styles.emptyText}>No content right now.{'\n'}Pull down to refresh.</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      <BottomNav active="home" />
    </View>
  );
}

export function BottomNav({ active }: { active: string }) {
  const items = [
    { id: 'home', label: 'Home', icon: 'home' as const, path: '/home' },
    { id: 'music', label: 'Music', icon: 'music-note' as const, path: '/music' },
    { id: 'downloads', label: 'Downloads', icon: 'download' as const, path: '/downloads' },
    { id: 'settings', label: 'Settings', icon: 'settings' as const, path: '/settings' },
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
  header: {
    height: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#171719',
  },
  logo: { color: '#f0f0f0', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  logoAccent: { color: '#E53935' },
  sub: { color: '#3a3a3f', fontSize: 8, letterSpacing: 1.8, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#191920', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#28282e',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 2,
    gap: 2,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 5,
  },
  activeTab: { backgroundColor: '#1d1d22' },
  tabText: { color: '#3a3a45', fontSize: 12, fontWeight: '600' },
  activeText: { color: '#fff', fontWeight: '800' },
  tabUnderlineTrack: {
    height: 2, backgroundColor: '#17171c',
    marginHorizontal: 10, borderRadius: 2,
    position: 'relative', marginBottom: 2, overflow: 'hidden',
  },
  tabUnderline: {
    position: 'absolute', height: 2,
    backgroundColor: '#E53935', borderRadius: 2,
  },
  swipeArea: { flex: 1 },
  skeletonWrap: { padding: 14 },
  listContent: { padding: 14, paddingBottom: 130 },
  footerLoader: { paddingHorizontal: 0, paddingBottom: 20 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyText: { color: '#4a4a55', textAlign: 'center', lineHeight: 22, fontSize: 14 },
  nav: {
    position: 'absolute', bottom: 30, left: 14, right: 14, height: 60,
    backgroundColor: '#111115', borderRadius: 20, borderWidth: 1, borderColor: '#222228',
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 25,
  },
  navItem: { alignItems: 'center', gap: 2, flex: 1, position: 'relative', paddingTop: 4 },
  navActiveBar: {
    position: 'absolute', top: -1, width: 20, height: 3,
    backgroundColor: '#E53935', borderRadius: 2,
  },
  navText: { color: '#484850', fontSize: 10, fontWeight: '500' },
  navActive: { color: '#E53935', fontWeight: '700' },
});
