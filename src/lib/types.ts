export type Profile = {
  id: string;
  username: string;
  display_name: string;
};

export type Challenge = {
  id: string;
  user_id: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
};

/** A measurable end result, e.g. "Weight 192 -> 175 lb". */
export type OutcomeGoal = {
  id: string;
  challenge_id: string;
  user_id: string;
  name: string;
  unit: string;
  start_value: number;
  target_value: number;
  sort: number;
};

/** A repeated action, e.g. "Workout 4x per week". 7 = daily. */
export type HabitGoal = {
  id: string;
  challenge_id: string;
  user_id: string;
  name: string;
  target_per_week: number;
  sort: number;
};

export type OutcomeLog = {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  value: number;
};

/** A row exists = the habit was done that day. */
export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
};

export type DailyNote = {
  id: string;
  user_id: string;
  date: string;
  note: string;
  energy: number | null;
};

/** Everything needed to render one person's challenge. */
export type ChallengeBundle = {
  challenge: Challenge;
  outcomes: OutcomeGoal[];
  habits: HabitGoal[];
  outcomeLogs: OutcomeLog[];
  habitLogs: HabitLog[];
  notes: DailyNote[];
};

export type FriendStatus = "pending" | "accepted";

export type Friendship = {
  id: string;
  status: FriendStatus;
  /** true when the signed-in user sent the request */
  outgoing: boolean;
  friend: Profile;
};

/** Draft shape edited on the My Goals page. */
export type GoalsDraft = {
  challenge: Pick<Challenge, "id" | "title" | "start_date" | "end_date">;
  outcomes: Pick<OutcomeGoal, "id" | "name" | "unit" | "start_value" | "target_value">[];
  habits: Pick<HabitGoal, "id" | "name" | "target_per_week">[];
};
