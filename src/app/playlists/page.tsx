"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadLibrary,
  loadPlaylists,
  newId,
  savePlaylists,
  type MediaItem,
  type Playlist,
} from "@/lib/store";

export default function PlaylistsPage() {
  const [lists, setLists] = useState<Playlist[]>([]);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setLists(loadPlaylists());
    setLibrary(loadLibrary());
  }, []);

  function createList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const list: Playlist = {
      id: newId("pl"),
      name: trimmed,
      itemIds: [],
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    };
    const next = [list, ...lists];
    setLists(next);
    savePlaylists(next);
    setName("");
    setSelected(list.id);
  }

  function setVisibility(id: string, visibility: Playlist["visibility"]) {
    const next = lists.map((l) =>
      l.id === id ? { ...l, visibility, updatedAt: new Date().toISOString() } : l
    );
    setLists(next);
    savePlaylists(next);
  }

  function addFromLibrary(listId: string, itemId: string) {
    const next = lists.map((l) => {
      if (l.id !== listId) return l;
      if (l.itemIds.includes(itemId)) return l;
      return { ...l, itemIds: [...l.itemIds, itemId], updatedAt: new Date().toISOString() };
    });
    setLists(next);
    savePlaylists(next);
  }

  function removeFromList(listId: string, itemId: string) {
    const next = lists.map((l) =>
      l.id !== listId
        ? l
        : {
            ...l,
            itemIds: l.itemIds.filter((id) => id !== itemId),
            updatedAt: new Date().toISOString(),
          }
    );
    setLists(next);
    savePlaylists(next);
  }

  const active = lists.find((l) => l.id === selected) ?? null;
  const byId = new Map(library.map((i) => [i.id, i]));

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 pb-24">
      <h1 className="font-display text-4xl tracking-tight">Playlists</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Build lists from your library. Sharing grants and cloud sync land next; visibility is local for now.
      </p>

      <form onSubmit={createList} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-[#1a1020] hover:brightness-110"
        >
          Create playlist
        </button>
      </form>

      <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
        <ul className="space-y-2">
          {lists.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              No playlists yet.
            </li>
          )}
          {lists.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setSelected(l.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selected === l.id
                    ? "border-accent bg-surface"
                    : "border-border bg-surface/40 hover:border-border"
                }`}
              >
                <span className="block font-medium truncate">{l.name}</span>
                <span className="text-xs text-muted">
                  {l.itemIds.length} items · {l.visibility}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-border bg-surface/50 p-5 min-h-64">
          {!active && (
            <p className="text-sm text-muted">Select or create a playlist.</p>
          )}
          {active && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl tracking-tight">{active.name}</h2>
                  <p className="text-xs text-muted mt-1">
                    Updated {new Date(active.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(["private", "link", "public"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(active.id, v)}
                      className={`rounded-lg px-2.5 py-1 text-xs capitalize border ${
                        active.visibility === v
                          ? "border-accent text-text bg-bg"
                          : "border-border text-muted"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <h3 className="mt-6 text-sm font-medium text-muted">In this playlist</h3>
              <ul className="mt-2 space-y-2">
                {active.itemIds.length === 0 && (
                  <li className="text-sm text-muted">Empty. Add from your library below.</li>
                )}
                {active.itemIds.map((id) => {
                  const item = byId.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg/40 px-3 py-2"
                    >
                      <span className="truncate text-sm">{item?.title ?? id}</span>
                      <button
                        type="button"
                        onClick={() => removeFromList(active.id, id)}
                        className="text-xs text-muted hover:text-text"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>

              <h3 className="mt-6 text-sm font-medium text-muted">Add from library</h3>
              {library.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Library is empty.{" "}
                  <Link href="/library" className="text-accent-2 underline-offset-2 hover:underline">
                    Import something
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-2 space-y-2 max-h-64 overflow-auto">
                  {library.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                    >
                      <span className="truncate text-sm">{item.title}</span>
                      <button
                        type="button"
                        disabled={active.itemIds.includes(item.id)}
                        onClick={() => addFromLibrary(active.id, item.id)}
                        className="text-xs text-accent-2 disabled:text-muted disabled:opacity-50"
                      >
                        {active.itemIds.includes(item.id) ? "Added" : "Add"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href={`/room?playlist=${active.id}`}
                className="mt-8 inline-flex rounded-xl border border-border px-4 py-2 text-sm hover:border-accent"
              >
                Start a room from this playlist
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
