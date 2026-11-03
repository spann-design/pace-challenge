"use client";

import { useCallback, useState, type PointerEvent } from "react";
import { addDays, daysBetween, formatShort } from "@/lib/dates";
import {
  HIGH_CONSISTENCY,
  expectedValue,
  formatSigned,
  formatValue,
  type HabitWeek,
  type OutcomeStatus,
} from "@/lib/metrics";
import type { Challenge } from "@/lib/types";

/** Measures an element's width immediately on mount and on every resize. */
function useWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((el: T | null) => {
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

function Legend({ items }: { items: { label: string; dash?: string; opacity?: number; color?: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <svg width="20" height="8" aria-hidden>
            <line
              x1="1"
              x2="19"
              y1="4"
              y2="4"
              stroke={i.color ?? "var(--accent)"}
              strokeWidth="2"
              strokeDasharray={i.dash}
              strokeLinecap="round"
              opacity={i.opacity}
            />
          </svg>
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pace chart: actual measurements vs. the straight "on pace" line to the goal
// ---------------------------------------------------------------------------

export function PaceChart({ status, challenge, today }: { status: OutcomeStatus; challenge: Challenge; today: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { goal, logs } = status;
  const unit = goal.unit;
  const H = 220;
  const M = { top: 16, right: 16, bottom: 26, left: 44 };
  const W = Math.max(width, 280);
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const total = daysBetween(challenge.start_date, challenge.end_date);

  const values = [goal.start_value, goal.target_value, ...logs.map((l) => l.value)];
  if (status.projectedEnd !== null) values.push(status.projectedEnd);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;
  const ticks = niceTicks(lo, hi);

  const x = (date: string) => M.left + (daysBetween(challenge.start_date, date) / total) * iw;
  const y = (v: number) => M.top + (1 - (v - lo) / (hi - lo)) * ih;

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => addDays(challenge.start_date, Math.round(f * total)));
  const showToday = today >= challenge.start_date && today <= challenge.end_date;
  const actualPath = logs.map((l, i) => `${i ? "L" : "M"}${x(l.date)},${y(l.value)}`).join("");
  const last = logs.at(-1);

  function onMove(e: PointerEvent<SVGRectElement>) {
    if (!logs.length) return;
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left + M.left;
    let best = 0;
    logs.forEach((l, i) => {
      if (Math.abs(x(l.date) - px) < Math.abs(x(logs[best].date) - px)) best = i;
    });
    setHover(best);
  }

  const h = hover !== null ? logs[hover] : null;
  const hExpected = h ? expectedValue(goal, challenge, h.date) : 0;
  const dir = Math.sign(goal.target_value - goal.start_value);

  return (
    <div>
      <Legend
        items={[
          { label: "Actual" },
          { label: "On-pace line", dash: "5 4", color: "var(--muted)" },
          ...(status.projectedEnd !== null ? [{ label: "Projected", dash: "1 4", opacity: 0.8 }] : []),
        ]}
      />
      <div ref={ref} className="relative w-full">
        {width > 0 && (
          <svg
            width={W}
            height={H}
            role="img"
            aria-label={`${goal.name}: ${logs.length} measurements. Latest ${formatValue(status.latest, unit)}, goal ${formatValue(goal.target_value, unit)}.`}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular">
                  {t}
                </text>
              </g>
            ))}
            <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke="var(--axis)" />
            {xTicks.map((d, i) => (
              <text
                key={d}
                x={x(d)}
                y={H - 8}
                fontSize={11}
                fill="var(--muted)"
                textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              >
                {formatShort(d)}
              </text>
            ))}

            {showToday && (
              <g>
                <line x1={x(today)} x2={x(today)} y1={M.top} y2={H - M.bottom} stroke="var(--axis)" strokeDasharray="2 3" />
                <text x={x(today) + 4} y={M.top + 2} dy="0.7em" fontSize={10} fill="var(--muted)">
                  Today
                </text>
              </g>
            )}

            {/* On-pace line */}
            <line
              x1={x(challenge.start_date)}
              y1={y(goal.start_value)}
              x2={x(challenge.end_date)}
              y2={y(goal.target_value)}
              stroke="var(--muted)"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            <circle cx={x(challenge.end_date)} cy={y(goal.target_value)} r={4} fill="var(--surface)" stroke="var(--muted)" strokeWidth={2} />

            {/* Projection */}
            {status.projectedEnd !== null && last && (
              <line
                x1={x(last.date)}
                y1={y(last.value)}
                x2={x(challenge.end_date)}
                y2={y(status.projectedEnd)}
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="1 4"
                strokeLinecap="round"
                opacity={0.8}
              />
            )}

            {/* Actual */}
            <path d={actualPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
            {logs.map((l, i) => (
              <circle
                key={l.id}
                cx={x(l.date)}
                cy={y(l.value)}
                r={hover === i ? 5 : 3.5}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}

            {h && <line x1={x(h.date)} x2={x(h.date)} y1={M.top} y2={H - M.bottom} stroke="var(--ink-2)" strokeWidth={1} opacity={0.4} />}

            <rect
              x={M.left}
              y={M.top}
              width={iw}
              height={ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {h && (
          <div
            className="pointer-events-none absolute z-10 w-max rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(x(h.date) - 70, 0), W - 160),
              top: Math.max(y(h.value) - 84, 0),
            }}
          >
            <div className="font-semibold">{formatShort(h.date)}</div>
            <div className="tabular mt-0.5 text-ink">Actual: {formatValue(h.value, unit)}</div>
            <div className="tabular text-ink-2">On pace: {formatValue(hExpected, unit)}</div>
            <div className="tabular text-ink-2">
              {formatSigned((h.value - hExpected) * dir, unit)} {(h.value - hExpected) * dir >= 0 ? "ahead" : "behind"}
            </div>
          </div>
        )}
      </div>

      <details className="mt-1 text-xs text-ink-2">
        <summary className="cursor-pointer select-none">View as table</summary>
        <table className="tabular mt-2 w-full text-left">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="font-medium">Actual</th>
              <th className="font-medium">On pace</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="py-1">{formatShort(l.date)}</td>
                <td>{formatValue(l.value, unit)}</td>
                <td>{formatValue(expectedValue(goal, challenge, l.date), unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly habit consistency
// ---------------------------------------------------------------------------

export function WeeklyBars({ weeks, totalWeeks }: { weeks: HabitWeek[]; totalWeeks: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 170;
  const M = { top: 14, right: 8, bottom: 24, left: 36 };
  const W = Math.max(width, 260);
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const n = Math.max(totalWeeks, weeks.length, 1);
  const band = iw / n;
  const bw = Math.min(36, band - 2);
  const y = (v: number) => M.top + (1 - v) * ih;
  const xc = (i: number) => M.left + band * i + band / 2;
  const hw = hover !== null ? weeks[hover] : null;

  return (
    <div>
      <Legend
        items={[
          { label: "Habits completed" },
          { label: `${Math.round(HIGH_CONSISTENCY * 100)}% target`, dash: "5 4", color: "var(--muted)" },
        ]}
      />
      <div ref={ref} className="relative w-full">
        {width > 0 && (
          <svg width={W} height={H} role="img" aria-label="Weekly habit consistency">
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
                  {t * 100}%
                </text>
              </g>
            ))}
            {weeks.map((w, i) => {
              const top = y(w.consistency);
              const h = Math.max(0, H - M.bottom - top);
              const r = Math.min(4, h / 2, bw / 2);
              const x0 = xc(i) - bw / 2;
              // Rounded top only; flat on the baseline.
              const d = `M${x0},${H - M.bottom}V${top + r}q0,-${r} ${r},-${r}H${x0 + bw - r}q${r},0 ${r},${r}V${H - M.bottom}Z`;
              return (
                <g key={w.week}>
                  <path d={d} fill="var(--accent)" opacity={w.complete ? (hover === null || hover === i ? 1 : 0.55) : 0.4} />
                  <rect
                    x={M.left + band * i}
                    y={M.top}
                    width={band}
                    height={ih}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                  />
                </g>
              );
            })}
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(HIGH_CONSISTENCY)}
              y2={y(HIGH_CONSISTENCY)}
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              pointerEvents="none"
            />
            {Array.from({ length: n }, (_, i) =>
              n <= 14 || i % 2 === 0 ? (
                <text key={i} x={xc(i)} y={H - 7} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  W{i + 1}
                </text>
              ) : null,
            )}
          </svg>
        )}
        {hw && (
          <div
            className="pointer-events-none absolute z-10 w-max rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(xc(hover!) - 80, 0), W - 190), top: 0 }}
          >
            <div className="font-semibold">
              Week {hw.week}: {Math.round(hw.consistency * 100)}%{hw.complete ? "" : " so far"}
            </div>
            <div className="text-muted">
              {formatShort(hw.start)} – {formatShort(hw.end)}
            </div>
            {hw.perHabit.map((p) => (
              <div key={p.habit.id} className="tabular mt-0.5 text-ink-2">
                {p.habit.name}: {p.done}/{p.target}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
