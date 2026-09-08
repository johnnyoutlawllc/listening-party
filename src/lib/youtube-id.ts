/** Client-safe YouTube URL / id parsers (no API key). */

export function parseYouTubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(url.hostname)) {
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

export function parseYouTubePlaylistId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^(PL|UU|LL|FL|RD|OLAK5uy)[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const list = url.searchParams.get("list");
    return list && list.length >= 10 ? list : null;
  } catch {
    return null;
  }
}
