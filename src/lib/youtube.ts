/** Server-side YouTube Data API helpers (search, playlist expand, video check). */

import { parseYouTubePlaylistId, parseYouTubeVideoId } from "./youtube-id";

export { parseYouTubePlaylistId, parseYouTubeVideoId };
export const MAX_PLAYLIST_ITEMS = 300;

export type YtPlaylistItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
};

export type YouTubePlaylistInfo = {
  playlistId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnail: string | null;
  itemCount: number | null;
};

export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnail: string | null;
  durationMs: number | null;
  views: number | null;
  publishedAt: string | null;
};

export type YtVideoInfo = {
  id: string;
  playable: boolean;
  reason: string | null;
  thumbnail: string | null;
  title: string;
  channelTitle: string;
  durationMs: number | null;
  views: number;
  publishedAt: string | null;
};

function apiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YouTube search is not configured yet.");
  return key;
}

async function throwYouTubeHttpError(res: Response, fallback: string): Promise<never> {
  let reason: string | null = null;
  try {
    const json = (await res.json()) as { error?: { message?: string; errors?: Array<{ reason?: string }> } };
    reason = json.error?.errors?.[0]?.reason ?? null;
    const message = json.error?.message;
    if (message) throw new Error(message);
  } catch (e) {
    if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e;
  }
  throw new Error(`${fallback}${reason ? ` (${reason})` : ""}`);
}

export function parseYouTubeDuration(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== "string") return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const ms = (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) * 1000;
  return ms > 0 ? ms : null;
}

export async function fetchYouTubePlaylistItems(
  playlistId: string,
): Promise<{ items: YtPlaylistItem[]; truncated: boolean }> {
  const key = apiKey();
  const items: YtPlaylistItem[] = [];
  let pageToken: string | undefined;
  let truncated = false;
  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    url.searchParams.set("key", key);
    const res = await fetch(url.toString());
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("That playlist could not be found. Check it is public or unlisted.");
      }
      await throwYouTubeHttpError(res, "YouTube API error");
    }
    const json = (await res.json()) as { items?: Array<Record<string, unknown>>; nextPageToken?: string };
    for (const item of json.items ?? []) {
      const sn = (item.snippet ?? {}) as Record<string, unknown>;
      const resourceId = sn.resourceId as { videoId?: string } | undefined;
      const videoId = resourceId?.videoId;
      if (!videoId) continue;
      if (/^(deleted|private) video$/i.test(String(sn.title || ""))) continue;
      const thumbs = sn.thumbnails as { medium?: { url?: string }; default?: { url?: string } } | undefined;
      items.push({
        videoId,
        title: String(sn.title || "Untitled"),
        channelTitle: String(sn.videoOwnerChannelTitle || sn.channelTitle || ""),
        thumbnail: thumbs?.medium?.url ?? thumbs?.default?.url ?? null,
      });
      if (items.length >= MAX_PLAYLIST_ITEMS) {
        truncated = true;
        break;
      }
    }
    pageToken = truncated ? undefined : json.nextPageToken;
  } while (pageToken);
  return { items, truncated };
}

export async function fetchYouTubePlaylistInfo(playlistId: string): Promise<YouTubePlaylistInfo | null> {
  const key = apiKey();
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet,contentDetails,status");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) await throwYouTubeHttpError(res, "YouTube API error");
  const json = (await res.json()) as { items?: Array<Record<string, unknown>> };
  const item = json.items?.[0];
  if (!item) return null;
  const status = item.status as { privacyStatus?: string } | undefined;
  if (status?.privacyStatus === "private") return null;
  const snippet = (item.snippet ?? {}) as Record<string, unknown>;
  const thumbs = snippet.thumbnails as { medium?: { url?: string }; default?: { url?: string } } | undefined;
  const contentDetails = item.contentDetails as { itemCount?: number } | undefined;
  return {
    playlistId: String(item.id),
    title: String(snippet.title || "Untitled playlist"),
    description: String(snippet.description || ""),
    channelTitle: String(snippet.channelTitle || ""),
    thumbnail: thumbs?.medium?.url ?? thumbs?.default?.url ?? null,
    itemCount: Number.isFinite(Number(contentDetails?.itemCount)) ? Number(contentDetails?.itemCount) : null,
  };
}

