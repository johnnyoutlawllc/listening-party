"use client";
import {Suspense,useEffect,useRef,useState} from "react";
import {useSearchParams,useRouter} from "next/navigation";
import Link from "next/link";
import {Cover} from "@/components/Cover";
import {Icon} from "@/components/Icon";
import {LiveRooms} from "@/components/LiveRooms";
import {YouTubePlayer} from "@/components/YouTubePlayer";
import {importSufferingJukeboxSeed,loadLibrary,loadPlaylists,type MediaItem,type Playlist} from "@/lib/store";
import {requestJson,asPlaylist,type SharedPlaylist,type LiveRoom} from "@/lib/shared";
function RoomInner(){
 const params=useSearchParams();const router=useRouter();const liveId=params.get("live");const playlistId=params.get("playlist");
 const [lists,setLists]=useState<Playlist[]>([]);const [library,setLibrary]=useState<MediaItem[]>([]);
 const [selected,setSelected]=useState("");const [room,setRoom]=useState<LiveRoom|null>(null);
 const [index,setIndex]=useState(0);const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 const [roomName,setRoomName]=useState("");const playback=useRef({position:0,playing:false});const hostState=useRef({index:0,host:false});const stopping=useRef(false);
 useEffect(()=>{hostState.current={index,host:!!room?.isHost};},[index,room?.isHost]);
 useEffect(()=>{importSufferingJukeboxSeed();setLists(loadPlaylists());setLibrary(loadLibrary());setSelected(playlistId||loadPlaylists()[0]?.id||"");
 if(playlistId&&!playlistId.startsWith("sjpl_")&&!playlistId.startsWith("pl_")){let cancelled=false;requestJson<SharedPlaylist>("/api/playlists/"+playlistId).then(p=>{if(cancelled)return;setLists(prev=>[asPlaylist(p),...prev.filter(l=>l.id!==p.id)]);setLibrary(prev=>[...p.tracks,...prev.filter(t=>!p.tracks.some(x=>x.id===t.id))]);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};}},[playlistId]);
 useEffect(()=>{if(!liveId)return;let cancelled=false;stopping.current=false;
 async function refresh(){try{const data=await requestJson<LiveRoom>("/api/rooms/"+liveId);if(!cancelled){setRoom(data);if(!data.isHost)setIndex(data.track_index);else if(!hostState.current.host)setIndex(data.track_index);setError("");}}
 catch(e){if(!cancelled){setRoom(null);setError(e instanceof Error?e.message:"This room is unavailable.");}}}
 refresh();const timer=setInterval(async()=>{if(stopping.current)return;if(hostState.current.host){try{await requestJson("/api/rooms/"+liveId,{method:"PATCH",body:JSON.stringify({track_index:hostState.current.index,...playback.current,active:true})});if(!cancelled)setError("");}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Connection lost.");}}else await refresh();},5000);
 return()=>{cancelled=true;clearInterval(timer);};
 },[liveId]);
 const playlist=lists.find(p=>p.id===selected);const byId=new Map(library.map(t=>[t.id,t]));
 const queue=room?room.tracks:playlist?playlist.itemIds.map(id=>byId.get(id)).filter((t):t is MediaItem=>!!t):[];
 const current=queue[index];const host=!!room?.isHost;
 function changeTrack(i:number){setIndex(i);playback.current={position:0,playing:true};}
 async function goLive(){setBusy(true);setError("");try{const created=await requestJson<LiveRoom>("/api/rooms",{method:"POST",body:JSON.stringify({name:roomName.trim()||playlist?.name,tracks:queue})});setRoom(created);setIndex(0);router.push("/room?live="+created.id);}catch(e){setError(e instanceof Error?e.message:"Couldn't start your room.");}finally{setBusy(false);}}
 async function end(){if(!room)return;setBusy(true);stopping.current=true;try{await requestJson("/api/rooms/"+room.id,{method:"PATCH",body:JSON.stringify({track_index:index,...playback.current,active:false})});setRoom(null);hostState.current.host=false;router.push("/room");}catch(e){stopping.current=false;setError(e instanceof Error?e.message:"Couldn't end the room.");}finally{setBusy(false);}}
 async function share(){try{await navigator.clipboard.writeText(window.location.href);setNotice("Room link copied. Send it to your people.");}catch{setNotice("Copy this page's address to invite someone.");}}
 return <div className="page-shell"><Link href="/" className="back-link"><Icon name="back"/>Back to Discover</Link><div className="page-intro"><div><p className="eyebrow"><Icon name="radio"/>{room?"ON AIR":"EVERY GOOD MIX DESERVES AN AUDIENCE"}</p><h1>{room?room.name:"Bring your people. Press play."}</h1><p className="intro-copy">{room?host?"You're the host. Set the pace, change the track, make their night.":"You're tuned in. Tap Join audio to follow the host.":"Choose a playlist and broadcast a listening room anyone can join."}</p></div>{room&&<span className="live-badge"><span className="tiny-dot"/>LIVE NOW</span>}</div>
 {error&&<p className="message" role="alert">{error}</p>}{notice&&<p className="message success-message" role="status">{notice}</p>}
 {liveId&&!room?<div className="empty-state"><Icon name="radio"/><h2>{error?"This session is off air.":"Finding the frequency…"}</h2><Link href="/room" className="button secondary" style={{marginTop:20}}>Start your own room</Link></div>:<div className="room-layout"><section><div className="panel">
 {!room&&<><h2>Your room, your soundtrack.</h2><label className="field">Choose a playlist<select className="room-select" value={selected} onChange={e=>{setSelected(e.target.value);setIndex(0);}}>{lists.map(p=><option value={p.id} key={p.id}>{p.name} · {p.itemIds.length} tracks</option>)}</select></label><label className="field">Room name<input maxLength={100} value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder={playlist?.name||"A little after-hours listening"}/></label><p className="room-note">Going live makes this room and its tracklist public, even if the original playlist is private. Keep this tab open to stay on air.</p><button className="button primary" disabled={!queue.length||busy} onClick={goLive}><Icon name="radio"/>{busy?"Going live…":"Go live"}</button></>}
 {room&&<div className="button-row"><button className="button secondary" onClick={share}>Invite with a link <Icon name="arrow"/></button>{host?<button className="button secondary" disabled={busy} onClick={end}>End broadcast</button>:<Link href="/" className="button secondary">Leave room</Link>}</div>}
 </div>{current&&<div style={{marginTop:24}}><YouTubePlayer videoId={current.youtubeId} onProgress={host?(position,playing)=>{playback.current={position,playing};}:undefined} onEnded={host||!room?()=>{if(index<queue.length-1)changeTrack(index+1);}:undefined} sync={room&&!host?{position:room.position,playing:room.playing,updatedAt:room.updated_at}:undefined}/><p className="help">{current.title}</p>{(!room||host)&&<div className="button-row" style={{marginTop:15}}><button className="button secondary" disabled={index===0} onClick={()=>changeTrack(index-1)}>Previous</button><button className="button secondary" disabled={index>=queue.length-1} onClick={()=>changeTrack(index+1)}>Next track <Icon name="arrow"/></button></div>}</div>}</section>
 <aside className="panel"><div className="section-heading"><h2>Up next <span className="count">{queue.length}</span></h2><Icon name="music"/></div><ul className="track-list track-scroll">{queue.map((t,i)=><li key={t.id} className="track-row"><span className="track-number">{i===index?<Icon name="music"/>:i+1}</span><Cover name={t.title} items={[t]}/><div className="track-info"><h3>{t.title}</h3><p>{i===index?"Now playing":t.channelTitle||"YouTube"}</p></div>{(!room||host)&&<button className="icon-button" aria-label={`Play ${t.title}`} onClick={()=>changeTrack(i)}><Icon name="play"/></button>}</li>)}</ul>{!queue.length&&<p className="help">No tracks yet. <Link href="/build">Build a playlist to get started.</Link></p>}</aside></div>}
 {!room&&<LiveRooms/>}<footer className="site-footer"><span>Good music travels better together.</span><Link href="/build" className="text-link">Build your next playlist <Icon name="plus"/></Link></footer></div>;
}
export default function RoomPage(){return <Suspense fallback={<div className="flow-shell">Tuning in…</div>}><RoomInner/></Suspense>;}

