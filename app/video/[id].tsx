import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { contentProvider } from '../../src/services/provider';
import { downloadManager } from '../../src/services/downloadManager';
import { library } from '../../src/services/library';
import { Video, VideoFormat, VideoFormatOption } from '../../src/types/video';

const formats: VideoFormatOption[] = [
  { id: 'video_144', label: '144p', size: 'Smallest', kind: 'video' }, { id: 'video_240', label: '240p', size: 'Low', kind: 'video' },
  { id: 'video_360', label: '360p', size: 'Small', kind: 'video' }, { id: 'video_480', label: '480p', size: 'Medium', kind: 'video' },
  { id: 'video_720', label: '720p HD', size: 'High', kind: 'video' }, { id: 'video_1080', label: '1080p HD', size: 'Full HD', kind: 'video' },
  { id: 'video_1440', label: '1440p', size: '2K', kind: 'video' }, { id: 'video_2160', label: '2160p', size: '4K', kind: 'video' },
  { id: 'audio_128', label: 'MP3 128 kbps', size: 'Audio', kind: 'audio' }, { id: 'audio_192', label: 'MP3 192 kbps', size: 'Audio', kind: 'audio' }, { id: 'audio_320', label: 'MP3 320 kbps', size: 'Audio', kind: 'audio' },
];

