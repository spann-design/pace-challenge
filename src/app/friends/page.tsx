"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useApp, useBundle } from "@/components/app-provider";
import { Empty, Meter, PaceBadge, SectionTitle } from "@/components/ui";
import { summarize } from "@/lib/metrics";
import type { Friendship } from "@/lib/types";

export default function FriendsPage() {
  const { store, version, refresh } = useApp();
  const [list, setList] = useState<Friendship[] | null>(null);
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    store.listFriendships().then(setList, (e: Error) => setMsg({ kind: "error", text: e.message }));
  }, [store, version]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    try {
      const r = await store.requestFriend(username);
      setMsg({ kind: "ok", text: r === "accepted" ? "You're now friends!" : "Request sent." });
      setUsername("");
      refresh();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }

  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      refresh();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }

  const friends = list?.filter((f) => f.status === "accepted") ?? [];
  const incoming = list?.filter((f) => f.status === "pending" && !f.outgoing) ?? [];
  const outgoing = list?.filter((f) => f.status === "pending" && f.outgoing) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Friends</h1>
      <p className="text-sm text-ink-2">
        Friends can see your goals, check-ins and notes, and you can see theirs. Your username is{" "}
        <strong className="text-ink">@{store.me.username}</strong>.
      </p>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          className="input"
          placeholder="Add a friend by username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
        />
        <button className="btn btn-primary shrink-0">Add</button>
      </form>
      {msg && <p className={`mt-2 text-sm ${msg.kind === "ok" ? "text-good-text" : "text-critical"}`}>{msg.text}</p>}

      {incoming.length > 0 && (
        <>
          <SectionTitle>Requests</SectionTitle>
          <div className="card divide-y divide-line !py-1">
            {incoming.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-2.5">
                <Person f={f} />
                <button className="btn btn-primary ml-auto !py-1" onClick={() => act(() => store.acceptFriend(f.id))}>
                  Accept
                </button>
                <button className="btn btn-ghost !py-1" onClick={() => act(() => store.removeFriend(f.id))}>
                  Decline
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Your accountability crew</SectionTitle>
      {list === null ? null : friends.length === 0 ? (
        <Empty>No friends yet. Add someone by their username above.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {friends.map((f) => (
            <FriendCard key={f.id} f={f} onRemove={() => act(() => store.removeFriend(f.id))} />
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <>
          <SectionTitle>Sent requests</SectionTitle>
          <div className="card divide-y divide-line !py-1">
            {outgoing.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-2.5">
                <Person f={f} />
                <span className="ml-auto text-xs text-muted">Pending</span>
                <button className="btn btn-ghost !py-1" onClick={() => act(() => store.removeFriend(f.id))}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Person({ f }: { f: Friendship }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={f.friend.display_name} />
      <div>
        <div className="font-semibold leading-tight">{f.friend.display_name}</div>
        <div className="text-xs text-muted">@{f.friend.username}</div>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-ink-2">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function FriendCard({ f, onRemove }: { f: Friendship; onRemove: () => void }) {
  const { today } = useApp();
  const { bundle, loading } = useBundle(f.friend.id);
  const s = bundle ? summarize(bundle, today) : null;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Person f={f} />
        {s && <PaceBadge pace={s.pace} small />}
      </div>
      {loading ? (
        <div className="h-16" />
      ) : !bundle || !s ? (
        <p className="text-sm text-ink-2">Hasn&apos;t set up a challenge yet.</p>
      ) : (
        <>
          <div className="text-sm">
            <div className="font-medium">{bundle.challenge.title}</div>
            <div className="text-xs text-ink-2">
              Day {s.timeline.dayNumber} of {s.timeline.totalDays} · streak {s.streak}d
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-ink-2">
              <span>Habit consistency</span>
              <span className="tabular font-semibold text-ink">{Math.round(s.habits.overall * 100)}%</span>
            </div>
            <Meter value={s.habits.overall} label="Habit consistency" />
          </div>
          <ul className="space-y-1 text-xs">
            {s.outcomes.map((o) => (
              <li key={o.goal.id} className="flex items-center justify-between gap-2">
                <span className="text-ink-2">{o.goal.name}</span>
                <PaceBadge pace={o.pace} small />
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-auto flex gap-2">
        {bundle && (
          <Link href={`/friend?id=${f.friend.id}`} className="btn btn-primary flex-1 !py-1.5 text-sm">
            View progress
          </Link>
        )}
        <button
          className="btn btn-ghost !py-1.5 text-sm"
          onClick={() => confirm(`Remove ${f.friend.display_name} as a friend?`) && onRemove()}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
