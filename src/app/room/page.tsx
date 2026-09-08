"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  loadLibrary,
  loadPlaylists,
  thumbFor,
  type MediaItem,
  type Playlist,
} from "@/lib/store";

function RoomInner() {
  const params = useSearchParams();
  const playlistId = params.get("playlist");
  const [lists, setLists] = useState<Playlist[]>([]);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [code] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase());
  const [index, setIndex] = useState(0);
  const [chat, setChat] = useState<{ who: string; text: string; at: string }[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setLists(loadPlaylists());
    setLibrary(loadLibrary());
  }, []);

  const playlist = useMemo(
    () => lists.find((l) => l.id === playlistId) ?? lists[0] ?? null,
    [lists, playlistId]
  );

  const queue = useMemo(() => {
    if (!playlist) return [] as MediaItem[];
    const byId = new Map(library.map((i) => [i.id, i]));
    return playlist.itemIds.map((id) => byId.get(id)).filter(Boolean) as MediaItem[];
  }, [playlist, library]);

  const current = queue[index] ?? null;

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setChat((c) => [...c, { who: "You", text, at: new Date().toISOString() }]);
    setDraft("");
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 pb-24">
      <h1 className="font-display text-4xl tracking-tight">Room</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Sync listening scaffold. Host clock, guest join, and permissions wire up after playlists share.
        Room code is local-only for now.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono tracking-widest">
          {code}
        </span>
        <span className="text-muted">Share this code when multiplayer joins.</span>
      </div>

      {!playlist && (
        <p className="mt-10 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted">
          Create a playlist with items first, then open a room from Playlists.
        </p>
      )}

      {playlist && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm text-muted mb-2">
              Playing from <span className="text-text">{playlist.name}</span>
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-black aspect-video">
              {current ? (
                <iframe
                  title="Room player"
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${current.youtubeId}?rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  Queue is empty
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={index >= queue.length - 1}
                onClick={() => setIndex((i) => Math.min(queue.length - 1, i + 1))}
                className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
            <ul className="mt-6 space-y-2">
              {queue.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                      i === index ? "border-accent bg-surface" : "border-border bg-surface/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbUrl || thumbFor(item.youtubeId)}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
                    />
                    <span className="truncate text-sm">{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface/50 p-4 flex flex-col min-h-80">
            <h2 className="font-display text-xl">Chat</h2>
            <p className="text-xs text-muted mt-1">Local stub. Realtime comes with rooms.</p>
            <ul className="mt-4 flex-1 space-y-2 overflow-auto">
              {chat.length === 0 && (
                <li className="text-sm text-muted">No messages yet.</li>
              )}
              {chat.map((m, i) => (
                <li key={`${m.at}-${i}`} className="text-sm">
                  <span className="text-accent-2">{m.who}</span>{" "}
                  <span className="text-muted">{m.text}</span>
                </li>
              ))}
            </ul>
            <form onSubmit={sendChat} className="mt-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Say something"
                className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#1a1020]"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="px-5 py-10 text-muted">Loading room…</div>}>
      <RoomInner />
    </Suspense>
  );
}
