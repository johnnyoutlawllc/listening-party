"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cover } from "./Cover";
import { Icon } from "./Icon";
import { MoreMenu } from "./MoreMenu";
import { AltVersionsModal } from "./AltVersionsModal";
import { usePlayer } from "./PlayerProvider";
import {
  importSufferingJukeboxSeed,
  loadLibrary,
  loadPlaylists,
  savePlaylists,
  type MediaItem,
  type Playlist,
} from "@/lib/store";
import { requestJson, asPlaylist, type SharedPlaylist } from "@/lib/shared";

export function PlaylistDetail({ id }: { id: string }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [altItem, setAltItem] = useState<MediaItem | null>(null);
  const { currentTrack, playQueue } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        importSufferingJukeboxSeed();
        let p: Playlist;
        let queue: MediaItem[];
        if (id.startsWith("sjpl_") || id.startsWith("pl_")) {
          const local = loadPlaylists().find((x) => x.id === id);
          if (!local) throw new Error("This playlist isn't available on this device.");
          p = local;
          const byId = new Map(loadLibrary().map((t) => [t.id, t]));
          queue = p.itemIds.map((i) => byId.get(i)).filter((t): t is MediaItem => !!t);
        } else {
          const shared = await requestJson<SharedPlaylist & { canEdit: boolean }>("/api/playlists/" + id);
          p = asPlaylist(shared);
          queue = shared.tracks;
          if (!cancelled) setCanEdit(shared.canEdit);
        }
        if (!cancelled) {
          setPlaylist(p);
          setTracks(queue);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load this playlist.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Playlist link copied.");
    } catch {
      setNotice("Copy the address in your browser to share this playlist.");
    }
  }

  function remove(itemId: string) {
    if (!playlist) return;
    const updated = {
      ...playlist,
      itemIds: playlist.itemIds.filter((i) => i !== itemId),
      updatedAt: new Date().toISOString(),
    };
    savePlaylists(loadPlaylists().map((p) => (p.id === id ? updated : p)));
    setPlaylist(updated);
    setTracks((prev) => prev.filter((t) => t.id !== itemId));
  }

  return (
    <div className="flow-shell">
      <Link href="/" className="back-link">
        <Icon name="back" />
        Back to Discover
      </Link>
      {loading ? (
        <div className="empty-state" role="status">
          Finding your mix…
        </div>
      ) : error ? (
        <div className="empty-state">
          <h1>That mix is out of reach.</h1>
          <p role="alert">{error}</p>
          <Link href="/" className="button primary">
            Explore playlists
          </Link>
        </div>
      ) : (
        playlist && (
          <>
            <div className="detail-header">
              <Cover items={tracks} name={playlist.name} />
              <div>
                <div className="detail-title-row">
                  <p className="eyebrow">
                    <Icon name="music" />
                    {playlist.visibility === "link" ? "UNLISTED" : playlist.visibility.toUpperCase()} PLAYLIST
                  </p>
                  <MoreMenu
                    target={{ kind: "playlist", playlist, tracks }}
                    onNotice={setNotice}
                    onFindAlts={setAltItem}
                  />
                </div>
                <h1>{playlist.name}</h1>
                <p className="help">
                  {playlist.description || "A collection worth getting lost in."}
                  <br />
                  {tracks.length} tracks · {id.startsWith("sjpl_") ? "Suffering Jukebox" : "Listening Party"}
                </p>
                <div className="button-row">
                  <button disabled={!tracks.length} className="button primary" onClick={() => playQueue(tracks, 0)}>
                    <Icon name="play" />
                    Play playlist
                  </button>
                  <Link href={`/room?playlist=${id}`} className="button secondary">
                    <Icon name="radio" />
                    Start a room
                  </Link>
                  {playlist.visibility !== "private" && !id.startsWith("pl_") && (
                    <button className="button secondary" onClick={share}>
                      <Icon name="arrow" />
                      Share
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Link href={"/build?edit=" + id} className="text-link">
              {canEdit
                ? "Edit playlist"
                : id.startsWith("sjpl_") || id.startsWith("pl_")
                  ? "Remix this playlist"
                  : ""}
              {(canEdit || id.startsWith("sjpl_") || id.startsWith("pl_")) && <Icon name="arrow" />}
            </Link>
            {notice && (
              <p role="status" className="message success-message">
                {notice}
              </p>
            )}
            <div className="section-heading" style={{ marginTop: 30 }}>
              <h2>
                The tracklist <span className="count">{tracks.length}</span>
              </h2>
              <Link href="/build" className="text-link">
                Make your own mix <Icon name="plus" />
              </Link>
            </div>
            <ul className="track-list">
              {tracks.map((t, i) => (
                <li className="track-row" key={t.id}>
                  <span className="track-number">
                    {currentTrack?.id === t.id ? <Icon name="music" /> : String(i + 1).padStart(2, "0")}
                  </span>
                  <Cover name={t.title} items={[t]} />
                  <div className="track-info">
                    <h3>{t.title}</h3>
                    <p>{t.channelTitle || "YouTube"}</p>
                  </div>
                  <button className="icon-button" aria-label={`Play ${t.title}`} onClick={() => playQueue(tracks, i)}>
                    <Icon name="play" />
                  </button>
                  <MoreMenu
                    target={{ kind: "song", item: t }}
                    onNotice={setNotice}
                    onFindAlts={setAltItem}
                  />
                  {id.startsWith("pl_") && (
                    <button className="icon-button" aria-label={`Remove ${t.title}`} onClick={() => remove(t.id)}>
                      <Icon name="close" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {!tracks.length && (
              <div className="empty-state">
                <p>This playlist is empty.</p>
                <Link href="/build" className="button primary">
                  Build a new playlist
                </Link>
              </div>
            )}
            <AltVersionsModal item={altItem} onClose={() => setAltItem(null)} onNotice={setNotice} />
          </>
        )
      )}
    </div>
  );
}
