import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from '../types/video';

export function VideoCard({ video, onPress, onLongPress }: { video: Video; onPress: () => void; onLongPress?: () => void }) {
  return <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.72 }]}>
    <View style={styles.thumbWrap}>
      <Image source={{ uri: video.thumbnail }} style={styles.thumb} />
      <View style={styles.duration}><Text style={styles.durationText}>{video.duration}</Text></View>
      {video.category === 'live' && <View style={styles.live}><Text style={styles.liveText}>LIVE</Text></View>}
    </View>
    <View style={styles.meta}>
      <Text numberOfLines={2} style={styles.title}>{video.title}</Text>
      <Text style={styles.channel}>{video.channel} • {video.views} views</Text>
      <Text style={styles.date}>{video.published}</Text>
    </View>
    <Pressable onPress={onLongPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <MaterialIcons name="more-vert" size={22} color="#777" />
    </Pressable>
  </Pressable>;
}
const styles = StyleSheet.create({ card: { flexDirection: 'row', marginBottom: 17, gap: 11, alignItems: 'flex-start' }, thumbWrap: { width: 142, height: 84, borderRadius: 10, overflow: 'hidden', backgroundColor: '#202024' }, thumb: { width: '100%', height: '100%' }, duration: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,.75)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }, durationText: { color: '#fff', fontSize: 10, fontWeight: '700' }, live: { position: 'absolute', left: 5, top: 5, backgroundColor: '#e91e63', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }, liveText: { color: '#fff', fontSize: 9, fontWeight: '800' }, meta: { flex: 1, gap: 4 }, title: { color: '#f5f5f5', fontSize: 14, lineHeight: 19, fontWeight: '700' }, channel: { color: '#9a9a9f', fontSize: 11 }, date: { color: '#68686d', fontSize: 10 } });
