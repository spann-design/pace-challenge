// Demo backend: keeps everything in this browser's localStorage.

import type { ChallengeBundle, Friendship, GoalsDraft } from "../types";
import { createDemoDb, type DemoDb } from "./demo-data";
import { newId, type DataStore } from "./types";

const KEY = "pace-demo-v1";

function load(today: string): DemoDb {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DemoDb;
    } catch {
      /* fall through and reseed */
    }
  }
  const db = createDemoDb(today);
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

export function resetDemo() {
  localStorage.removeItem(KEY);
}

export function createDemoStore(today: string): DataStore {
  const db = load(today);
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const me = db.profiles.find((p) => p.id === db.meId)!;
  const myBundle = () => db.bundles[me.id] as ChallengeBundle | undefined;

  const isFriend = (otherId: string) =>
    db.friendships.some(
      (f) =>
        f.status === "accepted" &&
        ((f.requester_id === me.id && f.addressee_id === otherId) ||
          (f.addressee_id === me.id && f.requester_id === otherId)),
    );

  return {
    mode: "demo",
    me,

    async getBundle(userId) {
      if (userId !== me.id && !isFriend(userId)) return null;
      const b = db.bundles[userId];
      return b ? structuredClone(b) : null;
    },

    async saveGoals(draft: GoalsDraft) {
      const existing = myBundle();
      const cid = draft.challenge.id;
      const challenge = { ...draft.challenge, user_id: me.id };
      const outcomes = draft.outcomes.map((o, i) => ({ ...o, challenge_id: cid, user_id: me.id, sort: i }));
      const habits = draft.habits.map((h, i) => ({ ...h, challenge_id: cid, user_id: me.id, sort: i }));
      const keepO = new Set(outcomes.map((o) => o.id));
      const keepH = new Set(habits.map((h) => h.id));
      db.bundles[me.id] = {
        challenge,
        outcomes,
        habits,
        outcomeLogs: (existing?.outcomeLogs ?? []).filter((l) => keepO.has(l.goal_id)),
        habitLogs: (existing?.habitLogs ?? []).filter((l) => keepH.has(l.habit_id)),
        notes: existing?.notes ?? [],
      };
      save();
    },

    async setHabitDone(habitId, date, done) {
      const b = myBundle();
      if (!b) return;
      b.habitLogs = b.habitLogs.filter((l) => !(l.habit_id === habitId && l.date === date));
      if (done) b.habitLogs.push({ id: newId(), habit_id: habitId, user_id: me.id, date });
      save();
    },

    async setOutcomeValue(goalId, date, value) {
      const b = myBundle();
      if (!b) return;
      b.outcomeLogs = b.outcomeLogs.filter((l) => !(l.goal_id === goalId && l.date === date));
      if (value !== null) b.outcomeLogs.push({ id: newId(), goal_id: goalId, user_id: me.id, date, value });
      save();
    },

    async saveNote(date, note, energy) {
      const b = myBundle();
      if (!b) return;
      b.notes = b.notes.filter((n) => n.date !== date);
      if (note.trim() || energy !== null) b.notes.push({ id: newId(), user_id: me.id, date, note, energy });
      save();
    },

    async listFriendships(): Promise<Friendship[]> {
      return db.friendships
        .filter((f) => f.requester_id === me.id || f.addressee_id === me.id)
        .map((f) => {
          const outgoing = f.requester_id === me.id;
          const friend = db.profiles.find((p) => p.id === (outgoing ? f.addressee_id : f.requester_id))!;
          return { id: f.id, status: f.status, outgoing, friend };
        });
    },

    async requestFriend(username) {
      const other = db.profiles.find((p) => p.username === username.trim().toLowerCase());
      if (!other) throw new Error(`No one with the username "${username}". In demo mode, try "sam".`);
      if (other.id === me.id) throw new Error("That's you!");
      const existing = db.friendships.find(
        (f) =>
          (f.requester_id === me.id && f.addressee_id === other.id) ||
          (f.addressee_id === me.id && f.requester_id === other.id),
      );
      if (existing?.status === "accepted") throw new Error(`You're already friends with ${other.display_name}.`);
      if (existing && existing.requester_id === me.id) throw new Error("Request already sent.");
      if (existing) {
        existing.status = "accepted";
        save();
        return "accepted";
      }
      db.friendships.push({ id: newId(), requester_id: me.id, addressee_id: other.id, status: "pending" });
      save();
      return "sent";
    },

    async acceptFriend(id) {
      const f = db.friendships.find((x) => x.id === id && x.addressee_id === me.id);
      if (f) f.status = "accepted";
      save();
    },

    async removeFriend(id) {
      db.friendships = db.friendships.filter((f) => f.id !== id);
      save();
    },

    async updateProfile(displayName) {
      me.display_name = displayName;
      save();
    },
  };
}
