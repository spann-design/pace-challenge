"use client";

import { useState } from "react";
import { fmt } from "@/lib/dates";
import { inviteUrl, copyText, shareLink } from "@/lib/share";
import { addComment, deleteComment, sendFriendRequest, setCheer } from "@/lib/social";
import { CHEER_EMOJIS } from "@/lib/theme";
import type { FeedItem, GoalStat, LeaderRow } from "@/lib/types";
import { Flame, Icon } from "./icon";
import { Avatar, Button, Card, cx, Sheet, StatusChip, useToast } from "./ui";

/** Ranked list of people: rank, avatar, name, streak, on track / slipping. */
export function Leaderboard({ rows, onOpen, showWeek = false }: { rows: LeaderRow[]; onOpen?: (r: LeaderRow) => void; showWeek?: boolean }) {
  return (
    <Card className="px-4 py-1">
      <div role="list">
        {rows.map((r, i) => {
          const label = `${r.is_me ? "You" : r.display_name}, ${r.current_streak}-day streak, ${r.on_track ? "on track" : "slipping"}`;
          const inner = (
            <>
              <span className="w-5 shrink-0 text-center font-display text-[17px] font-semibold text-ink-2">{i + 1}</span>
              <Avatar emoji={r.avatar_emoji} bg={r.avatar_bg} size={44} ring={r.is_me} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="truncate text-[16px] font-semibold">{r.is_me ? "You" : r.display_name}</span>
                <span className="flex items-center gap-1 text-[13px] text-ink-2">
                  <Flame size={13} />
                  <span className="truncate">
                    {r.current_streak}-day streak
                    {showWeek && r.this_week !== undefined && ` · ${Math.round(r.this_week * 100)}% this week`}
                  </span>
                </span>
              </span>
              <StatusChip onTrack={r.on_track} />
            </>
          );
          return (
            <div role="listitem" key={r.user_id} className={cx(i > 0 && "border-t border-divider")}>
              {onOpen && !r.is_me ? (
                <button type="button" aria-label={`${label}. Open`} onClick={() => onOpen(r)} className="flex w-full cursor-pointer items-center gap-3 py-3">
                  {inner}
                </button>
              ) : (
                <div aria-label={label} className="flex items-center gap-3 py-3">
                  {inner}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Per-goal progress bars: percentages and streaks only. */
export function GoalBars({ stats, empty }: { stats: GoalStat[]; empty: string }) {
  if (stats.length === 0) return <Card className="px-5 py-6 text-center text-[14px] text-ink-2">{empty}</Card>;
  return (
    <Card className="px-4 py-1">
      {stats.map((s, i) => {
        const pct = Math.round(s.this_week * 100);
        const last = Math.round(s.last_week * 100);
        const unit = s.cadence === "weekly" ? "week" : "day";
        return (
          <div key={s.goal_id} className={cx("flex items-center gap-3.5 py-3", i > 0 && "border-t border-divider")}>
            <span className="bg-tint flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px]">
              <Icon name={s.icon} size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px] font-semibold">{s.title}</span>
                <span className="font-display text-[17px] font-semibold tabular">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-subtle" role="img" aria-label={`${pct}% this week`}>
                <div className="bg-accent-bar h-2 rounded-full transition-[width] duration-500" style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <span className="text-[12px] text-ink-2">
                Last week {last}% · {s.current_streak > 0 ? `${s.current_streak}-${unit} streak` : "no streak yet"}
                {s.best_streak > s.current_streak ? ` · best ${s.best_streak}` : ""}
              </span>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/** A friend's recent check-ins with cheers and comments. */
export function ActivityFeed({ items, me, today }: { items: FeedItem[]; me: string; today: string }) {
  const [shown, setShown] = useState(5);
  if (items.length === 0) return <Card className="px-5 py-6 text-center text-[14px] text-ink-2">No shared check-ins in the last two weeks.</Card>;
  return (
    <div className="flex flex-col gap-2.5">
      {items.slice(0, shown).map((it) => (
        <FeedCard key={it.log_id} item={it} me={me} today={today} />
      ))}
      {items.length > shown && (
        <Button variant="outline" onClick={() => setShown(shown + 10)}>
          Show more
        </Button>
      )}
    </div>
  );
}

function FeedCard({ item, me, today }: { item: FeedItem; me: string; today: string }) {
  const toast = useToast();
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [mine, setMine] = useState(item.my_cheer);
  const [busy, setBusy] = useState(false);

  async function cheer(e: string) {
    const next = mine === e ? null : e;
    setMine(next);
    try {
      await setCheer(item.log_id, me, next);
    } catch {
      setMine(item.my_cheer);
      toast("Couldn’t send that. Try again.");
    }
  }

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await addComment(item.log_id, draft);
      setDraft("");
      setComposing(false);
    } catch {
      toast("Couldn’t post your comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", item.completed ? "bg-accent" : "bg-tint")}>
          <Icon name={item.goal_icon} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold">{item.completed ? `Hit ${item.goal_title}` : `Logged ${item.goal_title}`}</span>
          <span className="text-[12px] text-ink-2">{fmt.relative(item.day, today)}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {CHEER_EMOJIS.map((e) => {
          const n = (item.cheers[e] ?? 0) - (item.my_cheer === e ? 1 : 0) + (mine === e ? 1 : 0);
          return (
            <button
              key={e}
              type="button"
              aria-label={`React ${e}${n ? `, ${n}` : ""}`}
              aria-pressed={mine === e}
              onClick={() => cheer(e)}
              className={cx(
                "flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-[14px] font-semibold",
                mine === e ? "bg-tint border-[1.5px] border-[var(--a1)]" : "border-[1.5px] border-divider bg-surface",
              )}
            >
              <span aria-hidden="true">{e}</span>
              {n > 0 && n}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setComposing(!composing)}
          className="ml-auto flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink-2"
        >
          <Icon name="comment" size={16} />
          {item.comments.length ? "Reply" : "Comment"}
        </button>
      </div>
      {item.comments.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-divider pt-2.5">
          {item.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar emoji={c.emoji} bg={c.bg} size={26} />
              <span className="flex-1 text-[14px] leading-snug">
                <span className="font-semibold">{c.user_id === me ? "You" : c.name}</span> {c.body}
              </span>
              {c.user_id === me && (
                <button type="button" aria-label="Delete comment" onClick={() => deleteComment(c.id).catch(() => toast("Couldn’t delete."))} className="h-7 w-7 cursor-pointer text-ink-3">
                  <Icon name="close" size={12} strokeWidth={2.4} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {composing && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Write a comment</span>
            <input className="field h-11 rounded-full" autoFocus maxLength={280} placeholder="Say something kind…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <button type="submit" aria-label="Send comment" disabled={busy || !draft.trim()} className="bg-accent flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:opacity-50">
            <Icon name="send" size={17} strokeWidth={2} />
          </button>
        </form>
      )}
    </Card>
  );
}

/** Invite link (share / copy) and add-by-username. */
export function InviteSheet({ open, onClose, username, name }: { open: boolean; onClose: () => void; username: string; name: string }) {
  const toast = useToast();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const url = typeof window === "undefined" ? "" : inviteUrl(username);

  async function add() {
    setBusy(true);
    try {
      const r = await sendFriendRequest(handle.trim());
      const msg = {
        sent: "Request sent",
        accepted: "You’re now friends",
        already_friends: "You’re already friends",
        already_sent: "Request already sent",
        not_found: "No one with that username",
        self: "That’s you!",
      }[r];
      toast(msg);
      if (r === "sent" || r === "accepted") {
        setHandle("");
        onClose();
      }
    } catch {
      toast("Couldn’t send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Invite a friend">
      <p className="-mt-2 text-[15px] leading-normal text-ink-2">Send your link. When they open it, they’ll send you a friend request to accept.</p>
      <Card className="flex items-center gap-3 rounded-3xl p-4">
        <Icon name="link" size={20} />
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold">Join {name} and build habits together</span>
          <span className="truncate text-[13px] text-ink-2">{url}</span>
        </span>
      </Card>
      <Button
        size="lg"
        onClick={async () => {
          const r = await shareLink(url, `Join me on Pace and let’s keep each other going.`);
          if (r === "copied") toast("Link copied");
          if (r !== "cancelled") onClose();
        }}
      >
        <Icon name="share" size={18} strokeWidth={2} /> Share link
      </Button>
      <Button
        variant="outline"
        onClick={async () => {
          toast((await copyText(url)) ? "Link copied" : "Couldn’t copy. Press and hold the link instead.");
        }}
      >
        Copy link
      </Button>
      <form
        className="flex flex-col gap-2 border-t border-hairline pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor="addHandle" className="eyebrow">
          Or add by username
        </label>
        <div className="flex gap-2">
          <input id="addHandle" className="field" autoCapitalize="none" autoCorrect="off" placeholder="username" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <Button type="submit" variant="dark" disabled={busy || handle.trim().length < 3}>
            Add
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
