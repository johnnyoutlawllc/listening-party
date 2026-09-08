import { NextRequest, NextResponse } from "next/server";
import { failure } from "@/lib/server";
import {
  fetchYouTubePlaylistInfo,
  fetchYouTubePlaylistItems,
  fetchYouTubeVideoInfo,
  parseYouTubePlaylistId,
  parseYouTubeVideoId,
  searchYouTubePlaylists,
  searchYouTubeVideos,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const playlistQuery = url.searchParams.get("playlistQuery")?.trim() ?? "";
    if (playlistQuery) {
      if (playlistQuery.length < 2) return NextResponse.json({ ok: true, results: [] });
      return NextResponse.json({ ok: true, results: await searchYouTubePlaylists(playlistQuery) });
    }

    const playlistParam = url.searchParams.get("playlist")?.trim();
    if (playlistParam) {
      const playlistId = parseYouTubePlaylistId(playlistParam);
      if (!playlistId) {
        return NextResponse.json({ error: "That doesn't look like a YouTube playlist link." }, { status: 400 });
      }
      const [playlist, playlistItems] = await Promise.all([
        fetchYouTubePlaylistInfo(playlistId),
        fetchYouTubePlaylistItems(playlistId),
      ]);
      if (!playlist) {
        return NextResponse.json(
          { error: "That playlist could not be found. Check it is public or unlisted." },
          { status: 404 },
        );
      }
      const { items, truncated } = playlistItems;
      if (!items.length) return NextResponse.json({ ok: true, playlist, results: [], truncated: false });

      const seen = new Set<string>();
      const deduped = items.filter((it) => (seen.has(it.videoId) ? false : (seen.add(it.videoId), true)));
      const info = await fetchYouTubeVideoInfo(deduped.map((it) => it.videoId));
      const results = deduped
        .filter((it) => info[it.videoId]?.playable !== false)
        .map((it) => ({
          videoId: it.videoId,
          title: info[it.videoId]?.title || it.title,
          description: "",
          channelTitle: info[it.videoId]?.channelTitle || it.channelTitle,
          thumbnail: info[it.videoId]?.thumbnail ?? it.thumbnail,
          durationMs: info[it.videoId]?.durationMs ?? null,
          views: info[it.videoId]?.views ?? null,
          publishedAt: info[it.videoId]?.publishedAt ?? null,
        }));
      return NextResponse.json({ ok: true, playlist, results, truncated });
    }

    const videoParam = url.searchParams.get("video")?.trim();
    if (videoParam) {
      const videoId = parseYouTubeVideoId(videoParam);
      if (!videoId) {
        return NextResponse.json({ error: "That doesn't look like a YouTube video link." }, { status: 400 });
      }
      const info = await fetchYouTubeVideoInfo([videoId]);
      const detail = info[videoId];
      if (!detail) {
        return NextResponse.json({ error: "That video could not be found." }, { status: 404 });
      }
      if (!detail.playable) {
        return NextResponse.json(
          { error: detail.reason ? `This video can't be added: ${detail.reason}.` : "This video can't be embedded." },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        results: [
          {
            videoId: detail.id,
            title: detail.title,
            description: "",
            channelTitle: detail.channelTitle,
            thumbnail: detail.thumbnail,
            durationMs: detail.durationMs,
            views: detail.views,
            publishedAt: detail.publishedAt,
          },
        ],
      });
    }

    const query = url.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ ok: true, results: [] });
    return NextResponse.json({ ok: true, results: await searchYouTubeVideos(query) });
  } catch (error) {
    console.error("[youtube:search]", error);
    return failure(error, 502);
  }
}
