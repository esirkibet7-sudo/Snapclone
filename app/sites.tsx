import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supportedSites } from '../src/services/siteCatalog';

export default function Sites() {
  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff" /></Pressable>
      <Text style={styles.title}>Supported sites</Text>
      <Text style={styles.count}>{supportedSites.length}</Text>
    </View>
    <FlatList data={supportedSites} keyExtractor={(item) => item.url} contentContainerStyle={styles.list}
      renderItem={({item}) => <View style={styles.row}>
        <View style={styles.icon}><MaterialIcons name="public" size={20} color="#ff1744" /></View>
        <View style={styles.info}><Text style={styles.name}>{item.title}</Text><Text style={styles.url}>{item.url}</Text></View>
      </View>} />
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0b0b0d'},header:{height:70,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:14},title:{color:'#fff',fontSize:19,fontWeight:'800',flex:1},count:{color:'#777'},list:{padding:16,paddingBottom:30},row:{backgroundColor:'#151518',borderRadius:14,padding:13,marginBottom:8,flexDirection:'row',alignItems:'center',gap:12},icon:{width:40,height:40,borderRadius:12,backgroundColor:'#21161b',alignItems:'center',justifyContent:'center'},info:{flex:1},name:{color:'#eee',fontWeight:'700',fontSize:14},url:{color:'#666',fontSize:10,marginTop:4}});
