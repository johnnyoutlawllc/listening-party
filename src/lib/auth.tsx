"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { authConfigured, supabase, type PartyProfile } from "./supabase";

type Ctx = {
  user: User | null;
  profile: PartyProfile | null;
  loading: boolean;
  configured: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signUpWithPassword: (email: string, password: string, username?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  }) => Promise<boolean>;
  clearError: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

function nameOf(user: User | null, profile: PartyProfile | null): string | null {
  if (profile?.username) return profile.username;
  if (profile?.display_name) return profile.display_name.split(/\s+/)[0];
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const full =
    (typeof meta.given_name === "string" && meta.given_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  if (full) return full.split(/\s+/)[0];
  return user.email?.split("@")[0] ?? "you";
}

function avatarOf(user: User | null, profile: PartyProfile | null): string | null {
  if (profile?.avatar_url) return profile.avatar_url;
  const meta = user?.user_metadata ?? {};
  if (typeof meta.avatar_url === "string" && meta.avatar_url) return meta.avatar_url;
  if (typeof meta.picture === "string" && meta.picture) return meta.picture;
  return null;
}

function redirectTo() {
  return `${window.location.origin}/auth/callback`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PartyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Map<string, Promise<void>>>(new Map());

  const runLoad = useCallback(async (u: User) => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .maybeSingle();

    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      setProfile(data as PartyProfile);
      setError(null);
      return;
    }

    const meta = u.user_metadata ?? {};
    const suggested = (u.email?.split("@")[0] || "listener")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
    const { data: row, error: upsertErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: u.id,
          username: suggested.length >= 3 ? suggested : null,
          display_name:
            (typeof meta.full_name === "string" && meta.full_name) ||
            (typeof meta.name === "string" && meta.name) ||
            (u.email?.split("@")[0] ?? null),
          avatar_url:
            (typeof meta.avatar_url === "string" && meta.avatar_url) ||
            (typeof meta.picture === "string" && meta.picture) ||
            null,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (!upsertErr) {
      setProfile(row as PartyProfile);
      setError(null);
      return;
    }

    const { data: reread } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .maybeSingle();
    if (reread) {
      setProfile(reread as PartyProfile);
      setError(null);
    } else {
      setError(upsertErr.message);
    }
  }, []);

  const loadProfile = useCallback(
    async (u: User | null) => {
      if (!u) {
        setProfile(null);
        return;
      }
      const existing = inFlight.current.get(u.id);
      if (existing) return existing;
      const p = runLoad(u).finally(() => {
        inFlight.current.delete(u.id);
      });
      inFlight.current.set(u.id, p);
      return p;
    },
    [runLoad],
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const u = data.session?.user ?? null;
      setUser(u);
      await loadProfile(u);
      if (!cancelled) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setError("Sign-in is not configured yet.");
      return;
    }
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (err) setError(err.message);
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!supabase) {
      setError("Sign-in is not configured yet.");
      return;
    }
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: redirectTo() },
    });
    if (err) setError(err.message);
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError("Sign-in is not configured yet.");
      return false;
    }
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  const signUpWithPassword = useCallback(
    async (email: string, password: string, username?: string) => {
      if (!supabase) {
        setError("Sign-in is not configured yet.");
        return false;
      }
      setError(null);
      const cleanUser = username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: cleanUser
            ? { preferred_username: cleanUser, full_name: cleanUser, name: cleanUser }
            : undefined,
          emailRedirectTo: redirectTo(),
        },
      });
      if (err) {
        setError(err.message);
        return false;
      }
      if (!data.session) {
        setError("Check your email to confirm the account, then sign in.");
        return false;
      }
      return true;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signOut();
    if (err) setError(err.message);
    else setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const updateProfile = useCallback(
    async (patch: {
      username?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
    }) => {
      if (!supabase || !user) {
        setError("Sign in to update your profile.");
        return false;
      }
      setError(null);
      const payload: Record<string, string | null> = {};
      if ("username" in patch) {
        const value = patch.username?.trim().toLowerCase() || null;
        if (value && !/^[a-z0-9_]{3,24}$/.test(value)) {
          setError("Username must be 3–24 characters: lowercase letters, numbers, underscore.");
          return false;
        }
        payload.username = value;
      }
      if ("display_name" in patch) {
        payload.display_name = patch.display_name?.trim() || null;
      }
      if ("avatar_url" in patch) {
        payload.avatar_url = patch.avatar_url?.trim() || null;
      }

      const { data, error: err } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...payload }, { onConflict: "id" })
        .select()
        .single();

      if (err) {
        if (/duplicate|unique/i.test(err.message)) {
          setError("That username is already taken.");
        } else {
          setError(err.message);
        }
        return false;
      }
      setProfile(data as PartyProfile);
      return true;
    },
    [user],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      profile,
      loading,
      configured: authConfigured(),
      displayName: nameOf(user, profile),
      avatarUrl: avatarOf(user, profile),
      error,
      signInWithGoogle,
      signInWithApple,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
      updateProfile,
      clearError,
    }),
    [
      user,
      profile,
      loading,
      error,
      signInWithGoogle,
      signInWithApple,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
      updateProfile,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
