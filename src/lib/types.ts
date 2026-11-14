import type { AccentId } from "./theme";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_bg: string;
  accent: AccentId;
  onboarded: boolean;
};

export type Goal = {
  id: string;
  owner_id: string;
  title: string;
  type: "habit" | "workout";
  icon: string;
  target: number;
  unit: string;
  cadence: "daily" | "weekly";
  visibility: "private" | "friends";
  timed: boolean;
  start_date: string; // YYYY-MM-DD
  archived: boolean;
  sort_order: number;
  created_at: string;
};

export type ProgressLog = {
  id: string;
  goal_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD, the person's local day
  value: number;
  note: string | null;
  duration_min: number | null;
  distance: number | null;
  effort: number | null;
  activity: string | null;
  created_at: string;
};

export type UserSummary = {
  current_streak: number;
  best_streak: number;
  consistency: number;
  this_week: number;
  last_week: number;
  on_track: boolean;
};

export type GoalStat = {
  goal_id: string;
  title: string;
  icon: string;
  type: Goal["type"];
  cadence: Goal["cadence"];
  current_streak: number;
  best_streak: number;
  this_week: number;
  last_week: number;
  consistency: number;
};

export type LeaderRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_bg: string;
  current_streak: number;
  this_week?: number;
  on_track: boolean;
  is_me: boolean;
};

export type FeedComment = { id: string; user_id: string; name: string; emoji: string; bg: string; body: string; at: string };

export type FeedItem = {
  log_id: string;
  goal_title: string;
  goal_icon: string;
  day: string;
  created_at: string;
  completed: boolean;
  cheers: Record<string, number>;
  my_cheer: string | null;
  comments: FeedComment[];
};
