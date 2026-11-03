"use client";

import { useState } from "react";
import { useApp, useBundle } from "@/components/app-provider";
import { FREQUENCY_LABEL, SectionTitle } from "@/components/ui";
import { addDays, daysBetween } from "@/lib/dates";
import { newId } from "@/lib/store/types";
import type { ChallengeBundle, GoalsDraft } from "@/lib/types";

export default function GoalsPage() {
  const { store, today } = useApp();
  const { bundle, loading, error } = useBundle(store.me.id);
  if (loading) return null;
  if (error) return <p className="text-critical">{error}</p>;
  // Key on the challenge so the form resets if the saved data changes underneath it.
  return <GoalsForm key={bundle?.challenge.id ?? "new"} initial={toDraft(bundle, today)} isNew={!bundle} />;
}

type OutcomeRow = { id: string; name: string; unit: string; start_value: string; target_value: string };
type HabitRow = GoalsDraft["habits"][number];
type FormState = { challenge: GoalsDraft["challenge"]; outcomes: OutcomeRow[]; habits: HabitRow[] };

function toDraft(bundle: ChallengeBundle | null, today: string): FormState {
  if (!bundle)
    return {
      challenge: { id: newId(), title: "90-Day Challenge", start_date: today, end_date: addDays(today, 89) },
      outcomes: [{ id: newId(), name: "", unit: "", start_value: "", target_value: "" }],
      habits: [{ id: newId(), name: "", target_per_week: 7 }],
    };
  const c = bundle.challenge;
  return {
    challenge: { id: c.id, title: c.title, start_date: c.start_date, end_date: c.end_date },
    outcomes: bundle.outcomes.map((o) => ({
      id: o.id,
      name: o.name,
      unit: o.unit,
      start_value: String(o.start_value),
      target_value: String(o.target_value),
    })),
    habits: bundle.habits.map((h) => ({ id: h.id, name: h.name, target_per_week: h.target_per_week })),
  };
}

