"use client";

import { useEffect, useState } from "react";
import {
  addTrackToPlaylist,
  loadLibrary,
  loadPlaylists,
  newId,
  saveLibrary,
  thumbFor,
  type MediaItem,
} from "@/lib/store";
import { Icon } from "./Icon";
import type { YtResult } from "./YouTubeImportWizard";

export function AltVersionsModal({
  item,
  onClose,
  onNotice,
}: {
  item: MediaItem | null;
  onClose: () => void;
  onNotice?: (message: string) => void;
}) {
  const [results, setResults] = useState<YtResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [playlistId, setPlaylistId] = useState("");

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    setResults([]);
    const query = `${item.title} ${item.channelTitle || ""}`.trim();
    fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't find alternatives.");
        if (!cancelled) {
          setResults((data.results || []).filter((r: YtResult) => r.videoId !== item.youtubeId));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't find alternatives.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;

  const lists = loadPlaylists().filter((p) => !p.id.startsWith("sjpl_"));

  function saveAlt(result: YtResult) {
    const media: MediaItem = {
      id: newId("m"),
      youtubeId: result.videoId,
      title: result.title,
      channelTitle: result.channelTitle,
      thumbUrl: result.thumbnail || thumbFor(result.videoId),
      addedAt: new Date().toISOString(),
    };
    const library = loadLibrary();
    if (!library.some((t) => t.youtubeId === media.youtubeId)) {
      saveLibrary([media, ...library]);
    }
    if (playlistId) addTrackToPlaylist(playlistId, media);
    onNotice?.(playlistId ? `Saved alternative and added to playlist.` : "Saved alternative to your library.");
    onClose();
  }

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label="Alternative versions">
      <div className="wizard-card">
        <div className="wizard-head">
          <div>
            <p className="eyebrow">BETTER TAKES</p>
            <h2>Find alternative versions</h2>
            <p className="help">Looking for other uploads of {item.title}.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {lists.length > 0 && (
          <label className="field">
            Also add to playlist
            <select value={playlistId} onChange={(e) => setPlaylistId(e.target.value)}>
              <option value="">Library only</option>
              {lists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p className="message" role="alert">
            {error}
          </p>
        )}
        {busy && <p className="help">Searching YouTube…</p>}

        <ul className="track-list track-scroll wizard-results">
          {results.map((result) => (
            <li key={result.videoId} className="track-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="wizard-thumb"
                src={result.thumbnail || thumbFor(result.videoId)}
                alt=""
                loading="lazy"
              />
              <div className="track-info">
                <h3>{result.title}</h3>
                <p>{result.channelTitle}</p>
              </div>
              <a
                className="icon-button"
                href={`https://www.youtube.com/watch?v=${result.videoId}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Preview on YouTube"
              >
                <Icon name="play" />
              </a>
              <button type="button" className="button secondary" onClick={() => saveAlt(result)}>
                Save
              </button>
            </li>
          ))}
        </ul>

        {!busy && !results.length && !error && (
          <p className="help">No other versions turned up. Try a different upload title on YouTube.</p>
        )}

        <div className="wizard-actions">
          <a
            className="button secondary"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " official audio")}`}
            target="_blank"
            rel="noreferrer"
          >
            Open on YouTube ↗
          </a>
          <button type="button" className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
