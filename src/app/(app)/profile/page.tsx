"use client";

import { useState, type ReactNode } from "react";
import { mutate as globalMutate } from "swr";
import { Icon } from "@/components/icon";
import { useSession, useSignOut } from "@/components/session";
import { Avatar, Button, Card, cx, Sheet, Spinner, StreakChip, Switch, useToast } from "@/components/ui";
import { saveGoal, useGoals, useSummary } from "@/lib/data";
import { today } from "@/lib/dates";
import { describeTarget } from "@/lib/goals";
import { supabase } from "@/lib/supabase/client";
import { ACCENTS, applyAccent, AVATAR_BGS, AVATAR_EMOJIS, type AccentId } from "@/lib/theme";

export default function ProfilePage() {
  const { profile, userId, mutateProfile } = useSession();
  const signOut = useSignOut();
  const toast = useToast();
  const { data: summary } = useSummary(userId, today());
  const { data: goals } = useGoals();
  const [sheet, setSheet] = useState<null | "edit" | "privacy" | "accent">(null);

  if (!goals) return <Spinner />;
  const accent = ACCENTS.find((a) => a.id === profile.accent) ?? ACCENTS[0];
  const privateCount = goals.filter((g) => g.visibility === "private").length;

  async function pickAccent(id: AccentId) {
    applyAccent(id);
    mutateProfile({ ...profile, accent: id }, { revalidate: false });
    const { error } = await supabase().from("profiles").update({ accent: id }).eq("id", userId);
    if (error) toast("Couldn’t save your color.");
  }

  return (
    <>
      <h1 className="pt-10 text-[32px] leading-tight">Profile</h1>

      <Card className="flex items-center gap-4 rounded-3xl p-5">
        <button type="button" aria-label="Edit name and avatar" onClick={() => setSheet("edit")} className="relative cursor-pointer">
          <Avatar emoji={profile.avatar_emoji} bg={profile.avatar_bg} size={72} />
          <span className="bg-accent absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface">
            <Icon name="edit" size={13} strokeWidth={2.2} />
          </span>
        </button>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate font-display text-[24px] leading-tight">{profile.display_name}</span>
          <span className="text-[13px] text-ink-2">@{profile.username}</span>
          <StreakChip days={summary?.current_streak ?? 0} className="w-fit" />
        </div>
      </Card>

      <Section title="Privacy">
        <Row icon="eye" title="What friends see" sub={`Streaks and % only · ${privateCount} ${privateCount === 1 ? "goal" : "goals"} private`} onClick={() => setSheet("privacy")} />
      </Section>

      <Section title="App">
        <Row
          title="Accent color"
          sub={accent.name}
          lead={<span className="bg-accent h-[38px] w-[38px] rounded-xl" />}
          onClick={() => setSheet("accent")}
        />
      </Section>

      <Button variant="outline" onClick={signOut}>
        <Icon name="signout" size={18} /> Sign out
      </Button>

      <EditProfileSheet open={sheet === "edit"} onClose={() => setSheet(null)} />

      <Sheet open={sheet === "privacy"} onClose={() => setSheet(null)} title="Privacy" subtitle="Friends and group members only ever see percentages and streaks">
        <Card className="px-4 py-1">
          {goals.length === 0 && <p className="py-5 text-center text-[14px] text-ink-2">No goals yet.</p>}
          {goals.map((g, i) => (
            <div key={g.id} className={cx("flex items-center gap-3 py-2", i > 0 && "border-t border-divider")}>
              <span className="bg-tint flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl">
                <Icon name={g.icon} size={19} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{g.title}</span>
                <span className="text-[12px] text-ink-2">
                  {describeTarget(g)} · {g.visibility === "friends" ? "Shared" : "Private"}
                </span>
              </span>
              <Switch
                checked={g.visibility === "friends"}
                label={`Share ${g.title} with friends`}
                onChange={async (on) => {
                  globalMutate("goals", goals.map((x) => (x.id === g.id ? { ...x, visibility: on ? "friends" : "private" } : x)), { revalidate: false });
                  try {
                    await saveGoal(g.id, { visibility: on ? "friends" : "private" });
                  } catch {
                    toast("Couldn’t save. Try again.");
                  }
                }}
              />
            </div>
          ))}
        </Card>
        <p className="text-[13px] leading-normal text-ink-2">
          Private goals never show to friends: not in streaks, trends, activity or leaderboards. Your values, notes, times and distances are never shared, even for shared goals.
        </p>
      </Sheet>

      <Sheet open={sheet === "accent"} onClose={() => setSheet(null)} title="Make it yours" subtitle="Only the accent changes; text stays easy to read">
        <div className="grid grid-cols-3 gap-3 rounded-3xl bg-surface p-5">
          {ACCENTS.map((a) => (
            <button key={a.id} type="button" aria-pressed={profile.accent === a.id} onClick={() => pickAccent(a.id)} className="flex cursor-pointer flex-col items-center gap-2 text-[13px] font-medium">
              <span className="flex h-[68px] w-[68px] rounded-full p-1" style={{ border: `2px solid ${profile.accent === a.id ? "var(--ink)" : "transparent"}` }}>
                <span className="flex-1 rounded-full" style={{ background: `linear-gradient(120deg, ${a.light[0]}, ${a.light[1]})` }} />
              </span>
              {a.name}
            </button>
          ))}
        </div>
        <Card className="flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[16px] font-semibold">Journal</span>
            <span className="text-[13px] text-ink-2">6 of 10 min</span>
          </div>
          <div className="h-2.5 rounded-full bg-subtle">
            <div className="bg-accent-bar h-2.5 w-3/5 rounded-full" />
          </div>
          <Button onClick={() => setSheet(null)}>Done</Button>
        </Card>
      </Sheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[20px]">{title}</h2>
      <Card className="px-4 py-1">{children}</Card>
    </div>
  );
}

