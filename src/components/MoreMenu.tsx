"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  addTrackToPlaylist,
  loadBreaks,
  loadPlaylists,
  saveBreaks,
  toggleBreakTarget,
  type BreakTarget,
  type MediaItem,
  type Playlist,
} from "@/lib/store";
import { Icon } from "./Icon";

type SongTarget = { kind: "song"; item: MediaItem };
type PlaylistTarget = {
  kind: "playlist";
  playlist: Playlist;
  tracks: MediaItem[];
};

type Target = SongTarget | PlaylistTarget;

function useOutsideClose(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, ref]);
}

function PlaylistPicker({
  item,
  onDone,
  onBack,
}: {
  item: MediaItem;
  onDone: (message: string) => void;
  onBack: () => void;
}) {
  const lists = loadPlaylists().filter((p) => !p.id.startsWith("sjpl_"));
  if (!lists.length) {
    return (
      <div className="more-submenu">
        <button type="button" className="more-item" onClick={onBack}>
          ← Back
        </button>
        <p className="more-empty">No personal playlists yet.</p>
        <Link className="more-item" href="/build" onClick={() => onDone("")}>
          Build a Playlist
        </Link>
      </div>
    );
  }
  return (
    <div className="more-submenu">
      <button type="button" className="more-item" onClick={onBack}>
        ← Back
      </button>
      <p className="more-hint">Add to playlist</p>
      {lists.map((p) => (
        <button
          key={p.id}
          type="button"
          className="more-item"
          onClick={() => {
            const updated = addTrackToPlaylist(p.id, item);
            onDone(updated ? `Added to ${updated.name}.` : "Couldn't add to that playlist.");
          }}
        >
          {p.name}
          <span className="more-sub">{p.itemIds.length}</span>
        </button>
      ))}
    </div>
  );
}

export function MoreMenu({
  target,
  onNotice,
  onFindAlts,
  className = "",
}: {
  target: Target;
  onNotice?: (message: string) => void;
  onFindAlts?: (item: MediaItem) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"root" | "playlists">("root");
  const [breaks, setBreaks] = useState<BreakTarget[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useOutsideClose(open, () => setOpen(false), wrapRef);
  useEffect(() => {
    if (open) setBreaks(loadBreaks());
  }, [open]);

  const song = target.kind === "song" ? target.item : null;
  const playlist = target.kind === "playlist" ? target.playlist : null;
  const breakKey = song ? song.id : playlist!.id;
  const breakKind = song ? "item" : "playlist";
  const onBreak = breaks.some((b) => b.kind === breakKind && b.key === breakKey);

  function closeWith(message?: string) {
    setOpen(false);
    setView("root");
    if (message) onNotice?.(message);
  }

  function toggleBreak() {
    const next = toggleBreakTarget(breaks, {
      kind: breakKind,
      key: breakKey,
      label: song?.title || playlist!.name,
    });
    saveBreaks(next);
    setBreaks(next);
    closeWith(onBreak ? "Break ended." : "On a break. It'll sit out for a while.");
  }

  function addPlaylistTracksTo(otherId: string) {
    if (!playlist) return;
    const tracks = target.kind === "playlist" ? target.tracks : [];
    let added = 0;
    for (const track of tracks) {
      const before = loadPlaylists().find((p) => p.id === otherId)?.itemIds.length ?? 0;
      addTrackToPlaylist(otherId, track);
      const after = loadPlaylists().find((p) => p.id === otherId)?.itemIds.length ?? 0;
      if (after > before) added += 1;
    }
    const name = loadPlaylists().find((p) => p.id === otherId)?.name || "playlist";
    closeWith(added ? `Added ${added} track${added === 1 ? "" : "s"} to ${name}.` : `Already in ${name}.`);
  }

  let body: ReactNode = null;
  if (open && view === "playlists" && song) {
    body = (
      <PlaylistPicker item={song} onBack={() => setView("root")} onDone={(msg) => closeWith(msg)} />
    );
  } else if (open && view === "playlists" && playlist) {
    const lists = loadPlaylists().filter((p) => p.id !== playlist.id && !p.id.startsWith("sjpl_"));
    body = (
      <div className="more-submenu">
        <button type="button" className="more-item" onClick={() => setView("root")}>
          ← Back
        </button>
        <p className="more-hint">Add tracks to playlist</p>
        {lists.length ? (
          lists.map((p) => (
            <button key={p.id} type="button" className="more-item" onClick={() => addPlaylistTracksTo(p.id)}>
              {p.name}
              <span className="more-sub">{p.itemIds.length}</span>
            </button>
          ))
        ) : (
          <p className="more-empty">Make another playlist first.</p>
        )}
      </div>
    );
  } else if (open) {
    body = (
      <div className="more-panel" role="menu" id={menuId}>
        {playlist && (
          <Link className="more-item" href={`/playlists/${playlist.id}`} onClick={() => closeWith()}>
            Open playlist
          </Link>
        )}
        <button type="button" className="more-item" onClick={toggleBreak}>
          {onBreak ? "End break" : "Take a Break"}
        </button>
        <button type="button" className="more-item" onClick={() => setView("playlists")}>
          Add to playlists
          <span className="more-sub">›</span>
        </button>
        {song && (
          <button
            type="button"
            className="more-item"
            onClick={() => {
              setOpen(false);
              setView("root");
              onFindAlts?.(song);
            }}
          >
            Find alternative versions
            <span className="more-sub">›</span>
          </button>
        )}
        {playlist && target.kind === "playlist" && target.tracks[0] && (
          <button
            type="button"
            className="more-item"
            onClick={() => {
              setOpen(false);
              setView("root");
              onFindAlts?.(target.tracks[0]);
            }}
          >
            Find alternative versions
            <span className="more-sub">›</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`more-menu ${className}`} ref={wrapRef}>
      <button
        type="button"
        className="more-trigger"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
          setView("root");
        }}
      >
        ⋯
      </button>
      {body}
    </div>
  );
}
