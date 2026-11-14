"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoalForm } from "@/components/goal-form";
import { Icon } from "@/components/icon";
import { SessionProvider, useSession } from "@/components/session";
import { Avatar, Button, cx, IconButton, ToastProvider, useToast } from "@/components/ui";
import { today } from "@/lib/dates";
import { draftToRow, emptyDraft, type GoalDraft } from "@/lib/goals";
import { inviteUrl, shareLink } from "@/lib/share";
import { supabase } from "@/lib/supabase/client";
import { AVATAR_BGS, AVATAR_EMOJIS } from "@/lib/theme";

const AREAS = [
  { id: "fitness", label: "Fitness", desc: "Workouts, runs, strength", icon: "run", goal: { title: "Run 3 times a week", kind: "workout", perWeek: 3, icon: "run" } },
  { id: "sleep", label: "Sleep", desc: "A steady bedtime and wake-up", icon: "sleep", goal: { title: "Wake by 7", kind: "habit", perWeek: 7, icon: "sun" } },
  { id: "sobriety", label: "Sobriety", desc: "Alcohol-free days", icon: "heart", goal: { title: "Alcohol-free day", kind: "habit", perWeek: 7, icon: "glass", shared: false } },
  { id: "reading", label: "Reading", desc: "Pages or minutes a day", icon: "read", goal: { title: "Read 10 pages", kind: "quantity", qty: 10, unit: "pages", icon: "read" } },
] as const;

type Step = "name" | "areas" | "goal" | "invite";
const STEPS: Step[] = ["name", "areas", "goal", "invite"];

export default function OnboardingPage() {
  return (
    <SessionProvider onboarding>
      <ToastProvider>
        <Onboarding />
      </ToastProvider>
    </SessionProvider>
  );
}

