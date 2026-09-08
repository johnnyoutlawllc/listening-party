import {db,owner,body,name,tracks,failure} from "@/lib/server";
const columns="id,name,tracks,track_index,active,updated_at,position,playing";
export async function GET(){
 try{const {data,error}=await db().from("lp_rooms").select(columns).eq("active",true).gte("updated_at",new Date(Date.now()-60000).toISOString()).order("updated_at",{ascending:false}).limit(30);
 if(error)throw new Error("Couldn't load live rooms. Please try again.");
 return Response.json(data,{headers:{"Cache-Control":"no-store"}});
 }catch(e){return failure(e,503);}
}
export async function POST(request:Request){
 try{const input=await body(request);const hash=await owner(true);
 const {data,error}=await db().from("lp_rooms").upsert({owner_hash:hash,name:name(input.name),tracks:tracks(input.tracks),track_index:0,active:true,position:0,playing:false,updated_at:new Date().toISOString()},{onConflict:"owner_hash"}).select(columns).single();
 if(error)throw new Error("Couldn't start your room. Please try again.");
 return Response.json({...data,isHost:true},{status:201});
 }catch(e){return failure(e);}
}

