"use client";
import {useEffect,useRef,useState} from "react";
type Player={destroy():void;loadVideoById(options:{videoId:string;startSeconds?:number}):void;cueVideoById(options:{videoId:string;startSeconds?:number}):void;playVideo():void;pauseVideo():void;seekTo(n:number,allow:boolean):void;getCurrentTime():number;getPlayerState():number};
type Api={Player:new(el:HTMLElement,options:Record<string,unknown>)=>Player};
declare global{interface Window{YT?:Api;onYouTubeIframeAPIReady?:()=>void}}
let apiPromise:Promise<Api>|undefined;
function loadApi():Promise<Api>{
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
 const previous=window.onYouTubeIframeAPIReady;
 const timeout=window.setTimeout(()=>{apiPromise=undefined;reject(new Error("YouTube couldn't load. Check your connection or browser privacy settings."));},15000);
 window.onYouTubeIframeAPIReady=()=>{previous?.();if(window.YT){clearTimeout(timeout);resolve(window.YT);}};
 const script=document.createElement("script");script.src="https://www.youtube.com/iframe_api";script.async=true;script.onerror=()=>{clearTimeout(timeout);apiPromise=undefined;reject(new Error("YouTube couldn't load."));};document.head.appendChild(script);
 });return apiPromise;
}
export function YouTubePlayer({videoId,onProgress,onEnded,sync}:{videoId:string;onProgress?:(position:number,playing:boolean)=>void;onEnded?:()=>void;sync?:{position:number;playing:boolean;updatedAt:string}}){
 const holder=useRef<HTMLDivElement>(null);const player=useRef<Player|null>(null);
 const progress=useRef(onProgress);const ended=useRef(onEnded);const latestVideo=useRef(videoId);
 const [ready,setReady]=useState(false);const [error,setError]=useState("");const [joined,setJoined]=useState(false);
 useEffect(()=>{progress.current=onProgress;ended.current=onEnded;},[onProgress,onEnded]);
 useEffect(()=>{latestVideo.current=videoId;},[videoId]);
 useEffect(()=>{let disposed=false;let instance:Player|null=null;
 loadApi().then(api=>{if(disposed||!holder.current)return;const target=document.createElement("div");holder.current.appendChild(target);
 instance=new api.Player(target,{width:"100%",height:"100%",videoId:latestVideo.current,playerVars:{rel:0,playsinline:1,origin:window.location.origin},events:{onReady:()=>{if(!disposed)setReady(true);},onStateChange:(e:{data:number})=>{if(e.data===0)ended.current?.();},onError:()=>setError("This video can't play here. Try the next track or open it on YouTube.")}});player.current=instance;
 }).catch(e=>{if(!disposed)setError(e.message);});
 const timer=setInterval(()=>{if(player.current?.getCurrentTime)progress.current?.(player.current.getCurrentTime(),player.current.getPlayerState()===1);},1000);
 return()=>{disposed=true;clearInterval(timer);instance?.destroy();player.current=null;};
 },[]);
 const previousVideo=useRef(videoId);
 useEffect(()=>{if(!ready||!player.current)return;if(videoId!==previousVideo.current){previousVideo.current=videoId;setError("");if(!sync||joined)player.current.loadVideoById({videoId});else player.current.cueVideoById({videoId});}},[videoId,ready,sync,joined]);
 useEffect(()=>{if(!ready||!sync||!joined||!player.current)return;
 const target=sync.position+(sync.playing?Math.max(0,(Date.now()-Date.parse(sync.updatedAt))/1000):0);
 if(Math.abs(player.current.getCurrentTime()-target)>4)player.current.seekTo(target,true);
 if(sync.playing&&player.current.getPlayerState()!==1)player.current.playVideo();
 if(!sync.playing&&player.current.getPlayerState()===1)player.current.pauseVideo();
 },[sync,joined,ready]);
 return <><div className="player"><div className="youtube-mount" ref={holder}/></div>{sync&&!joined&&<button className="button primary" disabled={!ready} onClick={()=>{setJoined(true);player.current?.playVideo();}}>Join audio</button>}{error&&<p className="message" role="alert">{error} <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">Open YouTube ↗</a></p>}</>;
}
