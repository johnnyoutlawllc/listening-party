/** Local-first library until the `party` schema ships. */

import sjSeed from "@/data/sj-playlists.json";
import { parseYouTubeVideoId, parseYouTubePlaylistId } from "./youtube-id";

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
  description?: string;
};

export type BreakTarget = {
  kind: "item" | "channel" | "playlist";
  key: string;
  label: string;
  until: string | null;
};

export type CardSize = "sm" | "md" | "lg";
const CARD_SIZE = "lp.cardSize.v1";

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
/** Remove SJ seed playlists/tracks and clear the import marker on this device. */
export function clearSufferingJukeboxImport() {
  const library = loadLibrary().filter((item) => !item.id.startsWith("sj_"));
  const lists = loadPlaylists().filter((p) => !p.id.startsWith("sjpl_"));
  saveLibrary(library);
  savePlaylists(lists);
  if (typeof window !== "undefined") localStorage.removeItem(SJ_META);
}

export function removeLibraryItem(id: string) {
  const library = loadLibrary().filter((item) => item.id !== id);
  saveLibrary(library);
  const lists = loadPlaylists().map((p) => ({
    ...p,
    itemIds: p.itemIds.filter((itemId) => itemId !== id),
    updatedAt: new Date().toISOString(),
  }));
  savePlaylists(lists);
}

export function removePlaylist(id: string) {
  savePlaylists(loadPlaylists().filter((p) => p.id !== id));
}

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
  const canonicalIds = new Map(seed.library.map(item => [item.id, byYt.get(item.youtubeId)!.id]));
  for (const pl of seed.playlists) {
    lists.push({
      id: pl.id,
      name: pl.name,
      itemIds: pl.itemIds.map(id => canonicalIds.get(id) ?? id),
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
  return parseYouTubeVideoId(input);
}

export { parseYouTubePlaylistId };

export function loadCardSize(): CardSize {
  const value = read<string>(CARD_SIZE, "md");
  return value === "sm" || value === "lg" || value === "md" ? value : "md";
}

export function saveCardSize(size: CardSize) {
  write(CARD_SIZE, size);
}

export function toggleBreakTarget(
  breaks: BreakTarget[],
  target: Omit<BreakTarget, "until"> & { until?: string | null },
): BreakTarget[] {
  const exists = breaks.some((b) => b.kind === target.kind && b.key === target.key);
  if (exists) return breaks.filter((b) => !(b.kind === target.kind && b.key === target.key));
  return [...breaks, { ...target, until: target.until ?? null }];
}

export function addTrackToPlaylist(playlistId: string, item: MediaItem): Playlist | null {
  const lists = loadPlaylists();
  const playlist = lists.find((p) => p.id === playlistId);
  if (!playlist) return null;
  let library = loadLibrary();
  const existing = library.find((t) => t.id === item.id || t.youtubeId === item.youtubeId);
  if (!existing) {
    library = [item, ...library];
    saveLibrary(library);
  }
  const resolvedId = existing?.id || item.id;
  if (playlist.itemIds.includes(resolvedId)) return playlist;
  const updated: Playlist = {
    ...playlist,
    itemIds: [...playlist.itemIds, resolvedId],
    updatedAt: new Date().toISOString(),
  };
  savePlaylists(lists.map((p) => (p.id === playlistId ? updated : p)));
  return updated;
}

export function thumbFor(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
