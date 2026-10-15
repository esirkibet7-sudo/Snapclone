import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { snaptubeKeyGuides, snaptubeRasterAssets, snaptubeResourceCount, snaptubeRasterCount, snaptubeAssetCount } from '../src/services/snaptubeResources';

export default function SnapTubeResources() {
  const raster = useMemo(() => Object.entries(snaptubeRasterAssets).slice(0, 48), []);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff" /></Pressable>
        <Text style={styles.title}>APK Resources</Text>
        <View style={{ width: 25 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stats}>
          <Stat value={snaptubeResourceCount} label="bundled resources" />
          <Stat value={snaptubeRasterCount} label="raster assets" />
          <Stat value={snaptubeAssetCount} label="APK assets" />
        </View>
        <Text style={styles.heading}>Original guide resources</Text>
        <View style={styles.guides}>
          <View style={styles.guide}><Image source={snaptubeKeyGuides.playerGuide} style={styles.guideImage} resizeMode="contain" /><Text style={styles.caption}>Player/action guide</Text></View>
          <View style={styles.guide}><Image source={snaptubeKeyGuides.gestureGuide} style={styles.guideImage} resizeMode="contain" /><Text style={styles.caption}>Gesture guide</Text></View>
        </View>
        <Text style={styles.heading}>Bundled APK artwork</Text>
        <Text style={styles.note}>The full resource pack is included in the project. This gallery previews the bundled raster set; the generated resource registry keeps every imported asset addressable from TypeScript.</Text>
        <View style={styles.grid}>{raster.map(([key, source]) => <View key={key} style={styles.tile}><Image source={source} style={styles.thumb} resizeMode="contain" /></View>)}</View>
      </ScrollView>
    </View>
  );
}
function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b0d' },
  header: { height: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 19, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: '#151518', borderRadius: 14, padding: 14 },
  statValue: { color: '#ff1744', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#777', fontSize: 10, marginTop: 3 },
  heading: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  note: { color: '#777', fontSize: 11, lineHeight: 17, marginBottom: 14 },
  guides: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  guide: { flex: 1, backgroundColor: '#151518', borderRadius: 14, padding: 8 },
  guideImage: { width: '100%', height: 130 },
  caption: { color: '#999', fontSize: 10, marginTop: 6, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.8%', aspectRatio: 1, backgroundColor: '#151518', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumb: { width: '90%', height: '90%' },
});
