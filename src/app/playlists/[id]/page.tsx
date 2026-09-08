import {PlaylistDetail} from "@/components/PlaylistDetail";
export default async function PlaylistPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <PlaylistDetail id={id}/>;}
