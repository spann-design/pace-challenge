"use client";

import { useEffect, useRef, useState } from "react";
import { addLog } from "@/lib/data";
import { num } from "@/lib/goals";
import type { Goal } from "@/lib/types";
import { Flame, Icon } from "../icon";
import { Button, IconButton, Sheet, useToast } from "../ui";

type Mode = "run" | "paused" | "ended" | "done";

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Full-screen timer for a timed habit. Logs the remaining minutes when it
 * finishes, or asks whether to log a partial session when ended early.
 */
export function TimerScreen({
  goal,
  date,
  alreadyMin,
  streak,
  summary,
  onClose,
}: {
  goal: Goal;
  date: string;
  alreadyMin: number;
  streak: number;
  /** "5 of 7 done today", computed by Home after the log lands. */
  summary: string;
  onClose: (toast?: string) => void;
}) {
  const toast = useToast();
  const target = goal.target;
  const totalSec = Math.max(60, (target - alreadyMin) * 60);
  const [mode, setMode] = useState<Mode>("run");
  const [acc, setAcc] = useState(0); // seconds counted before the current run
  const [runStart, setRunStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const saved = useRef(false);
  // Streak as it was when the timer opened; it refreshes once today's log lands.
  const [startStreak] = useState(streak);

  const elapsed = acc + (mode === "run" ? (now - runStart) / 1000 : 0);
  const remaining = Math.max(0, totalSec - elapsed);

  // Tick while running.
  useEffect(() => {
    if (mode !== "run") return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [mode]);

  // Keep the screen awake while the timer runs (where supported).
  useEffect(() => {
    if (mode !== "run" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [mode]);

  // Finished: log the rest of today's minutes once.
  useEffect(() => {
    if (mode !== "run" || remaining > 0 || saved.current) return;
    saved.current = true;
    navigator.vibrate?.(200);
    // Moving to "done" here is a reaction to time passing, not to a render.
    setMode("done");
    addLog({ goal, date, value: Math.max(0, target - alreadyMin), duration_min: Math.max(0, target - alreadyMin) }).catch(() =>
      toast("Couldn’t save. Check your connection."),
    );
  }, [mode, remaining, goal, date, target, alreadyMin, toast]);

  const pause = () => {
    setAcc(elapsed);
    setMode("paused");
  };
  const resume = () => {
    setRunStart(Date.now());
    setNow(Date.now());
    setMode("run");
  };
  const endEarly = () => {
    if (mode === "run") setAcc(elapsed);
    setMode("ended");
  };

  const elapsedMin = Math.max(1, Math.round(elapsed / 60));
  async function logPartial() {
    saved.current = true;
    try {
      await addLog({ goal, date, value: elapsedMin, duration_min: elapsedMin });
      onClose(`Logged ${elapsedMin} min of ${goal.title}`);
    } catch {
      toast("Couldn’t save. Check your connection.");
    }
  }

  const doneSec = alreadyMin * 60 + (mode === "done" ? totalSec : elapsed);
  const deg = mode === "done" ? 360 : Math.max(2, (360 * doneSec) / (target * 60));
  const isDone = mode === "done";

  return (
    <div role="dialog" aria-modal="true" aria-label={`${goal.title} timer`} className="animate-fade pt-safe fixed inset-0 z-50 flex flex-col items-center bg-bg px-5 pb-14">
      <div className="mx-auto grid w-full max-w-[440px] grid-cols-[44px_1fr_44px] items-center pt-10">
        <span />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-2">Timed habit · {num(target)} min</span>
          <span className="font-display text-[26px]">{goal.title}</span>
        </div>
        {isDone ? <span /> : <IconButton icon="close" label="End early" onClick={endEarly} className="shadow-[0_4px_14px_rgba(42,34,51,0.06)]" />}
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
        <div className="relative h-[300px] w-[300px] sm:h-[320px] sm:w-[320px]">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full blur-[5px]"
            style={{
              background: `conic-gradient(from 0deg, var(--a1) 0deg, var(--a2) ${deg.toFixed(1)}deg, transparent ${deg.toFixed(1)}deg)`,
              WebkitMaskImage: "radial-gradient(closest-side, #000 40%, rgba(0,0,0,0.55) 72%, transparent 100%)",
              maskImage: "radial-gradient(closest-side, #000 40%, rgba(0,0,0,0.55) 72%, transparent 100%)",
              transition: "background 0.25s linear",
            }}
          />
          {isDone && <Sparkles />}
          <div role="timer" aria-live="off" className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <span className="font-display text-[80px] font-semibold leading-none tracking-[-0.02em] tabular">{isDone ? mmss(target * 60) : mmss(remaining)}</span>
            <span className="text-[15px] font-medium">{isDone ? "minutes" : mode === "paused" || mode === "ended" ? "Paused" : `of ${mmss(target * 60)}`}</span>
          </div>
        </div>

        {isDone && (
          <div className="flex flex-col items-center gap-3">
            <span className="font-display text-[30px]">{goal.title} complete</span>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[14px] font-semibold shadow-[0_4px_14px_rgba(42,34,51,0.06)]">
              <Flame size={16} />
              {startStreak + 1}-day {goal.title.toLowerCase()} streak
              <span className="bg-accent rounded-full px-2 py-0.5 text-[12px]">+1</span>
            </span>
            <span className="text-[15px] text-ink-2">{summary}</span>
          </div>
        )}
      </div>

      {isDone ? (
        <Button size="lg" className="px-9" onClick={() => onClose(`${goal.title} done · ${summary.replace(" done today", "")}`)}>
          Back to today
        </Button>
      ) : (
        <button
          type="button"
          aria-label={mode === "run" ? "Pause" : "Resume"}
          onClick={mode === "run" ? pause : resume}
          className="flex h-[60px] w-[124px] cursor-pointer items-center justify-center rounded-full bg-subtle text-ink"
        >
          {mode === "run" ? (
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
              <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
            </svg>
          ) : (
            <Icon name="play" size={22} />
          )}
        </button>
      )}

      <Sheet open={mode === "ended"} onClose={resume} role="alertdialog">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-2">Ended early</span>
          <h2 className="text-[30px] leading-tight">
            Log {elapsedMin} of {num(target)} minutes?
          </h2>
          <p className="max-w-[300px] text-[15px] leading-normal text-ink-2">It counts toward your day. You can finish the rest later today.</p>
        </div>
        <Button size="lg" onClick={logPartial}>
          Log
        </Button>
        <Button variant="outline" onClick={() => onClose()}>
          Discard
        </Button>
      </Sheet>
    </div>
  );
}

function Sparkles() {
  return (
    <svg aria-hidden="true" width="360" height="360" viewBox="0 0 360 360" className="pointer-events-none absolute -left-5 -top-5">
      <path d="M40 70l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="var(--a1)" />
      <path d="M318 96l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--a2)" />
      <path d="M300 300l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--a1)" />
      <circle cx="36" cy="250" r="5" fill="var(--a2)" />
      <circle cx="330" cy="200" r="4" fill="var(--ink)" />
      <circle cx="90" cy="330" r="3.5" fill="var(--ink)" />
      <rect x="250" y="28" width="14" height="5" rx="2.5" fill="var(--a1)" transform="rotate(30 257 30)" />
    </svg>
  );
}
