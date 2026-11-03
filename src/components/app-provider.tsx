"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { todayISO } from "@/lib/dates";
import { createDemoStore } from "@/lib/store/demo-store";
import { createSupabaseStore, loadMyProfile, supabase, supabaseConfigured } from "@/lib/store/supabase-store";
import type { DataStore } from "@/lib/store/types";
import type { ChallengeBundle, Profile } from "@/lib/types";
import { LoginScreen } from "./login-screen";

type AppState = {
  store: DataStore;
  today: string;
  /** Bumped after any write so views reload. */
  version: number;
  refresh: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

const noopSubscribe = () => () => {};

export function AppProvider({ children }: { children: ReactNode }) {
  // Dates and storage only exist in the browser, so nothing renders until we're on the client.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const today = useMemo(() => (isClient ? todayISO() : null), [isClient]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
    const { data: sub } = supabase().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (userId) loadMyProfile(userId).then(setProfile);
  }, [userId]);

  const store = useMemo<DataStore | null>(() => {
    if (!today) return null;
    if (!supabaseConfigured) return createDemoStore(today);
    return profile && profile.id === userId ? createSupabaseStore(profile) : null;
  }, [today, profile, userId]);

  const signOut = useCallback(async () => {
    if (supabaseConfigured) await supabase().auth.signOut();
  }, []);

  if (!today || (supabaseConfigured && session === undefined)) return <Splash />;
  if (supabaseConfigured && !session) return <LoginScreen />;
  if (supabaseConfigured && profile === null)
    return <Splash message="Your profile wasn't found. Did you run supabase/schema.sql before signing up?" />;
  if (!store) return <Splash />;

  return <Ctx.Provider value={{ store, today, version, refresh, signOut }}>{children}</Ctx.Provider>;
}

function Splash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6 text-center text-ink-2">
      {message ?? "Loading…"}
    </div>
  );
}

/** Load one person's challenge bundle; reloads after any write. */
export function useBundle(userId: string | null) {
  const { store, version } = useApp();
  const [state, setState] = useState<{ bundle: ChallengeBundle | null; loading: boolean; error: string | null }>({
    bundle: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    if (!userId) return;
    let live = true;
    store
      .getBundle(userId)
      .then((bundle) => live && setState({ bundle, loading: false, error: null }))
      .catch((e: Error) => live && setState({ bundle: null, loading: false, error: e.message }));
    return () => {
      live = false;
    };
  }, [store, userId, version]);
  return state;
}
