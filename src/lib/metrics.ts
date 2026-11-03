// The math that turns check-ins into "am I on track?".
//
// - Outcome pace: where you *should* be on a straight line from your start value
//   to your target over the challenge, compared to your latest logged value.
// - Habit consistency: habits completed vs. the weekly target, per challenge week
//   (week 1 = your start date + 6 days, not the calendar week).
// - Habit -> outcome link: for completed weeks, how much each outcome moved in
//   high-consistency weeks vs. low-consistency weeks.

import { addDays, daysBetween, minDate } from "./dates";
import type { Challenge, ChallengeBundle, HabitGoal, HabitLog, OutcomeGoal, OutcomeLog } from "./types";

export type Pace = "ahead" | "on_track" | "behind" | "no_data";

/** How far ahead/behind (as a fraction of the total change) still counts as "on track". */
const ON_TRACK_BAND = 0.05;
/** A week at or above this habit completion counts as a "high-consistency" week. */
export const HIGH_CONSISTENCY = 0.8;

export const PACE_LABEL: Record<Pace, string> = {
  ahead: "Ahead of pace",
  on_track: "On track",
  behind: "Behind pace",
  no_data: "No check-ins yet",
};

// ---------------------------------------------------------------------------
// Challenge timeline
// ---------------------------------------------------------------------------

export type Timeline = {
  totalDays: number;
  /** 1-based day number of today, clamped to [0, totalDays]. 0 = not started. */
  dayNumber: number;
  phase: "upcoming" | "active" | "finished";
  /** Today's date clamped to the challenge window: the last day that "counts". */
  effectiveToday: string;
  /** Number of challenge weeks (last one may be partial). */
  weekCount: number;
};

export function timeline(challenge: Challenge, today: string): Timeline {
  const totalDays = daysBetween(challenge.start_date, challenge.end_date) + 1;
  const raw = daysBetween(challenge.start_date, today) + 1;
  const phase = raw < 1 ? "upcoming" : raw > totalDays ? "finished" : "active";
  return {
    totalDays,
    dayNumber: Math.max(0, Math.min(totalDays, raw)),
    phase,
    effectiveToday: minDate(today, challenge.end_date),
    weekCount: Math.ceil(totalDays / 7),
  };
}

/** Fraction of the challenge elapsed at the end of `date` (0..1). */
function elapsedFraction(challenge: Challenge, date: string): number {
  const total = daysBetween(challenge.start_date, challenge.end_date);
  if (total <= 0) return 1;
  return clamp(daysBetween(challenge.start_date, date) / total, 0, 1);
}

/** The straight-line "on pace" value for an outcome goal on a given date. */
export function expectedValue(goal: OutcomeGoal, challenge: Challenge, date: string): number {
  const f = elapsedFraction(challenge, date);
  return goal.start_value + (goal.target_value - goal.start_value) * f;
}

// ---------------------------------------------------------------------------
// Outcome goals
// ---------------------------------------------------------------------------

export type OutcomeStatus = {
  goal: OutcomeGoal;
  logs: OutcomeLog[]; // sorted by date
  latest: number;
  latestDate: string | null;
  /** Share of the total change achieved so far (can be < 0 or > 1). */
  progress: number;
  /** Share of the total change you should have achieved by latestDate. */
  expectedProgress: number;
  expectedAtLatest: number;
  pace: Pace;
  /** Linear projection of the value on the end date, or null if not enough data. */
  projectedEnd: number | null;
  /** Change per week needed from here to hit the target on time. */
  neededPerWeek: number | null;
  /** Your recent actual change per week. */
  recentPerWeek: number | null;
};

