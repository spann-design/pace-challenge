"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/icon";
import { Avatar, Button, Spinner } from "@/components/ui";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { PublicProfile } from "@/lib/social";

type Result = "sent" | "accepted" | "already_friends" | "already_sent" | "not_found" | "self";

// Opened from someone's invite link. Works signed out: shows who invited you,
// then asks you to sign in. Signed in: one tap sends the friend request.
export default function InvitePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Invite />
    </Suspense>
  );
}

function Invite() {
  const { username } = useParams<{ username: string }>();
  const { data, isLoading } = useSWR(isSupabaseConfigured ? ["invite", username] : null, async () => {
    const sb = supabase();
    const [{ data: rows }, { data: auth }] = await Promise.all([sb.rpc("invite_profile", { p_username: username }), sb.auth.getUser()]);
    return { inviter: ((rows as PublicProfile[] | null) ?? [])[0] ?? null, signedIn: !!auth.user, isMe: auth.user?.id === rows?.[0]?.id };
  });
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading || !data) return <Spinner />;
  const { inviter, signedIn, isMe } = data;
  const first = inviter?.display_name.split(" ")[0] ?? "";

  async function send() {
    setBusy(true);
    const { data: r } = await supabase().rpc("send_friend_request", { p_username: username });
    setResult((r as Result) ?? "not_found");
    setBusy(false);
  }

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-10">
      <span className="pt-12 text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-2">Invite link</span>
      {!inviter ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-[30px]">This link doesn’t work</h1>
          <p className="text-[15px] text-ink-2">Ask your friend to send their invite link again.</p>
          <Link href="/" className="bg-accent flex h-[52px] items-center rounded-full px-6 font-semibold">
            Open Pace
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <Avatar emoji={inviter.avatar_emoji} bg={inviter.avatar_bg} size={120} />
            <h1 className="text-[34px] leading-[1.1]">{isMe ? "This is your invite link" : `${first} invited you to be friends`}</h1>
            <p className="max-w-[320px] text-[16px] leading-normal text-ink-2">
              {isMe
                ? "Send it to a friend. When they open it, they can send you a request."
                : "You’ll see each other’s streaks and trends, and can cheer each other on. Numbers stay private."}
            </p>
          </div>

          {result ? (
            <div role="status" className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card">
                <span className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <Icon name="check" size={18} strokeWidth={2.6} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[16px] font-semibold">
                    {result === "accepted" || result === "already_friends" ? `You and ${first} are friends` : result === "not_found" ? "Couldn’t send" : "Request sent"}
                  </span>
                  <span className="text-[14px] text-ink-2">
                    {result === "sent" || result === "already_sent" ? `You’ll be friends as soon as ${first} accepts.` : result === "not_found" ? "Try the link again." : "See them on your Friends tab."}
                  </span>
                </span>
              </div>
              <Link href="/friends" className="bg-accent flex h-14 items-center justify-center rounded-full text-[17px] font-semibold">
                Open Pace
              </Link>
            </div>
          ) : isMe ? (
            <Link href="/friends" className="bg-accent flex h-14 items-center justify-center rounded-full text-[17px] font-semibold">
              Back to Pace
            </Link>
          ) : signedIn ? (
            <div className="flex flex-col gap-2">
              <Button size="lg" disabled={busy} onClick={send}>
                Send friend request
              </Button>
              <Link href="/" className="flex h-12 items-center justify-center text-[15px] font-semibold">
                Not now
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href={`/login?next=${encodeURIComponent(`/i/${username}`)}`} className="bg-accent flex h-14 items-center justify-center rounded-full text-[17px] font-semibold">
                Sign in to accept
              </Link>
              <span className="text-center text-[13px] text-ink-2">New to Pace? Signing in creates your account.</span>
            </div>
          )}
        </>
      )}
    </main>
  );
}
