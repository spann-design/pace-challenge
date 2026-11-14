"use client";

import { useState } from "react";
import { archiveGoal, saveGoal, useGoals } from "@/lib/data";
import { today } from "@/lib/dates";
import { describeTarget, draftToRow, emptyDraft, goalToDraft, type GoalDraft } from "@/lib/goals";
import type { Goal } from "@/lib/types";
import { GoalForm } from "./goal-form";
import { Icon } from "./icon";
import { Button, Sheet, useToast } from "./ui";

const ADD_OPTIONS = [
  { id: "activity", title: "Activity", desc: "A workout to log — run, ride, lift, swim", icon: "run", draft: { kind: "workout", perWeek: 3, icon: "run" } },
  { id: "habit", title: "Habit", desc: "Something small, every day — journal, read, meditate", icon: "journal", draft: { kind: "habit", perWeek: 7, icon: "journal" } },
  { id: "goal", title: "Goal", desc: "An amount or minutes per day, with its own streak", icon: "star", draft: { kind: "quantity", icon: "drop" } },
  { id: "program", title: "Program", desc: "A multi-week plan, like a 10K in 8 weeks", icon: "calendar", draft: null },
] as const;

/** The + button's sheet: pick what to add, then fill in the goal. */
export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => {
    setDraft(null);
    onClose();
  };

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await saveGoal(null, draftToRow(draft, today()));
      toast(`${draft.title.trim()} added`);
      close();
    } catch {
      toast("Couldn’t save. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title={draft ? "New goal" : "Add"}>
      {draft ? (
        <>
          <GoalForm draft={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDraft(null)}>
              Back
            </Button>
            <Button size="lg" className="flex-1" disabled={busy || !draft.title.trim()} onClick={save}>
              Save goal
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2.5 pb-2">
          {ADD_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => (o.draft ? setDraft(emptyDraft({ ...o.draft })) : toast("Programs are coming in a later update"))}
              className="flex min-h-[76px] cursor-pointer items-center gap-3.5 rounded-3xl bg-surface px-4 py-3.5 text-left shadow-card"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${o.draft ? "bg-tint" : "bg-subtle"}`}>
                <Icon name={o.icon} size={22} />
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[17px] font-semibold">{o.title}</span>
                <span className="text-[13px] leading-snug text-ink-2">{o.desc}</span>
              </span>
              <Icon name="chevron" size={18} className="text-ink-2" />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/** "Edit today": list of goals, tap one to change it or remove it. */
export function ManageGoalsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: goals } = useGoals();
  const toast = useToast();
  const [editing, setEditing] = useState<{ goal: Goal; draft: GoalDraft } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = () => {
    setEditing(null);
    setConfirmRemove(false);
    onClose();
  };

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await saveGoal(editing.goal.id, draftToRow(editing.draft, editing.goal.start_date));
      toast("Saved");
      setEditing(null);
    } catch {
      toast("Couldn’t save. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      await archiveGoal(editing.goal.id);
      toast(`${editing.goal.title} removed`);
      setEditing(null);
      setConfirmRemove(false);
    } catch {
      toast("Couldn’t remove. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title={editing ? "Edit goal" : "Your goals"} subtitle={editing ? undefined : "Tap a goal to change it"}>
      {editing ? (
        <>
          <GoalForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Back
            </Button>
            <Button size="lg" className="flex-1" disabled={busy || !editing.draft.title.trim()} onClick={save}>
              Save
            </Button>
          </div>
          {confirmRemove ? (
            <div className="flex flex-col gap-2 rounded-panel bg-surface p-4">
              <p className="text-[14px] text-ink-2">Remove “{editing.goal.title}”? It leaves your list and your friends’ view. Past check-ins stay in your calendar.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmRemove(false)}>
                  Keep it
                </Button>
                <Button variant="dark" size="sm" disabled={busy} onClick={remove}>
                  Remove goal
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className="h-11 cursor-pointer text-[15px] font-semibold text-ink-2">
              Remove this goal
            </button>
          )}
        </>
      ) : (
        <div className="rounded-card bg-surface px-4 py-1 shadow-card">
          {(goals ?? []).length === 0 && <p className="py-6 text-center text-[15px] text-ink-2">No goals yet. Add one with the + button.</p>}
          {(goals ?? []).map((g, i) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setEditing({ goal: g, draft: goalToDraft(g) })}
              className={`flex w-full cursor-pointer items-center gap-3.5 py-3 text-left ${i ? "border-t border-divider" : ""}`}
            >
              <span className="bg-tint flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px]">
                <Icon name={g.icon} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[16px] font-semibold">{g.title}</span>
                <span className="text-[13px] text-ink-2">
                  {describeTarget(g)} · {g.visibility === "friends" ? "Shared" : "Private"}
                </span>
              </span>
              <Icon name="edit" size={18} className="text-ink-2" />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
