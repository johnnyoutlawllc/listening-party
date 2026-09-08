"use client";

import { Icon } from "./Icon";
import { thumbFor, type MediaItem } from "@/lib/store";

function mosaicTier(n: number) {
  if (n >= 9) return 9;
  if (n >= 8) return 8;
  if (n >= 6) return 6;
  if (n >= 4) return 4;
  if (n >= 2) return 2;
  if (n >= 1) return 1;
  return 0;
}

function uniqueThumbs(items: MediaItem[]) {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of items) {
    const url = item.thumbUrl || (item.youtubeId ? thumbFor(item.youtubeId) : "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= 9) break;
  }
  return urls;
}

export function Cover({
  items,
  name,
  className = "",
  live = false,
}: {
  items: MediaItem[];
  name: string;
  className?: string;
  live?: boolean;
}) {
  const arts = uniqueThumbs(items);
  const n = mosaicTier(arts.length);

  if (!n) {
    return (
      <div className={`cover playlist-mosaic-empty ${className}`} aria-hidden="true">
        <span className="cover-fallback">
          <Icon name="music" />
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  if (n === 1) {
    return (
      <div className={`cover playlist-mosaic ${className}`} data-n="1" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={arts[0]} alt="" loading="lazy" />
        {live && <span className="playlist-broadcasting-now">Broadcasting Now</span>}
      </div>
    );
  }

  return (
    <div className={`cover playlist-mosaic ${className}`} data-n={n} aria-hidden="true">
      {arts.slice(0, n).map((art) => (
        <span key={art} className="playlist-mosaic-cell" style={{ backgroundImage: `url(${art})` }} />
      ))}
      {live && <span className="playlist-broadcasting-now">Broadcasting Now</span>}
    </div>
  );
}
