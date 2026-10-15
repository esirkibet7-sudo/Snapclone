import { Audio, AVPlaybackStatus } from 'expo-av';

let sound: Audio.Sound | null = null;
export async function configureBackgroundAudio(){
  await Audio.setAudioModeAsync({ playsInSilentModeIOS:true, staysActiveInBackground:true, shouldDuckAndroid:true, playThroughEarpieceAndroid:false });
}
export async function playAudio(uri:string,onStatus?:(s:AVPlaybackStatus)=>void){
  await configureBackgroundAudio();
  if(sound){await sound.unloadAsync(); sound=null;}
  const result=await Audio.Sound.createAsync({uri},{shouldPlay:true,progressUpdateIntervalMillis:500},onStatus);
  sound=result.sound;
  return sound;
}
export async function pauseAudio(){if(sound)await sound.pauseAsync();}
export async function resumeAudio(){if(sound)await sound.playAsync();}
export async function stopAudio(){if(sound){await sound.stopAsync();await sound.unloadAsync();sound=null;}}
export async function setAudioVolume(v:number){if(sound)await sound.setVolumeAsync(v);}
