import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { BottomNav } from './home';
import { AppSettings, defaultSettings, library } from '../src/services/library';
import { updateService } from '../src/services/updates';
import { EsirEasterEggModal } from '../src/components/EsirEasterEggModal';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [showcaseVisible, setShowcaseVisible] = useState(false);
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);

  useFocusEffect(useCallback(() => { library.settings().then(setSettings); }, []));
  const update = async (patch: Partial<AppSettings>) => setSettings(await library.updateSettings(patch));

  const handleAboutTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 2500) {
      tapCount.current += 1;
      if (tapCount.current >= 5) {
        tapCount.current = 0;
        lastTapTime.current = 0;
        setPinModalVisible(true);
      } else {
        lastTapTime.current = now;
      }
    } else {
      tapCount.current = 1;
      lastTapTime.current = now;
    }
  };

  return <View style={styles.root}><View style={styles.header}><Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={25} color="#fff" /></Pressable><Text style={styles.title}>Settings</Text><View style={{ width: 25 }} /></View><ScrollView contentContainerStyle={styles.content}>
    <Section title="Downloads"><Setting icon="wifi" title="Download on Wi-Fi only" subtitle="Avoid mobile-data downloads" control={<Switch value={settings.wifiOnly} onValueChange={v=>update({wifiOnly:v})} trackColor={{false:'#333',true:'#7a1b2e'}} thumbColor={settings.wifiOnly?'#ff1744':'#888'}/>} /><Setting icon="high-quality" title="Default video quality" subtitle={settings.defaultVideoQuality} onPress={()=>Alert.alert('Video quality','Choose default', ['360p','720p','1080p'].map(x=>({text:x,onPress:()=>update({defaultVideoQuality:x as AppSettings['defaultVideoQuality']})})).concat([{text:'Cancel',style:'cancel'}] as any))} /><Setting icon="audiotrack" title="Default audio quality" subtitle={settings.defaultAudioQuality} onPress={()=>Alert.alert('Audio quality','Choose default', ['128kbps','192kbps','320kbps'].map(x=>({text:x,onPress:()=>update({defaultAudioQuality:x as AppSettings['defaultAudioQuality']})})).concat([{text:'Cancel',style:'cancel'}] as any))} /></Section>
    <Section title="Playback"><Setting icon="play-circle" title="Background playback" subtitle="Keep audio playing outside the player" control={<Switch value={settings.backgroundPlayback} onValueChange={v=>update({backgroundPlayback:v})} trackColor={{false:'#333',true:'#7a1b2e'}} thumbColor={settings.backgroundPlayback?'#ff1744':'#888'}/>} /><Setting icon="dark-mode" title="Night mode" subtitle="Use the dark interface" control={<Switch value={settings.nightMode} onValueChange={v=>update({nightMode:v})} trackColor={{false:'#333',true:'#7a1b2e'}} thumbColor={settings.nightMode?'#ff1744':'#888'}/>} /></Section>
    <Section title="Smart download"><Setting icon="link" title="Auto-detect links" subtitle="Allow the app to react to supported shared links" control={<Switch value={settings.autoDetectLinks} onValueChange={v=>update({autoDetectLinks:v})} trackColor={{false:'#333',true:'#7a1b2e'}} thumbColor={settings.autoDetectLinks?'#ff1744':'#888'}/>} /><Setting icon="folder" title="Download location" subtitle="Device Downloads/KenyaTube" onPress={()=>Alert.alert('Download location','Folder selection will be exposed by the native Android downloader.')} /></Section>
    <Section title="Notifications"><Setting icon="notifications" title="Download notifications" subtitle="Show progress and completion" control={<Switch value={settings.notifications} onValueChange={v=>update({notifications:v})} trackColor={{false:'#333',true:'#7a1b2e'}} thumbColor={settings.notifications?'#ff1744':'#888'}/>} /></Section>
    <Section title="Library"><Setting icon="history" title="Watch history" subtitle="Recently opened videos" onPress={()=>router.push('/history')} /><Setting icon="bookmark" title="Saved" subtitle="Your saved videos" onPress={()=>router.push('/saved')} /></Section>
    <Section title="About"><Setting icon="system-update" title="Check for updates" subtitle="Get the latest version and improvements" onPress={()=>updateService.checkAndApplyUpdate(true)} /><Setting icon="info-outline" title="About" subtitle="Provider-ready media client" onPress={handleAboutTap} /><Setting icon="description" title="Provider contract" subtitle="Connect your permitted source through src/services/provider.ts" /></Section>
  </ScrollView>
  <BottomNav active="settings" />
  <EsirEasterEggModal
    pinModalVisible={pinModalVisible}
    onClosePinModal={() => setPinModalVisible(false)}
    showcaseVisible={showcaseVisible}
    onCloseShowcase={() => setShowcaseVisible(false)}
    onCorrectPin={() => {
      setPinModalVisible(false);
      setTimeout(() => setShowcaseVisible(true), 250);
    }}
  />
  </View>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>}
function Setting({icon,title,subtitle,control,onPress}:{icon:any;title:string;subtitle:string;control?:React.ReactNode;onPress?:()=>void}){return <Pressable onPress={onPress} style={styles.setting}><View style={styles.icon}><MaterialIcons name={icon} size={21} color="#ff1744"/></View><View style={styles.settingInfo}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>{control??<MaterialIcons name="chevron-right" size={23} color="#666"/>}</Pressable>}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0b0b0d'},header:{height:70,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{color:'#fff',fontSize:19,fontWeight:'800'},content:{padding:16,paddingBottom:100},section:{marginBottom:22},sectionTitle:{color:'#777',fontSize:12,fontWeight:'800',textTransform:'uppercase',letterSpacing:1,marginBottom:8},setting:{minHeight:68,backgroundColor:'#151518',borderRadius:14,padding:12,marginBottom:7,flexDirection:'row',alignItems:'center',gap:12},icon:{width:40,height:40,borderRadius:12,backgroundColor:'#21161b',alignItems:'center',justifyContent:'center'},settingInfo:{flex:1},settingTitle:{color:'#eee',fontWeight:'700',fontSize:13},subtitle:{color:'#666',fontSize:10,marginTop:4}});
