import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { VideoCard } from '../src/components/VideoCard';
import { library } from '../src/services/library';
import { Video } from '../src/types/video';

export default function History() {
  const [items, setItems] = useState<Video[]>([]);
  const load = useCallback(async () => setItems(await library.history()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <Page title="History" action={<Pressable onPress={() => Alert.alert('Clear history?', 'This cannot be undone.', [{ text: 'Cancel' }, { text: 'Clear', style: 'destructive', onPress: async () => { await library.clearHistory(); load(); } }])}><MaterialIcons name="delete-sweep" size={24} color="#aaa" /></Pressable>}>
    {!items.length ? <Empty icon="history" text="Your watch history will appear here." /> : items.map(v => <VideoCard key={v.id} video={v} onPress={() => router.push({ pathname: '/video/[id]', params: { id: v.id } })} />)}
  </Page>;
}
function Page({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <View style={styles.root}><View style={styles.header}><Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff" /></Pressable><Text style={styles.title}>{title}</Text>{action ?? <View style={{ width: 25 }} />}</View><ScrollView contentContainerStyle={styles.content}>{children}</ScrollView></View>; }
function Empty({ icon, text }: { icon: any; text: string }) { return <View style={styles.empty}><MaterialIcons name={icon} size={45} color="#444" /><Text style={styles.emptyText}>{text}</Text></View>; }
const styles = StyleSheet.create({ root:{flex:1,backgroundColor:'#0b0b0d'},header:{height:70,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{color:'#fff',fontSize:19,fontWeight:'800'},content:{padding:16,paddingBottom:35},empty:{paddingTop:100,alignItems:'center',gap:12},emptyText:{color:'#777'}});
