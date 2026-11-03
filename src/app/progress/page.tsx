"use client";

import Link from "next/link";
import { useApp, useBundle } from "@/components/app-provider";
import { ProgressView } from "@/components/progress-view";
import { Empty } from "@/components/ui";

export default function ProgressPage() {
  const { store, today } = useApp();
  const { bundle, loading, error } = useBundle(store.me.id);
  if (loading) return null;
  if (error) return <Empty>{error}</Empty>;
  if (!bundle)
    return (
      <Empty>
        No challenge yet.{" "}
        <Link href="/goals" className="underline">
          Set up your goals
        </Link>
      </Empty>
    );
  return <ProgressView bundle={bundle} today={today} isMe />;
}
