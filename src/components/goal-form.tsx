"use client";

import { GOAL_KINDS, type GoalDraft } from "@/lib/goals";
import { GOAL_ICONS, Icon } from "./icon";
import { cx, Stepper, Switch } from "./ui";

/** Name, type, target, icon and sharing for a goal. Used by onboarding, Add and Edit. */
export function GoalForm({
  draft,
  onChange,
  showIcons = true,
  lockKind = false,
}: {
  draft: GoalDraft;
  onChange: (d: GoalDraft) => void;
  showIcons?: boolean;
  lockKind?: boolean;
}) {
  const set = (p: Partial<GoalDraft>) => onChange({ ...draft, ...p });

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Name</span>
        <input
          className="field h-[50px] text-[17px] font-medium"
          value={draft.title}
          maxLength={60}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={draft.kind === "workout" ? "Run 3 times a week" : draft.kind === "timed" ? "Journal" : "Read 10 pages"}
        />
      </label>

      {!lockKind && (
        <div role="group" aria-label="Goal type" className="grid grid-cols-2 gap-2">
          {GOAL_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={draft.kind === k.id}
              onClick={() => set({ kind: k.id, perWeek: k.id === "workout" && draft.perWeek === 7 ? 3 : draft.perWeek })}
              className={cx(
                "flex h-16 cursor-pointer flex-col items-start justify-center gap-0.5 rounded-[18px] px-3.5 text-left",
                draft.kind === k.id ? "bg-accent" : "border-[1.5px] border-line bg-surface",
              )}
            >
              <span className="text-[15px] font-semibold">{k.title}</span>
              <span className="text-[12px] opacity-80">{k.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-panel bg-surface px-4 py-3">
        {(draft.kind === "habit" || draft.kind === "workout") && (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Times per week</span>
              <span className="text-[13px] text-ink-2">{draft.perWeek === 7 ? "Every day" : `${draft.perWeek}× a week`}</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={n === draft.perWeek}
                  aria-label={`${n} times a week`}
                  onClick={() => set({ perWeek: n })}
                  className={cx(
                    "h-11 cursor-pointer rounded-full text-[16px] font-semibold",
                    n === draft.perWeek ? "bg-accent" : n < draft.perWeek ? "bg-tint" : "border-[1.5px] border-line bg-surface",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}
        {draft.kind === "quantity" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold">Per day</span>
              <Stepper value={draft.qty} onChange={(qty) => set({ qty })} min={1} max={999} />
            </div>
            <label className="flex items-center justify-between gap-3 border-t border-divider pt-2.5">
              <span className="text-[15px] font-semibold">Unit</span>
              <input className="field h-11 max-w-[180px] text-right" value={draft.unit} maxLength={24} onChange={(e) => set({ unit: e.target.value })} placeholder="glasses of water" />
            </label>
          </>
        )}
        {draft.kind === "timed" && (
          <div className="flex items-center justify-between">
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">Minutes per day</span>
              <span className="text-[12px] text-ink-2">Start the timer from Home</span>
            </span>
            <Stepper value={draft.minutes} onChange={(minutes) => set({ minutes })} step={5} min={5} max={240} format={(v) => `${v} min`} lessLabel="5 minutes less" moreLabel="5 minutes more" />
          </div>
        )}
      </div>

      {showIcons && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Icon</span>
          <div role="group" aria-label="Icon" className="grid grid-cols-7 gap-1.5">
            {GOAL_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                aria-pressed={draft.icon === ic}
                aria-label={`${ic} icon`}
                onClick={() => set({ icon: ic })}
                className={cx(
                  "flex h-11 cursor-pointer items-center justify-center rounded-[14px]",
                  draft.icon === ic ? "bg-accent" : "border-[1.5px] border-divider bg-surface",
                )}
              >
                <Icon name={ic} size={20} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-panel bg-surface px-4 py-1.5">
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold">Share with friends</span>
          <span className="text-[12px] text-ink-2">{draft.shared ? "They see % and streaks, never your numbers" : "Only you can see this goal"}</span>
        </span>
        <Switch checked={draft.shared} onChange={(shared) => set({ shared })} label="Share with friends" />
      </div>
    </div>
  );
}