export function outcomeStatus(
  goal: OutcomeGoal,
  allLogs: OutcomeLog[],
  challenge: Challenge,
  today: string,
): OutcomeStatus {
  const logs = allLogs.filter((l) => l.goal_id === goal.id).sort((a, b) => a.date.localeCompare(b.date));
  const totalChange = goal.target_value - goal.start_value;
  const last = logs.at(-1);
  const latest = last ? last.value : goal.start_value;
  const latestDate = last ? last.date : null;

  const progress = (latest - goal.start_value) / totalChange;
  // Judge pace as of your last weigh-in/measurement, so logging weekly isn't penalised.
  const asOf = latestDate ?? challenge.start_date;
  const expectedProgress = elapsedFraction(challenge, asOf);
  const expectedAtLatest = expectedValue(goal, challenge, asOf);

  let pace: Pace = "no_data";
  if (last) {
    const delta = progress - expectedProgress;
    pace = delta > ON_TRACK_BAND ? "ahead" : delta >= -ON_TRACK_BAND ? "on_track" : "behind";
  }

  // Trend from the last 21 days of logs (plus the starting point if that's all we have).
  const points = logs.map((l) => ({ x: daysBetween(challenge.start_date, l.date), y: l.value }));
  let recent = points.filter((p) => p.x >= (points.at(-1)?.x ?? 0) - 21);
  if (recent.length < 3) recent = [{ x: 0, y: goal.start_value }, ...points];
  const slope = recent.length >= 2 && spanOf(recent) >= 7 ? linearSlope(recent) : null;

  const daysLeft = latestDate ? daysBetween(latestDate, challenge.end_date) : daysBetween(today, challenge.end_date);
  const projectedEnd = slope !== null && latestDate ? latest + slope * daysLeft : null;
  const neededPerWeek = daysLeft > 0 ? ((goal.target_value - latest) / daysLeft) * 7 : null;

  return {
    goal,
    logs,
    latest,
    latestDate,
    progress,
    expectedProgress,
    expectedAtLatest,
    pace,
    projectedEnd,
    neededPerWeek,
    recentPerWeek: slope === null ? null : slope * 7,
  };
}

