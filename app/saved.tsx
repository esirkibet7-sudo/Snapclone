import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { VideoCard } from '../src/components/VideoCard';
import { library } from '../src/services/library';
import { Video } from '../src/types/video';
export default function Saved() { const [items,setItems]=useState<Video[]>([]); const load=useCallback(async()=>setItems(await library.saved()),[]); useFocusEffect(useCallback(()=>{load()},[load])); return <View style={styles.root}><View style={styles.header}><Pressable onPress={()=>router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff"/></Pressable><Text style={styles.title}>Saved</Text><View style={{width:25}}/></View><ScrollView contentContainerStyle={styles.content}>{items.length?items.map(v=><VideoCard key={v.id} video={v} onPress={()=>router.push({pathname:'/video/[id]',params:{id:v.id}})}/>):<View style={styles.empty}><MaterialIcons name="bookmark-border" size={45} color="#444"/><Text style={styles.emptyText}>Saved videos will appear here.</Text></View>}</ScrollView></View> }
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0b0b0d'},header:{height:70,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{color:'#fff',fontSize:19,fontWeight:'800'},content:{padding:16,paddingBottom:35},empty:{paddingTop:100,alignItems:'center',gap:12},emptyText:{color:'#777'}});