export default function VideoDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null); const [stream, setStream] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [formatOpen, setFormatOpen] = useState(false); const [saved, setSaved] = useState(false);
  useEffect(() => { (async () => { setLoading(true); try { const v = await contentProvider.getDetails(id); setVideo(v); if (v) { await library.addHistory(v); setSaved(await library.isSaved(v.id)); setStream(await contentProvider.resolveStream(v.id, 'video_360')); } } catch {} finally { setLoading(false); } })(); }, [id]);
  const chooseDownload = async (format: VideoFormat) => {
    if (!video) return;
    try {
      const url = await contentProvider.resolveStream(video.id, format);
      await downloadManager.enqueue({
        id: `${video.id}-${format}`,
        title: `${video.title} (${format.replace('video_', '').replace('audio_', '')}${format.startsWith('audio_') ? ' kbps' : 'p'})`,
        url: url ?? undefined,
        type: format.startsWith('audio_') ? 'audio' : 'video',
        format,
      });
      setFormatOpen(false);
      router.push('/downloads');
    } catch {}
  };
  const availableFormats = video?.formats && video.formats.length > 0 ? video.formats : formats;
  if (loading) return <View style={styles.center}><ActivityIndicator color="#ff1744" size="large" /></View>;
  if (!video) return <View style={styles.center}><Text style={styles.error}>Video not found or unavailable.</Text></View>;
  return <View style={styles.root}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 35 }}>
    <View style={[styles.player, video.category === 'shorts' && styles.shortPlayer]}>{video.isLive && <View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveText}>LIVE</Text></View>}{stream ? <ExpoVideo source={{ uri: stream }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} useNativeControls /> : <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFillObject} />}</View>
    <View style={styles.body}><View style={styles.titleRow}><Text style={styles.title}>{video.title}</Text><Pressable onPress={() => setFormatOpen(true)} style={styles.downloadButton}><MaterialIcons name="download" size={22} color="#fff" /></Pressable></View>
    <Text style={styles.meta}>{video.channel} • {video.views} views • {video.published}</Text>
    <View style={styles.actions}><Action icon="download" label="Download" onPress={() => setFormatOpen(true)} /><Action icon={saved ? 'bookmark' : 'bookmark-border'} label={saved ? 'Saved' : 'Save'} onPress={async()=>setSaved(await library.toggleSaved(video))} /><Action icon="share" label="Share" onPress={()=>Share.share({ message: `${video.title}\n${video.sourceUrl ?? ''}` })} /></View>
    <Text style={styles.section}>Description</Text><Text style={styles.description}>{video.description ?? 'No description available.'}</Text>
    <View style={styles.quickRow}><Quick icon="playlist-play" text="Add to playlist" onPress={()=>router.push({pathname:'/playlists/add',params:{videoId:video.id}})}/><Quick icon="download-for-offline" text="Offline" onPress={() => setFormatOpen(true)}/><Quick icon="flag" text="Report" onPress={() => Share.share({ message: `Report: ${video.title}` })}/></View>
    </View></ScrollView><Pressable style={styles.back} onPress={() => router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff" /></Pressable>
    <Modal transparent visible={formatOpen} animationType="slide" onRequestClose={() => setFormatOpen(false)}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHead}><Text style={styles.sheetTitle}>Choose download format</Text><Pressable onPress={() => setFormatOpen(false)}><MaterialIcons name="close" size={24} color="#aaa" /></Pressable></View><ScrollView>{availableFormats.map(f => <Pressable key={f.id} style={styles.format} onPress={() => chooseDownload(f.id)}><View><Text style={styles.formatLabel}>{f.label}</Text><Text style={styles.formatSize}>{f.size}</Text></View><MaterialIcons name={f.kind === 'audio' ? 'audiotrack' : 'video-file'} size={24} color="#ff1744" /></Pressable>)}</ScrollView></View></View></Modal>
  </View>;
}
function Action({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) { return <Pressable style={styles.action} onPress={onPress}><MaterialIcons name={icon} size={22} color="#fff" /><Text style={styles.actionText}>{label}</Text></Pressable>; }
function Quick({ icon, text, onPress }: { icon: any; text: string; onPress?:()=>void }) { return <Pressable onPress={onPress} style={styles.quick}><MaterialIcons name={icon} size={19} color="#aaa"/><Text style={styles.quickText}>{text}</Text></Pressable>; }
const styles = StyleSheet.create({ root:{flex:1,backgroundColor:'#0b0b0d'},center:{flex:1,backgroundColor:'#0b0b0d',alignItems:'center',justifyContent:'center'},error:{color:'#fff'},player:{width:'100%',aspectRatio:16/9,backgroundColor:'#000'},shortPlayer:{aspectRatio:9/16},liveBadge:{position:'absolute',zIndex:3,left:14,bottom:14,backgroundColor:'#ff1744',borderRadius:8,paddingHorizontal:10,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:6},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:'#fff'},liveText:{color:'#fff',fontWeight:'900',fontSize:11},back:{position:'absolute',top:42,left:14,width:40,height:40,borderRadius:20,backgroundColor:'rgba(0,0,0,.6)',alignItems:'center',justifyContent:'center'},body:{padding:16},titleRow:{flexDirection:'row',gap:10,alignItems:'flex-start'},title:{color:'#fff',fontSize:20,fontWeight:'800',flex:1,lineHeight:27},downloadButton:{width:44,height:44,borderRadius:22,backgroundColor:'#ff1744',alignItems:'center',justifyContent:'center'},meta:{color:'#8f8f95',fontSize:12,marginTop:8},actions:{flexDirection:'row',justifyContent:'space-around',marginVertical:22,paddingVertical:13,backgroundColor:'#151518',borderRadius:15},action:{alignItems:'center',gap:5},actionText:{color:'#aaa',fontSize:11},section:{color:'#fff',fontWeight:'800',fontSize:15,marginBottom:7},description:{color:'#999',lineHeight:21},quickRow:{flexDirection:'row',gap:8,marginTop:22},quick:{flex:1,backgroundColor:'#151518',borderRadius:12,padding:12,alignItems:'center',gap:6},quickText:{color:'#888',fontSize:10},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.65)',justifyContent:'flex-end'},sheet:{maxHeight:'82%',backgroundColor:'#17171b',borderTopLeftRadius:22,borderTopRightRadius:22,padding:18,paddingBottom:30},sheetHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},sheetTitle:{color:'#fff',fontSize:18,fontWeight:'800'},format:{backgroundColor:'#202025',marginTop:9,borderRadius:14,padding:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},formatLabel:{color:'#fff',fontWeight:'700',fontSize:15},formatSize:{color:'#777',marginTop:3,fontSize:11}});
