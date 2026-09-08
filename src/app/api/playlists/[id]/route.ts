import {db,owner,body,tracks,name,failure} from "@/lib/server";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
 try{const {id}=await params;const {data,error}=await db().from("lp_playlists").select("*").eq("id",id).maybeSingle();
 if(error)throw new Error("Couldn't load this playlist.");
 if(!data||(data.visibility==="private"&&data.owner_hash!==await owner()))return failure(new Error("This playlist is private or no longer available."),404);
 const {owner_hash,...safe}=data;return Response.json({...safe,canEdit:owner_hash===await owner()},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return failure(e,503);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
 try {
 const input=await body(request);const hash=await owner();
 if(!hash)return failure(new Error("Only the playlist creator can edit this mix."),403);
 const {id}=await params;const queue=tracks(input.tracks);const title=name(input.name);
 if(!["private","link","public"].includes(input.visibility))throw new Error("Choose who can see your playlist.");
 const description=typeof input.description==="string"?input.description.trim():"";
 if(description.length>600)throw new Error("Keep your description under 600 characters.");
 const {data,error}=await db().from("lp_playlists").update({name:title,description,tracks:queue,visibility:input.visibility}).eq("id",id).eq("owner_hash",hash).select("id,name,description,visibility,tracks,created_at").maybeSingle();
 if(error)throw new Error("Couldn't save your changes. Please try again.");
 if(!data)return failure(new Error("Only the playlist creator can edit this mix."),403);
 return Response.json(data);
 }catch(e){return failure(e);}
}

