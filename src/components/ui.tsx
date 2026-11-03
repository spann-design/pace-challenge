"use client";

import type { ReactNode } from "react";
import { PACE_LABEL, type Pace } from "@/lib/metrics";

/** Status always pairs color with an icon and a label, never color alone. */
const PACE_STYLE: Record<Pace, { color: string; icon: string }> = {
  ahead: { color: "var(--good)", icon: "M12 19V5m-6 6l6-6 6 6" },
  on_track: { color: "var(--good)", icon: "M5 12l4 4L19 6" },
  behind: { color: "var(--serious)", icon: "M12 7v6m0 4h.01" },
  no_data: { color: "var(--muted)", icon: "M6 12h12" },
};

export function PaceBadge({ pace, small }: { pace: Pace; small?: boolean }) {
  const s = PACE_STYLE[pace];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold text-ink ${
        small ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      style={{ background: `color-mix(in srgb, ${s.color} 16%, transparent)` }}
    >
      <svg viewBox="0 0 24 24" className={small ? "h-3.5 w-3.5" : "h-4 w-4"} fill="none" stroke={s.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={s.icon} />
      </svg>
      {PACE_LABEL[pace]}
    </span>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card !p-3.5">
      <div className="text-xs font-medium text-ink-2">{label}</div>
      <div className="mt-1 text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Thin horizontal meter, e.g. habit consistency. */
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between gap-3">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-sm text-ink-2">{children}</div>;
}

export const FREQUENCY_LABEL = (n: number) => (n === 7 ? "Daily" : `${n}× per week`);
