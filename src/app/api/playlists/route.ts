import {db,owner,body,tracks,name,failure} from "@/lib/server";
const columns="id,name,description,visibility,tracks,created_at";
export async function GET(request:Request) {
 try{
 let query=db().from("lp_playlists").select(columns).order("created_at",{ascending:false}).limit(100);
 if(new URL(request.url).searchParams.get("mine")==="1"){const hash=await owner();if(!hash)return Response.json([]);query=query.eq("owner_hash",hash);}else query=query.eq("visibility","public");
 const {data,error}=await query;if(error)throw new Error("Couldn't load shared playlists. Please try again.");
 return Response.json(data,{headers:{"Cache-Control":"no-store"}});
 }catch(e){return failure(e,503);}
}
export async function POST(request:Request) {
 try{
 const input=await body(request);const title=name(input.name);const queue=tracks(input.tracks);
 if(!["private","link","public"].includes(input.visibility))throw new Error("Choose who can see your playlist.");
 const description=typeof input.description==="string"?input.description.trim():"";
 if(description.length>600)throw new Error("Keep your description under 600 characters.");
 const hash=await owner(true);
 const client=db();const {count,error:countError}=await client.from("lp_playlists").select("id",{count:"exact",head:true}).eq("owner_hash",hash!);
 if(countError)throw new Error("Couldn't save your playlist. Please try again.");
 if((count??0)>=50)return failure(new Error("You've reached the 50-playlist limit for this browser."),429);
 const {data,error}=await client.from("lp_playlists").insert({owner_hash:hash,name:title,description,tracks:queue,visibility:input.visibility}).select(columns).single();
 if(error)throw new Error("Couldn't save your playlist. Your draft is still here.");
 return Response.json(data,{status:201});
 }catch(e){return failure(e);}
}

