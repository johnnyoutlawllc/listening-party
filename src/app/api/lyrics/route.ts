import { NextRequest, NextResponse } from "next/server";

function value(input: string | null, limit: number) {
  return (input || "").trim().slice(0, limit);
}

export async function GET(request: NextRequest) {
  const title = value(request.nextUrl.searchParams.get("title"), 300);
  const artist = value(request.nextUrl.searchParams.get("artist"), 200);
  if (!title || !artist) return NextResponse.json({ lyrics: null }, { status: 400 });

  try {
    const search = new URL("https://lrclib.net/api/search");
    search.searchParams.set("track_name", title);
    search.searchParams.set("artist_name", artist);
    const response = await fetch(search, { headers: { "User-Agent": "ListeningParty/1.0" }, next: { revalidate: 86400 } });
    if (!response.ok) throw new Error("Lyrics search failed.");
    const matches = (await response.json()) as Array<{ plainLyrics?: string | null }>;
    const lyrics = matches.find((match) => match.plainLyrics?.trim())?.plainLyrics?.trim() || null;
    return NextResponse.json({ lyrics }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return NextResponse.json({ lyrics: null }, { status: 200 });
  }
}
