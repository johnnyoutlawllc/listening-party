import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-20">
      <section className="relative overflow-hidden pt-14 pb-16 sm:pt-20 sm:pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-accent-2 mb-4">Outlaw Apps</p>
        <h1 className="font-display text-5xl sm:text-7xl leading-[0.95] tracking-tight max-w-3xl">
          Listening Party
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted leading-relaxed">
          Import anything public on YouTube. Build playlists. Share them. Find a better take.
          Take a break from what you are sick of. Start a room when the group wants the same moment.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/library"
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-[#1a1020] hover:brightness-110 transition"
          >
            Import to library
          </Link>
          <Link
            href="/playlists"
            className="rounded-xl border border-border bg-surface/60 px-5 py-3 text-sm font-medium text-text hover:border-accent/50 transition"
          >
            Your playlists
          </Link>
          <Link
            href="/room"
            className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted hover:text-text transition"
          >
            Start a room
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Playlists and share",
            body: "Private, link, or public. Grant who can view, add, and reorder.",
          },
          {
            title: "Discover and break",
            body: "Swap in an alt version. Snooze a song or channel when it wears thin.",
          },
          {
            title: "Listen together",
            body: "Optional sync rooms for road trips and couches. Same queue, separate speakers.",
          },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-border bg-surface/50 p-5">
            <h2 className="font-display text-xl tracking-tight">{card.title}</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">{card.body}</p>
          </div>
        ))}
      </section>

      <p className="mt-12 text-xs text-muted">
        Building on listeningparty.outlawapps.online. Custom domain listeningparty.stream comes later.
        Sibling to Suffering Jukebox, which stays focused on exploring artists.
      </p>
    </div>
  );
}
