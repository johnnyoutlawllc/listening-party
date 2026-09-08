"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { YouTubeImportWizard } from "@/components/YouTubeImportWizard";
import {
  importSufferingJukeboxSeed,
  loadLibrary,
  loadPlaylists,
  saveLibrary,
  savePlaylists,
  type MediaItem,
  type Playlist,
} from "@/lib/store";
import { requestJson, asPlaylist, type SharedPlaylist } from "@/lib/shared";

function BuildInner() {
  const router = useRouter();
  const editId = useSearchParams().get("edit");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Playlist["visibility"]>("public");
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [source, setSource] = useState("library");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(25);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    importSufferingJukeboxSeed();
    setLibrary(loadLibrary());
    if (!editId) return;
    let cancelled = false;
    const load = async () => {
      try {
        let playlist: Playlist;
        let queue: MediaItem[];
        if (editId.startsWith("sjpl_") || editId.startsWith("pl_")) {
          const local = loadPlaylists().find((p) => p.id === editId);
          if (!local) throw new Error("This playlist isn't available on this device.");
          playlist = local;
          const byId = new Map(loadLibrary().map((t) => [t.id, t]));
          queue = local.itemIds.map((id) => byId.get(id)).filter((t): t is MediaItem => !!t);
        } else {
          const shared = await requestJson<SharedPlaylist & { canEdit: boolean }>("/api/playlists/" + editId);
          if (!shared.canEdit) throw new Error("Only the creator can edit this mix.");
          playlist = asPlaylist(shared);
          queue = shared.tracks;
        }
        if (!cancelled) {
          setName(playlist.name);
          setDescription(playlist.description || "");
          setVisibility(playlist.visibility);
          setSelected(queue);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load the playlist.");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const results = library.filter((t) =>
    (t.title + " " + (t.channelTitle || "")).toLowerCase().includes(search.toLowerCase()),
  );
  const selectedIds = new Set(selected.map((t) => t.youtubeId));

  function toggle(t: MediaItem) {
    setError("");
    setSelected((prev) =>
      prev.some((i) => i.youtubeId === t.youtubeId)
        ? prev.filter((i) => i.youtubeId !== t.youtubeId)
        : prev.length < 200
          ? [...prev, t]
          : prev,
    );
  }

  function move(i: number, d: number) {
    setSelected((prev) => {
      const next = [...prev];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  }

  function next() {
    setError("");
    if (step === 0 && !name.trim()) {
      setError("First, give your playlist a name.");
      return;
    }
    if (step === 1 && !selected.length) {
      setError("Add at least one track to continue.");
      return;
    }
    setStep((s) => s + 1);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const canUpdate = editId && !editId.startsWith("sjpl_") && !editId.startsWith("pl_");
      const created = await requestJson<SharedPlaylist>(
        canUpdate ? "/api/playlists/" + editId : "/api/playlists",
        {
          method: canUpdate ? "PATCH" : "POST",
          body: JSON.stringify({ name, description, visibility, tracks: selected }),
        },
      );
      const existing = loadLibrary();
      const ids = new Set(existing.map((t) => t.id));
      try {
        saveLibrary([...existing, ...created.tracks.filter((t) => !ids.has(t.id))]);
        savePlaylists([asPlaylist(created), ...loadPlaylists().filter((p) => p.id !== created.id)]);
      } catch {
        /* shared playlist remains available */
      }
      router.push("/playlists/" + created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flow-shell">
      <Link href="/" className="back-link">
        <Icon name="back" />
        Back to Discover
      </Link>
      <div className="flow-heading">
        <p className="eyebrow">YOUR TASTE. YOUR TRACKLIST.</p>
        <h1>Build a Playlist</h1>
        <p>A great mix starts with one song. Let&apos;s find yours.</p>
      </div>
      <ol className="steps" aria-label="Playlist creation progress">
        {["Set the mood", "Add your tracks", "Make it a mix"].map((s, i) => (
          <li
            key={s}
            className={`step ${i === step ? "current" : i < step ? "done" : ""}`}
            aria-current={i === step ? "step" : undefined}
          >
            <span>{i < step ? <Icon name="check" /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="builder-layout">
        <div className="panel">
          {step === 0 && (
            <>
              <h2>What&apos;s the vibe?</h2>
              <p className="help">A road trip, a rabbit hole, or just a really good Tuesday.</p>
              <label className="field">
                Playlist name
                <input
                  autoFocus
                  value={name}
                  maxLength={100}
                  placeholder="e.g. The long way home"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                A few words about your mix <span className="muted">(optional)</span>
                <textarea
                  rows={3}
                  value={description}
                  maxLength={600}
                  placeholder="For the windows-down, nowhere-to-be kind of drive."
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="field">
                Who can discover it?
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Playlist["visibility"])}
                >
                  <option value="public">Everyone · Public playlist</option>
                  <option value="link">People with the link · Unlisted</option>
                  <option value="private">Only me · Private</option>
                </select>
                <small>
                  {visibility === "public"
                    ? "Your playlist will appear on Discover for everyone."
                    : visibility === "link"
                      ? "Anyone with the direct link can listen. It won't appear on Discover."
                      : "Only this browser can access it. Keep your browser cookies to retain access."}
                </small>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Find your first track. Then another.</h2>
              <p className="help">Mix tracks from the library with your own YouTube finds.</p>
              <div className="source-tabs">
                <button
                  className={`button secondary ${source === "library" ? "selected" : ""}`}
                  aria-pressed={source === "library"}
                  onClick={() => setSource("library")}
                >
                  <Icon name="music" />
                  Track library
                </button>
                <button
                  className={`button secondary ${source === "youtube" ? "selected" : ""}`}
                  aria-pressed={source === "youtube"}
                  onClick={() => setSource("youtube")}
                >
                  <Icon name="youtube" />
                  From YouTube
                </button>
              </div>
              {source === "library" ? (
                <>
                  <label className="search-field">
                    <Icon name="search" />
                    <input
                      aria-label="Search tracks"
                      placeholder="Search tracks or artists…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setLimit(25);
                      }}
                    />
                  </label>
                  <ul className="track-list track-scroll">
                    {results.slice(0, limit).map((t) => (
                      <li className="track-row" key={t.id}>
                        <Cover name={t.title} items={[t]} />
                        <div className="track-info">
                          <h3>{t.title}</h3>
                          <p>{t.channelTitle || "YouTube"}</p>
                        </div>
                        <button
                          className={`icon-button ${selectedIds.has(t.youtubeId) ? "selected" : ""}`}
                          disabled={!selectedIds.has(t.youtubeId) && selected.length >= 200}
                          aria-label={`${selectedIds.has(t.youtubeId) ? "Remove" : "Add"} ${t.title}`}
                          onClick={() => toggle(t)}
                        >
                          <Icon name={selectedIds.has(t.youtubeId) ? "check" : "plus"} />
                        </button>
                      </li>
                    ))}
                    {results.length === 0 && (
                      <li className="help">No matching tracks. Try another search or import from YouTube.</li>
                    )}
                  </ul>
                  {results.length > limit && (
                    <button className="button secondary load-more" onClick={() => setLimit((v) => v + 25)}>
                      Show more tracks
                    </button>
                  )}
                </>
              ) : (
                <div className="youtube-import-panel">
                  <h3>Import from YouTube</h3>
                  <p className="help">
                    Search YouTube, paste a video link, or drop in a playlist URL and pick what to add.
                  </p>
                  <button type="button" className="button primary" onClick={() => setImportOpen(true)}>
                    <Icon name="youtube" />
                    Open import wizard
                  </button>
                </div>
              )}
              <p className="help" role="status" style={{ marginTop: 20 }}>
                {selected.length} of 200 tracks selected
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Give it a final spin.</h2>
              <p className="help">Put your tracks in just the right order. Remove anything that doesn&apos;t fit.</p>
              <ul className="track-list">
                {selected.map((t, i) => (
                  <li className="track-row" key={t.youtubeId}>
                    <span className="track-number">{String(i + 1).padStart(2, "0")}</span>
                    <Cover name={t.title} items={[t]} />
                    <div className="track-info">
                      <h3>{t.title}</h3>
                      <p>{t.channelTitle || "YouTube"}</p>
                    </div>
                    <button
                      className="icon-button"
                      disabled={i === 0}
                      aria-label={`Move ${t.title} up`}
                      onClick={() => move(i, -1)}
                    >
                      <Icon name="up" />
                    </button>
                    <button
                      className="icon-button"
                      disabled={i === selected.length - 1}
                      aria-label={`Move ${t.title} down`}
                      onClick={() => move(i, 1)}
                    >
                      <Icon name="down" />
                    </button>
                    <button className="icon-button" aria-label={`Remove ${t.title}`} onClick={() => toggle(t)}>
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ul>
              {selected.length === 0 && (
                <p className="message">Your mix needs at least one track. Go back to add some music.</p>
              )}
            </>
          )}

          {error && (
            <p className="message" role="alert">
              {error}
            </p>
          )}
          <div className="wizard-actions">
            <button
              className="button secondary"
              disabled={step === 0 || busy}
              onClick={() => {
                setStep((s) => s - 1);
                setError("");
              }}
            >
              <Icon name="back" />
              Back
            </button>
            {step < 2 ? (
              <button className="button primary" onClick={next}>
                Continue <Icon name="arrow" />
              </button>
            ) : (
              <button className="button primary" disabled={busy || !selected.length} onClick={save}>
                {busy ? "Saving your mix…" : visibility === "public" ? "Publish playlist" : "Save playlist"}
                <Icon name="check" />
              </button>
            )}
          </div>
        </div>
        <aside className="panel builder-aside">
          <Cover items={selected} name={name || "Your mix"} />
          <p className="eyebrow">YOUR MIX, TAKING SHAPE</p>
          <h3>{name || "Something good is coming."}</h3>
          <p className="help">{description || "A few favorites. A few surprises. All you."}</p>
          <p className="help">
            {selected.length} tracks · {visibility === "link" ? "Unlisted" : visibility}
          </p>
        </aside>
      </div>

      <YouTubeImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Add YouTube to this mix"
        onImport={(imported) => {
          setLibrary(loadLibrary());
          setSelected((prev) => {
            const ids = new Set(prev.map((t) => t.youtubeId));
            const next = [...prev];
            for (const item of imported) {
              if (ids.has(item.youtubeId) || next.length >= 200) continue;
              ids.add(item.youtubeId);
              next.push(item);
            }
            return next;
          });
          setError("");
        }}
      />
    </div>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={<div className="flow-shell">Opening your mix…</div>}>
      <BuildInner />
    </Suspense>
  );
}
