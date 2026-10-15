import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { contentProvider } from '../src/services/provider';
import { Video } from '../src/types/video';
import { VideoCard } from '../src/components/VideoCard';
export default function Music(){const [items,setItems]=useState<Video[]>([]);useEffect(()=>{contentProvider.home('music').then(setItems).catch(()=>setItems([]))},[]);return <View style={styles.root}><View style={styles.header}><Pressable onPress={()=>router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff"/></Pressable><Text style={styles.title}>Music</Text><Pressable onPress={()=>router.push('/downloads')}><MaterialIcons name="library-music" size={23} color="#aaa"/></Pressable></View><ScrollView contentContainerStyle={styles.content}><View style={styles.hero}><MaterialIcons name="music-note" size={40} color="#ff1744"/><Text style={styles.heroTitle}>Music for offline listening</Text><Text style={styles.heroText}>Search, preview and save audio using your permitted provider.</Text></View>{items.map(v=><VideoCard key={v.id} video={v} onPress={()=>router.push({pathname:'/video/[id]',params:{id:v.id}})}/>)}</ScrollView></View>}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0b0b0d'},header:{height:70,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{color:'#fff',fontSize:19,fontWeight:'800'},content:{padding:16,paddingBottom:35},hero:{backgroundColor:'#17171b',borderRadius:18,padding:20,marginBottom:18},heroTitle:{color:'#fff',fontSize:20,fontWeight:'800',marginTop:10},heroText:{color:'#777',marginTop:7,lineHeight:20}});
