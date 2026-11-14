"use client";

// Temporary style check for the setup PR. Replaced by the Home digest in a later PR.

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Icon, GOAL_ICONS } from "@/components/icon";
import { Avatar, Button, Card, Chip, Sheet, StatusChip, Stepper, StreakChip, Switch, ToastProvider, useToast } from "@/components/ui";
import { ACCENTS, AVATAR_BGS, applyAccent, type AccentId } from "@/lib/theme";

export default function StyleCheck() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}

function Inner() {
  const toast = useToast();
  const [accent, setAccent] = useState<AccentId>("golden");
  const [sheet, setSheet] = useState(false);
  const [mins, setMins] = useState(30);
  const [on, setOn] = useState(true);

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-5 px-5 pb-36 pt-safe">
      <div className="flex flex-col gap-1.5 pt-10">
        <h1 className="text-[32px] leading-tight">Good morning, Kennedy</h1>
        <span className="text-[15px] text-ink-2">Pace v1 setup · design tokens check</span>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <span className="eyebrow">Accent</span>
        <div className="grid grid-cols-6 gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={accent === a.id}
              onClick={() => {
                setAccent(a.id);
                applyAccent(a.id);
              }}
              className="flex cursor-pointer flex-col items-center gap-1.5 text-[11px] font-medium"
            >
              <span
                className="flex h-12 w-12 rounded-full p-[3px]"
                style={{ border: `2px solid ${accent === a.id ? "var(--ink)" : "transparent"}` }}
              >
                <span className="flex-1 rounded-full" style={{ background: `linear-gradient(120deg, ${a.light[0]}, ${a.light[1]})` }} />
              </span>
              {a.name}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[16px] font-semibold">Journal</span>
          <span className="text-[13px] text-ink-2">6 of 10 min</span>
        </div>
        <div className="h-2.5 rounded-full bg-subtle">
          <div className="bg-accent-bar h-2.5 w-3/5 rounded-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StreakChip days={12} />
          <StatusChip onTrack />
          <StatusChip onTrack={false} />
        </div>
      </Card>

      <Card className="flex flex-wrap gap-2 p-5">
        {GOAL_ICONS.map((i) => (
          <span key={i} className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-tint">
            <Icon name={i} />
          </span>
        ))}
      </Card>

      <Card className="flex flex-wrap items-center gap-2 p-5">
        {AVATAR_BGS.map((b, i) => (
          <Avatar key={b.id} emoji={["🌻", "🌸", "🌊", "🐝", "🍓", "🌙", "🍋", "🌿"][i]} bg={b.hex} />
        ))}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast("Journal done · 5 of 7")}>Show toast</Button>
        <Button variant="outline" onClick={() => setSheet(true)}>
          Open sheet
        </Button>
        <Button variant="dark" size="sm">
          <Icon name="run" size={14} /> Start
        </Button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Log workout" subtitle="Bottom sheet check">
        <div className="flex gap-2 overflow-x-auto">
          <Chip selected onClick={() => {}}>Run</Chip>
          <Chip selected={false} onClick={() => {}}>Walk</Chip>
          <Chip selected={false} onClick={() => {}}>Strength</Chip>
        </div>
        <div className="flex items-center justify-between rounded-panel bg-surface px-4 py-2.5">
          <span className="text-[16px] font-semibold">Duration</span>
          <Stepper value={mins} onChange={setMins} step={5} min={5} format={(v) => `${v} min`} />
        </div>
        <div className="flex items-center justify-between rounded-panel bg-surface px-4 py-1">
          <span className="text-[16px] font-semibold">Share with friends</span>
          <Switch checked={on} onChange={setOn} label="Share with friends" />
        </div>
        <Button size="lg" onClick={() => setSheet(false)}>
          Log run
        </Button>
      </Sheet>

      <BottomNav onAdd={() => toast("Add sheet comes in a later PR")} />
    </main>
  );
}
