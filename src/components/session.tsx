"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import useSWR, { useSWRConfig, type KeyedMutator } from "swr";
import { supabase } from "@/lib/supabase/client";
import { applyAccent, isAccentId } from "@/lib/theme";
import type { Profile } from "@/lib/types";
import { Spinner } from "./ui";

type Session = { userId: string; profile: Profile; mutateProfile: KeyedMutator<Profile | null> };
const SessionCtx = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionCtx);
  if (!s) throw new Error("useSession must be used inside <SessionProvider>");
  return s;
}

async function loadProfile(): Promise<Profile | null> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", auth.user.id).single();
  if (error) throw error;
  return data as Profile;
}

/**
 * Loads the signed-in person's profile for every screen inside it.
 * Sends people who haven't finished onboarding to /onboarding.
 */
export function SessionProvider({ children, onboarding = false }: { children: ReactNode; onboarding?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const { data: profile, error, mutate, isLoading } = useSWR("profile", loadProfile, { revalidateOnFocus: false });

  useEffect(() => {
    if (profile && isAccentId(profile.accent)) applyAccent(profile.accent);
  }, [profile]);

  useEffect(() => {
    if (isLoading) return;
    if (profile === null) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (profile && !profile.onboarded && !onboarding) router.replace("/onboarding");
  }, [profile, isLoading, onboarding, path, router]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col items-center gap-3 px-6 pt-32 text-center">
        <h1 className="text-[28px]">Can’t reach Pace</h1>
        <p className="text-[15px] text-ink-2">Check your connection and try again.</p>
        <button type="button" onClick={() => mutate()} className="bg-accent h-[52px] rounded-full px-6 font-semibold">
          Try again
        </button>
      </div>
    );
  }
  if (!profile || (!profile.onboarded && !onboarding)) return <Spinner />;

  return <SessionCtx.Provider value={{ userId: profile.id, profile, mutateProfile: mutate }}>{children}</SessionCtx.Provider>;
}

/** Signs out, forgets cached data, and goes to the sign-in screen. */
export function useSignOut() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  return async () => {
    await supabase().auth.signOut();
    await mutate(() => true, undefined, { revalidate: false });
    router.replace("/login");
    router.refresh();
  };
}
