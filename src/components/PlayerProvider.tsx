"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Cover } from "./Cover";
import { Icon } from "./Icon";
import { YouTubePlayer } from "./YouTubePlayer";
import type { MediaItem } from "@/lib/store";

type Rating = "up" | "down" | null;
type Reaction = "heart" | "break" | null;
type PlayerState = {
  ratings: Record<string, Exclude<Rating, null>>;
  reactions: Record<string, Exclude<Reaction, null>>;
};

type PlayerContextValue = {
  currentTrack: MediaItem | null;
  currentIndex: number;
  playQueue: (tracks: MediaItem[], index?: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
const PLAYER_STATE_KEY = "lp.player.reactions.v1";
const PLAYER_STATE_EVENT = "lp-player-state-change";
const EMPTY_PLAYER_STATE: PlayerState = { ratings: {}, reactions: {} };
let cachedPlayerStateRaw: string | null | undefined;
let cachedPlayerState = EMPTY_PLAYER_STATE;

function readState(): PlayerState {
  if (typeof window === "undefined") return EMPTY_PLAYER_STATE;
  try {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    if (raw === cachedPlayerStateRaw) return cachedPlayerState;
    const value = JSON.parse(raw || "{}") as Partial<PlayerState>;
    cachedPlayerStateRaw = raw;
    cachedPlayerState = { ratings: value.ratings || {}, reactions: value.reactions || {} };
    return cachedPlayerState;
  } catch {
    cachedPlayerStateRaw = null;
    cachedPlayerState = EMPTY_PLAYER_STATE;
    return cachedPlayerState;
  }
}

function subscribeToPlayerState(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PLAYER_STATE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PLAYER_STATE_EVENT, callback);
  };
}

function savePlayerState(next: PlayerState) {
  localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(PLAYER_STATE_EVENT));
}

