"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import seed from "@/data/sj-playlists.json";
import {
  importSufferingJukeboxSeed,
  loadCardSize,
  loadLibrary,
  loadPlaylists,
  type CardSize,
  type MediaItem,
  type Playlist,
} from "@/lib/store";
import { Cover } from "./Cover";
import { Icon } from "./Icon";
import { LiveRooms } from "./LiveRooms";
import { MoreMenu } from "./MoreMenu";
import { AltVersionsModal } from "./AltVersionsModal";
import { CardSizeSlider, exploreGridClass } from "./CardSizeSlider";
import { requestJson, asPlaylist, type SharedPlaylist } from "@/lib/shared";

const publicLists = seed.playlists.filter((p) => p.visibility === "public") as Playlist[];
const filters = ["All sounds", "Indie & alternative", "Hip-hop", "Rock", "Instrumental"];

function category(name: string) {
  if (/instrumental/i.test(name)) return "Instrumental";
  if (/eminem|hip hop/i.test(name)) return "Hip-hop";
  if (/floyd|haken/i.test(name)) return "Rock";
  return "Indie & alternative";
}

export function Discover({ saved = false }: { saved?: boolean }) {
  const [lists, setLists] = useState<Playlist[]>(saved ? [] : publicLists);
  const [library, setLibrary] = useState<MediaItem[]>(seed.library);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All sounds");
  const [limit, setLimit] = useState(saved ? 24 : 8);
  const [notice, setNotice] = useState("");
  const [cardSize, setCardSize] = useState<CardSize>("md");
  const [altItem, setAltItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    importSufferingJukeboxSeed();
    setCardSize(loadCardSize());
    const localLibrary = loadLibrary();
    const localLists = loadPlaylists();
    setLibrary(localLibrary);
    setLists(saved ? localLists : publicLists);
    requestJson<SharedPlaylist[]>(saved ? "/api/playlists?mine=1" : "/api/playlists")
      .then((shared) => {
        if (cancelled) return;
        const base = saved ? localLists : publicLists;
        const merged = new Map(base.map((p) => [p.id, p]));
        shared.forEach((p) => merged.set(p.id, asPlaylist(p)));
        setLists([
          ...shared.map(asPlaylist),
          ...Array.from(merged.values()).filter((p) => !shared.some((s) => s.id === p.id)),
        ]);
        const allTracks = new Map(localLibrary.map((t) => [t.id, t]));
        shared.flatMap((p) => p.tracks).forEach((t) => allTracks.set(t.id, t));
        setLibrary([...allTracks.values()]);
      })
      .catch(() => {
        if (!cancelled) {
          setNotice("Community playlists couldn't load. You can still explore the curated collection.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [saved]);

  const byId = new Map(library.map((item) => [item.id, item]));
  const filtered = lists.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All sounds" || category(p.name) === filter),
  );
  const featured = publicLists.find((p) => p.name === "Blue Pinkerton")!;
  const tracksFor = (p: Playlist) =>
    p.itemIds.map((id) => byId.get(id)).filter((i): i is MediaItem => !!i);

  return (
    <div className="page-shell">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{saved ? "YOUR PERSONAL ROTATION" : "GOOD MUSIC. BETTER COMPANY."}</p>
          <h1>{saved ? "My playlists" : "Find your next obsession."}</h1>
          <p className="intro-copy">
            {saved
              ? "Your favorites, deep cuts, and works in progress."
              : "Deep cuts, full discographies, and someone's very good taste."}
          </p>
        </div>
        <span className="edition">
          <span className="tiny-dot" /> THE LISTENING CLUB
        </span>
      </div>

      {!saved && (
        <section className="feature-grid" aria-label="Featured playlist">
          <Link href={`/playlists/${featured.id}`} className="featured-playlist">
            <Cover items={tracksFor(featured)} name={featured.name} />
            <div className="feature-shade" />
            <div className="feature-content">
              <span className="pill">
                ON REPEAT <span> / </span> EDITOR&apos;S PICK
              </span>
              <h2>
                Blue.
                <br />
                <em>Pinkerton.</em>
                <br />
                No skips.
              </h2>
              <p>Two records. Twenty reasons to turn it up.</p>
              <span className="feature-bottom">
                <span className="button cream">
                  <Icon name="play" /> Explore playlist
                </span>
                <span>Weezer · 20 tracks</span>
              </span>
            </div>
          </Link>
          <Link href="/build" className="build-feature">
            <span className="eyebrow">MAKE IT YOURS</span>
            <span className="build-symbol">
              <Icon name="plus" />
            </span>
            <h2>
              You have
              <br />
              great taste.
              <br />
              <span>Pass it on.</span>
            </h2>
            <p>
              Start with a few favorites.
              <br />
              Add a YouTube find. Make a mix.
            </p>
            <span className="build-feature-footer">
              Build a Playlist <Icon name="arrow" />
            </span>
          </Link>
        </section>
      )}

      <section className="playlist-section" aria-labelledby="playlist-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{saved ? "COLLECTED BY YOU" : "MADE TO BE DISCOVERED"}</p>
            <h2 id="playlist-heading">
              {saved ? "Your collection" : "Public playlists"}
              <span className="count">{lists.length}</span>
            </h2>
          </div>
          <div className="section-tools">
            {saved && (
              <Link className="button primary" href="/build">
                <Icon name="plus" />
                Build a Playlist
              </Link>
            )}
            <CardSizeSlider value={cardSize} onChange={setCardSize} />
            <label className="search-field">
              <Icon name="search" />
              <input
                aria-label="Search playlists"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(saved ? 24 : 8);
                }}
                placeholder="Find a playlist…"
              />
            </label>
          </div>
        </div>

        <div className="filter-row" aria-label="Filter playlists">
          {filters.map((f) => (
            <button
              key={f}
              className={f === filter ? "filter active" : "filter"}
              aria-pressed={f === filter}
              onClick={() => {
                setFilter(f);
                setLimit(saved ? 24 : 8);
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {notice && (
          <p role="status" className="message">
            {notice}
          </p>
        )}

        <div className={exploreGridClass(cardSize)}>
          {filtered.slice(0, limit).map((p) => {
            const tracks = tracksFor(p);
            return (
              <div className="playlist-explore-cardwrap" key={p.id}>
                <Link className="playlist-explore-card" href={`/playlists/${p.id}`}>
                  <Cover items={tracks} name={p.name} />
                  <span className="playlist-explore-body">
                    <span className="playlist-explore-name">{p.name}</span>
                    <span className="playlist-explore-meta">
                      <span className="pl-meta-n">{p.itemIds.length} tracks</span>
                      <span className="pl-meta-by">
                        {p.id.startsWith("sjpl_")
                          ? "Suffering Jukebox"
                          : saved
                            ? "Made by you"
                            : "Community playlist"}
                      </span>
                    </span>
                    <span className="playlist-explore-action">Open playlist →</span>
                  </span>
                </Link>
                <MoreMenu
                  className="playlist-explore-more-wrap"
                  target={{ kind: "playlist", playlist: p, tracks }}
                  onNotice={setNotice}
                  onFindAlts={setAltItem}
                />
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <Icon name="search" />
            <h3>No playlists found</h3>
            <p>Try another title or explore all sounds.</p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setFilter("All sounds");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        {filtered.length > limit && (
          <button className="button secondary load-more" onClick={() => setLimit((v) => v + (saved ? 12 : 8))}>
            Explore more playlists <Icon name="down" />
          </button>
        )}
      </section>

      {!saved && <LiveRooms />}

      <AltVersionsModal item={altItem} onClose={() => setAltItem(null)} onNotice={setNotice} />

      <footer className="site-footer">
        <Link href="/" className="footer-brand">
          <Icon name="headphones" />
          listeningparty.
        </Link>
        <span>A little less algorithm. A little more human.</span>
        <span>AN OUTLAW APPS PROJECT ↗</span>
      </footer>
    </div>
  );
}
