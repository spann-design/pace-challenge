"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";
import { Icon } from "@/components/icon";
import { useSession } from "@/components/session";
import { Card, cx, IconButton, Sheet, Spinner, useToast } from "@/components/ui";
import { addLog, clearDay, deleteLog, useFeed, useGoals, useLogs, useSummary } from "@/lib/data";
import { addDays, fmt, fromISODate, monthGrid, today, toISODate, weekStart } from "@/lib/dates";
import { describeTarget, num, sumFor } from "@/lib/goals";
import { dayRatio } from "@/lib/today";
import type { FeedItem, Goal, ProgressLog } from "@/lib/types";

const WORKOUT_COLORS: Record<string, string> = {
  run: "#E0662E",
  cycle: "#D9468F",
  power: "#D94848",
  yoga: "#8A5CD6",
  swim: "#2C8FD6",
  walk: "#2E9E6A",
};
const ACTIVITY_ICON: Record<string, string> = { Run: "run", Walk: "walk", Strength: "power", Yoga: "yoga", Cycle: "cycle", HIIT: "power", Swim: "swim" };
const workoutIcon = (log: ProgressLog, goal?: Goal) => (log.activity && ACTIVITY_ICON[log.activity]) || goal?.icon || "run";
const workoutColor = (icon: string) => WORKOUT_COLORS[icon] ?? "#5A6CD6";

export default function CalendarPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Calendar />
    </Suspense>
  );
}

