"use client";

import { useId } from "react";

/** Half-circle gauge with a gradient fill and a knob at the leading edge. */
export function ArcGauge({ done, total, status }: { done: number; total: number; status: string }) {
  const id = "arc" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const p = total ? Math.min(1, done / total) : 0;
  const ease = "0.7s cubic-bezier(0.3, 0.7, 0.2, 1)";
  return (
    <div className="relative h-[144px] w-[260px]">
      <svg role="img" aria-label={`${done} of ${total} done, ${status}`} width="260" height="144" viewBox="0 0 260 144">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--a1)" />
            <stop offset="100%" stopColor="var(--a2)" />
          </linearGradient>
        </defs>
        <path d="M20 132 A110 110 0 0 1 240 132" fill="none" stroke="var(--divider)" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M20 132 A110 110 0 0 1 240 132"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="16"
          strokeLinecap="round"
          pathLength={100}
          style={{ strokeDasharray: `${(p * 100).toFixed(2)} 100`, transition: `stroke-dasharray ${ease}`, opacity: p === 0 ? 0 : 1 }}
        />
        {p > 0 && p < 1 && (
          <g style={{ transform: `rotate(${(180 * p).toFixed(1)}deg)`, transformOrigin: "130px 132px", transition: `transform ${ease}` }}>
            <circle cx="20" cy="132" r="9" fill="var(--surface)" stroke="var(--a2)" strokeWidth="4" />
          </g>
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center gap-0.5">
        <span className="font-display text-[46px] font-semibold leading-none tabular">
          {done}
          <span className="text-[24px] text-ink-2">/{total}</span>
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-2">{status}</span>
      </div>
    </div>
  );
}

/** Sparks around a button the moment it's checked. */
export function Burst() {
  return (
    <svg aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" className="animate-fade pointer-events-none absolute -left-[18px] -top-[18px]">
      <path
        d="M40 4v8M40 68v8M4 40h8M68 40h8M14.5 14.5l5.5 5.5M60 60l5.5 5.5M14.5 65.5l5.5-5.5M60 20l5.5-5.5"
        stroke="var(--a2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="27" cy="6" r="2.5" fill="var(--a1)" />
      <circle cx="74" cy="28" r="2.5" fill="var(--a1)" />
      <circle cx="8" cy="54" r="2.5" fill="var(--a1)" />
      <circle cx="54" cy="75" r="2.5" fill="var(--ink)" />
    </svg>
  );
}

/** Sparkles behind the gauge when the day is complete. */
export function Confetti({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="300" height="150" viewBox="0 0 300 150" className={`pointer-events-none absolute left-1/2 top-2.5 -ml-[150px] ${className}`}>
      <path d="M28 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--a1)" />
      <path d="M268 30l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="var(--a2)" />
      <circle cx="52" cy="104" r="4" fill="var(--a2)" />
      <circle cx="250" cy="96" r="5" fill="var(--a1)" />
      <circle cx="278" cy="70" r="3" fill="var(--ink)" />
      <circle cx="20" cy="76" r="3" fill="var(--ink)" />
      <rect x="232" y="56" width="10" height="4" rx="2" fill="var(--a1)" transform="rotate(35 237 58)" />
      <rect x="60" y="62" width="10" height="4" rx="2" fill="var(--a2)" transform="rotate(-30 65 64)" />
    </svg>
  );
}
