import {createClient} from "@supabase/supabase-js";
import {cookies} from "next/headers";
import {createHash,randomBytes} from "node:crypto";
import type {MediaItem} from "./store";
export function db() {
 const url=process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error("The shared music service is unavailable. Please try again shortly.");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function owner(create=false) {
 const jar=await cookies();
 let token=jar.get("lp_owner")?.value;
 if(!token&&create){token=randomBytes(32).toString("hex");jar.set("lp_owner",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",maxAge:31536000,path:"/"});}
 return token?createHash("sha256").update(token).digest("hex"):null;
}
export function checkOrigin(request:Request) {
 const origin=request.headers.get("origin");
 if(origin && origin!==new URL(request.url).origin) throw new Error("This request must come from Listening Party.");
}
export async function body(request:Request) {
 checkOrigin(request);
 const raw=await request.text();
 if(raw.length>180000) throw new Error("This mix is too large. Please keep it under 200 tracks.");
 return JSON.parse(raw);
}
export function tracks(input:unknown):MediaItem[] {
 if(!Array.isArray(input)||input.length<1||input.length>200)throw new Error("Choose between 1 and 200 tracks.");
 const seen=new Set<string>();
 return input.map(i=>{
 if(!i||typeof i.youtubeId!=="string"||!/^[-_a-zA-Z0-9]{11}$/.test(i.youtubeId)||typeof i.title!=="string"||!i.title.trim()||i.title.length>300||seen.has(i.youtubeId))throw new Error("Check your track titles and remove duplicates.");
 seen.add(i.youtubeId);
 return {id:i.youtubeId,youtubeId:i.youtubeId,title:i.title.trim(),channelTitle:typeof i.channelTitle==="string"?i.channelTitle.slice(0,150):"",thumbUrl:`https://i.ytimg.com/vi/${i.youtubeId}/hqdefault.jpg`,addedAt:new Date().toISOString()};
 });
}
export function name(input:unknown) {if(typeof input!=="string"||!input.trim()||input.trim().length>100)throw new Error("Give your mix a name of 100 characters or fewer.");return input.trim();}
export function failure(error:unknown,status=400) {return Response.json({error:error instanceof Error?error.message:"Something went wrong. Please try again."},{status});}

