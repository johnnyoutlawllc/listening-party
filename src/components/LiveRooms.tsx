"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { Cover } from "./Cover";
import { CardSizeSlider, exploreGridClass } from "./CardSizeSlider";
import { loadCardSize, type CardSize } from "@/lib/store";
import { requestJson, type LiveRoom } from "@/lib/shared";

export function LiveRooms({ standalone = false }: { standalone?: boolean }) {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cardSize, setCardSize] = useState<CardSize>("md");

  useEffect(() => {
    setCardSize(loadCardSize());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const data = await requestJson<LiveRoom[]>("/api/rooms");
        if (!cancelled) {
          setRooms(data);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load live rooms.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [attempt]);

  const heading = (
    <div className="section-heading">
      <div>
        <p className="eyebrow">
          <span className="tiny-dot" /> THE SAME SONG. THE SAME MOMENT.
        </p>
        <h2>
          Live rooms <span className="count">{rooms.length} on air</span>
        </h2>
      </div>
      <div className="section-tools">
        <CardSizeSlider value={cardSize} onChange={setCardSize} />
        <Link href="/room" className="text-link">
          Start a room <Icon name="arrow" />
        </Link>
      </div>
    </div>
  );

  const body = error ? (
    <div className="live-empty">
      <Icon name="radio" />
      <div>
        <h3>We lost the signal.</h3>
        <p role="alert">{error}</p>
      </div>
      <button className="button secondary" onClick={() => setAttempt((v) => v + 1)}>
        Try again
      </button>
    </div>
  ) : loading ? (
    <div className="live-empty" role="status">
      <Icon name="radio" />
      Tuning in to live rooms…
    </div>
  ) : rooms.length ? (
    <div className={exploreGridClass(cardSize)}>
      {rooms.map((r) => {
        const current = r.tracks[r.track_index] || r.tracks[0];
        return (
          <div className="playlist-explore-cardwrap" key={r.id}>
            <Link className="playlist-explore-card" href={`/room?live=${r.id}`}>
              <Cover items={r.tracks} name={r.name} live />
              <span className="playlist-explore-body">
                <span className="live-badge">
                  <span className="tiny-dot" />
                  LIVE NOW
                </span>
                <span className="playlist-explore-name">{r.name}</span>
                <span className="playlist-explore-meta">
                  <span className="pl-meta-n">{current?.title || "Between tracks"}</span>
                  <span className="pl-meta-by">{r.tracks.length} tracks</span>
                </span>
                <span className="playlist-explore-action">Join room →</span>
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="live-empty">
      <span className="radio-mark">
        <Icon name="radio" />
      </span>
      <div>
        <h3>The floor is yours.</h3>
        <p>
          No rooms are broadcasting right now. Pick a playlist, go live, and give someone a new favorite song.
        </p>
      </div>
      <Link href="/room" className="button secondary">
        Start a room <Icon name="arrow" />
      </Link>
    </div>
  );

  if (standalone) {
    return (
      <div className="page-shell">
        <div className="page-intro">
          <div>
            <p className="eyebrow">EVERY GOOD MIX DESERVES AN AUDIENCE</p>
            <h1>Live rooms</h1>
            <p className="intro-copy">Tune in together. Same song, same moment.</p>
          </div>
          <Link href="/room" className="button primary">
            <Icon name="radio" /> Start a room
          </Link>
        </div>
        {heading}
        {body}
      </div>
    );
  }

  return (
    <section className="live-section" id="live-rooms">
      {heading}
      {body}
    </section>
  );
}