function Onboarding() {
  const router = useRouter();
  const toast = useToast();
  const { profile, mutateProfile } = useSession();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState(profile.display_name);
  const [emoji, setEmoji] = useState(profile.avatar_emoji);
  const [bg, setBg] = useState(profile.avatar_bg);
  const [areas, setAreas] = useState<string[]>([]);
  const [custom, setCustom] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idx = STEPS.indexOf(step);

  async function saveName() {
    setBusy(true);
    setError(null);
    const { error } = await supabase()
      .from("profiles")
      .update({ display_name: name.trim(), avatar_emoji: emoji, avatar_bg: bg })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return setError("Couldn’t save that. Try again.");
    mutateProfile({ ...profile, display_name: name.trim(), avatar_emoji: emoji, avatar_bg: bg }, { revalidate: false });
    setStep("areas");
  }

  function toGoal() {
    const first = AREAS.find((a) => areas.includes(a.id));
    if (first) setDraft(emptyDraft({ ...first.goal }));
    else if (custom?.trim()) setDraft(emptyDraft({ title: custom.trim(), icon: "star" }));
    setStep("goal");
  }

  async function saveGoal() {
    setBusy(true);
    setError(null);
    const { error } = await supabase().from("goals").insert(draftToRow(draft, today()));
    setBusy(false);
    if (error) return setError("Couldn’t save your goal. Try again.");
    setStep("invite");
  }

  async function finish() {
    setBusy(true);
    const { error } = await supabase().from("profiles").update({ onboarded: true }).eq("id", profile.id);
    if (error) {
      setBusy(false);
      return setError("Couldn’t finish setting up. Try again.");
    }
    await mutateProfile({ ...profile, display_name: name.trim(), avatar_emoji: emoji, avatar_bg: bg, onboarded: true }, { revalidate: false });
    router.replace("/");
  }

  async function invite() {
    const r = await shareLink(inviteUrl(profile.username), `Join me on Pace and let’s keep each other going.`);
    if (r === "copied") toast("Invite link copied");
    if (r !== "cancelled") finish();
  }

  const firstName = name.trim().split(/\s+/)[0] || "friend";

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-9">
      <div className="grid grid-cols-[44px_1fr_44px] items-center pt-9">
        {idx > 0 ? <IconButton icon="back" label="Back" onClick={() => setStep(STEPS[idx - 1])} /> : <span />}
        <div role="progressbar" aria-label={`Step ${idx + 1} of 4`} aria-valuemin={1} aria-valuemax={4} aria-valuenow={idx + 1} className="grid grid-cols-4 gap-1.5 px-3">
          {STEPS.map((s, i) => (
            <span key={s} className={cx("h-1.5 rounded-full", i <= idx ? "bg-accent" : "bg-hairline")} />
          ))}
        </div>
        <span />
      </div>

      <div className="flex flex-1 flex-col gap-[18px] pt-8">
        {step === "name" && (
          <>
            <Heading title="What should we call you?" sub="Friends will see this name and avatar." />
            <div className="flex items-center gap-3.5">
              <Avatar emoji={emoji} bg={bg} size={76} />
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[13px] font-semibold text-ink-2">Name</span>
                <input className="field h-[52px] text-[18px] font-semibold" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Your first name" />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Avatar</span>
              <div role="group" aria-label="Avatar" className="grid grid-cols-8 gap-1">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-label={`Avatar ${e}`}
                    aria-pressed={e === emoji}
                    onClick={() => setEmoji(e)}
                    className={cx("h-11 cursor-pointer rounded-[14px] p-0 text-[22px]", e === emoji ? "border-2 border-ink bg-surface" : "border-[1.5px] border-transparent bg-surface")}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Background</span>
              <div role="group" aria-label="Avatar background" className="grid grid-cols-8 gap-1">
                {AVATAR_BGS.map((b) => (
                  <button key={b.id} type="button" aria-label={b.name} aria-pressed={b.hex === bg} onClick={() => setBg(b.hex)} className="flex h-11 cursor-pointer items-center justify-center">
                    <span
                      className="h-8 w-8 rounded-full border border-[rgba(42,34,51,0.12)]"
                      style={{ background: b.hex, boxShadow: b.hex === bg ? "0 0 0 2px var(--bg), 0 0 0 4px var(--ink)" : undefined }}
                    />
                  </button>
                ))}
              </div>
            </div>
            {error && <ErrorText text={error} />}
            <Button size="lg" className="mt-auto" disabled={busy || !name.trim()} onClick={saveName}>
              Continue
            </Button>
          </>
        )}

        {step === "areas" && (
          <>
            <Heading title={`What are you working on, ${firstName}?`} sub="Pick as many as you like. You can change these later." />
            <div role="group" aria-label="Goal areas" className="grid grid-cols-2 gap-2.5">
              {AREAS.map((a) => {
                const on = areas.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAreas(on ? areas.filter((x) => x !== a.id) : [...areas, a.id])}
                    className={cx(
                      "relative flex h-32 cursor-pointer flex-col items-start justify-between rounded-3xl bg-surface p-4 text-left",
                      on ? "border-2 border-ink" : "border-[1.5px] border-hairline",
                    )}
                  >
                    <span className={cx("flex h-11 w-11 items-center justify-center rounded-[14px]", on ? "bg-accent" : "bg-tint")}>
                      <Icon name={a.icon} size={22} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[17px] font-semibold">{a.label}</span>
                      <span className="text-[12px] text-ink-2">{a.desc}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cx("absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full", on ? "bg-accent" : "border-[1.5px] border-line")}
                    >
                      {on && <Icon name="check" size={14} strokeWidth={2.6} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {custom === null ? (
              <button
                type="button"
                onClick={() => setCustom("")}
                className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-panel border-[1.5px] border-dashed border-ink-3 text-[16px] font-semibold"
              >
                <Icon name="plus" size={18} strokeWidth={2.2} /> Add your own
              </button>
            ) : (
              <label>
                <span className="sr-only">Your own goal area</span>
                <input className="field h-[52px]" autoFocus value={custom} maxLength={40} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Hydration, Meditation" />
              </label>
            )}
            <Button size="lg" className="mt-auto" disabled={areas.length === 0 && !custom?.trim()} onClick={toGoal}>
              {areas.length === 0 && !custom?.trim() ? "Pick at least one" : "Continue"}
            </Button>
          </>
        )}

        {step === "goal" && (
          <>
            <Heading title="Set your first goal" sub="Start small. You can add more from the + button." />
            <GoalForm draft={draft} onChange={setDraft} showIcons={false} />
            {error && <ErrorText text={error} />}
            <Button size="lg" className="mt-auto" disabled={busy || !draft.title.trim()} onClick={saveGoal}>
              Create goal
            </Button>
          </>
        )}

        {step === "invite" && (
          <>
            <span className="self-start rounded-full bg-subtle px-2.5 py-1 text-[12px] font-semibold text-ink-2">Optional</span>
            <Heading title="Better with a friend" sub="Invite someone to cheer you on and race your streak. They’ll only see trends, never your numbers." />
            <div aria-hidden="true" className="relative h-[130px] w-[210px] self-center">
              <span className="absolute left-5 top-5 rounded-full shadow-[0_0_0_4px_var(--bg)]">
                <Avatar emoji={emoji} bg={bg} size={90} />
              </span>
              <span className="absolute left-[100px] top-5 flex h-[90px] w-[90px] items-center justify-center rounded-full border-2 border-dashed border-[#CFC6CE] bg-surface text-ink-3">
                <Icon name="plus" size={30} strokeWidth={2} />
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-[22px] bg-surface px-4 py-3.5">
              <Icon name="link" size={20} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-semibold">Your invite link</span>
                <span className="truncate text-[13px] text-ink-2">{typeof window === "undefined" ? "" : inviteUrl(profile.username)}</span>
              </span>
            </div>
            {error && <ErrorText text={error} />}
            <div className="mt-auto flex flex-col gap-2">
              <Button size="lg" disabled={busy} onClick={invite}>
                <Icon name="share" size={18} strokeWidth={2} /> Share invite link
              </Button>
              <Button variant="outline" disabled={busy} onClick={finish}>
                Skip for now
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[32px] leading-[1.1]">{title}</h1>
      <p className="text-[15px] leading-normal text-ink-2">{sub}</p>
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-[14px] text-warn-ink">
      {text}
    </p>
  );
}
