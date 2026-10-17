import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SearchBar } from '../src/components/SearchBar';
import { VideoCard } from '../src/components/VideoCard';
import { contentProvider } from '../src/services/provider';
import { Video, SearchFilter } from '../src/types/video';
import { personalization, inferTopicsFromVideo } from '../src/services/personalization';

export default function Search() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true); setError(null);
    // Record search signal
    personalization.recordSearch(q.trim()).catch(() => {});
    try {
      const res = await contentProvider.search(q.trim(), filter);
      setResults(res);
    } catch (e: any) {
      setResults([]);
      setError(e?.message?.includes('Network') ? 'Network error. Please check your connection.' : 'Search service temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (v: Video) => {
    // Record search-click signal
    const topics = inferTopicsFromVideo(v.title, v.channel, v.category);
    personalization.recordSearchClick(topics).catch(() => {});
    router.push({ pathname: '/video/[id]', params: { id: v.id, title: v.title, channel: v.channel, thumbnail: v.thumbnail, duration: v.duration, views: v.views, published: v.published, category: v.category, isLive: v.isLive ? '1' : '0' } });
  };

  useEffect(() => { if (params.q) { setQuery(params.q); search(params.q); } }, [params.q, filter]);

  return <View style={styles.root}>
    <View style={styles.top}><Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff" /></Pressable><View style={{ flex: 1 }}><SearchBar initialValue={query} onSubmit={(q) => { setQuery(q); search(q); }} /></View><Pressable onPress={() => router.push('/link')}><MaterialIcons name="link" size={23} color="#aaa" /></Pressable></View>
    <View style={styles.filters}>{(['all', 'video', 'music', 'shorts', 'live'] as SearchFilter[]).map(x => <Pressable key={x} onPress={() => setFilter(x)} style={[styles.filter, filter === x && styles.filterActive]}><Text style={[styles.filterText, filter === x && styles.filterTextActive]}>{x === 'all' ? 'All' : x[0].toUpperCase() + x.slice(1)}</Text></Pressable>)}</View>
    <ScrollView contentContainerStyle={styles.content}>{loading ? <ActivityIndicator color="#ff1744" size="large" /> : error ? <View style={styles.empty}><MaterialIcons name="cloud-off" size={38} color="#555" /><Text style={styles.emptyText}>{error}</Text></View> : results.length ? results.map(v => <VideoCard key={v.id} video={v} onPress={() => handleVideoPress(v)} />) : <View style={styles.empty}><MaterialIcons name="search-off" size={38} color="#555" /><Text style={styles.emptyText}>No results for "{query}".</Text></View>}</ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#0b0b0d' }, top: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, paddingRight: 10 }, filters: { flexDirection: 'row', gap: 7, padding: 16, paddingBottom: 12 }, filter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#18181c' }, filterActive: { backgroundColor: '#ff1744' }, filterText: { color: '#888', fontSize: 12 }, filterTextActive: { color: '#fff', fontWeight: '700' }, content: { padding: 16, paddingBottom: 40 }, empty: { paddingTop: 70, paddingHorizontal: 25, alignItems: 'center', gap: 12 }, emptyText: { color: '#777', textAlign: 'center', lineHeight: 20 } });
