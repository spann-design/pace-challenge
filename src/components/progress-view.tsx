"use client";

import { formatLong, formatShort } from "@/lib/dates";
import {
  HIGH_CONSISTENCY,
  formatSigned,
  formatValue,
  habitImpact,
  projectionHitsTarget,
  summarize,
  type OutcomeStatus,
} from "@/lib/metrics";
import type { ChallengeBundle } from "@/lib/types";
import { PaceChart, WeeklyBars } from "./charts";
import { Empty, FREQUENCY_LABEL, Meter, PaceBadge, SectionTitle, StatTile } from "./ui";

export function ProgressView({ bundle, today, isMe }: { bundle: ChallengeBundle; today: string; isMe: boolean }) {
  const s = summarize(bundle, today);
  const { challenge } = bundle;
  const t = s.timeline;
  const you = isMe ? "you" : "they";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{challenge.title}</h1>
          <p className="text-sm text-ink-2">
            {formatShort(challenge.start_date)} – {formatShort(challenge.end_date)} ·{" "}
            {t.phase === "upcoming" ? "Starts soon" : t.phase === "finished" ? "Finished" : `Day ${t.dayNumber} of ${t.totalDays}`}
          </p>
        </div>
        <PaceBadge pace={s.pace} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Challenge"
          value={`${Math.round((t.dayNumber / t.totalDays) * 100)}%`}
          sub={`${t.totalDays - t.dayNumber} days left`}
        />
        <StatTile label="Habit consistency" value={`${Math.round(s.habits.overall * 100)}%`} sub="of targets so far" />
        <StatTile label="Check-in streak" value={`${s.streak} ${s.streak === 1 ? "day" : "days"}`} />
        <StatTile
          label="Goals on pace"
          value={`${s.outcomes.filter((o) => o.pace === "ahead" || o.pace === "on_track").length}/${s.outcomes.length}`}
          sub="outcome goals"
        />
      </div>

      <SectionTitle>Outcome goals</SectionTitle>
      {s.outcomes.length === 0 && <Empty>No outcome goals yet.</Empty>}
      <div className="space-y-3">
        {s.outcomes.map((o) => (
          <OutcomeCard key={o.goal.id} status={o} bundle={bundle} today={today} you={you} />
        ))}
      </div>

      {bundle.habits.length > 0 && (
        <>
          <SectionTitle>Habit consistency by week</SectionTitle>
          <div className="card">
            {s.weeks.length ? (
              <WeeklyBars weeks={s.weeks} totalWeeks={t.weekCount} />
            ) : (
              <p className="text-sm text-ink-2">Starts once the challenge begins.</p>
            )}
            <div className="mt-4 space-y-3">
              {s.habits.perHabit.map((h) => (
                <div key={h.habit.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>
                      {h.habit.name} <span className="text-xs text-muted">{FREQUENCY_LABEL(h.habit.target_per_week)}</span>
                    </span>
                    <span className="tabular font-semibold">{Math.round(h.rate * 100)}%</span>
                  </div>
                  <Meter value={h.rate} label={`${h.habit.name} consistency`} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {bundle.notes.length > 0 && (
        <>
          <SectionTitle>Check-in notes</SectionTitle>
          <div className="card divide-y divide-line !py-1">
            {[...bundle.notes]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((n) => (
                <div key={n.id} className="py-2.5 text-sm">
                  <div className="text-xs text-muted">
                    {formatLong(n.date)}
                    {n.energy ? ` · Energy ${n.energy}/5` : ""}
                  </div>
                  {n.note && <div className="mt-0.5">{n.note}</div>}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function OutcomeCard({
  status: o,
  bundle,
  today,
  you,
}: {
  status: OutcomeStatus;
  bundle: ChallengeBundle;
  today: string;
  you: string;
}) {
  const { goal } = o;
  const unit = goal.unit;
  const dir = Math.sign(goal.target_value - goal.start_value);
  const hits = projectionHitsTarget(o);
  const weeks = summarize(bundle, today).weeks;
  const impact = habitImpact(goal, bundle.outcomeLogs, weeks);
  const progressPct = Math.round(Math.max(0, o.progress) * 100);

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold">{goal.name}</h3>
          <p className="text-sm text-ink-2">
            {formatValue(goal.start_value, unit)} → {formatValue(goal.target_value, unit)}
          </p>
        </div>
        <PaceBadge pace={o.pace} small />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs text-ink-2">Latest</div>
          <div className="tabular text-lg font-bold">{o.latestDate ? formatValue(o.latest, unit) : "–"}</div>
          {o.latestDate && <div className="text-xs text-muted">{formatShort(o.latestDate)}</div>}
        </div>
        <div>
          <div className="text-xs text-ink-2">On-pace value</div>
          <div className="tabular text-lg font-bold">{o.latestDate ? formatValue(o.expectedAtLatest, unit) : "–"}</div>
          {o.latestDate && (
            <div className="text-xs text-muted">
              {formatSigned((o.latest - o.expectedAtLatest) * dir, unit)} {(o.latest - o.expectedAtLatest) * dir >= 0 ? "ahead" : "behind"}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-ink-2">Progress to goal</div>
          <div className="tabular text-lg font-bold">{progressPct}%</div>
          <div className="text-xs text-muted">vs {Math.round(o.expectedProgress * 100)}% expected</div>
        </div>
      </div>

      <div className="mt-4">
        <PaceChart status={o} challenge={bundle.challenge} today={today} />
      </div>

      {(o.projectedEnd !== null || o.neededPerWeek !== null) && o.latestDate && (
        <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
          {o.projectedEnd !== null && o.recentPerWeek !== null && (
            <>
              At the recent rate ({formatSigned(o.recentPerWeek, unit)}/week), {you}&apos;d finish around{" "}
              <strong className="tabular">{formatValue(o.projectedEnd, unit)}</strong>
              {hits ? ", hitting the goal. " : ", short of the goal. "}
            </>
          )}
          {o.neededPerWeek !== null && (o.latest - goal.target_value) * dir < 0 && (
            <>
              Needed from here: <strong className="tabular">{formatSigned(o.neededPerWeek, unit)}/week</strong>.
            </>
          )}
        </p>
      )}

      <ImpactNote impact={impact} unit={unit} name={goal.name} />
    </div>
  );
}

function ImpactNote({ impact, unit, name }: { impact: ReturnType<typeof habitImpact>; unit: string; name: string }) {
  const pct = Math.round(HIGH_CONSISTENCY * 100);
  const toward = (v: number) => `${formatValue(Math.abs(v), unit)} ${v >= 0 ? "toward" : "away from"} the goal`;
  // Need at least 2 weeks on each side, or one noisy week can flip the story.
  if (impact.highAvg === null || impact.lowAvg === null || impact.highCount < 2 || impact.lowCount < 2) {
    return (
      <p className="mt-3 text-xs text-muted">
        <strong className="text-ink-2">Habits → results:</strong> after at least 2 completed weeks above and 2 below{" "}
        {pct}% habit consistency (each with a measurement), this shows how much {name.toLowerCase()} moves in each kind of
        week.
      </p>
    );
  }
  return (
    <div className="mt-3 text-sm">
      <div className="font-semibold">Habits → results</div>
      <ul className="mt-1 space-y-0.5 text-ink-2">
        <li>
          Weeks with {pct}%+ of habits done ({impact.highCount}):{" "}
          <strong className="tabular text-ink">{toward(impact.highAvg)}</strong> per week on average
        </li>
        <li>
          Weeks under {pct}% ({impact.lowCount}): <strong className="tabular text-ink">{toward(impact.lowAvg)}</strong> per
          week
        </li>
      </ul>
    </div>
  );
}
