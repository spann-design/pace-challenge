"use client";

import type { TodayRow } from "@/lib/today";
import { Icon } from "../icon";
import { cx } from "../ui";
import { Burst } from "./visuals";

/** One line on Home's list: icon tile, name + subline, and the right action. */
export function GoalRow({
  row,
  first,
  bursting,
  onToggle,
  onStart,
  onLog,
}: {
  row: TodayRow;
  first: boolean;
  bursting: boolean;
  onToggle: () => void;
  onStart: () => void;
  onLog: () => void;
}) {
  const { goal, done, action, todayTotal } = row;
  // Weekly goals: show the check state for today, but a gradient tile once the week is met.
  const tileOn = done || row.weekMet;

  return (
    <div className={cx("flex items-center gap-3.5 py-3", !first && "border-t border-divider")}>
      <span
        className={cx("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] transition-colors duration-300", tileOn ? "bg-accent" : "bg-tint")}
      >
        <Icon name={goal.icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cx("truncate text-[16px] font-semibold", done ? "text-ink-2 line-through" : "text-ink")}>{goal.title}</span>
        <span className="flex items-center gap-1 text-[13px] text-ink-2">
          {goal.visibility === "private" && <Icon name="lock" size={12} strokeWidth={2} label="Private" />}
          <span className="truncate">{row.sub}</span>
        </span>
      </div>
      <div className="relative flex shrink-0">
        {bursting && <Burst />}
        {done ? (
          <button
            type="button"
            aria-label={`${goal.title} done, tap to undo`}
            onClick={onToggle}
            className={cx("bg-accent flex h-11 w-11 cursor-pointer items-center justify-center rounded-full", bursting && "animate-pop")}
          >
            <Icon name="check" size={20} strokeWidth={2.4} />
          </button>
        ) : action === "check" ? (
          <button
            type="button"
            aria-label={`Mark ${goal.title} done`}
            onClick={onToggle}
            className="h-11 w-11 cursor-pointer rounded-full border-2 border-ink-3 bg-surface"
          />
        ) : action === "timer" ? (
          <button
            type="button"
            onClick={onStart}
            className="flex h-11 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-semibold text-bg"
          >
            <Icon name="play" size={12} />
            {todayTotal > 0 ? "Resume" : "Start"}
          </button>
        ) : (
          <button type="button" onClick={onLog} className="bg-accent h-11 cursor-pointer rounded-full px-[18px] text-[14px] font-semibold">
            Log
          </button>
        )}
      </div>
    </div>
  );
}
