import type { ChallengeBundle, Friendship, GoalsDraft, Profile } from "../types";

/** Everything the UI needs from a backend. Implemented by Supabase and by the local demo. */
export interface DataStore {
  mode: "demo" | "supabase";
  me: Profile;
  /** The user's most recent challenge with all goals and logs, or null if none yet. */
  getBundle(userId: string): Promise<ChallengeBundle | null>;
  saveGoals(draft: GoalsDraft): Promise<void>;
  setHabitDone(habitId: string, date: string, done: boolean): Promise<void>;
  setOutcomeValue(goalId: string, date: string, value: number | null): Promise<void>;
  saveNote(date: string, note: string, energy: number | null): Promise<void>;
  listFriendships(): Promise<Friendship[]>;
  /** Send a request by username. If they already asked you, this accepts it. */
  requestFriend(username: string): Promise<"sent" | "accepted">;
  acceptFriend(friendshipId: string): Promise<void>;
  removeFriend(friendshipId: string): Promise<void>;
  updateProfile(displayName: string): Promise<void>;
}

export function newId(): string {
  return crypto.randomUUID();
}
