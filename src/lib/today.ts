import { weekStart } from "./dates";
import { describeTarget, num, sumFor } from "./goals";
import type { Goal, GoalStat, ProgressLog } from "./types";

export type RowAction = "check" | "timer" | "log";

export type TodayRow = {
  goal: Goal;
  action: RowAction;
  /** Daily: met today. Weekly: checked in today. */
  done: boolean;
  /** Counted in today's "X of Y". */
  counts: boolean;
  todayTotal: number;
  weekTotal: number;
  weekMet: boolean;
  sub: string;
};

export function actionFor(g: Goal): RowAction {
  if (g.type === "workout") return "log";
  if (g.timed) return "timer";
  return "check";
}

/**
 * Today's list. Daily goals always count toward X of Y; weekly goals only
 * count on days you check in, so a rest day never hurts.
 */
export function buildToday(goals: Goal[], logs: ProgressLog[], day: string, stats?: GoalStat[]): TodayRow[] {
  const ws = weekStart(day);
  return goals
    .filter((g) => !g.archived && g.start_date <= day)
    .map((g) => {
      const todayTotal = sumFor(logs, g.id, day, day);
      const weekTotal = sumFor(logs, g.id, ws, day);
      const weekMet = weekTotal >= g.target;
      const daily = g.cadence === "daily";
      const done = daily ? todayTotal >= g.target : todayTotal > 0;
      const streak = stats?.find((s) => s.goal_id === g.id)?.current_streak ?? 0;
      return {
        goal: g,
        action: actionFor(g),
        done,
        counts: daily || todayTotal > 0,
        todayTotal,
        weekTotal,
        weekMet,
        sub: subline(g, { todayTotal, weekTotal, weekMet, streak, done }),
      };
    });
}

function subline(g: Goal, s: { todayTotal: number; weekTotal: number; weekMet: boolean; streak: number; done: boolean }) {
  if (g.cadence === "weekly") {
    if (s.weekMet) return s.streak > 1 ? `Done for the week · ${s.streak} weeks in a row` : "Done for the week";
    return `${num(s.weekTotal)} of ${num(g.target)} this week`;
  }
  if (!s.done && s.todayTotal > 0) {
    return g.timed ? `${num(s.todayTotal)} of ${num(g.target)} min logged` : `${num(s.todayTotal)} of ${num(g.target)} ${g.unit}`;
  }
  if (s.streak > 1) return `${s.streak}-day streak`;
  if (g.timed) return `${num(g.target)} min · timed`;
  return describeTarget(g);
}

export function countToday(rows: TodayRow[]) {
  const counted = rows.filter((r) => r.counts);
  return { done: counted.filter((r) => r.done).length, total: counted.length };
}

export function statusWord(done: number, total: number) {
  if (total === 0) return "Add a goal";
  if (done >= total) return "Day complete";
  const p = done / total;
  if (p >= 0.7) return "Almost there";
  if (p >= 0.4) return "Halfway";
  return "Warming up";
}

/** Same rule as the database: every daily goal met, or any check-in if there are none. */
export function dayComplete(goals: Goal[], logs: ProgressLog[], day: string): boolean {
  const daily = goals.filter((g) => !g.archived && g.start_date <= day && g.cadence === "daily");
  if (daily.length === 0) return logs.some((l) => l.date === day);
  return daily.every((g) => sumFor(logs, g.id, day, day) >= g.target);
}

/** Share of daily goals met on a day (0..1), for calendar rings. */
export function dayRatio(goals: Goal[], logs: ProgressLog[], day: string): number | null {
  const daily = goals.filter((g) => !g.archived && g.start_date <= day && g.cadence === "daily");
  if (daily.length === 0) return logs.some((l) => l.date === day) ? 1 : null;
  return daily.filter((g) => sumFor(logs, g.id, day, day) >= g.target).length / daily.length;
}

export const WORKOUT_TYPES = ["Run", "Walk", "Strength", "Yoga", "Cycle", "HIIT", "Swim"] as const;

export function defaultWorkoutType(icon: string) {
  return ({ run: "Run", walk: "Walk", power: "Strength", yoga: "Yoga", cycle: "Cycle", swim: "Swim", stretch: "Yoga" } as Record<string, string>)[icon] ?? "Run";
}
