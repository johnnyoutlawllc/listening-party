# Open issues

- Supabase `party` schema has `profiles` only so far; library/playlists are still localStorage + bundled SJ seed.
- Suffering Jukebox import: 18 playlists / ~598 unique tracks bundled in `src/data/sj-playlists.json` (re-export via `scripts/export-sj-playlists.ps1`).
- Auth UI is wired (Google / Apple / email) against `party.profiles`. Add `https://listeningparty.stream/**`, `https://www.listeningparty.stream/**`, and local `http://localhost:3000/**` to the auth `uri_allow_list`. Apple provider still needs Apple Developer credentials in Supabase if it is not already enabled. Library/playlists remain localStorage until more of the `party` schema ships.
- Sync rooms are still light (no chat); Break / alt discovery / YouTube import wizard are local-first helpers backed by `YOUTUBE_API_KEY`.
- `support@listeningparty.stream` forwarding destination still needs to be set in Porkbun (MX/SPF already present).
