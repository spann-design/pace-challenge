"use client";

import { useId, type ReactNode } from "react";
import { Flame, Icon } from "@/components/icon";
import { useSession } from "@/components/session";
import { GoalBars } from "@/components/social";
import { Card, cx, Spinner } from "@/components/ui";
import { useGoals, useGoalStats, useLogs, useSummary } from "@/lib/data";
import { addDays, today } from "@/lib/dates";
import { dayComplete, dayRatio } from "@/lib/today";

export default function TrendsPage() {
  const { userId } = useSession();
  const day = today();
  const from = addDays(day, -27);
  const { data: summary } = useSummary(userId, day);
  const { data: stats } = useGoalStats(userId, day);
  const { data: goals } = useGoals();
  const { data: logs } = useLogs(from, day);
  const gid = "tr" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  if (!summary || !stats || !goals || !logs) return <Spinner />;

  const days = Array.from({ length: 28 }, (_, i) => addDays(from, i));
  const ticks = days.slice(-21).map((d) => (d === day ? dayComplete(goals, logs, d) || null : dayComplete(goals, logs, d)));
  const ratios = days.map((d) => (d === day ? null : dayRatio(goals, logs, d)));
  const thisWeek = Math.round(summary.this_week * 100);
  const lastWeek = Math.round(summary.last_week * 100);
  const change = thisWeek - lastWeek;

  return (
    <>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--a1)" />
            <stop offset="100%" stopColor="var(--a2)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col gap-1 pt-10">
        <h1 className="text-[32px] leading-tight">Trends</h1>
        <span className="text-[15px] text-ink-2">Your last four weeks</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile icon={<Flame size={14} />} label="Current streak">
          <Big value={summary.current_streak} unit={summary.current_streak === 1 ? "day" : "days"} />
          <div role="img" aria-label={`Last 21 days: ${ticks.filter(Boolean).length} complete`} className="flex gap-[2px]">
            {ticks.map((t, i) => (
              <span key={i} className={cx("h-4 flex-1 rounded-[2px]", t ? "bg-accent" : t === null ? "border border-dashed border-line" : "bg-subtle")} />
            ))}
          </div>
          <span className="text-[12px] text-ink-2">
            Longest: <span className="font-semibold text-ink">{summary.best_streak} days</span>
          </span>
        </Tile>

        <Tile icon={<Icon name="trends" size={14} strokeWidth={2} />} label="Consistency">
          <Big value={`${Math.round(summary.consistency * 100)}%`} unit="of days" />
          <Sparkline values={ratios} gradId={gid} />
          <span className="text-[12px] text-ink-2">All daily goals done, last 30 days</span>
        </Tile>

        <Tile icon={<Icon name="calendar" size={14} strokeWidth={2} />} label="This week">
          <Big value={`${thisWeek}%`} unit="" />
          <span className={cx("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", change >= 0 ? "bg-good-bg text-good-ink" : "bg-warn-bg text-warn-ink")}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)} pts vs last week
          </span>
        </Tile>

        <Tile icon={<Icon name="star" size={14} strokeWidth={2} />} label="Last week">
          <Big value={`${lastWeek}%`} unit="" />
          <span className="text-[12px] text-ink-2">Average progress across your goals</span>
        </Tile>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <h2 className="text-[22px]">By goal</h2>
        <span className="text-[13px] text-ink-2">This week vs last</span>
      </div>
      <GoalBars stats={stats} empty="Add a goal to see trends." />
      <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-2">
        <Icon name="lock" size={12} /> Friends see these percentages and streaks for shared goals only.
      </p>
    </>
  );
}

function Tile({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 rounded-3xl p-4">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
        {icon}
        {label}
      </span>
      {children}
    </Card>
  );
}

function Big({ value, unit }: { value: string | number; unit: string }) {
  return (
    <span className="font-display text-[32px] font-semibold leading-none">
      {value}
      {unit && <span className="ml-1 text-[15px] font-medium text-ink-2">{unit}</span>}
    </span>
  );
}

/** Daily completion over the last 4 weeks. Gaps where there were no goals. */
function Sparkline({ values, gradId }: { values: (number | null)[]; gradId: string }) {
  const W = 128;
  const H = 40;
  const pts = values
    .map((v, i) => (v === null ? null : `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 4 - v * (H - 8)).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  return (
    <svg role="img" aria-label="Daily completion over the last 4 weeks" width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line x1="0" y1="4" x2={W} y2="4" stroke="var(--divider)" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
