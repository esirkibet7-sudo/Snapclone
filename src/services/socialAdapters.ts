import { ProviderLinkResult } from '../types/video';

export type SocialSource='youtube'|'tiktok'|'instagram'|'facebook'|'twitter'|'soundcloud'|'whatsapp'|'unknown';
const rules:Array<[SocialSource,RegExp]>= [
 ['youtube',/(youtube\.com|youtu\.be)/i],['tiktok',/tiktok\.com/i],['instagram',/instagram\.com/i],['facebook',/(facebook\.com|fb\.watch)/i],['twitter',/(twitter\.com|x\.com)/i],['soundcloud',/soundcloud\.com/i],['whatsapp',/whatsapp\.com/i]
];
export function detectSocialSource(url:string):SocialSource{return rules.find(([,r])=>r.test(url))?.[0]??'unknown';}
export async function resolveThroughProvider(url:string,resolve:(url:string)=>Promise<ProviderLinkResult>){return resolve(url)}