function GoalsForm({ initial, isNew }: { initial: FormState; isNew: boolean }) {
  const { store, refresh } = useApp();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const days = daysBetween(form.challenge.start_date, form.challenge.end_date) + 1;

  const setChallenge = (patch: Partial<FormState["challenge"]>) =>
    setForm((f) => ({ ...f, challenge: { ...f.challenge, ...patch } }));
  const setOutcome = (id: string, patch: Partial<OutcomeRow>) =>
    setForm((f) => ({ ...f, outcomes: f.outcomes.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const setHabit = (id: string, patch: Partial<HabitRow>) =>
    setForm((f) => ({ ...f, habits: f.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));

  function validate(): GoalsDraft | string {
    const c = form.challenge;
    if (!c.title.trim()) return "Give your challenge a name.";
    if (!c.start_date || !c.end_date || c.end_date <= c.start_date) return "End date must be after the start date.";
    const outcomes = [];
    for (const o of form.outcomes) {
      if (!o.name.trim() && !o.start_value && !o.target_value) continue; // blank row
      const start = Number(o.start_value);
      const target = Number(o.target_value);
      if (!o.name.trim()) return "Every outcome goal needs a name.";
      if (o.start_value === "" || o.target_value === "" || Number.isNaN(start) || Number.isNaN(target))
        return `"${o.name}" needs a numeric start and target.`;
      if (start === target) return `"${o.name}": start and target can't be the same.`;
      outcomes.push({ id: o.id, name: o.name.trim(), unit: o.unit.trim(), start_value: start, target_value: target });
    }
    const habits = form.habits.filter((h) => h.name.trim()).map((h) => ({ ...h, name: h.name.trim() }));
    if (!outcomes.length && !habits.length) return "Add at least one outcome or habit goal.";
    return { challenge: { ...c, title: c.title.trim() }, outcomes, habits };
  }

  async function save() {
    const draft = validate();
    if (typeof draft === "string") {
      setMessage({ kind: "error", text: draft });
      return;
    }
    const removed =
      initial.outcomes.filter((o) => !draft.outcomes.some((d) => d.id === o.id) && o.name).length +
      initial.habits.filter((h) => !draft.habits.some((d) => d.id === h.id) && h.name).length;
    if (!isNew && removed && !confirm(`Removing ${removed} goal(s) also deletes their check-in history. Continue?`)) return;
    setSaving(true);
    setMessage(null);
    try {
      await store.saveGoals(draft);
      setMessage({ kind: "ok", text: "Saved." });
      refresh();
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold">My Goals</h1>
      <p className="text-sm text-ink-2">
        Set your challenge window, the results you&apos;re working toward, and the habits that get you there.
      </p>

      <SectionTitle>Challenge</SectionTitle>
      <div className="card grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input className="input mt-1" value={form.challenge.title} onChange={(e) => setChallenge({ title: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Start date</span>
          <input
            className="input mt-1"
            type="date"
            value={form.challenge.start_date}
            onChange={(e) => setChallenge({ start_date: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">End date</span>
          <input
            className="input mt-1"
            type="date"
            value={form.challenge.end_date}
            onChange={(e) => setChallenge({ end_date: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2 sm:col-span-3">
          <span>{days > 0 ? `${days} days` : "Invalid dates"}</span>
          <span className="text-muted">·</span>
          <span>Quick set:</span>
          {[30, 60, 75, 90].map((n) => (
            <button
              key={n}
              type="button"
              className="rounded-full border border-line px-2 py-0.5 hover:bg-surface-2"
              onClick={() => setChallenge({ end_date: addDays(form.challenge.start_date, n - 1) })}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>

      <SectionTitle>Outcome goals</SectionTitle>
      <p className="-mt-1 mb-2 text-xs text-muted">
        The end results you&apos;ll measure, e.g. body weight 192 → 175 lb, 5K time 31 → 26 min, or a squat of 185 → 225 lb.
      </p>
      <div className="space-y-2">
        {form.outcomes.map((o) => (
          <div key={o.id} className="card grid grid-cols-[1fr_auto] gap-2 !p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
            <Labeled label="Goal" className="col-span-2 sm:col-span-1">
              <input className="input" placeholder="Body weight" value={o.name} onChange={(e) => setOutcome(o.id, { name: e.target.value })} />
            </Labeled>
            <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-3">
              <Labeled label="Start">
                <input
                  className="input tabular"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={o.start_value}
                  onChange={(e) => setOutcome(o.id, { start_value: e.target.value })}
                />
              </Labeled>
              <Labeled label="Target">
                <input
                  className="input tabular"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={o.target_value}
                  onChange={(e) => setOutcome(o.id, { target_value: e.target.value })}
                />
              </Labeled>
              <Labeled label="Unit">
                <input className="input" placeholder="lb" value={o.unit} onChange={(e) => setOutcome(o.id, { unit: e.target.value })} />
              </Labeled>
            </div>
            <RemoveButton onClick={() => setForm((f) => ({ ...f, outcomes: f.outcomes.filter((x) => x.id !== o.id) }))} />
          </div>
        ))}
      </div>
      <button
        className="btn btn-ghost mt-2"
        onClick={() =>
          setForm((f) => ({ ...f, outcomes: [...f.outcomes, { id: newId(), name: "", unit: "", start_value: "", target_value: "" }] }))
        }
      >
        + Add outcome goal
      </button>

      <SectionTitle>Habit goals</SectionTitle>
      <p className="-mt-1 mb-2 text-xs text-muted">The daily and weekly actions you&apos;ll check off, e.g. strength workout 4× per week, 10k steps daily.</p>
      <div className="space-y-2">
        {form.habits.map((h) => (
          <div key={h.id} className="card grid grid-cols-[1fr_auto] gap-2 !p-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <Labeled label="Habit" className="col-span-2 sm:col-span-1">
              <input className="input" placeholder="Strength workout" value={h.name} onChange={(e) => setHabit(h.id, { name: e.target.value })} />
            </Labeled>
            <Labeled label="How often">
              <select
                className="input"
                value={h.target_per_week}
                onChange={(e) => setHabit(h.id, { target_per_week: Number(e.target.value) })}
              >
                {[7, 6, 5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {FREQUENCY_LABEL(n)}
                  </option>
                ))}
              </select>
            </Labeled>
            <RemoveButton onClick={() => setForm((f) => ({ ...f, habits: f.habits.filter((x) => x.id !== h.id) }))} />
          </div>
        ))}
      </div>
      <button
        className="btn btn-ghost mt-2"
        onClick={() => setForm((f) => ({ ...f, habits: [...f.habits, { id: newId(), name: "", target_per_week: 7 }] }))}
      >
        + Add habit goal
      </button>

      <div className="sticky bottom-16 mt-6 flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-lg sm:bottom-4">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : isNew ? "Start challenge" : "Save goals"}
        </button>
        {message && (
          <span className={`text-sm ${message.kind === "ok" ? "text-good-text" : "text-critical"}`}>{message.text}</span>
        )}
      </div>
    </div>
  );
}

function Labeled({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="col-start-2 row-start-1 self-start rounded-md p-2 text-muted hover:bg-surface-2 hover:text-critical sm:col-start-auto sm:row-start-auto sm:self-end"
      aria-label="Remove"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
