"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/components/session";
import { ActivityFeed, GoalBars } from "@/components/social";
import { Avatar, Button, Card, IconButton, Sheet, Spinner, StatusChip, StreakChip, useToast } from "@/components/ui";
import { useFeed, useGoalStats, useSummary } from "@/lib/data";
import { today } from "@/lib/dates";
import { findProfileByUsername, removeFriendship, useFriendships } from "@/lib/social";

export default function FriendPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const toast = useToast();
  const { userId } = useSession();
  const day = today();
  const { data: person, isLoading } = useSWR(["person", username], () => findProfileByUsername(username));
  const { data: summary } = useSummary(person?.id, day);
  const { data: stats } = useGoalStats(person?.id, day);
  const { data: feed } = useFeed(person?.id, day);
  const { data: friendships } = useFriendships(userId);
  const [menu, setMenu] = useState(false);

  if (isLoading || (person && (!summary || !stats || !feed))) return <Spinner />;
  if (!person || person.id === userId) {
    return (
      <div className="flex flex-col items-center gap-3 pt-24 text-center">
        <h1 className="text-[26px]">Not found</h1>
        <p className="text-[15px] text-ink-2">You can only see friends and people in your groups.</p>
        <Button variant="outline" onClick={() => router.push("/friends")}>
          Back to friends
        </Button>
      </div>
    );
  }
  const friendship = friendships?.find((f) => f.other.id === person.id && f.status === "accepted");

  return (
    <>
      <div className="flex items-center justify-between pt-8">
        <IconButton icon="back" label="Back to friends" onClick={() => router.back()} />
        {friendship && <IconButton icon="more" label="More options" onClick={() => setMenu(true)} />}
      </div>

      <div className="flex items-center gap-4">
        <Avatar emoji={person.avatar_emoji} bg={person.avatar_bg} size={76} />
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] leading-tight">{person.display_name || person.username}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StreakChip days={summary?.current_streak ?? 0} />
            <StatusChip onTrack={summary?.on_track ?? false} />
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="This week" value={`${Math.round(summary.this_week * 100)}%`} />
          <Stat label="Last week" value={`${Math.round(summary.last_week * 100)}%`} />
          <Stat label="Best streak" value={`${summary.best_streak}d`} />
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px]">Goals</h2>
        <span className="text-[13px] text-ink-2">This week · trends only</span>
      </div>
      <GoalBars stats={stats ?? []} empty="Nothing shared yet." />

      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px]">Recent activity</h2>
        <span className="text-[13px] text-ink-2">React or comment</span>
      </div>
      <ActivityFeed items={feed ?? []} me={userId} today={day} />

      <Sheet open={menu} onClose={() => setMenu(false)} title={person.display_name}>
        <Button
          variant="outline"
          onClick={async () => {
            if (!friendship) return;
            try {
              await removeFriendship(friendship.id);
              toast(`Removed ${person.display_name}`);
              router.replace("/friends");
            } catch {
              toast("Couldn’t remove. Try again.");
            }
          }}
        >
          Remove friend
        </Button>
        <p className="text-center text-[13px] text-ink-2">They won’t be told. You’ll stop seeing each other’s streaks.</p>
      </Sheet>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-0.5 rounded-panel px-3.5 py-3">
      <span className="text-[12px] text-ink-2">{label}</span>
      <span className="font-display text-[22px] font-semibold">{value}</span>
    </Card>
  );
}