function Calendar() {
  const router = useRouter();
  const params = useSearchParams();
  const { userId } = useSession();
  const now = today();
  const selected = params.get("day");
  const anchor = fromISODate(params.get("month") ?? selected ?? now);
  const [year, month] = [anchor.getFullYear(), anchor.getMonth()];
  const cells = monthGrid(year, month);
  const first = toISODate(new Date(year, month, 1));
  const last = toISODate(new Date(year, month + 1, 0));
  const gridStart = weekStart(first);

  const { data: goals } = useGoals();
  // Through the end of the last week, so a week that spills into next month is judged fully.
  const { data: logs } = useLogs(gridStart, addDays(weekStart(last), 6));
  const { data: summary } = useSummary(userId, now);
  const gradId = "cal" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const go = (q: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(q)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`/calendar${p.size ? `?${p}` : ""}`, { scroll: false });
  };
  const shiftMonth = (n: number) => go({ month: toISODate(new Date(year, month + n, 1)), day: null });

  if (!goals || !logs) return <Spinner />;

  const weekly = goals.filter((g) => g.cadence === "weekly");
  const monthLogs = logs.filter((l) => l.date >= first && l.date <= last);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7).concat(Array(Math.max(0, 7 - cells.slice(i, i + 7).length)).fill(null)));

  return (
    <>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--a1)" />
            <stop offset="100%" stopColor="var(--a2)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex items-center justify-between pt-10">
        <h1 className="text-[32px] leading-tight">{fmt.month(year, month)}</h1>
        <div className="flex gap-1.5">
          <IconButton icon="back" label="Previous month" onClick={() => shiftMonth(-1)} />
          <IconButton icon="chevron" label="Next month" onClick={() => shiftMonth(1)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-ink-2">Your streak</span>
          <span className="font-display text-[28px] font-semibold leading-tight">
            {summary?.current_streak ?? 0} {summary?.current_streak === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-ink-2">Check-ins this month</span>
          <span className="font-display text-[28px] font-semibold leading-tight">{monthLogs.length}</span>
        </div>
      </div>

      <div className="flex flex-col">
        <div aria-hidden="true" className="flex gap-2.5 pb-1.5">
          <div className="grid flex-1 grid-cols-7 gap-0.5 text-center text-[12px] font-semibold text-ink-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          {weekly.length > 0 && <span className="w-[34px]" />}
        </div>
        {weeks.map((wk, wi) => {
          const ws = weekStart(wk.find(Boolean)!);
          const weekMet = weekly.length > 0 && weekly.every((g) => sumFor(logs, g.id, ws, addDays(ws, 6)) >= g.target);
          const isFutureWeek = ws > now;
          return (
            <div key={wi} className="flex h-12 items-center gap-2.5">
              <div className="grid flex-1 grid-cols-7 justify-items-center gap-0.5">
                {wk.map((d, j) =>
                  d ? (
                    <DayCell key={d} day={d} now={now} goals={goals} logs={logs} gradId={gradId} onOpen={() => go({ day: d })} />
                  ) : (
                    <span key={`b${j}`} />
                  ),
                )}
              </div>
              {weekly.length > 0 && (
                <div
                  role="img"
                  aria-label={isFutureWeek ? "Upcoming week" : weekMet ? "Weekly goals met" : "Weekly goals not met yet"}
                  className="flex h-12 w-[34px] shrink-0 items-center justify-center"
                >
                  {weekMet ? (
                    <span className="bg-accent flex h-6 w-6 items-center justify-center rounded-full">
                      <Icon name="check" size={13} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className={cx("h-5 w-5 rounded-full border-[1.5px]", isFutureWeek ? "border-dashed border-line" : "border-line")} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--divider)" strokeWidth="2" />
            <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
          </svg>
          Ring = daily goals done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#E0662E]" />
          Workout
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink" />
          2+ workouts
        </span>
        {weekly.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-accent h-3 w-3 rounded-full" />
            Week’s goals met
          </span>
        )}
      </div>

      <DaySheet day={selected} now={now} goals={goals} logs={logs} onClose={() => go({ day: null })} userId={userId} />
    </>
  );
}

function DayCell({ day, now, goals, logs, gradId, onOpen }: { day: string; now: string; goals: Goal[]; logs: ProgressLog[]; gradId: string; onOpen: () => void }) {
  const isToday = day === now;
  const isPast = day < now;
  const ratio = day <= now ? dayRatio(goals, logs, day) : null;
  const workouts = logs.filter((l) => l.date === day && goals.find((g) => g.id === l.goal_id)?.type === "workout");
  const w = workouts[0];
  const icon = w ? workoutIcon(w, goals.find((g) => g.id === w.goal_id)) : null;
  const n = fromISODate(day).getDate();
  const pct = Math.round((ratio ?? 0) * 100);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${fmt.long(day)}${ratio !== null ? `, ${pct}% of daily goals` : ""}${workouts.length ? `, ${workouts.length} workout${workouts.length > 1 ? "s" : ""}` : ""}`}
      className="relative h-[42px] w-[42px] cursor-pointer"
    >
      <svg aria-hidden="true" width="42" height="42" viewBox="0 0 42 42" className="absolute inset-0 -rotate-90">
        {ratio !== null && (
          <>
            <circle cx="21" cy="21" r="19" fill="none" stroke="var(--divider)" strokeWidth="3" />
            {pct > 0 && <circle cx="21" cy="21" r="19" fill="none" stroke={`url(#${gradId})`} strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} />}
          </>
        )}
      </svg>
      <span
        className={cx(
          "absolute left-[5px] top-[5px] flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold",
          isToday && !w && "border-[1.5px] border-ink bg-surface",
          isPast && !w && "bg-divider",
        )}
        style={w ? { background: workoutColor(icon!), color: "#fff" } : undefined}
      >
        {w ? <Icon name={icon!} size={17} strokeWidth={1.9} /> : n}
      </span>
      {workouts.length > 1 && <span className="absolute right-0.5 top-0.5 h-[11px] w-[11px] rounded-full border-2 border-bg bg-ink" />}
    </button>
  );
}

type TimelineRow = {
  key: string;
  time: string;
  sort: number;
  goal: Goal;
  log?: ProgressLog;
  title: string;
  sub: string;
  status: "done" | "missed" | "pending" | "planned";
  social?: FeedItem;
};

function DaySheet({ day, now, goals, logs, onClose, userId }: { day: string | null; now: string; goals: Goal[]; logs: ProgressLog[]; onClose: () => void; userId: string }) {
  const toast = useToast();
  const { data: feed } = useFeed(day ? userId : undefined, now);
  const [busy, setBusy] = useState(false);
  if (!day) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const isFuture = day > now;
  const isToday = day === now;
  const dayLogs = logs.filter((l) => l.date === day);
  const active = goals.filter((g) => g.start_date <= day);
  const timeOf = (l?: ProgressLog) => (l ? new Date(l.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
  const rows: TimelineRow[] = [];

  for (const g of active.filter((x) => x.cadence === "daily")) {
    const gl = dayLogs.filter((l) => l.goal_id === g.id);
    const total = gl.reduce((s, l) => s + l.value, 0);
    const done = total >= g.target;
    const lastLog = gl[gl.length - 1];
    rows.push({
      key: g.id,
      goal: g,
      log: lastLog,
      time: lastLog ? timeOf(lastLog) : isFuture ? "" : "—",
      sort: lastLog ? new Date(lastLog.created_at).getTime() : Infinity,
      title: g.title,
      sub: total > 0 && !done ? `${num(total)} of ${num(g.target)} ${g.unit}` : describeTarget(g),
      status: isFuture ? "planned" : done ? "done" : isToday ? "pending" : "missed",
      social: feed?.find((f) => gl.some((l) => l.id === f.log_id)),
    });
  }
  for (const l of dayLogs) {
    const g = goals.find((x) => x.id === l.goal_id);
    if (!g || g.cadence !== "weekly") continue;
    const details = [l.distance ? `${num(l.distance)} mi` : "", l.duration_min ? `${num(l.duration_min)} min` : "", l.effort ? `effort ${l.effort}/5` : ""].filter(Boolean).join(" · ");
    rows.push({
      key: l.id,
      goal: g,
      log: l,
      time: timeOf(l),
      sort: new Date(l.created_at).getTime(),
      title: l.activity && g.type === "workout" ? `${l.activity}` : g.title,
      sub: `${g.type === "workout" ? "Workout" : "Weekly"}${details ? ` · ${details}` : ""}${l.note ? ` · “${l.note}”` : ""}`,
      status: "done",
      social: feed?.find((f) => f.log_id === l.id),
    });
  }
  if (isFuture) for (const g of active.filter((x) => x.cadence === "weekly")) rows.push({ key: g.id, goal: g, time: "", sort: Infinity, title: g.title, sub: describeTarget(g), status: "planned" });
  rows.sort((a, b) => a.sort - b.sort);

  const dailyCount = rows.filter((r) => r.goal.cadence === "daily");
  const workoutsCount = dayLogs.filter((l) => goals.find((g) => g.id === l.goal_id)?.type === "workout").length;
  const sub = isFuture
    ? `${rows.length} planned`
    : `${dailyCount.filter((r) => r.status === "done").length} of ${dailyCount.length} daily goals · ${workoutsCount ? `${workoutsCount} workout${workoutsCount > 1 ? "s" : ""}` : "no workout"}`;

  async function toggle(r: TimelineRow) {
    if (isFuture || busy) return;
    setBusy(true);
    try {
      if (r.goal.cadence === "weekly" && r.log) {
        await deleteLog(r.log.id, day!);
        toast("Check-in removed");
      } else if (r.status === "done") {
        await clearDay(r.goal.id, day!);
      } else {
        const have = dayLogs.filter((l) => l.goal_id === r.goal.id).reduce((s, l) => s + l.value, 0);
        await addLog({ goal: r.goal, date: day!, value: Math.max(1, r.goal.target - have), duration_min: r.goal.timed ? r.goal.target - have : null });
        toast(`${r.goal.title} marked done`);
      }
    } catch {
      toast("Couldn’t save. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-2">{isToday ? "Today" : isFuture ? "Planned" : "Past day"}</span>
          <h2 className="text-[28px] leading-[1.1]">{fromISODate(day).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h2>
          <span className="text-[14px] text-ink-2">{sub}</span>
        </div>
        <IconButton icon="close" label="Close" onClick={onClose} />
      </div>

      {rows.length === 0 ? (
        <Card className="px-5 py-6 text-center text-[15px] text-ink-2">No goals on this day.</Card>
      ) : (
        <ol className="relative flex flex-col gap-2">
          <span aria-hidden="true" className="absolute bottom-6 left-[75px] top-6 w-0.5 bg-hairline" />
          {rows.map((r) => (
            <li key={r.key} className="relative grid grid-cols-[62px_28px_minmax(0,1fr)] items-center">
              <span className="pr-2.5 text-right text-[12px] font-semibold text-ink-2">{r.time}</span>
              <span className="flex justify-center">
                <button
                  type="button"
                  disabled={isFuture || busy}
                  onClick={() => toggle(r)}
                  aria-label={
                    isFuture ? `${r.title}, planned` : r.goal.cadence === "weekly" ? `Remove ${r.title} check-in` : r.status === "done" ? `${r.title} done, tap to undo` : `Mark ${r.title} done`
                  }
                  className="flex h-11 w-7 cursor-pointer items-center justify-center disabled:cursor-default"
                >
                  {r.status === "done" ? (
                    <span className="bg-accent flex h-[22px] w-[22px] items-center justify-center rounded-full shadow-[0_0_0_4px_var(--bg)]">
                      <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                  ) : r.status === "missed" ? (
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-ink-3 bg-surface text-ink-2 shadow-[0_0_0_4px_var(--bg)]">
                      <Icon name="close" size={10} strokeWidth={3.5} />
                    </span>
                  ) : (
                    <span className="h-[22px] w-[22px] rounded-full border-2 border-dashed border-ink-3 bg-surface shadow-[0_0_0_4px_var(--bg)]" />
                  )}
                </button>
              </span>
              <div className={cx("flex flex-col gap-1.5 rounded-[18px] bg-surface px-3 py-2.5", r.status === "missed" && "opacity-70")}>
                <div className="flex items-center gap-3">
                  <span
                    className={cx("flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl", r.goal.type !== "workout" && "bg-tint")}
                    style={r.goal.type === "workout" ? { background: workoutColor(r.log ? workoutIcon(r.log, r.goal) : r.goal.icon), color: "#fff" } : undefined}
                  >
                    <Icon name={r.log && r.goal.type === "workout" ? workoutIcon(r.log, r.goal) : r.goal.icon} size={19} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-[15px] font-semibold">{r.title}</span>
                    <span className="line-clamp-2 text-[12px] text-ink-2">{r.sub}</span>
                  </span>
                  <span className={cx("whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold", r.status === "done" ? "bg-tint" : "bg-subtle")}>
                    {r.status === "done" ? "Done" : r.status === "missed" ? "Missed" : r.status === "pending" ? "Not yet" : "Planned"}
                  </span>
                </div>
                {r.social && (Object.keys(r.social.cheers).length > 0 || r.social.comments.length > 0) && <SocialLine item={r.social} />}
              </div>
            </li>
          ))}
        </ol>
      )}
      {!isFuture && <p className="text-center text-[12px] text-ink-2">Tap a circle to fix a missed check-in.</p>}
    </Sheet>
  );
}

function SocialLine({ item }: { item: FeedItem }) {
  return (
    <div className="flex flex-col gap-1 border-t border-divider pt-1.5 text-[12px]">
      {Object.keys(item.cheers).length > 0 && (
        <span className="flex gap-2">
          {Object.entries(item.cheers).map(([e, n]) => (
            <span key={e} className="rounded-full bg-subtle px-2 py-0.5">
              {e} {n}
            </span>
          ))}
        </span>
      )}
      {item.comments.map((c) => (
        <span key={c.id} className="text-ink-2">
          <span className="font-semibold text-ink">{c.name}</span> {c.body}
        </span>
      ))}
    </div>
  );
}
