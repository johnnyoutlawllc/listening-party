# Open issues

- Supabase `party` schema not created yet; library/playlists are localStorage + bundled SJ seed.
- Suffering Jukebox import: 18 playlists / ~598 unique tracks bundled in `src/data/sj-playlists.json` (re-export via `scripts/export-sj-playlists.ps1`).
- Google auth not wired (shared Outlaw Apps project planned). When it is, add `https://listeningparty.stream/**` and `https://www.listeningparty.stream/**` to the auth `uri_allow_list` (`SUPABASE_TOKEN` currently 401 and needs reissue).
- Sync rooms are still light (no chat); Break / alt discovery / YouTube import wizard are local-first helpers backed by `YOUTUBE_API_KEY`.
- `support@listeningparty.stream` forwarding destination still needs to be set in Porkbun (MX/SPF already present).
