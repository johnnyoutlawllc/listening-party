import {db,owner,body,failure} from "@/lib/server";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;const {data,error}=await db().from("lp_rooms").select("*").eq("id",id).maybeSingle();
 if(error)throw new Error("Couldn't load this room.");
 if(!data||!data.active||Date.parse(data.updated_at)<Date.now()-60000)return failure(new Error("This room has ended. Find another session on Discover."),404);
 const {owner_hash,...safe}=data;return Response.json({...safe,isHost:owner_hash===await owner()},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return failure(e,503);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{const input=await body(request);const hash=await owner();if(!hash)return failure(new Error("Only the host can control this room."),403);
 const {id}=await params;const client=db();const {data:room,error:readError}=await client.from("lp_rooms").select("tracks").eq("id",id).eq("owner_hash",hash).maybeSingle();
 if(readError||!room)return failure(new Error("Only the host can control this room."),403);
 if(!Number.isInteger(input.track_index)||input.track_index<0||input.track_index>=room.tracks.length||!Number.isFinite(input.position)||input.position<0||input.position>86400||typeof input.playing!=="boolean"||typeof input.active!=="boolean")throw new Error("Invalid playback update.");
 const {error}=await client.from("lp_rooms").update({track_index:input.track_index,position:input.position,playing:input.playing,active:input.active,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_hash",hash);
 if(error)throw new Error("The room couldn't reconnect. Please try again.");
 return Response.json({ok:true});
 }catch(e){return failure(e);}
}

