"use client";

import { useEffect, useState } from "react";
import {
  loadLibrary,
  newId,
  saveLibrary,
  thumbFor,
  type MediaItem,
} from "@/lib/store";
import { parseYouTubePlaylistId, parseYouTubeVideoId } from "@/lib/youtube-id";
import { Icon } from "./Icon";

export type YtResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
  durationMs?: number | null;
  views?: number | null;
};

type PlaylistMeta = {
  playlistId: string;
  title: string;
  channelTitle: string;
  itemCount: number | null;
  thumbnail: string | null;
};

function formatDuration(ms: number | null | undefined) {
  if (!ms) return "";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function toMedia(item: YtResult): MediaItem {
  return {
    id: newId("m"),
    youtubeId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    thumbUrl: item.thumbnail || thumbFor(item.videoId),
    addedAt: new Date().toISOString(),
  };
}

export function YouTubeImportWizard({
  open,
  onClose,
  onImport,
  title = "Import from YouTube",
}: {
  open: boolean;
  onClose: () => void;
  onImport: (items: MediaItem[]) => void;
  title?: string;
}) {
  const [mode, setMode] = useState<"search" | "link">("search");
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<YtResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playlist, setPlaylist] = useState<PlaylistMeta | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [playlistHits, setPlaylistHits] = useState<PlaylistMeta[]>([]);

  useEffect(() => {
    if (!open) return;
    setMode("search");
    setQuery("");
    setLink("");
    setError("");
    setResults([]);
    setSelected(new Set());
    setPlaylist(null);
    setTruncated(false);
    setPlaylistHits([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    setPlaylist(null);
    setPlaylistHits([]);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results || []);
      setSelected(new Set());
      if (query.trim().length >= 2) {
        const pl = await fetch(`/api/youtube/search?playlistQuery=${encodeURIComponent(query.trim())}`);
        const plData = await pl.json();
        if (pl.ok) setPlaylistHits(plData.results || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFromLink(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    setPlaylistHits([]);
    try {
      const playlistId = parseYouTubePlaylistId(link);
      const videoId = parseYouTubeVideoId(link);
      if (playlistId && (!videoId || link.includes("list="))) {
        const res = await fetch(`/api/youtube/search?playlist=${encodeURIComponent(link.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't load that playlist.");
        setPlaylist(data.playlist);
        setResults(data.results || []);
        setTruncated(!!data.truncated);
        setSelected(new Set((data.results || []).map((r: YtResult) => r.videoId)));
      } else if (videoId) {
        const res = await fetch(`/api/youtube/search?video=${encodeURIComponent(link.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't load that video.");
        setPlaylist(null);
        setTruncated(false);
        setResults(data.results || []);
        setSelected(new Set((data.results || []).map((r: YtResult) => r.videoId)));
      } else {
        throw new Error("Paste a YouTube video or playlist link.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that link.");
    } finally {
      setBusy(false);
    }
  }

  async function openPlaylist(hit: PlaylistMeta) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/youtube/search?playlist=${encodeURIComponent(hit.playlistId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load that playlist.");
      setMode("link");
      setLink(`https://www.youtube.com/playlist?list=${hit.playlistId}`);
      setPlaylist(data.playlist);
      setResults(data.results || []);
      setTruncated(!!data.truncated);
      setSelected(new Set((data.results || []).map((r: YtResult) => r.videoId)));
      setPlaylistHits([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that playlist.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(results.map((r) => r.videoId)));
  }

  function importSelected() {
    const picked = results.filter((r) => selected.has(r.videoId)).map(toMedia);
    if (!picked.length) {
      setError("Select at least one video to import.");
      return;
    }
    const library = loadLibrary();
    const byYt = new Map(library.map((t) => [t.youtubeId, t]));
    const merged: MediaItem[] = [];
    for (const item of picked) {
      const existing = byYt.get(item.youtubeId);
      if (existing) merged.push(existing);
      else {
        byYt.set(item.youtubeId, item);
        merged.push(item);
      }
    }
    try {
      saveLibrary([...byYt.values()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
    } catch {
      /* caller still gets the selection */
    }
    onImport(merged);
    onClose();
  }

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="wizard-card">
        <div className="wizard-head">
          <div>
            <p className="eyebrow">YOUTUBE IMPORT</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="source-tabs">
          <button
            type="button"
            className={`button secondary ${mode === "search" ? "selected" : ""}`}
            onClick={() => setMode("search")}
          >
            <Icon name="search" /> Search YouTube
          </button>
          <button
            type="button"
            className={`button secondary ${mode === "link" ? "selected" : ""}`}
            onClick={() => setMode("link")}
          >
            <Icon name="youtube" /> Paste a link
          </button>
        </div>

        {mode === "search" ? (
          <form className="wizard-form" onSubmit={runSearch}>
            <label className="search-field">
              <Icon name="search" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, artists, or mixes…"
                aria-label="Search YouTube"
              />
            </label>
            <button className="button primary" type="submit" disabled={busy || query.trim().length < 2}>
              {busy ? "Searching…" : "Search"}
            </button>
          </form>
        ) : (
          <form className="wizard-form" onSubmit={loadFromLink}>
            <label className="field">
              Video or playlist link
              <input
                autoFocus
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or playlist?list=…"
              />
            </label>
            <button className="button primary" type="submit" disabled={busy || !link.trim()}>
              {busy ? "Loading…" : "Fetch"}
            </button>
          </form>
        )}

        {error && (
          <p className="message" role="alert">
            {error}
          </p>
        )}

        {playlistHits.length > 0 && (
          <div className="wizard-playlists">
            <p className="eyebrow">MATCHING PLAYLISTS</p>
            <ul>
              {playlistHits.map((hit) => (
                <li key={hit.playlistId}>
                  <button type="button" className="wizard-pl-hit" onClick={() => openPlaylist(hit)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {hit.thumbnail ? <img src={hit.thumbnail} alt="" /> : <span className="wizard-pl-ph" />}
                    <span>
                      <strong>{hit.title}</strong>
                      <small>
                        {hit.channelTitle}
                        {hit.itemCount != null ? ` · ${hit.itemCount} videos` : ""}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {playlist && (
          <div className="wizard-playlist-banner">
            <div>
              <p className="eyebrow">YOUTUBE PLAYLIST</p>
              <h3>{playlist.title}</h3>
              <p className="help">
                {playlist.channelTitle}
                {playlist.itemCount != null ? ` · ${playlist.itemCount} listed` : ""}
                {truncated ? " · showing the first 300" : ""}
              </p>
            </div>
            <button type="button" className="button secondary" onClick={selectAll}>
              Select all
            </button>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="wizard-result-tools">
              <p className="eyebrow">
                {selected.size} selected · {results.length} results
              </p>
              <div className="button-row">
                <button type="button" className="button secondary" onClick={selectAll}>
                  Select all
                </button>
                <button type="button" className="button secondary" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
              </div>
            </div>
            <ul className="track-list track-scroll wizard-results">
              {results.map((item) => {
                const checked = selected.has(item.videoId);
                return (
                  <li key={item.videoId} className="track-row">
                    <button
                      type="button"
                      className={`icon-button ${checked ? "selected" : ""}`}
                      aria-pressed={checked}
                      aria-label={`${checked ? "Deselect" : "Select"} ${item.title}`}
                      onClick={() => toggle(item.videoId)}
                    >
                      <Icon name={checked ? "check" : "plus"} />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="wizard-thumb"
                      src={item.thumbnail || thumbFor(item.videoId)}
                      alt=""
                      loading="lazy"
                    />
                    <div className="track-info">
                      <h3>{item.title}</h3>
                      <p>
                        {item.channelTitle}
                        {item.durationMs ? ` · ${formatDuration(item.durationMs)}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {!busy && !results.length && !error && (
          <p className="help wizard-empty">
            Search YouTube, or paste a video / playlist link to preview what you&apos;ll import.
          </p>
        )}

        <div className="wizard-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!selected.size}
            onClick={importSelected}
          >
            <Icon name="plus" />
            {playlist && selected.size === results.length && results.length > 1
              ? `Import playlist (${selected.size})`
              : `Add ${selected.size || ""} selected`}
          </button>
        </div>
      </div>
    </div>
  );
}
