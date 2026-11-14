"use client";

import { useState } from "react";
import { addLog } from "@/lib/data";
import { defaultWorkoutType, WORKOUT_TYPES } from "@/lib/today";
import type { Goal } from "@/lib/types";
import { Button, Chip, cx, Sheet, Stepper, useToast } from "../ui";

const EFFORT_WORDS = ["", "Easy", "Light", "Steady", "Hard", "All out"];

/** "Log workout" bottom sheet: type, duration, distance, effort, note. */
export function QuickLogSheet({
  goal,
  date,
  onClose,
  onLogged,
}: {
  goal: Goal | null;
  date: string;
  onClose: () => void;
  onLogged: (goal: Goal) => void;
}) {
  return (
    <Sheet open={!!goal} onClose={onClose} title={goal ? `Log ${goal.type === "workout" ? "workout" : goal.title}` : ""} subtitle={goal?.title}>
      {goal && <QuickLogForm key={goal.id} goal={goal} date={date} onDone={() => onLogged(goal)} />}
    </Sheet>
  );
}

function QuickLogForm({ goal, date, onDone }: { goal: Goal; date: string; onDone: () => void }) {
  const toast = useToast();
  const [type, setType] = useState(defaultWorkoutType(goal.icon));
  const [dur, setDur] = useState(30);
  const [dist, setDist] = useState("");
  const [effort, setEffort] = useState(3);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const distance = dist.trim() ? Number(dist.replace(",", ".")) : null;
    if (distance !== null && (Number.isNaN(distance) || distance < 0)) return toast("Distance should be a number");
    // What counts toward the goal depends on its unit.
    const value = goal.unit === "min" ? dur : goal.unit === "mi" || goal.unit === "km" ? (distance ?? 0) : 1;
    setBusy(true);
    try {
      await addLog({ goal, date, value, duration_min: dur, distance, effort, note, activity: type });
      onDone();
    } catch {
      toast("Couldn’t save. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Type</span>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {WORKOUT_TYPES.map((t) => (
            <Chip key={t} selected={t === type} onClick={() => setType(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="rounded-panel bg-surface px-4 py-1">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[16px] font-semibold">Duration</span>
          <Stepper value={dur} onChange={setDur} step={5} min={5} max={600} format={(v) => `${v} min`} lessLabel="5 minutes less" moreLabel="5 minutes more" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-divider py-2.5">
          <label htmlFor="logDist" className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold">Distance</span>
            <span className="text-[12px] text-ink-2">Optional</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="logDist"
              className="field h-11 w-[84px] rounded-xl px-3 text-right font-medium"
              inputMode="decimal"
              placeholder="0.0"
              value={dist}
              onChange={(e) => setDist(e.target.value)}
            />
            <span className="text-[15px] text-ink-2">{goal.unit === "km" ? "km" : "mi"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Effort</span>
          <span className="text-[13px] text-ink-2">
            {effort} · {EFFORT_WORDS[effort]}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Effort ${n} of 5, ${EFFORT_WORDS[n]}`}
              aria-pressed={n === effort}
              onClick={() => setEffort(n)}
              className={cx("h-12 cursor-pointer rounded-2xl text-[17px] font-semibold", n === effort ? "bg-accent" : "border-[1.5px] border-line bg-surface")}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[12px] text-ink-2">
          <span>Easy</span>
          <span>All out</span>
        </div>
      </div>

      <label>
        <span className="sr-only">Note</span>
        <input className="field" placeholder="Add a note (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="-mt-2 text-[12px] text-ink-2">Only you see your times, distances and notes.</p>

      <Button size="lg" disabled={busy} onClick={save}>
        {busy ? "Saving…" : `Log ${type.toLowerCase()}`}
      </Button>
    </>
  );
}
