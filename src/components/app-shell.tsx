"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { resetDemo } from "@/lib/store/demo-store";
import { useApp } from "./app-provider";

const TABS = [
  { href: "/", label: "Today", icon: "M5 12l4 4L19 6" },
  { href: "/goals", label: "My Goals", icon: "M12 3v18M3 12h18" },
  { href: "/progress", label: "Progress", icon: "M4 19l5-6 4 3 7-9" },
  { href: "/friends", label: "Friends", icon: "M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5m2-5c3 0 6 2 6 5" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { store, signOut } = useApp();
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/friends" && path.startsWith("/friend")));

  return (
    <div className="min-h-dvh pb-20 sm:pb-8">
      {store.mode === "demo" && (
        <div className="bg-surface-2 px-4 py-2 text-center text-xs text-ink-2">
          <strong>Demo mode</strong>: example data, saved in this browser only. Add Supabase keys to enable real
          accounts.{" "}
          <button
            className="underline"
            onClick={() => {
              resetDemo();
              location.reload();
            }}
          >
            Reset demo
          </button>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Pace
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  active(t.href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-2">
            <span className="hidden sm:inline">
              {store.me.display_name} <span className="text-muted">@{store.me.username}</span>
            </span>
            {store.mode === "supabase" && (
              <button className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={signOut}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">{children}</main>

      {/* Bottom tab bar on phones */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
              active(t.href) ? "text-accent" : "text-muted"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={t.icon} />
            </svg>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
