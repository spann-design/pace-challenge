"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp, useBundle } from "@/components/app-provider";
import { Empty, FREQUENCY_LABEL, Meter, PaceBadge, SectionTitle } from "@/components/ui";
import { addDays, formatLong } from "@/lib/dates";
import { formatValue, summarize } from "@/lib/metrics";
import type { ChallengeBundle } from "@/lib/types";

export default function TodayPage() {
  const { store, today } = useApp();
  const { bundle, loading, error } = useBundle(store.me.id);

  if (loading) return null;
  if (error) return <Empty>{error}</Empty>;
  if (!bundle)
    return (
      <Empty>
        <p className="text-base font-semibold text-ink">Welcome, {store.me.display_name}!</p>
        <p className="mt-1">Start by setting your challenge dates and goals.</p>
        <Link href="/goals" className="btn btn-primary mt-4">
          Set up my goals
        </Link>
      </Empty>
    );
  return <CheckIn bundle={bundle} today={today} />;
}

function CheckIn({ bundle, today }: { bundle: ChallengeBundle; today: string }) {
  const { challenge } = bundle;
  const lastDay = today < challenge.end_date ? today : challenge.end_date;
  const [date, setDate] = useState(lastDay < challenge.start_date ? challenge.start_date : lastDay);
  const s = summarize(bundle, today);
  const t = s.timeline;
  const week = s.weeks.find((w) => date >= w.start && date <= w.end);
  const canPrev = date > challenge.start_date;
  const canNext = date < lastDay;

  return (
    <div>
      <div className="card-hero">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-sm font-medium text-white">{challenge.title}</div>
            <div className="text-3xl font-bold tracking-tight">
              {t.phase === "upcoming" ? "Starts soon" : t.phase === "finished" ? "Challenge complete" : `Day ${t.dayNumber} of ${t.totalDays}`}
            </div>
          </div>
          <PaceBadge pace={s.pace} onHero />
        </div>
        <div className="mt-4">
          <Meter value={t.dayNumber / t.totalDays} label="Challenge progress" onHero />
        </div>
        <div className="mt-2 flex justify-between text-sm font-medium text-white">
          <span>Habit consistency {Math.round(s.habits.overall * 100)}%</span>
          <span>
            Streak {s.streak} {s.streak === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      <div className="mb-2 mt-6 flex items-center justify-between gap-2">
        <button className="btn btn-ghost !w-11 !px-0" disabled={!canPrev} onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold">{date === today ? "Today's check-in" : "Check-in"}</h2>
          <div className="text-xs text-ink-2">{formatLong(date)}</div>
        </div>
        <button className="btn btn-ghost !w-11 !px-0" disabled={!canNext} onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      {t.phase === "upcoming" ? (
        <Empty>Your challenge hasn&apos;t started yet. Check-ins open on day 1.</Empty>
      ) : (
        // Re-mount per date so inputs reset to that day's values.
        <DayForm key={date} bundle={bundle} date={date} week={week} />
      )}
    </div>
  );
}

function DayForm({
  bundle,
  date,
  week,
}: {
  bundle: ChallengeBundle;
  date: string;
  week: ReturnType<typeof summarize>["weeks"][number] | undefined;
}) {
  const { store, refresh } = useApp();
  const [saving, setSaving] = useState(false);
  const note = bundle.notes.find((n) => n.date === date);
  const [noteText, setNoteText] = useState(note?.note ?? "");
  const [energy, setEnergy] = useState<number | null>(note?.energy ?? null);

  async function run(fn: () => Promise<void>) {
    setSaving(true);
    try {
      await fn();
      refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <SectionTitle>Habits</SectionTitle>
        {bundle.habits.length === 0 ? (
          <Empty>
            No habit goals yet. <Link className="underline" href="/goals">Add some</Link>
          </Empty>
        ) : (
          <div className="card divide-y divide-line !py-1">
            {bundle.habits.map((h) => {
              const done = bundle.habitLogs.some((l) => l.habit_id === h.id && l.date === date);
              const wk = week?.perHabit.find((p) => p.habit.id === h.id);
              return (
                <label key={h.id} className="flex cursor-pointer items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    className="h-6 w-6 shrink-0 accent-[var(--accent)]"
                    checked={done}
                    disabled={saving}
                    onChange={(e) => run(() => store.setHabitDone(h.id, date, e.target.checked))}
                  />
                  <span className="flex-1">
                    <span className="block font-medium">{h.name}</span>
                    <span className="text-xs text-muted">{FREQUENCY_LABEL(h.target_per_week)}</span>
                  </span>
                  {wk && (
                    <span className="tabular text-xs text-ink-2">
                      {wk.done}/{wk.target} this week
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {bundle.outcomes.length > 0 && (
        <section>
          <SectionTitle>Measurements</SectionTitle>
          <div className="card space-y-3">
            <p className="text-xs text-muted">Log whenever you measure: daily, a few times a week, or weekly all work.</p>
            {bundle.outcomes.map((o) => {
              const log = bundle.outcomeLogs.find((l) => l.goal_id === o.id && l.date === date);
              const prev = bundle.outcomeLogs
                .filter((l) => l.goal_id === o.id && l.date < date)
                .sort((a, b) => a.date.localeCompare(b.date))
                .at(-1);
              return (
                <div key={o.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-muted">
                      Goal {formatValue(o.target_value, o.unit)}
                      {prev ? ` · last ${formatValue(prev.value, o.unit)}` : ""}
                    </div>
                  </div>
                  <div className="flex w-36 items-center gap-1.5">
                    <input
                      className="input tabular text-right"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      defaultValue={log?.value ?? ""}
                      placeholder="–"
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : Number(raw);
                        if (v !== null && Number.isNaN(v)) return;
                        if (v === (log?.value ?? null)) return;
                        run(() => store.setOutcomeValue(o.id, date, v));
                      }}
                    />
                    <span className="w-8 text-sm text-ink-2">{o.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>How did it go?</SectionTitle>
        <div className="card space-y-3">
          <div>
            <div className="mb-1.5 text-sm font-medium">Energy</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-11 w-11 rounded-full border text-sm font-semibold ${
                    energy === n ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-2"
                  }`}
                  onClick={() => {
                    const next = energy === n ? null : n;
                    setEnergy(next);
                    run(() => store.saveNote(date, noteText, next));
                  }}
                  aria-pressed={energy === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input min-h-20"
            placeholder="Notes for the day (your friends can see these)"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => {
              if (noteText !== (note?.note ?? "")) run(() => store.saveNote(date, noteText, energy));
            }}
          />
        </div>
      </section>
      <p className="h-4 text-center text-xs text-muted">{saving ? "Saving…" : "Changes save automatically"}</p>
    </div>
  );
}
