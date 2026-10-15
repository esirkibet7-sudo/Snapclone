import * as FileSystem from 'expo-file-system/legacy';
import { DownloadItem } from './downloadManager';

export async function downloadToAppStorage(item:DownloadItem,onProgress?:(progress:number)=>void){
  if(!item.url) throw new Error('DOWNLOAD_URL_MISSING');
  const dir=FileSystem.documentDirectory+'downloads/';
  await FileSystem.makeDirectoryAsync(dir,{intermediates:true});
  const safeTitle=item.title.replace(/[^a-zA-Z0-9_\-]/g,'_').replace(/_+/g,'_').slice(0,50);
  const ext=item.type==='audio'?'mp3':'mp4';
  let target=`${dir}${safeTitle}.${ext}`;
  const existing=await FileSystem.getInfoAsync(target);
  if(existing.exists){
    target=`${dir}${safeTitle}_${Date.now()}.${ext}`;
  }
  const task=FileSystem.createDownloadResumable(item.url,target,{},p=>{
    const progress=p.totalBytesExpectedToWrite > 0 ? p.totalBytesWritten/p.totalBytesExpectedToWrite : 0;
    onProgress?.(progress);
  });
  const result=await task.downloadAsync();
  if(!result?.uri) throw new Error('DOWNLOAD_NO_FILE');
  return result.uri;
}
export async function deleteLocalFile(item:DownloadItem){if(item.localUri){try{await FileSystem.deleteAsync(item.localUri,{idempotent:true})}catch{}}}
export async function getLocalSize(uri:string){try{const i=await FileSystem.getInfoAsync(uri); return i.exists&&'size' in i?i.size:0}catch{return 0}}
