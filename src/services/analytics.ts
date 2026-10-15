import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='clone.analytics.v1';
export type AnalyticsEvent={name:string;params?:Record<string,string|number|boolean>;at:number};
export async function track(name:string,params?:AnalyticsEvent['params']){const raw=await AsyncStorage.getItem(KEY);const list:AnalyticsEvent[]=raw?JSON.parse(raw):[];await AsyncStorage.setItem(KEY,JSON.stringify([{name,params,at:Date.now()},...list].slice(0,500)));}
export async function analyticsEvents(){const raw=await AsyncStorage.getItem(KEY);return raw?JSON.parse(raw) as AnalyticsEvent[]:[];}
