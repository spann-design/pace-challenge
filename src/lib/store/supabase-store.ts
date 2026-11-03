// Real backend: Supabase Postgres. Security is enforced by row-level security
// policies in supabase/schema.sql. This code only asks; the database decides.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ChallengeBundle, Friendship, GoalsDraft, Profile } from "../types";
import type { DataStore } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!client) client = createClient(url!, key!);
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Like check(), for list queries: never null. */
function many<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  return check(res) ?? [];
}

const num = (v: unknown) => Number(v);

export async function loadMyProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase().from("profiles").select("id, username, display_name").eq("id", userId).maybeSingle();
  return data;
}

export function createSupabaseStore(me: Profile): DataStore {
  const db = supabase();

  return {
    mode: "supabase",
    me,

    async getBundle(userId) {
      const challenge = check(
        await db
          .from("challenges")
          .select("id, user_id, title, start_date, end_date")
          .eq("user_id", userId)
          .order("start_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      if (!challenge) return null;

      const [outcomes, habits, notes] = await Promise.all([
        db.from("outcome_goals").select("*").eq("challenge_id", challenge.id).order("sort"),
        db.from("habit_goals").select("*").eq("challenge_id", challenge.id).order("sort"),
        db
          .from("daily_notes")
          .select("*")
          .eq("user_id", userId)
          .gte("date", challenge.start_date)
          .lte("date", challenge.end_date),
      ]).then((r) => r.map(many));

      const goalIds = outcomes.map((o: { id: string }) => o.id);
      const habitIds = habits.map((h: { id: string }) => h.id);
      const [outcomeLogs, habitLogs] = await Promise.all([
        goalIds.length
          ? db.from("outcome_logs").select("*").in("goal_id", goalIds).order("date").then(many)
          : Promise.resolve([]),
        habitIds.length
          ? db.from("habit_logs").select("*").in("habit_id", habitIds).limit(5000).then(many)
          : Promise.resolve([]),
      ]);

      return {
        challenge,
        outcomes: outcomes.map((o: Record<string, unknown>) => ({
          ...o,
          start_value: num(o.start_value),
          target_value: num(o.target_value),
        })),
        habits,
        outcomeLogs: outcomeLogs.map((l: Record<string, unknown>) => ({ ...l, value: num(l.value) })),
        habitLogs,
        notes,
      } as ChallengeBundle;
    },

    async saveGoals(draft: GoalsDraft) {
      const cid = draft.challenge.id;
      check(await db.from("challenges").upsert({ ...draft.challenge, user_id: me.id }));

      const [oldO, oldH] = await Promise.all([
        db.from("outcome_goals").select("id").eq("challenge_id", cid).then(many),
        db.from("habit_goals").select("id").eq("challenge_id", cid).then(many),
      ]);
      const removedO = oldO.map((r: { id: string }) => r.id).filter((id: string) => !draft.outcomes.some((o) => o.id === id));
      const removedH = oldH.map((r: { id: string }) => r.id).filter((id: string) => !draft.habits.some((h) => h.id === id));
      if (removedO.length) check(await db.from("outcome_goals").delete().in("id", removedO));
      if (removedH.length) check(await db.from("habit_goals").delete().in("id", removedH));

      if (draft.outcomes.length)
        check(
          await db
            .from("outcome_goals")
            .upsert(draft.outcomes.map((o, i) => ({ ...o, challenge_id: cid, user_id: me.id, sort: i }))),
        );
      if (draft.habits.length)
        check(
          await db
            .from("habit_goals")
            .upsert(draft.habits.map((h, i) => ({ ...h, challenge_id: cid, user_id: me.id, sort: i }))),
        );
    },

    async setHabitDone(habitId, date, done) {
      if (done) {
        check(
          await db
            .from("habit_logs")
            .upsert({ habit_id: habitId, user_id: me.id, date }, { onConflict: "habit_id,date", ignoreDuplicates: true }),
        );
      } else {
        check(await db.from("habit_logs").delete().eq("habit_id", habitId).eq("date", date));
      }
    },

    async setOutcomeValue(goalId, date, value) {
      if (value === null) {
        check(await db.from("outcome_logs").delete().eq("goal_id", goalId).eq("date", date));
      } else {
        check(
          await db
            .from("outcome_logs")
            .upsert({ goal_id: goalId, user_id: me.id, date, value }, { onConflict: "goal_id,date" }),
        );
      }
    },

    async saveNote(date, note, energy) {
      if (!note.trim() && energy === null) {
        check(await db.from("daily_notes").delete().eq("user_id", me.id).eq("date", date));
      } else {
        check(
          await db.from("daily_notes").upsert({ user_id: me.id, date, note, energy }, { onConflict: "user_id,date" }),
        );
      }
    },

    async listFriendships(): Promise<Friendship[]> {
      const rows = many(await db.from("friendships").select("id, requester_id, addressee_id, status"));
      if (!rows.length) return [];
      const otherIds = rows.map((r) => (r.requester_id === me.id ? r.addressee_id : r.requester_id));
      const profiles = many(await db.from("profiles").select("id, username, display_name").in("id", otherIds));
      return rows.flatMap((r) => {
        const outgoing = r.requester_id === me.id;
        const friend = profiles.find((p) => p.id === (outgoing ? r.addressee_id : r.requester_id));
        return friend ? [{ id: r.id, status: r.status, outgoing, friend }] : [];
      });
    },

    async requestFriend(username) {
      const handle = username.trim().toLowerCase().replace(/^@/, "");
      const other = check(
        await db.from("profiles").select("id, display_name").eq("username", handle).maybeSingle(),
      );
      if (!other) throw new Error(`No one with the username "${handle}".`);
      if (other.id === me.id) throw new Error("That's you!");

      const existing = (await this.listFriendships()).find((f) => f.friend.id === other.id);
      if (existing?.status === "accepted") throw new Error(`You're already friends with ${other.display_name}.`);
      if (existing?.outgoing) throw new Error("Request already sent.");
      if (existing) {
        await this.acceptFriend(existing.id);
        return "accepted";
      }
      check(await db.from("friendships").insert({ requester_id: me.id, addressee_id: other.id }));
      return "sent";
    },

    async acceptFriend(id) {
      check(await db.from("friendships").update({ status: "accepted" }).eq("id", id));
    },

    async removeFriend(id) {
      check(await db.from("friendships").delete().eq("id", id));
    },

    async updateProfile(displayName) {
      check(await db.from("profiles").update({ display_name: displayName }).eq("id", me.id));
    },
  };
}
