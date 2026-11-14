"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { useSession } from "@/components/session";
import { InviteSheet, Leaderboard } from "@/components/social";
import { Avatar, Button, Card, Chip, Sheet, Spinner, useToast } from "@/components/ui";
import { useLeaderboard } from "@/lib/data";
import { today } from "@/lib/dates";
import { acceptFriend, createGroup, joinGroup, leaveGroup, removeFriendship, useFriendships, useGroups } from "@/lib/social";

const GROUP_EMOJIS = ["🌅", "🏃", "📚", "🧘", "💪", "🌙", "🌿", "🔥"];

export default function FriendsPage() {
  const { profile, userId } = useSession();
  const router = useRouter();
  const toast = useToast();
  const day = today();
  const { data: board } = useLeaderboard(day);
  const { data: friendships } = useFriendships(userId);
  const { data: groups } = useGroups(userId);
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!board || !friendships || !groups) return <Spinner />;

  const incoming = friendships.filter((f) => f.status === "pending" && f.incoming);
  const outgoing = friendships.filter((f) => f.status === "pending" && !f.incoming);
  const friendCount = board.length - 1;
  const groupInvites = groups.filter((g) => g.myStatus === "invited");
  const myGroups = groups.filter((g) => g.myStatus === "joined");

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok);
    } catch {
      toast("Couldn’t do that. Check your connection.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1 pt-10">
        <h1 className="text-[32px] leading-tight">Friends</h1>
        {friendCount > 0 && <span className="text-[15px] text-ink-2">Ranked by streak</span>}
      </div>

      {incoming.map((f) => (
        <Card key={f.id} className="flex items-center gap-3.5 rounded-3xl p-4">
          <Avatar emoji={f.other.avatar_emoji} bg={f.other.avatar_bg} size={52} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-2">Friend request</span>
              <span className="text-[16px] font-semibold">{f.other.display_name || f.other.username} wants to be friends</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => act(() => removeFriendship(f.id), "Request declined")}>
                Decline
              </Button>
              <Button size="sm" onClick={() => act(() => acceptFriend(f.id), `You and ${f.other.display_name} are now friends`)}>
                Accept
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {groupInvites.map((g) => (
        <Card key={g.id} className="flex items-center gap-3.5 rounded-3xl p-4">
          <span className="bg-tint flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-[26px]">{g.emoji}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-2">Group invite</span>
              <span className="text-[16px] font-semibold">
                {g.invitedBy?.display_name ?? "A friend"} invited you to {g.name}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => act(() => leaveGroup(g.id, userId), "Invite declined")}>
                Decline
              </Button>
              <Button size="sm" onClick={() => act(() => joinGroup(g.id, userId), `You joined ${g.name}`)}>
                Join
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {friendCount === 0 ? (
        <EmptyFriends onInvite={() => setInviting(true)} />
      ) : (
        <>
          <Button variant="outline" onClick={() => setInviting(true)}>
            <Icon name="plus" size={18} strokeWidth={2.2} /> Invite a friend
          </Button>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[22px]">Close friends</h2>
            <span className="text-[13px] text-ink-2">
              {friendCount} {friendCount === 1 ? "friend" : "friends"}
            </span>
          </div>
          <Leaderboard rows={board} onOpen={(r) => router.push(`/friends/${r.username}`)} />
        </>
      )}

      {outgoing.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Waiting for them to accept</span>
          {outgoing.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-panel bg-surface px-4 py-2">
              <Avatar emoji={f.other.avatar_emoji} bg={f.other.avatar_bg} size={36} />
              <span className="flex-1 text-[15px] font-semibold">{f.other.display_name || `@${f.other.username}`}</span>
              <button type="button" onClick={() => act(() => removeFriendship(f.id), "Request cancelled")} className="h-11 cursor-pointer px-2 text-[14px] font-semibold text-ink-2">
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-[22px]">Groups</h2>
        <button type="button" onClick={() => setCreating(true)} className="flex h-11 cursor-pointer items-center gap-1.5 text-[14px] font-semibold">
          <Icon name="plus" size={16} strokeWidth={2.2} /> New group
        </button>
      </div>
      {myGroups.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-6 text-center">
          <span className="text-[30px]">🌅</span>
          <span className="text-[15px] font-semibold">Start a crew</span>
          <span className="text-[14px] text-ink-2">A group shares one leaderboard, like “Morning Crew”. Invite friends after you create it.</span>
        </Card>
      ) : (
        <Card className="px-4 py-1">
          {myGroups.map((g, i) => (
            <Link key={g.id} href={`/groups/${g.id}`} className={`flex items-center gap-3.5 py-3 ${i ? "border-t border-divider" : ""}`}>
              <span className="bg-tint flex h-11 w-11 items-center justify-center rounded-[14px] text-[22px]">{g.emoji}</span>
              <span className="flex-1 text-[16px] font-semibold">{g.name}</span>
              <Icon name="chevron" size={18} className="text-ink-2" />
            </Link>
          ))}
        </Card>
      )}

      <InviteSheet open={inviting} onClose={() => setInviting(false)} username={profile.username} name={profile.display_name.split(" ")[0]} />
      <NewGroupSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          router.push(`/groups/${id}`);
        }}
      />
    </>
  );
}

function EmptyFriends({ onInvite }: { onInvite: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 px-6 py-8 text-center">
      <div aria-hidden="true" className="relative h-24 w-40">
        <span className="absolute left-4 top-2 flex h-20 w-20 items-center justify-center rounded-full bg-[#FBF0D9] text-[40px] shadow-[0_0_0_4px_var(--surface)]">🌻</span>
        <span className="absolute left-[76px] top-2 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#CFC6CE] bg-surface text-ink-3">
          <Icon name="plus" size={28} strokeWidth={2} />
        </span>
      </div>
      <h2 className="text-[26px]">Better together</h2>
      <p className="text-[15px] leading-normal text-ink-2">Invite a friend to cheer each other on, compare streaks and keep each other honest.</p>
      <Button size="lg" className="w-full" onClick={onInvite}>
        <Icon name="plus" size={18} strokeWidth={2.2} /> Invite a friend
      </Button>
      <div className="flex w-full flex-col gap-2 rounded-panel bg-subtle p-4 text-left">
        <span className="eyebrow">What friends see</span>
        <span className="flex items-center gap-2 text-[14px]">
          <Icon name="eye" size={16} /> Your streaks and trends
        </span>
        <span className="flex items-center gap-2 text-[14px]">
          <Icon name="lock" size={16} /> Never your numbers, notes or times
        </span>
      </div>
    </Card>
  );
}

function NewGroupSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(GROUP_EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="New group" subtitle="Members see each other’s streaks and trends on shared goals">
      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Name</span>
        <input className="field" maxLength={40} placeholder="Morning Crew" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div role="group" aria-label="Group emoji" className="flex flex-wrap gap-2">
        {GROUP_EMOJIS.map((e) => (
          <Chip key={e} selected={e === emoji} onClick={() => setEmoji(e)} aria-label={`Emoji ${e}`} className="w-11 px-0 text-[20px]">
            {e}
          </Chip>
        ))}
      </div>
      <Button
        size="lg"
        disabled={busy || !name.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            const id = await createGroup(name, emoji);
            setName("");
            onCreated(id);
          } catch {
            toast("Couldn’t create the group.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Create group
      </Button>
    </Sheet>
  );
}
