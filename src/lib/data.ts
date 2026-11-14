"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { today } from "./dates";
import { supabase } from "./supabase/client";
import type { FeedItem, Goal, GoalStat, LeaderRow, ProgressLog, UserSummary } from "./types";

// ---------------------------------------------------------------------------
// Reads. SWR caches each one so switching tabs is instant, then refreshes.
// ---------------------------------------------------------------------------

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

/** Postgres numerics arrive as strings; turn the ones we do math on into numbers. */
const toNum = <T,>(rows: T[], keys: string[]) =>
  rows.map((r) => {
    const o = { ...r } as Record<string, unknown>;
    for (const k of keys) if (o[k] != null) o[k] = Number(o[k]);
    return o as T;
  });

export function useGoals() {
  return useSWR<Goal[]>("goals", async () => {
    const rows = await must<Goal[]>(
      supabase().from("goals").select("*").eq("archived", false).order("sort_order").order("created_at"),
    );
    return toNum(rows, ["target"]);
  });
}

export const logsKey = (from: string, to: string) => ["logs", from, to] as const;

export function useLogs(from: string, to: string) {
  return useSWR<ProgressLog[]>(logsKey(from, to), async () => {
    const rows = await must<ProgressLog[]>(
      supabase().from("progress_logs").select("*").gte("date", from).lte("date", to).order("created_at"),
    );
    return toNum(rows, ["value", "duration_min", "distance"]);
  });
}

export function useSummary(userId: string | undefined, day = today()) {
  return useSWR<UserSummary | null>(userId ? ["summary", userId, day] : null, async () => {
    const rows = await must<UserSummary[]>(supabase().rpc("user_summary", { p_user: userId, p_today: day }));
    return rows[0] ? toNum([rows[0]], ["consistency", "this_week", "last_week"])[0] : null;
  });
}

export function useGoalStats(userId: string | undefined, day = today()) {
  return useSWR<GoalStat[]>(userId ? ["goalStats", userId, day] : null, async () =>
    toNum(await must<GoalStat[]>(supabase().rpc("goal_stats", { p_user: userId, p_today: day })), ["this_week", "last_week", "consistency"]),
  );
}

export function useLeaderboard(day = today()) {
  return useSWR<LeaderRow[]>(["leaderboard", day], () => must<LeaderRow[]>(supabase().rpc("friend_leaderboard", { p_today: day })));
}

export function useGroupBoard(groupId: string | undefined, day = today()) {
  return useSWR<LeaderRow[]>(groupId ? ["groupBoard", groupId, day] : null, async () =>
    toNum(await must<LeaderRow[]>(supabase().rpc("group_leaderboard", { p_group: groupId, p_today: day })), ["this_week"]),
  );
}

export function useFeed(userId: string | undefined, day = today()) {
  return useSWR<FeedItem[]>(userId ? ["feed", userId, day] : null, () =>
    must<FeedItem[]>(supabase().rpc("activity_feed", { p_user: userId, p_today: day, p_limit: 20 })),
  );
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Refresh every cached list of logs and the stats that depend on them. */
export function refreshProgress() {
  return globalMutate((key) => Array.isArray(key) && ["logs", "summary", "goalStats", "leaderboard", "groupBoard", "feed"].includes(key[0]));
}

export type LogInput = {
  goal: Goal;
  date: string;
  value: number;
  duration_min?: number | null;
  distance?: number | null;
  effort?: number | null;
  note?: string | null;
  activity?: string | null;
};

/** Adds a check-in. Updates any cached log list right away, then saves. */
export async function addLog(input: LogInput) {
  const { goal, ...rest } = input;
  const optimistic: ProgressLog = {
    id: `tmp-${Math.random().toString(36).slice(2)}`,
    goal_id: goal.id,
    user_id: goal.owner_id,
    created_at: new Date().toISOString(),
    note: null,
    duration_min: null,
    distance: null,
    effort: null,
    activity: null,
    ...rest,
  };
  await patchLogs(input.date, (logs) => [...logs, optimistic]);
  const { error } = await supabase()
    .from("progress_logs")
    .insert({ goal_id: goal.id, ...rest, note: rest.note?.trim() || null });
  await refreshProgress();
  if (error) throw error;
}

/** Removes all of a goal's check-ins on one day (undo). */
export async function clearDay(goalId: string, date: string) {
  await patchLogs(date, (logs) => logs.filter((l) => !(l.goal_id === goalId && l.date === date)));
  const { error } = await supabase().from("progress_logs").delete().eq("goal_id", goalId).eq("date", date);
  await refreshProgress();
  if (error) throw error;
}

export async function deleteLog(id: string, date: string) {
  await patchLogs(date, (logs) => logs.filter((l) => l.id !== id));
  const { error } = await supabase().from("progress_logs").delete().eq("id", id);
  await refreshProgress();
  if (error) throw error;
}

function patchLogs(date: string, fn: (logs: ProgressLog[]) => ProgressLog[]) {
  return globalMutate(
    (key) => Array.isArray(key) && key[0] === "logs" && key[1] <= date && key[2] >= date,
    (current?: ProgressLog[]) => (current ? fn(current) : current),
    { revalidate: false },
  );
}

export async function saveGoal(id: string | null, row: Record<string, unknown>) {
  const sb = supabase();
  const { error } = id ? await sb.from("goals").update(row).eq("id", id) : await sb.from("goals").insert(row);
  await globalMutate("goals");
  await refreshProgress();
  if (error) throw error;
}

export async function archiveGoal(id: string) {
  const { error } = await supabase().from("goals").update({ archived: true }).eq("id", id);
  await globalMutate("goals");
  await refreshProgress();
  if (error) throw error;
}
