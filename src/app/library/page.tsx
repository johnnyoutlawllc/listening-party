"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Cover } from "@/components/Cover";
import { MoreMenu } from "@/components/MoreMenu";
import { AltVersionsModal } from "@/components/AltVersionsModal";
import { YouTubeImportWizard } from "@/components/YouTubeImportWizard";
import {
  importSufferingJukeboxSeed,
  loadBreaks,
  loadLibrary,
  saveLibrary,
  type BreakTarget,
  type MediaItem,
} from "@/lib/store";

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [breaks, setBreaks] = useState<BreakTarget[]>([]);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<MediaItem | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState("All tracks");
  const [notice, setNotice] = useState("");
  const [altItem, setAltItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    importSufferingJukeboxSeed();
    setItems(loadLibrary());
    setBreaks(loadBreaks());
  }, []);

  function refresh() {
    setItems(loadLibrary());
    setBreaks(loadBreaks());
  }

  function remove(item: MediaItem) {
    const next = loadLibrary().filter((i) => i.id !== item.id);
    saveLibrary(next);
    setItems(next);
    if (playing?.id === item.id) setPlaying(null);
    setNotice("Track removed from this device's library.");
  }

  const broken = new Set(breaks.filter((b) => b.kind === "item").map((b) => b.key));
  const filtered = items.filter(
    (t) =>
      (t.title + " " + (t.channelTitle || "")).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All tracks" || broken.has(t.id)),
  );

  return (
    <div className="flow-shell">
      <div className="page-intro">
        <div>
          <p className="eyebrow">THE GOOD STUFF STARTS HERE</p>
          <h1>Track library</h1>
          <p className="intro-copy">All your finds. Ready for the next great mix.</p>
        </div>
        <Link href="/build" className="button primary">
          <Icon name="plus" />
          Build a Playlist
        </Link>
      </div>

      <div className="library-tools">
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label="Search your library"
            placeholder="Search tracks or artists…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(40);
            }}
          />
        </label>
        <button className="button secondary" onClick={() => setImportOpen(true)}>
          <Icon name="youtube" />
          Add from YouTube
        </button>
      </div>

      {error && (
        <p className="message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="message success-message" role="status">
          {notice}
        </p>
      )}

      <div className="filter-row">
        {["All tracks", "On a break"].map((f) => (
          <button
            key={f}
            className={filter === f ? "filter active" : "filter"}
            aria-pressed={filter === f}
            onClick={() => {
              setFilter(f);
              setLimit(40);
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {playing && (
        <>
          <div className="section-heading">
            <h2 style={{ fontSize: 22 }}>{playing.title}</h2>
            <button className="icon-button" aria-label="Close player" onClick={() => setPlaying(null)}>
              <Icon name="close" />
            </button>
          </div>
          <div className="player">
            <iframe
              title={playing.title}
              src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1&rel=0`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </>
      )}

      <p className="eyebrow">
        {filtered.length} TRACKS · YOUR LIBRARY ON THIS DEVICE
      </p>
      <ul className="track-list">
        {filtered.slice(0, limit).map((item) => (
          <li className={`track-row library-row ${broken.has(item.id) ? "on-break" : ""}`} key={item.id}>
            <Cover name={item.title} items={[item]} />
            <div className="track-info">
              <h3>{item.title}</h3>
              <p>{broken.has(item.id) ? "On a break" : item.channelTitle || "YouTube"}</p>
            </div>
            <div className="track-actions">
              <button
                className="icon-button"
                aria-label={`Play ${item.title}`}
                onClick={() => setPlaying(item)}
              >
                <Icon name="play" />
              </button>
              <MoreMenu
                target={{ kind: "song", item }}
                onNotice={(msg) => {
                  setNotice(msg);
                  refresh();
                }}
                onFindAlts={setAltItem}
              />
              <button
                className="icon-button"
                aria-label={`Remove ${item.title} from library`}
                onClick={() => remove(item)}
              >
                <Icon name="close" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!filtered.length && (
        <div className="empty-state">
          <Icon name="music" />
          <h2>{filter === "On a break" ? "Nothing on pause." : "No tracks found."}</h2>
          <p>
            {filter === "On a break"
              ? "When a song wears thin, give it a little time off."
              : "Try another search or add a YouTube find."}
          </p>
        </div>
      )}
      {filtered.length > limit && (
        <button className="button secondary load-more" onClick={() => setLimit((v) => v + 40)}>
          Show more tracks <Icon name="down" />
        </button>
      )}

      <YouTubeImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(imported) => {
          setItems(loadLibrary());
          setNotice(
            imported.length === 1
              ? "Track added to your library."
              : `${imported.length} tracks added to your library.`,
          );
          setError("");
        }}
      />
      <AltVersionsModal
        item={altItem}
        onClose={() => setAltItem(null)}
        onNotice={(msg) => {
          setNotice(msg);
          refresh();
        }}
      />
    </div>
  );
}