function Row({ icon, lead, title, sub, onClick }: { icon?: string; lead?: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-3 py-3 text-left">
      {lead ?? (
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-subtle">
          <Icon name={icon!} size={19} />
        </span>
      )}
      <span className="flex flex-1 flex-col">
        <span className="text-[16px] font-semibold">{title}</span>
        <span className="text-[13px] text-ink-2">{sub}</span>
      </span>
      <Icon name="chevron" size={18} className="text-ink-2" />
    </button>
  );
}

function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      {open && <EditProfileForm onDone={onClose} />}
    </Sheet>
  );
}

function EditProfileForm({ onDone }: { onDone: () => void }) {
  const { profile, mutateProfile } = useSession();
  const toast = useToast();
  const [name, setName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [emoji, setEmoji] = useState(profile.avatar_emoji);
  const [bg, setBg] = useState(profile.avatar_bg);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validUsername = /^[a-z0-9_]{3,24}$/.test(username);

  async function save() {
    setBusy(true);
    setError(null);
    const patch = { display_name: name.trim(), username, avatar_emoji: emoji, avatar_bg: bg };
    const { error } = await supabase().from("profiles").update(patch).eq("id", profile.id);
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "That username is taken. Try another." : "Couldn’t save. Try again.");
      return;
    }
    mutateProfile({ ...profile, ...patch }, { revalidate: false });
    toast("Profile saved");
    onDone();
  }

  return (
    <>
      <div className="flex items-center gap-3.5">
        <Avatar emoji={emoji} bg={bg} size={72} />
        <div className="flex flex-1 flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-ink-2">Name</span>
            <input className="field h-12 font-semibold" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-ink-2">Username (your invite link)</span>
        <input
          className="field h-12"
          autoCapitalize="none"
          autoCorrect="off"
          maxLength={24}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
        />
        {!validUsername && <span className="text-[12px] text-warn-ink">3–24 letters, numbers or _</span>}
      </label>
      <div role="group" aria-label="Avatar" className="grid grid-cols-8 gap-1">
        {AVATAR_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`Avatar ${e}`}
            aria-pressed={e === emoji}
            onClick={() => setEmoji(e)}
            className={cx("h-11 cursor-pointer rounded-[14px] text-[22px]", e === emoji ? "border-2 border-ink bg-surface" : "bg-surface")}
          >
            {e}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Avatar background" className="grid grid-cols-8 gap-1">
        {AVATAR_BGS.map((b) => (
          <button key={b.id} type="button" aria-label={b.name} aria-pressed={b.hex === bg} onClick={() => setBg(b.hex)} className="flex h-11 cursor-pointer items-center justify-center">
            <span className="h-8 w-8 rounded-full border border-[rgba(42,34,51,0.12)]" style={{ background: b.hex, boxShadow: b.hex === bg ? "0 0 0 2px var(--bg), 0 0 0 4px var(--ink)" : undefined }} />
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-[14px] text-warn-ink">
          {error}
        </p>
      )}
      <Button size="lg" disabled={busy || !name.trim() || !validUsername} onClick={save}>
        Save
      </Button>
    </>
  );
}
