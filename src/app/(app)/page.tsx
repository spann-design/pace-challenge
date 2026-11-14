"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFrame } from "@/components/app-frame";
import { ManageGoalsSheet } from "@/components/goal-sheets";
import { GoalRow } from "@/components/home/goal-row";
import { QuickLogSheet } from "@/components/home/quick-log-sheet";
import { TimerScreen } from "@/components/home/timer";
import { ArcGauge, Confetti } from "@/components/home/visuals";
import { Icon } from "@/components/icon";
import { useSession } from "@/components/session";
import { Button, Card, cx, Spinner, StreakChip, useToast } from "@/components/ui";
import { addLog, clearDay, useGoals, useGoalStats, useLogs, useSummary } from "@/lib/data";
import { fmt, fromISODate, greeting, today, weekDays, weekStart } from "@/lib/dates";
import { buildToday, countToday, dayComplete, statusWord, type TodayRow } from "@/lib/today";
import type { Goal } from "@/lib/types";

export default function Home() {
  const { profile, userId } = useSession();
  const { openAdd } = useFrame();
  const toast = useToast();
  const day = today();
  const ws = weekStart(day);

  const { data: goals, error } = useGoals();
  const { data: logs } = useLogs(ws, day);
  const { data: summary } = useSummary(userId, day);
  const { data: stats } = useGoalStats(userId, day);

  const [burst, setBurst] = useState<string | null>(null);
  const [logGoal, setLogGoal] = useState<Goal | null>(null);
  const [timerRow, setTimerRow] = useState<TodayRow | null>(null);
  const [managing, setManaging] = useState(false);
  const burstTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (error) return <p className="pt-20 text-center text-ink-2">Couldn’t load your goals. Pull to refresh or try again.</p>;
  if (!goals || !logs) return <Spinner />;

  const rows = buildToday(goals, logs, day, stats).sort((a, b) => Number(a.goal.cadence === "weekly") - Number(b.goal.cadence === "weekly"));
  const todayCount = countToday(rows);
  // Only weekly goals and nothing logged yet today: show the week instead of 0/0.
  const weekView = todayCount.total === 0 && rows.length > 0;
  const { done, total } = weekView ? { done: rows.filter((r) => r.weekMet).length, total: rows.length } : todayCount;
  const status = weekView ? (done === total ? "Week complete" : "This week") : statusWord(done, total);
  const complete = !weekView && total > 0 && done === total;
  const streak = summary?.current_streak ?? 0;

  const celebrate = (goalId: string, msg: string) => {
    setBurst(goalId);
    clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(null), 900);
    toast(msg);
  };

  async function toggle(row: TodayRow) {
    const g = row.goal;
    try {
      if (row.done) {
        setBurst(null);
        await clearDay(g.id, day);
        return;
      }
      // Daily: fill up to the target. Weekly: one check-in.
      const value = g.cadence === "daily" ? Math.max(1, g.target - row.todayTotal) : 1;
      const after = { done: todayCount.done + 1, total: row.counts ? todayCount.total : todayCount.total + 1 };
      celebrate(g.id, `${g.title} done · ${after.done} of ${after.total}`);
      await addLog({ goal: g, date: day, value });
    } catch {
      toast("Couldn’t save. Check your connection.");
    }
  }

  return (
    <>
      <header className="flex flex-col gap-1.5 pt-10">
        <h1 className="text-[32px] leading-[1.1]">
          {greeting()}, {profile.display_name.split(" ")[0] || "friend"}
        </h1>
        <div className="flex items-center justify-between">
          <span className="text-[15px] text-ink-2">{fmt.long(day)}</span>
          <button type="button" onClick={() => setManaging(true)} className="flex h-11 cursor-pointer items-center">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium">
              <Icon name="edit" size={14} strokeWidth={2} />
              Edit goals
            </span>
          </button>
        </div>
      </header>

      <WeekStrip day={day} goals={goals} logs={logs} />

      <Card className="relative flex flex-col items-center gap-2.5 px-5 pb-[18px] pt-6">
        {complete && <Confetti />}
        <ArcGauge done={done} total={total} status={status} />
        <StreakChip days={streak} />
      </Card>

      {complete && (
        <Card className="flex items-center gap-3.5 rounded-3xl py-4 pl-[18px] pr-4">
          <span className="bg-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Icon name="trophy" size={22} strokeWidth={1.9} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-display text-[19px] leading-tight">
              All {total} done. {streak > 1 ? `${streak} days strong.` : "Great start."}
            </span>
            <span className="text-[13px] leading-snug text-ink-2">See you tomorrow. Your friends can see your streak.</span>
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <span className="bg-tint flex h-14 w-14 items-center justify-center rounded-[18px]">
            <Icon name="star" size={26} />
          </span>
          <h2 className="text-[22px]">Nothing on today’s list</h2>
          <p className="text-[14px] text-ink-2">Add a habit or workout to start a streak.</p>
          <Button onClick={openAdd}>Add a goal</Button>
        </Card>
      ) : (
        <Card className="px-4 py-1">
          {rows.map((r, i) => (
            <GoalRow
              key={r.goal.id}
              row={r}
              first={i === 0}
              bursting={burst === r.goal.id}
              onToggle={() => toggle(r)}
              onStart={() => setTimerRow(r)}
              onLog={() => setLogGoal(r.goal)}
            />
          ))}
        </Card>
      )}

      <QuickLogSheet
        goal={logGoal}
        date={day}
        onClose={() => setLogGoal(null)}
        onLogged={(g) => {
          const row = rows.find((r) => r.goal.id === g.id);
          const after = { done: row?.done ? todayCount.done : todayCount.done + 1, total: row?.counts ? todayCount.total : todayCount.total + 1 };
          setLogGoal(null);
          celebrate(g.id, `${g.title} logged · ${after.done} of ${after.total}`);
        }}
      />

      {timerRow && (
        <TimerScreen
          goal={timerRow.goal}
          date={day}
          alreadyMin={timerRow.todayTotal}
          streak={stats?.find((s) => s.goal_id === timerRow.goal.id)?.current_streak ?? 0}
          summary={`${todayCount.done} of ${todayCount.total} done today`}
          onClose={(msg) => {
            const id = timerRow.goal.id;
            setTimerRow(null);
            if (msg?.includes("done")) celebrate(id, msg);
            else if (msg) toast(msg);
          }}
        />
      )}

      <ManageGoalsSheet open={managing} onClose={() => setManaging(false)} />
    </>
  );
}

function WeekStrip({ day, goals, logs }: { day: string; goals: Goal[]; logs: Parameters<typeof dayComplete>[1] }) {
  return (
    <div role="list" aria-label="This week" className="grid grid-cols-7 gap-1">
      {weekDays(day).map((d) => {
        const isToday = d === day;
        const isFuture = d > day;
        const doneDay = !isFuture && dayComplete(goals, logs, d);
        return (
          <Link
            role="listitem"
            key={d}
            href={`/calendar?day=${d}`}
            aria-label={`${fmt.short(d)}${doneDay ? ", all done" : ""}. Open in calendar`}
            className={cx("flex h-[76px] flex-col items-center justify-center gap-1 rounded-full", isToday && "bg-accent")}
          >
            <span className={cx("text-[11px] font-semibold uppercase tracking-[0.04em]", isToday ? "text-ink" : "text-ink-2")}>{fmt.dow(d)}</span>
            <span className="text-[17px] font-semibold">{fromISODate(d).getDate()}</span>
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: doneDay ? (isToday ? "var(--ink)" : "var(--a2)") : "transparent" }} />
          </Link>
        );
      })}
    </div>
  );
}
