import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='clone.notification.events.v1';
export type DownloadEvent={id:string;title:string;status:'started'|'completed'|'failed';at:number};
export async function recordDownloadEvent(e:DownloadEvent){const raw=await AsyncStorage.getItem(KEY);const list:DownloadEvent[]=raw?JSON.parse(raw):[];await AsyncStorage.setItem(KEY,JSON.stringify([e,...list].slice(0,100)));}
export async function listDownloadEvents(){const raw=await AsyncStorage.getItem(KEY);return raw?JSON.parse(raw) as DownloadEvent[]:[];}
