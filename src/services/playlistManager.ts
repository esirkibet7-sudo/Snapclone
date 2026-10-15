import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from '../types/video';

export type Playlist = { id:string; name:string; createdAt:number; updatedAt:number; items:Video[] };
const KEY='clone.playlists.v1';
async function read():Promise<Playlist[]> { const raw=await AsyncStorage.getItem(KEY); if(!raw)return []; try{return JSON.parse(raw)}catch{return []} }
async function write(v:Playlist[]){await AsyncStorage.setItem(KEY,JSON.stringify(v));}
export const playlistManager={
  list:read,
  async create(name:string){const n=name.trim(); if(!n) throw new Error('PLAYLIST_NAME_REQUIRED'); const now=Date.now(); const p={id:`pl-${now}`,name:n,createdAt:now,updatedAt:now,items:[]}; await write([p,...await read()]); return p;},
  async remove(id:string){await write((await read()).filter(p=>p.id!==id));},
  async addVideo(id:string,video:Video){const ps=await read(); const p=ps.find(x=>x.id===id); if(!p)throw new Error('PLAYLIST_NOT_FOUND'); if(!p.items.some(v=>v.id===video.id))p.items.unshift(video); p.updatedAt=Date.now(); await write(ps);},
  async removeVideo(id:string,videoId:string){const ps=await read(); const p=ps.find(x=>x.id===id); if(!p)return; p.items=p.items.filter(v=>v.id!==videoId); p.updatedAt=Date.now(); await write(ps);},
};