export async function fetchYouTubeVideoInfo(videoIds: string[]): Promise<Record<string, YtVideoInfo>> {
  const key = apiKey();
  const out: Record<string, YtVideoInfo> = {};
  const ids = [...new Set(videoIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "status,contentDetails,statistics,snippet");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", key);
    const res = await fetch(url.toString());
    if (!res.ok) await throwYouTubeHttpError(res, "YouTube API error");
    const json = (await res.json()) as { items?: Array<Record<string, unknown>> };
    for (const item of json.items ?? []) {
      const status = (item.status ?? {}) as Record<string, unknown>;
      const contentDetails = (item.contentDetails ?? {}) as Record<string, unknown>;
      const rr = (contentDetails.regionRestriction ?? {}) as { blocked?: string[]; allowed?: string[] };
      const ageRestricted =
        (contentDetails.contentRating as { ytRating?: string } | undefined)?.ytRating === "ytAgeRestricted";
      let playable = true;
      let reason: string | null = null;
      if (status.privacyStatus && status.privacyStatus !== "public") {
        playable = false;
        reason = `video is ${status.privacyStatus}`;
      } else if (status.uploadStatus && status.uploadStatus !== "processed") {
        playable = false;
        reason = `upload status ${status.uploadStatus}`;
      } else if (status.embeddable === false) {
        playable = false;
        reason = "embedding disabled by the owner";
      } else if (ageRestricted) {
        playable = false;
        reason = "age-restricted, so it will not play outside YouTube";
      } else if (Array.isArray(rr.blocked) && rr.blocked.includes("US")) {
        playable = false;
        reason = "blocked in the US";
      } else if (Array.isArray(rr.allowed) && !rr.allowed.includes("US")) {
        playable = false;
        reason = "not available in the US";
      }
      const snippet = (item.snippet ?? {}) as Record<string, unknown>;
      const thumbs = snippet.thumbnails as { medium?: { url?: string }; default?: { url?: string } } | undefined;
      const stats = (item.statistics ?? {}) as Record<string, string>;
      out[String(item.id)] = {
        id: String(item.id),
        playable,
        reason,
        thumbnail: thumbs?.medium?.url ?? thumbs?.default?.url ?? null,
        title: String(snippet.title ?? ""),
        channelTitle: String(snippet.channelTitle ?? ""),
        publishedAt: typeof snippet.publishedAt === "string" ? snippet.publishedAt : null,
        durationMs: parseYouTubeDuration(contentDetails.duration as string | undefined),
        views: Number(stats.viewCount ?? 0),
      };
    }
  }
  return out;
}

export async function searchYouTubeVideos(query: string, maxResults = 12): Promise<YouTubeSearchResult[]> {
  const key = apiKey();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", String(Math.min(Math.max(maxResults, 1), 15)));
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) await throwYouTubeHttpError(res, "YouTube search error");
  const json = (await res.json()) as { items?: Array<Record<string, unknown>> };
  const candidates = (json.items ?? [])
    .map((item) => {
      const id = item.id as { videoId?: string } | undefined;
      return { videoId: id?.videoId, snippet: (item.snippet ?? {}) as Record<string, unknown> };
    })
    .filter((item): item is { videoId: string; snippet: Record<string, unknown> } => !!item.videoId);
  const details = await fetchYouTubeVideoInfo(candidates.map((item) => item.videoId));
  return candidates
    .filter((item) => details[item.videoId]?.playable)
    .map((item) => {
      const detail = details[item.videoId];
      const thumbs = item.snippet.thumbnails as { medium?: { url?: string }; default?: { url?: string } } | undefined;
      return {
        videoId: item.videoId,
        title: detail?.title || String(item.snippet.title || "Untitled video"),
        description: String(item.snippet.description || ""),
        channelTitle: detail?.channelTitle || String(item.snippet.channelTitle || ""),
        thumbnail: detail?.thumbnail ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? null,
        durationMs: detail?.durationMs ?? null,
        views: detail?.views ?? null,
        publishedAt: detail?.publishedAt ?? null,
      };
    });
}

export async function searchYouTubePlaylists(query: string, maxResults = 10): Promise<YouTubePlaylistInfo[]> {
  const key = apiKey();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("type", "playlist");
  url.searchParams.set("maxResults", String(Math.min(Math.max(maxResults, 1), 15)));
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) await throwYouTubeHttpError(res, "YouTube playlist search error");
  const json = (await res.json()) as { items?: Array<Record<string, unknown>> };
  const candidates = (json.items ?? [])
    .map((item) => {
      const id = item.id as { playlistId?: string } | undefined;
      return { playlistId: id?.playlistId, snippet: (item.snippet ?? {}) as Record<string, unknown> };
    })
    .filter((item): item is { playlistId: string; snippet: Record<string, unknown> } => !!item.playlistId);
  if (!candidates.length) return [];

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
  detailsUrl.searchParams.set("part", "contentDetails,status");
  detailsUrl.searchParams.set("id", candidates.map((item) => item.playlistId).join(","));
  detailsUrl.searchParams.set("maxResults", String(candidates.length));
  detailsUrl.searchParams.set("key", key);
  const detailsRes = await fetch(detailsUrl.toString());
  if (!detailsRes.ok) await throwYouTubeHttpError(detailsRes, "YouTube playlist details error");
  const detailsJson = (await detailsRes.json()) as { items?: Array<Record<string, unknown>> };
  const details = new Map((detailsJson.items ?? []).map((item) => [String(item.id), item]));

  return candidates.flatMap(({ playlistId, snippet }) => {
    const detail = details.get(playlistId);
    if (!detail) return [];
    const status = detail.status as { privacyStatus?: string } | undefined;
    if (status?.privacyStatus === "private") return [];
    const thumbs = snippet.thumbnails as { medium?: { url?: string }; default?: { url?: string } } | undefined;
    const contentDetails = detail.contentDetails as { itemCount?: number } | undefined;
    return [
      {
        playlistId,
        title: String(snippet.title || "Untitled playlist"),
        description: String(snippet.description || ""),
        channelTitle: String(snippet.channelTitle || ""),
        thumbnail: thumbs?.medium?.url ?? thumbs?.default?.url ?? null,
        itemCount: Number.isFinite(Number(contentDetails?.itemCount))
          ? Number(contentDetails?.itemCount)
          : null,
      },
    ];
  });
}
