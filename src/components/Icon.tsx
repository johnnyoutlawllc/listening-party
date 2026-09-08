import type { CSSProperties, ReactNode } from "react";
export type IconName="headphones"|"plus"|"arrow"|"play"|"search"|"radio"|"music"|"close"|"check"|"youtube"|"back"|"up"|"down"|"globe";
const paths: Record<IconName,ReactNode>={
headphones:<><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/></>,
plus:<path d="M12 5v14M5 12h14"/>,arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
play:<path d="m9 5 11 7-11 7z" fill="currentColor" strokeWidth="0"/>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
radio:<><circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/></>,
music:<><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
close:<path d="m6 6 12 12M6 18 18 6"/>,check:<path d="m5 12 4 4L19 6"/>,
youtube:<><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor" strokeWidth="0"/></>,
back:<path d="M20 12H4m6-6-6 6 6 6"/>,up:<path d="m6 15 6-6 6 6"/>,down:<path d="m6 9 6 6 6-6"/>,
globe:<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>};
export function Icon({name,style}:{name:IconName;style?:CSSProperties}) {return <svg style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;}