function displayTitle(track: MediaItem) {
  const artist = track.channelTitle?.trim();
  return artist ? track.title.replace(new RegExp(`\\s[-–—]\\s${artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "") : track.title;
}

function Lyrics({ track }: { track: MediaItem }) {
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [lyrics, setLyrics] = useState("");
  const title = displayTitle(track);
  const artist = track.channelTitle || "";

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ title, artist });
    fetch(`/api/lyrics?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Couldn't load lyrics."))))
      .then((data: { lyrics?: string | null }) => {
        const text = data.lyrics?.trim() || "";
        setLyrics(text);
        setStatus(text ? "ready" : "empty");
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [title, artist]);

  return (
    <section className="player-lyrics" aria-live="polite">
      <div className="player-lyrics-heading">
        <span className="eyebrow">LYRICS</span>
        <strong>{displayTitle(track)}</strong>
      </div>
      {status === "loading" && <p>Loading lyrics…</p>}
      {status === "empty" && <p>Lyrics are not available for this recording yet.</p>}
      {status === "error" && <p>Lyrics could not be loaded right now.</p>}
      {status === "ready" && <pre>{lyrics}</pre>}
    </section>
  );
}

function PlayerDock({ queue, index, onIndex, onClose }: { queue: MediaItem[]; index: number; onIndex: (index: number) => void; onClose: () => void }) {
  const track = queue[index];
  const [playing, setPlaying] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [lyricsTrackId, setLyricsTrackId] = useState<string | null>(null);
  const saved = useSyncExternalStore(subscribeToPlayerState, readState, () => EMPTY_PLAYER_STATE);
  const lyricsOpen = lyricsTrackId === track.id;

  const save = useCallback((next: PlayerState) => {
    savePlayerState(next);
  }, []);

  const toggleRating = (rating: Exclude<Rating, null>) => {
    const ratings = { ...saved.ratings };
    if (ratings[track.id] === rating) delete ratings[track.id];
    else ratings[track.id] = rating;
    save({ ...saved, ratings });
  };

  const toggleReaction = (reaction: Exclude<Reaction, null>) => {
    const reactions = { ...saved.reactions };
    if (reactions[track.id] === reaction) delete reactions[track.id];
    else reactions[track.id] = reaction;
    save({ ...saved, reactions });
  };

  const previous = () => index > 0 && onIndex(index - 1);
  const next = () => index < queue.length - 1 && onIndex(index + 1);
  const rating = saved.ratings[track.id];
  const reaction = saved.reactions[track.id];

  return (
    <aside className={`persistent-player ${expanded ? "player-expanded" : ""}`} aria-label="Now playing">
      <div className="persistent-player-video" aria-hidden={!expanded}>
        <YouTubePlayer
          videoId={track.youtubeId}
          autoPlay={playing}
          playing={playing}
          onPlayingChange={setPlaying}
          onEnded={next}
        />
      </div>
      <div className="persistent-player-bar">
        <button className="player-art" onClick={() => setExpanded((value) => !value)} aria-label="Toggle full player">
          <Cover items={[track]} name={track.title} />
        </button>
        <div className="persistent-player-track">
          <span>{displayTitle(track)}</span>
          <small>{track.channelTitle || "Listening Party"} · {index + 1} of {queue.length}</small>
        </div>
        <div className="persistent-player-controls" aria-label="Playback controls">
          <button className="player-control" onClick={previous} disabled={index === 0} aria-label="Previous track"><Icon name="previous" /></button>
          <button className="player-control player-control-main" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}><Icon name={playing ? "pause" : "play"} /></button>
          <button className="player-control" onClick={next} disabled={index >= queue.length - 1} aria-label="Next track"><Icon name="next" /></button>
        </div>
        <div className="persistent-player-reactions" aria-label="Rate this song">
          <button className={rating === "up" ? "player-reaction selected" : "player-reaction"} onClick={() => toggleRating("up")} aria-label="Thumbs up"><Icon name="thumbUp" /></button>
          <button className={rating === "down" ? "player-reaction selected" : "player-reaction"} onClick={() => toggleRating("down")} aria-label="Thumbs down"><Icon name="thumbDown" /></button>
          <button className={reaction === "heart" ? "player-reaction selected heart" : "player-reaction"} onClick={() => toggleReaction("heart")} aria-label="Heart this song"><Icon name="heart" /></button>
          <button className={reaction === "break" ? "player-reaction selected heartbreak" : "player-reaction"} onClick={() => toggleReaction("break")} aria-label="Mark as heartbreak"><Icon name="heartbreak" /></button>
        </div>
        <div className="persistent-player-actions">
          <button className={lyricsOpen ? "player-control selected" : "player-control"} onClick={() => { setExpanded(true); setLyricsTrackId(lyricsOpen ? null : track.id); }} aria-label="View lyrics"><Icon name="lyrics" /></button>
          <button className="player-control" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Minimize player" : "Open full player"}><Icon name={expanded ? "minimize" : "expand"} /></button>
          <button className="player-control" onClick={onClose} aria-label="Close player"><Icon name="close" /></button>
        </div>
      </div>
      {expanded && <div className="persistent-player-expanded-body">{lyricsOpen ? <Lyrics key={track.id} track={track} /> : <div className="player-expanded-empty"><Icon name="headphones" /><p>Playing from your playlist. Open Lyrics to follow along.</p></div>}</div>}
    </aside>
  );
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [index, setIndex] = useState(-1);
  const currentTrack = index >= 0 ? queue[index] || null : null;
  const playQueue = useCallback((tracks: MediaItem[], start = 0) => {
    if (!tracks.length) return;
    setQueue(tracks);
    setIndex(Math.min(Math.max(start, 0), tracks.length - 1));
  }, []);
  const close = useCallback(() => { setQueue([]); setIndex(-1); }, []);
  const value = useMemo(() => ({ currentTrack, currentIndex: index, playQueue }), [currentTrack, index, playQueue]);

  return <PlayerContext.Provider value={value}>{children}{currentTrack && <PlayerDock queue={queue} index={index} onIndex={setIndex} onClose={close} />}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider.");
  return context;
}
