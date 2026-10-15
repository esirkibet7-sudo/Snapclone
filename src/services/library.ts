import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from '../types/video';
const HISTORY_KEY='clone.history.v2'; const SAVED_KEY='clone.saved.v2'; const SETTINGS_KEY='clone.settings.v2';
async function read<T>(key:string,fallback:T):Promise<T>{const raw=await AsyncStorage.getItem(key);if(!raw)return fallback;try{return JSON.parse(raw) as T}catch{return fallback}}
export type AppSettings={wifiOnly:boolean;notifications:boolean;backgroundPlayback:boolean;nightMode:boolean;autoDetectLinks:boolean;defaultVideoQuality:'360p'|'720p'|'1080p';defaultAudioQuality:'128kbps'|'192kbps'|'320kbps'};
export const defaultSettings:AppSettings={wifiOnly:true,notifications:true,backgroundPlayback:true,nightMode:true,autoDetectLinks:true,defaultVideoQuality:'720p',defaultAudioQuality:'192kbps'};
export const library={
 async history(){return read<Video[]>(HISTORY_KEY,[])}, async addHistory(video:Video){const c=await this.history();await AsyncStorage.setItem(HISTORY_KEY,JSON.stringify([video,...c.filter(v=>v.id!==video.id)].slice(0,100)))}, async clearHistory(){await AsyncStorage.removeItem(HISTORY_KEY)},
 async saved(){return read<Video[]>(SAVED_KEY,[])}, async isSaved(id:string){return (await this.saved()).some(v=>v.id===id)}, async toggleSaved(video:Video){const c=await this.saved();const exists=c.some(v=>v.id===video.id);const n=exists?c.filter(v=>v.id!==video.id):[video,...c];await AsyncStorage.setItem(SAVED_KEY,JSON.stringify(n));return !exists},
 async settings(){return {...defaultSettings,...await read<Partial<AppSettings>>(SETTINGS_KEY,{})}}, async updateSettings(p:Partial<AppSettings>){const n={...(await this.settings()),...p};await AsyncStorage.setItem(SETTINGS_KEY,JSON.stringify(n));return n}
};
