"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import {
  clearSufferingJukeboxImport,
  importSufferingJukeboxSeed,
  loadLibrary,
  loadPlaylists,
  loadSjImportMeta,
  removeLibraryItem,
  removePlaylist,
  sjSeedStats,
  type MediaItem,
  type Playlist,
} from "@/lib/store";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";

export default function SettingsPage() {
  const {
    user,
    profile,
    loading,
    configured,
    avatarUrl,
    error,
    clearError,
    updateProfile,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [avatarInput, setAvatarInput] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sjMeta, setSjMeta] = useState<{ seedImportedAt: string; appliedAt: string } | null>(null);

  function refreshLocal() {
    setLibrary(loadLibrary());
    setPlaylists(loadPlaylists());
    setSjMeta(loadSjImportMeta());
  }

  useEffect(() => {
    refreshLocal();
  }, []);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setAvatarInput(profile.avatar_url ?? "");
    }
  }, [profile]);

  const importedTracks = useMemo(
    () => library.filter((t) => !t.id.startsWith("sj_")),
    [library],
  );
  const importedPlaylists = useMemo(
    () => playlists.filter((p) => !p.id.startsWith("sjpl_")),
    [playlists],
  );
  const sjPlaylists = useMemo(
    () => playlists.filter((p) => p.id.startsWith("sjpl_")),
    [playlists],
  );

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    clearError();
    setSavedMsg("");
    setBusy(true);
    const ok = await updateProfile({
      username: username.trim() || null,
      avatar_url: avatarInput.trim() || null,
    });
    setBusy(false);
    if (ok) setSavedMsg("Profile saved.");
  }

  function onAvatarFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSavedMsg("");
      return;
    }
    if (file.size > 700_000) {
      setSavedMsg("Keep profile pictures under 700 KB, or paste an image URL instead.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatarInput(reader.result);
    };
    reader.readAsDataURL(file);
  }

  if (!configured) {
    return (
      <div className="page-shell">
        <div className="page-intro">
          <div>
            <p className="eyebrow">SETTINGS</p>
            <h1>Sign-in is not ready yet.</h1>
            <p className="intro-copy">Supabase keys still need to be set for this environment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-intro">
          <div>
            <p className="eyebrow">SETTINGS</p>
            <h1>Loading…</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell">
        <div className="page-intro">
          <div>
            <p className="eyebrow">SETTINGS</p>
            <h1>Sign in to manage your profile.</h1>
            <p className="intro-copy">Choose Google, Apple, or email from the header, or jump in here.</p>
          </div>
        </div>
        <div className="settings-sign-in">
          <button type="button" className="button secondary" onClick={() => void signInWithGoogle()}>
            Continue with Google
          </button>
          <button type="button" className="button secondary" onClick={() => void signInWithApple()}>
            Continue with Apple
          </button>
          <Link href="/" className="text-link">
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell settings-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Settings</h1>
          <p className="intro-copy">Public username, profile picture, and the media you have brought in.</p>
        </div>
      </div>

      <section className="settings-section panel" aria-labelledby="profile-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PUBLIC PROFILE</p>
            <h2 id="profile-heading">How you show up</h2>
          </div>
        </div>
        <form className="settings-form" onSubmit={onSaveProfile}>
          <div className="settings-avatar-row">
            {avatarUrl || avatarInput ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarInput || avatarUrl || ""} alt="" className="settings-avatar" />
            ) : (
              <span className="settings-avatar fallback">{(username || "?").slice(0, 1).toUpperCase()}</span>
            )}
            <div className="settings-avatar-fields">
              <label>
                Profile picture URL
                <input
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="settings-file">
                Or upload an image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
          <label>
            Public username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              autoComplete="username"
            />
            <span className="help">3–24 characters. Lowercase letters, numbers, underscore.</span>
          </label>
          <p className="help">Signed in as {user.email || user.id}</p>
          <div className="button-row">
            <button type="submit" className="button primary" disabled={busy}>
              Save profile
            </button>
          </div>
          {savedMsg && (
            <p className="message" role="status">
              {savedMsg}
            </p>
          )}
          {error && (
            <p className="message error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>

      <section className="settings-section panel" aria-labelledby="imports-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">IMPORTED CONTENT</p>
            <h2 id="imports-heading">What you brought in</h2>
          </div>
        </div>

        <div className="settings-import-block">
          <h3>Suffering Jukebox seed</h3>
          <p className="help">
            {sjMeta
              ? `Imported ${sjPlaylists.length} playlists · ${sjSeedStats().libraryItems} tracks on ${new Date(sjMeta.appliedAt).toLocaleString()}`
              : "Not imported on this device yet."}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                importSufferingJukeboxSeed(true);
                refreshLocal();
                setSavedMsg("Suffering Jukebox seed refreshed.");
              }}
            >
              Re-import seed
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={!sjMeta && sjPlaylists.length === 0}
              onClick={() => {
                clearSufferingJukeboxImport();
                refreshLocal();
                setSavedMsg("Suffering Jukebox content removed from this device.");
              }}
            >
              Remove seed from this device
            </button>
          </div>
        </div>

        <div className="settings-import-block">
          <h3>Your playlists ({importedPlaylists.length})</h3>
          {importedPlaylists.length === 0 ? (
            <p className="help">No playlists you built yet. <Link href="/build">Build one</Link>.</p>
          ) : (
            <ul className="settings-list">
              {importedPlaylists.map((p) => (
                <li key={p.id}>
                  <Link href={`/playlists/${p.id}`}>{p.name}</Link>
                  <span>{p.itemIds.length} tracks</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => {
                      removePlaylist(p.id);
                      refreshLocal();
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="settings-import-block">
          <h3>Imported tracks ({importedTracks.length})</h3>
          {importedTracks.length === 0 ? (
            <p className="help">
              No YouTube imports on this device yet. Add some from the{" "}
              <Link href="/library">track library</Link>.
            </p>
          ) : (
            <ul className="settings-list track-imports">
              {importedTracks.slice(0, 40).map((t) => (
                <li key={t.id}>
                  <Cover items={[t]} name={t.title} />
                  <div>
                    <strong>{t.title}</strong>
                    <span>{t.channelTitle || "YouTube"}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${t.title}`}
                    onClick={() => {
                      removeLibraryItem(t.id);
                      refreshLocal();
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {importedTracks.length > 40 && (
            <p className="help">Showing the first 40. Open the track library for the rest.</p>
          )}
        </div>
      </section>
    </div>
  );
}