/** True if the projected value reaches (or beats) the target. */
export function projectionHitsTarget(s: OutcomeStatus): boolean | null {
  if (s.projectedEnd === null) return null;
  const dir = Math.sign(s.goal.target_value - s.goal.start_value);
  // Within 2% of the total change counts as hitting it (175.1 vs a 175 lb goal is a hit).
  const tolerance = Math.abs(s.goal.target_value - s.goal.start_value) * 0.02;
  return (s.projectedEnd - s.goal.target_value) * dir >= -tolerance;
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export type HabitWeek = {
  week: number; // 1-based
  start: string;
  end: string;
  complete: boolean; // false for the in-progress week
  /** Completion vs. full weekly targets (capped per habit). */
  consistency: number;
  perHabit: { habit: HabitGoal; done: number; target: number }[];
};

export function habitWeeks(
  habits: HabitGoal[],
  logs: HabitLog[],
  challenge: Challenge,
  today: string,
): HabitWeek[] {
  const t = timeline(challenge, today);
  if (t.phase === "upcoming" || habits.length === 0) return [];
  const weeks: HabitWeek[] = [];
  const lastWeek = Math.ceil(t.dayNumber / 7);
  for (let w = 1; w <= lastWeek; w++) {
    const start = addDays(challenge.start_date, (w - 1) * 7);
    const end = minDate(addDays(start, 6), challenge.end_date);
    const daysInWeek = daysBetween(start, end) + 1;
    const complete = end < t.effectiveToday || t.phase === "finished";
    // For the in-progress week, judge against the share of the week elapsed so far.
    const elapsed = complete ? daysInWeek : daysBetween(start, t.effectiveToday) + 1;
    const perHabit = habits.map((habit) => {
      // A short final week scales the target down (e.g. 6 days of a daily habit = 6).
      const target = Math.max(1, Math.round((habit.target_per_week * daysInWeek) / 7));
      const done = logs.filter((l) => l.habit_id === habit.id && l.date >= start && l.date <= end).length;
      return { habit, done, target };
    });
    const sumTarget = perHabit.reduce((s, h) => s + (h.target * elapsed) / daysInWeek, 0);
    const sumDone = perHabit.reduce((s, h) => s + Math.min(h.done, h.target), 0);
    weeks.push({ week: w, start, end, complete, consistency: sumTarget ? Math.min(1, sumDone / sumTarget) : 0, perHabit });
  }
  return weeks;
}

export type HabitSummary = {
  habit: HabitGoal;
  done: number;
  /** Target so far, prorated for the in-progress week. */
  expected: number;
  rate: number;
};

/** Consistency for the whole challenge so far, overall and per habit. */
export function habitSummary(weeks: HabitWeek[], challenge: Challenge, today: string) {
  const t = timeline(challenge, today);
  const per = new Map<string, HabitSummary>();
  for (const w of weeks) {
    const elapsedInWeek = w.complete ? 7 : daysBetween(w.start, t.effectiveToday) + 1;
    for (const h of w.perHabit) {
      const expected = w.complete ? h.target : (h.target * elapsedInWeek) / 7;
      const cur = per.get(h.habit.id) ?? { habit: h.habit, done: 0, expected: 0, rate: 0 };
      cur.done += Math.min(h.done, h.target);
      cur.expected += expected;
      per.set(h.habit.id, cur);
    }
  }
  const list = [...per.values()].map((h) => ({ ...h, rate: h.expected ? Math.min(1, h.done / h.expected) : 0 }));
  const done = list.reduce((s, h) => s + h.done, 0);
  const expected = list.reduce((s, h) => s + h.expected, 0);
  return { overall: expected ? Math.min(1, done / expected) : 0, perHabit: list };
}

/** Consecutive days (ending today, or yesterday if today isn't logged yet) with any check-in. */
export function checkInStreak(bundle: ChallengeBundle, today: string): number {
  const days = new Set<string>([...bundle.habitLogs.map((l) => l.date), ...bundle.outcomeLogs.map((l) => l.date)]);
  let d = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(d) && d >= bundle.challenge.start_date) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Habit -> outcome link
// ---------------------------------------------------------------------------

export type WeekImpact = {
  week: number;
  consistency: number;
  /** Movement toward the target this week, in the goal's units (positive = good). */
  change: number | null;
};

export type Impact = {
  goal: OutcomeGoal;
  weeks: WeekImpact[];
  highAvg: number | null;
  lowAvg: number | null;
  highCount: number;
  lowCount: number;
};

export function habitImpact(
  goal: OutcomeGoal,
  outcomeLogs: OutcomeLog[],
  weeks: HabitWeek[],
): Impact {
  const logs = outcomeLogs.filter((l) => l.goal_id === goal.id).sort((a, b) => a.date.localeCompare(b.date));
  const dir = Math.sign(goal.target_value - goal.start_value);
  const valueOnOrBefore = (date: string) => {
    let v: number | null = null;
    for (const l of logs) if (l.date <= date) v = l.value;
    return v;
  };

  const rows: WeekImpact[] = weeks
    .filter((w) => w.complete)
    .map((w) => {
      const hasLogInWeek = logs.some((l) => l.date >= w.start && l.date <= w.end);
      const before = valueOnOrBefore(addDays(w.start, -1)) ?? goal.start_value;
      const after = valueOnOrBefore(w.end);
      const change = hasLogInWeek && after !== null ? (after - before) * dir : null;
      return { week: w.week, consistency: w.consistency, change };
    });

  const high = rows.filter((r) => r.change !== null && r.consistency >= HIGH_CONSISTENCY);
  const low = rows.filter((r) => r.change !== null && r.consistency < HIGH_CONSISTENCY);
  const avg = (xs: WeekImpact[]) => (xs.length ? xs.reduce((s, r) => s + (r.change ?? 0), 0) / xs.length : null);

  return { goal, weeks: rows, highAvg: avg(high), lowAvg: avg(low), highCount: high.length, lowCount: low.length };
}

// ---------------------------------------------------------------------------
// One-line summary used on the dashboard and friends list
// ---------------------------------------------------------------------------

export function overallPace(statuses: OutcomeStatus[]): Pace {
  const withData = statuses.filter((s) => s.pace !== "no_data");
  if (!withData.length) return "no_data";
  const avgDelta = withData.reduce((s, x) => s + (x.progress - x.expectedProgress), 0) / withData.length;
  return avgDelta > ON_TRACK_BAND ? "ahead" : avgDelta >= -ON_TRACK_BAND ? "on_track" : "behind";
}

export function summarize(bundle: ChallengeBundle, today: string) {
  const t = timeline(bundle.challenge, today);
  const outcomes = bundle.outcomes.map((g) => outcomeStatus(g, bundle.outcomeLogs, bundle.challenge, today));
  const weeks = habitWeeks(bundle.habits, bundle.habitLogs, bundle.challenge, today);
  const habits = habitSummary(weeks, bundle.challenge, today);
  return {
    timeline: t,
    outcomes,
    weeks,
    habits,
    pace: overallPace(outcomes),
    streak: checkInStreak(bundle, today),
  };
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function spanOf(points: { x: number }[]) {
  return points.at(-1)!.x - points[0].x;
}

function linearSlope(points: { x: number; y: number }[]): number {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function formatNumber(n: number, digits = 1): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

export function formatValue(n: number, unit: string, digits = 1): string {
  return unit ? `${formatNumber(n, digits)} ${unit}` : formatNumber(n, digits);
}

export function formatSigned(n: number, unit: string, digits = 1): string {
  const s = formatValue(Math.abs(n), unit, digits);
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}
