"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

export function AuthControls() {
  const {
    user,
    loading,
    configured,
    displayName,
    avatarUrl,
    error,
    clearError,
    signInWithGoogle,
    signInWithApple,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "email">("menu");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) clearError();
  }, [open, clearError]);

  if (!configured) {
    return null;
  }

  if (loading) {
    return <div className="auth-slot auth-loading" aria-hidden />;
  }

  if (user) {
    return (
      <div className="auth-slot signed-in" ref={rootRef}>
        <button
          type="button"
          className="auth-avatar-btn"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="auth-avatar" />
          ) : (
            <span className="auth-avatar fallback">{(displayName || "?").slice(0, 1).toUpperCase()}</span>
          )}
          <span className="auth-name">{displayName}</span>
        </button>
        {open && (
          <div className="auth-menu" role="menu">
            <Link className="auth-menu-item" href="/settings" onClick={() => setOpen(false)}>
              Settings
            </Link>
            <button
              type="button"
              className="auth-menu-item"
              onClick={async () => {
                await signOut();
                setOpen(false);
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok =
      emailMode === "signin"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password, username);
    setBusy(false);
    if (ok) {
      setOpen(false);
      setMode("menu");
      setEmail("");
      setPassword("");
      setUsername("");
    }
  }

  return (
    <div className="auth-slot" ref={rootRef}>
      <button
        type="button"
        className="button secondary auth-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((v) => !v);
          setMode("menu");
        }}
      >
        Sign in
      </button>
      {open && (
        <div className="auth-panel" role="dialog" aria-label="Sign in">
          {mode === "menu" ? (
            <>
              <p className="auth-panel-title">Join the party</p>
              <button type="button" className="button secondary auth-provider" onClick={() => void signInWithGoogle()}>
                Continue with Google
              </button>
              <button type="button" className="button secondary auth-provider" onClick={() => void signInWithApple()}>
                Continue with Apple
              </button>
              <button
                type="button"
                className="button secondary auth-provider"
                onClick={() => {
                  setMode("email");
                  setEmailMode("signin");
                  clearError();
                }}
              >
                Sign in with email
              </button>
            </>
          ) : (
            <form className="auth-email-form" onSubmit={onEmailSubmit}>
              <div className="auth-email-tabs">
                <button
                  type="button"
                  className={emailMode === "signin" ? "active" : ""}
                  onClick={() => setEmailMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={emailMode === "signup" ? "active" : ""}
                  onClick={() => setEmailMode("signup")}
                >
                  Create account
                </button>
              </div>
              {emailMode === "signup" && (
                <label>
                  Public username
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_handle"
                    autoComplete="username"
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={emailMode === "signin" ? "current-password" : "new-password"}
                />
              </label>
              <div className="auth-email-actions">
                <button type="button" className="text-link" onClick={() => setMode("menu")}>
                  Back
                </button>
                <button type="submit" className="button primary" disabled={busy}>
                  {emailMode === "signin" ? "Sign in" : "Create account"}
                </button>
              </div>
            </form>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
