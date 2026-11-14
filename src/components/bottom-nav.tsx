"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/trends", label: "Trends", icon: "trends" },
  null, // the + button
  { href: "/friends", label: "Friends", icon: "friends" },
  { href: "/profile", label: "Profile", icon: "profile" },
] as const;

/** Floating pill tab bar: Home · Trends · (+) · Friends · Profile. */
export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/calendar") : path.startsWith(href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 z-40 mx-auto grid h-[68px] max-w-[448px] grid-cols-5 items-center rounded-full bg-surface px-1.5 shadow-float"
      style={{ bottom: "max(24px, env(safe-area-inset-bottom))" }}
    >
      {TABS.map((t) =>
        t === null ? (
          <div key="add" className="flex justify-center">
            <button
              type="button"
              aria-label="Add"
              onClick={onAdd}
              className="bg-accent flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full"
            >
              <Icon name="plus" size={22} strokeWidth={2.4} />
            </button>
          </div>
        ) : (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive(t.href) ? "page" : undefined}
            className={cx(
              "flex h-full flex-col items-center justify-center gap-[3px] text-[11px]",
              isActive(t.href) ? "font-semibold text-ink" : "font-medium text-ink-2",
            )}
          >
            <Icon name={t.icon} size={22} strokeWidth={isActive(t.href) ? 2 : 1.8} />
            {t.label}
          </Link>
        ),
      )}
    </nav>
  );
}
