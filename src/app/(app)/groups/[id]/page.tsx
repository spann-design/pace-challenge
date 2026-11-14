"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Leaderboard } from "@/components/social";
import { Avatar, Button, Card, IconButton, Sheet, Spinner, useToast } from "@/components/ui";
import { useGroupBoard } from "@/lib/data";
import { today } from "@/lib/dates";
import { inviteToGroup, leaveGroup, useFriendships, useGroup } from "@/lib/social";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { userId } = useSession();
  const day = today();
  const { data, isLoading } = useGroup(id);
  const { data: board } = useGroupBoard(id, day);
  const { data: friendships } = useFriendships(userId);
  const [inviting, setInviting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (isLoading || (data && !board)) return <Spinner />;
  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 pt-24 text-center">
        <h1 className="text-[26px]">Group not found</h1>
        <Button variant="outline" onClick={() => router.push("/friends")}>
          Back to friends
        </Button>
      </div>
    );
  }

  const { group, members } = data;
  const invited = members.filter((m) => m.status === "invited");
  const memberIds = new Set(members.map((m) => m.user_id));
  const invitable = (friendships ?? []).filter((f) => f.status === "accepted" && !memberIds.has(f.other.id));
  const isOwner = group.owner_id === userId;

  return (
    <>
      <div className="flex items-center pt-8">
        <IconButton icon="back" label="Back to friends" onClick={() => router.push("/friends")} />
      </div>
      <div className="flex items-center gap-4">
        <span className="bg-tint flex h-[72px] w-[72px] items-center justify-center rounded-3xl text-[36px]">{group.emoji}</span>
        <div className="flex flex-col">
          <h1 className="text-[30px] leading-tight">{group.name}</h1>
          <span className="text-[14px] text-ink-2">
            {members.filter((m) => m.status === "joined").length} members · ranked by streak
          </span>
        </div>
      </div>

      <Leaderboard rows={board ?? []} showWeek onOpen={(r) => router.push(`/friends/${r.username}`)} />

      {invited.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Invited</span>
          <div className="flex flex-wrap gap-2">
            {invited.map((m) => (
              <span key={m.user_id} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-[14px] font-semibold">
                <Avatar emoji={m.profile.avatar_emoji} bg={m.profile.avatar_bg} size={30} />
                {m.profile.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button onClick={() => setInviting(true)}>Invite friends</Button>
      <button type="button" onClick={() => setConfirmLeave(true)} className="h-11 cursor-pointer text-[15px] font-semibold text-ink-2">
        Leave group
      </button>

      <Sheet open={inviting} onClose={() => setInviting(false)} title={`Invite to ${group.name}`} subtitle="Only your friends can be invited">
        {invitable.length === 0 ? (
          <Card className="px-5 py-6 text-center text-[14px] text-ink-2">All your friends are already here. Invite more friends from the Friends tab.</Card>
        ) : (
          <Card className="px-4 py-1">
            {invitable.map((f, i) => (
              <div key={f.id} className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-divider" : ""}`}>
                <Avatar emoji={f.other.avatar_emoji} bg={f.other.avatar_bg} size={40} />
                <span className="flex-1 text-[16px] font-semibold">{f.other.display_name}</span>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await inviteToGroup(group.id, f.other.id, userId);
                      toast(`Invited ${f.other.display_name}`);
                    } catch {
                      toast("Couldn’t invite. Try again.");
                    }
                  }}
                >
                  Invite
                </Button>
              </div>
            ))}
          </Card>
        )}
      </Sheet>

      <Sheet open={confirmLeave} onClose={() => setConfirmLeave(false)} title={`Leave ${group.name}?`} role="alertdialog">
        <p className="-mt-2 text-[15px] text-ink-2">
          {isOwner ? "You created this group. It stays for everyone else; you can be invited back." : "You can be invited back by a member."}
        </p>
        <Button
          variant="dark"
          size="lg"
          onClick={async () => {
            try {
              await leaveGroup(group.id, userId);
              toast(`You left ${group.name}`);
              router.replace("/friends");
            } catch {
              toast("Couldn’t leave. Try again.");
            }
          }}
        >
          Leave group
        </Button>
        <Button variant="outline" onClick={() => setConfirmLeave(false)}>
          Stay
        </Button>
      </Sheet>
    </>
  );
}
