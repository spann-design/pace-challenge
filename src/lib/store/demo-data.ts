// Made-up example data for demo mode. Everything is generated relative to "today"
// so the demo always shows a challenge in progress (day 40 of 90).

import { addDays, daysBetween } from "../dates";
import type { ChallengeBundle, DailyNote, HabitLog, OutcomeLog, Profile } from "../types";

export type DemoDb = {
  version: 1;
  meId: string;
  profiles: Profile[];
  bundles: Record<string, ChallengeBundle>;
  friendships: { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted" }[];
};

type OutcomeSpec = {
  name: string;
  unit: string;
  start: number;
  target: number;
  /** Days between measurements. */
  every: number;
  /** Fraction of the total change gained per week at 100% consistency. */
  bestWeekly: number;
  noise: number;
  digits: number;
};

type PersonSpec = {
  profile: Profile;
  title: string;
  startOffset: number; // days before today the challenge started
  length: number;
  outcomes: OutcomeSpec[];
  habits: { name: string; perWeek: number }[];
  /** Habit consistency for each challenge week (cycles if shorter). */
  weekly: number[];
  notes: Record<number, string>;
  seed: number;
};

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBundle(spec: PersonSpec, today: string): ChallengeBundle {
  const rand = rng(spec.seed);
  const uid = spec.profile.id;
  const cid = `${uid}-challenge`;
  const start = addDays(today, -spec.startOffset);
  const end = addDays(start, spec.length - 1);
  const lastLogged = addDays(today, -1); // leave today open so you can check in
  const days = daysBetween(start, lastLogged) + 1;

  const outcomes = spec.outcomes.map((o, i) => ({
    id: `${cid}-o${i}`,
    challenge_id: cid,
    user_id: uid,
    name: o.name,
    unit: o.unit,
    start_value: o.start,
    target_value: o.target,
    sort: i,
  }));
  const habits = spec.habits.map((h, i) => ({
    id: `${cid}-h${i}`,
    challenge_id: cid,
    user_id: uid,
    name: h.name,
    target_per_week: h.perWeek,
    sort: i,
  }));

  const habitLogs: HabitLog[] = [];
  const outcomeLogs: OutcomeLog[] = [];
  const notes: DailyNote[] = [];
  const level = spec.outcomes.map((o) => o.start);

  for (let d = 0; d < days; d++) {
    const date = addDays(start, d);
    const week = Math.floor(d / 7);
    const c = spec.weekly[week % spec.weekly.length];

    habits.forEach((h) => {
      const p = h.target_per_week === 7 ? c : (c * h.target_per_week) / 7;
      if (rand() < p) habitLogs.push({ id: `${h.id}-${date}`, habit_id: h.id, user_id: uid, date });
    });

    // Outcomes improve faster in consistent weeks, and drift back a little in poor ones.
    spec.outcomes.forEach((o, i) => {
      const weeklyGain = (o.target - o.start) * o.bestWeekly * (c - 0.45) * 1.6;
      level[i] += weeklyGain / 7;
      if (d % o.every === 0 && d > 0) {
        const v = level[i] + (rand() - 0.5) * 2 * o.noise;
        const factor = 10 ** o.digits;
        outcomeLogs.push({
          id: `${outcomes[i].id}-${date}`,
          goal_id: outcomes[i].id,
          user_id: uid,
          date,
          value: Math.round(v * factor) / factor,
        });
      }
    });

    if (spec.notes[d]) {
      notes.push({ id: `${cid}-n${d}`, user_id: uid, date, note: spec.notes[d], energy: 2 + Math.floor(rand() * 4) });
    }
  }

  return {
    challenge: { id: cid, user_id: uid, title: spec.title, start_date: start, end_date: end },
    outcomes,
    habits,
    outcomeLogs,
    habitLogs,
    notes,
  };
}

export function createDemoDb(today: string): DemoDb {
  const me: Profile = { id: "demo-me", username: "kennedy", display_name: "Kennedy" };
  const jordan: Profile = { id: "demo-jordan", username: "jordan", display_name: "Jordan" };
  const taylor: Profile = { id: "demo-taylor", username: "taylor", display_name: "Taylor" };
  const sam: Profile = { id: "demo-sam", username: "sam", display_name: "Sam" };

  const people: PersonSpec[] = [
    {
      profile: me,
      title: "90-Day Reset",
      startOffset: 39,
      length: 90,
      outcomes: [
        { name: "Body weight", unit: "lb", start: 192, target: 175, every: 2, bestWeekly: 0.13, noise: 0.6, digits: 1 },
        { name: "Waist", unit: "in", start: 36, target: 33, every: 7, bestWeekly: 0.13, noise: 0.15, digits: 1 },
      ],
      habits: [
        { name: "Strength workout", perWeek: 4 },
        { name: "10k steps", perWeek: 7 },
        { name: "Hit 150g protein", perWeek: 7 },
        { name: "Lights out by 10:30", perWeek: 5 },
      ],
      weekly: [0.92, 0.88, 0.55, 0.9, 0.95, 0.5, 0.85],
      notes: {
        2: "Sore but feeling good. Meal prepped for the week.",
        16: "Work travel. Hard to hit protein.",
        30: "Best week so far, energy way up.",
        36: "Birthday weekend, off plan.",
      },
      seed: 7,
    },
    {
      profile: jordan,
      title: "Race-ready in 90",
      startOffset: 39,
      length: 90,
      outcomes: [
        { name: "5K time", unit: "min", start: 31, target: 26, every: 7, bestWeekly: 0.085, noise: 0.3, digits: 1 },
        { name: "Max push-ups", unit: "reps", start: 15, target: 40, every: 7, bestWeekly: 0.22, noise: 1, digits: 0 },
      ],
      habits: [
        { name: "Run", perWeek: 3 },
        { name: "Mobility 10 min", perWeek: 7 },
        { name: "No alcohol on weeknights", perWeek: 5 },
      ],
      weekly: [0.95, 0.7, 0.45, 0.6, 0.95, 0.55],
      notes: { 9: "Shin splints, swapped a run for the bike.", 28: "New 5K PR!" },
      seed: 11,
    },
    {
      profile: taylor,
      title: "Fall strength block",
      startOffset: 20,
      length: 60,
      outcomes: [{ name: "Squat 1RM", unit: "lb", start: 185, target: 225, every: 7, bestWeekly: 0.12, noise: 2, digits: 0 }],
      habits: [
        { name: "Lift", perWeek: 3 },
        { name: "8 hours of sleep", perWeek: 5 },
      ],
      weekly: [0.9, 0.8, 0.95],
      notes: {},
      seed: 3,
    },
  ];

  const bundles: Record<string, ChallengeBundle> = {};
  for (const p of people) bundles[p.profile.id] = buildBundle(p, today);

  return {
    version: 1,
    meId: me.id,
    profiles: [me, jordan, taylor, sam],
    bundles,
    friendships: [
      { id: "f-jordan", requester_id: me.id, addressee_id: jordan.id, status: "accepted" },
      { id: "f-taylor", requester_id: taylor.id, addressee_id: me.id, status: "pending" },
    ],
  };
}
