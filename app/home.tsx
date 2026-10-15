import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SearchBar } from '../src/components/SearchBar';
import { VideoCard } from '../src/components/VideoCard';
import { contentProvider } from '../src/services/provider';
import { Video } from '../src/types/video';
import { readClipboardUrl } from '../src/services/clipboardLinks';
import { Alert } from 'react-native';

const tabs = [{ label: 'For You', value: 'all' }, { label: 'Music', value: 'music' }, { label: 'Shorts', value: 'shorts' }, { label: 'Live', value: 'live' }];

export default function Home() {
  const [tab, setTab] = useState('all');
  const [videos, setVideos] = useState<Video[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => { setRefreshing(true); try { setVideos(await contentProvider.home(tab as any)); } finally { setRefreshing(false); } };
  useEffect(() => { load(); }, [tab]);
  return <View style={styles.root}>
    <View style={styles.header}><View><Text style={styles.logo}>SnapClone</Text><Text style={styles.sub}>VIDEO • MUSIC • DOWNLOADS</Text></View><View style={styles.headerActions}><Pressable style={styles.iconButton} onPress={async () => { const u=await readClipboardUrl(); if(u) router.push({pathname:'/link',params:{url:u}}); else Alert.alert('No link','Copy a supported media URL first.'); }}><MaterialIcons name="link" size={22} color="#fff" /></Pressable><Pressable style={styles.iconButton} onPress={() => router.push('/downloads')}><MaterialIcons name="file-download" size={23} color="#fff" /></Pressable></View></View>
    <SearchBar onSubmit={(q) => router.push({ pathname: '/search', params: { q } })} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#ff1744" />} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map(x => <Pressable key={x.value} onPress={() => setTab(x.value)} style={[styles.tab, tab === x.value && styles.activeTab]}><Text style={[styles.tabText, tab === x.value && styles.activeText]}>{x.label}</Text></Pressable>)}</ScrollView>
      {videos.length ? videos.map(v => <VideoCard key={v.id} video={v} onPress={() => router.push({ pathname: '/video/[id]', params: { id: v.id } })} />) : <Empty text="No content available right now. Pull down to refresh." />}
    </ScrollView>
    <BottomNav active="home" />
  </View>;
}
export function BottomNav({ active }: { active: string }) { const items = [{ id: 'home', label: 'Home', icon: 'home' as const, path: '/home' }, { id: 'music', label: 'Music', icon: 'music-note' as const, path: '/music' }, { id: 'downloads', label: 'Downloads', icon: 'download' as const, path: '/downloads' }, { id: 'settings', label: 'Settings', icon: 'settings' as const, path: '/settings' }]; return <View style={styles.nav}>{items.map(x => <Pressable key={x.id} style={styles.navItem} onPress={() => router.push(x.path as any)}><MaterialIcons name={x.icon} size={22} color={active === x.id ? '#ff1744' : '#777'} /><Text style={[styles.navText, active === x.id && styles.navActive]}>{x.label}</Text></Pressable>)}</View>; }
function Empty({ text }: { text: string }) { return <View style={styles.empty}><MaterialIcons name="cloud-off" size={36} color="#555" /><Text style={styles.emptyText}>{text}</Text></View>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#0b0b0d' }, headerActions: { flexDirection: 'row', gap: 8 }, header: { height: 69, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, logo: { color: '#ff1744', fontSize: 24, fontWeight: '800' }, sub: { color: '#555', fontSize: 8, letterSpacing: 1.3, marginTop: 2 }, iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#19191d', alignItems: 'center', justifyContent: 'center' }, content: { padding: 16, paddingBottom: 95 }, tabs: { gap: 9, paddingBottom: 18 }, tab: { paddingHorizontal: 17, paddingVertical: 8, borderRadius: 18, backgroundColor: '#18181c' }, activeTab: { backgroundColor: '#ff1744' }, tabText: { color: '#999', fontSize: 13, fontWeight: '600' }, activeText: { color: '#fff' }, nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 67, backgroundColor: '#151518', borderTopWidth: 1, borderTopColor: '#29292d', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 5 }, navItem: { alignItems: 'center', gap: 3, minWidth: 75 }, navText: { color: '#777', fontSize: 11 }, navActive: { color: '#ff1744', fontWeight: '700' }, empty: { alignItems: 'center', justifyContent: 'center', padding: 45, gap: 12 }, emptyText: { color: '#777', textAlign: 'center', lineHeight: 20 } });
