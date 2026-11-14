import type { Goal, ProgressLog } from "./types";

// What the person picks in the goal form, and how it maps to a goals row.
export type GoalKind = "habit" | "workout" | "quantity" | "timed";

export type GoalDraft = {
  title: string;
  kind: GoalKind;
  icon: string;
  perWeek: number; // habit + workout
  qty: number; // quantity per day
  unit: string; // quantity unit
  minutes: number; // timed per day
  shared: boolean;
};

export const GOAL_KINDS: { id: GoalKind; title: string; desc: string }[] = [
  { id: "habit", title: "Habit", desc: "X times a week" },
  { id: "workout", title: "Workout", desc: "Log time, distance, effort" },
  { id: "quantity", title: "Quantity", desc: "An amount per day" },
  { id: "timed", title: "Timed", desc: "Minutes per day" },
];

export const emptyDraft = (over: Partial<GoalDraft> = {}): GoalDraft => ({
  title: "",
  kind: "habit",
  icon: "star",
  perWeek: 7,
  qty: 8,
  unit: "glasses",
  minutes: 10,
  shared: true,
  ...over,
});

export function draftToRow(d: GoalDraft, startDate: string) {
  const base = {
    title: d.title.trim(),
    icon: d.icon,
    visibility: d.shared ? "friends" : "private",
    start_date: startDate,
    timed: false,
  } as const;
  switch (d.kind) {
    case "habit":
      return d.perWeek >= 7
        ? { ...base, type: "habit", cadence: "daily", target: 1, unit: "times" }
        : { ...base, type: "habit", cadence: "weekly", target: d.perWeek, unit: "times" };
    case "workout":
      return { ...base, type: "workout", cadence: "weekly", target: d.perWeek, unit: "workouts" };
    case "quantity":
      return { ...base, type: "habit", cadence: "daily", target: d.qty, unit: d.unit.trim() || "times" };
    case "timed":
      return { ...base, type: "habit", cadence: "daily", target: d.minutes, unit: "min", timed: true };
  }
}

export function goalToDraft(g: Goal): GoalDraft {
  const kind: GoalKind =
    g.type === "workout" ? "workout" : g.timed ? "timed" : g.cadence === "daily" && g.target > 1 ? "quantity" : "habit";
  return emptyDraft({
    title: g.title,
    kind,
    icon: g.icon,
    perWeek: g.cadence === "daily" ? 7 : g.target,
    qty: kind === "quantity" ? g.target : 8,
    unit: kind === "quantity" ? g.unit : "glasses",
    minutes: g.timed ? g.target : 10,
    shared: g.visibility === "friends",
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "Every day", "3× a week", "10 min a day", "8 glasses a day". */
export function describeTarget(g: Pick<Goal, "cadence" | "target" | "unit" | "timed" | "type">): string {
  if (g.cadence === "weekly") return `${num(g.target)}× a week`;
  if (g.timed || g.unit === "min") return `${num(g.target)} min a day`;
  if (g.target === 1 && g.unit === "times") return "Every day";
  return `${num(g.target)} ${g.unit} a day`;
}

// ---------------------------------------------------------------------------
// Progress math for the person's own data (the database does the same for friends).
// ---------------------------------------------------------------------------

export function sumFor(logs: ProgressLog[], goalId: string, from: string, to: string): number {
  return logs.filter((l) => l.goal_id === goalId && l.date >= from && l.date <= to).reduce((s, l) => s + Number(l.value), 0);
}

export function isActiveOn(g: Goal, day: string) {
  return !g.archived && g.start_date <= day;
}

/** Daily goal met on a day. */
export function dailyDone(g: Goal, logs: ProgressLog[], day: string) {
  return sumFor(logs, g.id, day, day) >= Number(g.target);
}

export { plural, num };
