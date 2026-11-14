"use client";

// Placeholder until the Home digest PR: confirms sign-in and onboarding worked.

import { useSession, useSignOut } from "@/components/session";
import { Avatar, Button, Card } from "@/components/ui";
import { fmt, greeting, today } from "@/lib/dates";

export default function Home() {
  const { profile } = useSession();
  const signOut = useSignOut();
  return (
    <>
      <div className="flex flex-col gap-1.5 pt-10">
        <h1 className="text-[32px] leading-tight">
          {greeting()}, {profile.display_name.split(" ")[0]}
        </h1>
        <span className="text-[15px] text-ink-2">{fmt.long(today())}</span>
      </div>
      <Card className="flex items-center gap-4 p-5">
        <Avatar emoji={profile.avatar_emoji} bg={profile.avatar_bg} size={56} />
        <div className="flex flex-col">
          <span className="text-[17px] font-semibold">You’re signed in</span>
          <span className="text-[13px] text-ink-2">@{profile.username} · today’s list arrives in the next update</span>
        </div>
      </Card>
      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </>
  );
}
