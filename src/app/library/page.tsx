"use client";

import { useEffect, useState } from "react";
import {
  loadBreaks,
  loadLibrary,
  newId,
  parseYoutubeInput,
  saveBreaks,
  saveLibrary,
  thumbFor,
  type BreakTarget,
  type MediaItem,
} from "@/lib/store";

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [breaks, setBreaks] = useState<BreakTarget[]>([]);
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadLibrary());
    setBreaks(loadBreaks());
  }, []);

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const youtubeId = parseYoutubeInput(input);
    if (!youtubeId) {
      setError("Paste a YouTube URL or 11-character video id.");
      return;
    }
    if (items.some((i) => i.youtubeId === youtubeId)) {
      setError("Already in your library.");
      return;
    }
    const next: MediaItem = {
      id: newId("m"),
      youtubeId,
      title: title.trim() || `YouTube ${youtubeId}`,
      thumbUrl: thumbFor(youtubeId),
      addedAt: new Date().toISOString(),
    };
    const updated = [next, ...items];
    setItems(updated);
    saveLibrary(updated);
    setInput("");
    setTitle("");
  }

  function takeBreak(item: MediaItem) {
    const next = [
      { kind: "item" as const, key: item.id, label: item.title, until: null },
      ...breaks.filter((b) => !(b.kind === "item" && b.key === item.id)),
    ];
    setBreaks(next);
    saveBreaks(next);
  }

  function clearBreak(key: string) {
    const next = breaks.filter((b) => !(b.kind === "item" && b.key === key));
    setBreaks(next);
    saveBreaks(next);
  }

  function removeItem(id: string) {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    saveLibrary(updated);
    if (playing === id) setPlaying(null);
  }

  const broken = new Set(breaks.filter((b) => b.kind === "item").map((b) => b.key));

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 pb-24">
      <h1 className="font-display text-4xl tracking-tight">Library</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Import public YouTube links. Stored on this device for now; cloud sync comes with the party schema.
      </p>

      <form onSubmit={addItem} className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="YouTube URL or video id"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-[#1a1020] hover:brightness-110"
        >
          Import
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-accent">{error}</p>}

      {playing && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-black aspect-video">
          <iframe
            title="Player"
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${items.find((i) => i.id === playing)?.youtubeId}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <ul className="mt-10 space-y-3">
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-muted text-sm">
            Nothing imported yet. Paste a YouTube link above.
          </li>
        )}
        {items.map((item) => {
          const onBreak = broken.has(item.id);
          return (
            <li
              key={item.id}
              className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-4 sm:flex-row sm:items-center ${
                onBreak ? "opacity-55" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbUrl || thumbFor(item.youtubeId)}
                alt=""
                className="h-20 w-36 rounded-lg object-cover shrink-0 bg-bg"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted mt-1">{item.youtubeId}</p>
                {onBreak && <p className="text-xs text-accent mt-1">On a break</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying(item.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-accent-2"
                >
                  Play
                </button>
                <button
                  type="button"
                  onClick={() => (onBreak ? clearBreak(item.id) : takeBreak(item))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-accent"
                >
                  {onBreak ? "End break" : "Take a break"}
                </button>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " official audio")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-accent-2"
                >
                  Find alts
                </a>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-text"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
