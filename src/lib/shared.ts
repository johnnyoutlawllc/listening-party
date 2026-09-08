import type {MediaItem,Playlist} from "./store";
export type SharedPlaylist={id:string;name:string;description:string;visibility:Playlist["visibility"];tracks:MediaItem[];created_at:string};
export type LiveRoom={id:string;name:string;tracks:MediaItem[];track_index:number;active:boolean;updated_at:string;position:number;playing:boolean;isHost?:boolean};
export function asPlaylist(p:SharedPlaylist):Playlist{return {id:p.id,name:p.name,description:p.description,visibility:p.visibility,itemIds:p.tracks.map(t=>t.id),createdAt:p.created_at,updatedAt:p.created_at};}
export async function requestJson<T>(url:string,options?:RequestInit):Promise<T>{
 const res=await fetch(url,{...options,headers:{"Content-Type":"application/json",...options?.headers}});
 const data=await res.json();
 if(!res.ok)throw new Error(data.error||"Couldn't connect. Please try again.");
 return data;
}

