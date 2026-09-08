# Listening Party — start here

Import public YouTube media into playlists, share them, discover better takes, Take a Break from what you hate, and optionally listen together in a sync room.

| | |
|---|---|
| Product | Listening Party |
| Domain | listeningparty.stream (Porkbun) |
| Live now | https://listeningparty.stream |
| Also | www → apex 308; listeningparty.outlawapps.online → apex 308 |
| Local | `C:\AI Projects\Projects\listening-party` |
| Hub card | outlawapps-online → Listening Party |
| Vercel | `listening-party` (`prj_z9L9AKR8qZbA8HMvpTKW4d0JFGov`), auto-deploys on push to main |
| Stack | Next.js 16 + Tailwind v4 + TypeScript + Supabase (schema `party` planned) |
| Support | support@listeningparty.stream (Porkbun email forward — set the destination inbox) |

## Sibling products

- **Suffering Jukebox** stays the artist-exploration product.
- This app is playlist-first: import, share, discover (alts + breaks). Sync rooms are a feature, not the brand center.

## Brand

- Mark: purple rounded-square party logo, monkey in headphones, star stripe (Dem/Rep inspired).
- Tagline: **JOIN THE LISTENING PARTY**
- Assets: `public/logo-mark.png`, `public/logo-mark.svg`, `public/icon.svg`

## DNS (Porkbun)

- `A @ -> 216.198.79.1`
- `CNAME www -> cname.vercel-dns.com`
- MX + SPF left for Porkbun email forwarding (`support@` etc.)

## Docs

- `OPEN-ISSUES.md` — known gaps
- `DECISIONS.md` — deliberate choices
