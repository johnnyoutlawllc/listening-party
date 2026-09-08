/** Local-first library until the `party` schema ships. */

import sjSeed from "@/data/sj-playlists.json";

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
  until: string | null;
};

type SjSeed = {
  importedAt: string;
  source: string;
  stats: {
    playlists: number;
    libraryItems: number;
    playlistTrackSlots: number;
    skippedNoVideo: number;
  };
  library: MediaItem[];
  playlists: Playlist[];
};

const LIB = "lp.library.v1";
const LISTS = "lp.playlists.v1";
const BREAKS = "lp.breaks.v1";
const SJ_META = "lp.sjImport.v1";

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

export function sjSeedStats() {
  return (sjSeed as SjSeed).stats;
}

export function sjSeedImportedAt() {
  return (sjSeed as SjSeed).importedAt;
}

export function loadSjImportMeta(): { seedImportedAt: string; appliedAt: string } | null {
  return read(SJ_META, null);
}

/**
 * Merge Suffering Jukebox playlists into local library/playlists.
 * SJ rows use stable ids (sj_ / sjpl_) so re-running updates them in place
 * without wiping playlists you created in Listening Party.
 */
export function importSufferingJukeboxSeed(force = false): {
  applied: boolean;
  playlists: number;
  libraryItems: number;
} {
  const seed = sjSeed as SjSeed;
  const meta = loadSjImportMeta();
  if (!force && meta?.seedImportedAt === seed.importedAt) {
    return {
      applied: false,
      playlists: seed.stats.playlists,
      libraryItems: seed.stats.libraryItems,
    };
  }

  const library = loadLibrary();
  const byYt = new Map(library.map((i) => [i.youtubeId, i]));
  for (const item of seed.library) {
    const existing = byYt.get(item.youtubeId);
    if (existing) {
      existing.title = item.title;
      existing.channelTitle = item.channelTitle;
      existing.thumbUrl = item.thumbUrl;
      if (existing.id.startsWith("sj_") || !existing.id) existing.id = item.id;
    } else {
      const row: MediaItem = {
        id: item.id,
        youtubeId: item.youtubeId,
        title: item.title,
        channelTitle: item.channelTitle,
        thumbUrl: item.thumbUrl,
        addedAt: item.addedAt,
      };
      library.push(row);
      byYt.set(item.youtubeId, row);
    }
  }
  saveLibrary(library);

  const lists = loadPlaylists().filter((p) => !p.id.startsWith("sjpl_"));
  for (const pl of seed.playlists) {
    lists.push({
      id: pl.id,
      name: pl.name,
      itemIds: pl.itemIds,
      visibility: pl.visibility,
      createdAt: pl.createdAt,
      updatedAt: pl.updatedAt,
    });
  }
  // Keep SJ playlists sorted by name after local ones
  lists.sort((a, b) => {
    const aSj = a.id.startsWith("sjpl_") ? 1 : 0;
    const bSj = b.id.startsWith("sjpl_") ? 1 : 0;
    if (aSj !== bSj) return aSj - bSj;
    return a.name.localeCompare(b.name);
  });
  savePlaylists(lists);

  write(SJ_META, {
    seedImportedAt: seed.importedAt,
    appliedAt: new Date().toISOString(),
  });

  return {
    applied: true,
    playlists: seed.stats.playlists,
    libraryItems: seed.stats.libraryItems,
  };
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
