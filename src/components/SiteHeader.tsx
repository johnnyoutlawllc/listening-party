"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
export function SiteHeader() {
 const pathname = usePathname();
 return <header className="site-header">
 <Link href="/" className="brand" aria-label="Listening Party home"><span className="brand-icon"><Icon name="headphones" /></span><span>listening<span className="brand-light">party</span><span className="brand-period">.</span></span></Link>
 <nav aria-label="Main navigation">{[{href:"/",label:"Discover"},{href:"/room",label:"Live rooms"},{href:"/playlists",label:"My playlists"},{href:"/library",label:"Track library"}].map(link=><Link key={link.href} href={link.href} aria-current={pathname===link.href?"page":undefined} className={pathname===link.href?"nav-active":""}>{link.label}</Link>)}</nav>
 <Link href="/build" className="button primary header-build"><Icon name="plus"/><span>Build a Playlist</span></Link></header>;
}
