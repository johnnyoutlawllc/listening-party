/** Local-first library until the `party` schema ships. */

export type MediaItem = {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle?: string;
  thumbUrl?: string;
  addedAt: string;
};

export type Playlist = {
  id: string;
  name: string;
  itemIds: string[];
  visibility: "private" | "link" | "public";
  createdAt: string;
  updatedAt: string;
};

export type BreakTarget = {
  kind: "item" | "channel";
  key: string;
  label: string;
  until: string | null; // ISO, or null = indefinite
};

const LIB = "lp.library.v1";
const LISTS = "lp.playlists.v1";
const BREAKS = "lp.breaks.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadLibrary(): MediaItem[] {
  return read<MediaItem[]>(LIB, []);
}

export function saveLibrary(items: MediaItem[]) {
  write(LIB, items);
}

export function loadPlaylists(): Playlist[] {
  return read<Playlist[]>(LISTS, []);
}

export function savePlaylists(lists: Playlist[]) {
  write(LISTS, lists);
}

export function loadBreaks(): BreakTarget[] {
  return read<BreakTarget[]>(BREAKS, []);
}

export function saveBreaks(breaks: BreakTarget[]) {
  write(BREAKS, breaks);
}

/** Accepts full YouTube URLs or bare 11-char ids. */
export function parseYoutubeInput(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
        const id = parts[1];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function thumbFor(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
