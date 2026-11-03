"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApp, useBundle } from "@/components/app-provider";
import { ProgressView } from "@/components/progress-view";
import { Empty } from "@/components/ui";

export default function FriendPage() {
  return (
    <Suspense>
      <FriendProgress />
    </Suspense>
  );
}

function FriendProgress() {
  const id = useSearchParams().get("id");
  const { store, today } = useApp();
  const { bundle, loading, error } = useBundle(id);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    store.listFriendships().then((list) => setName(list.find((f) => f.friend.id === id)?.friend.display_name ?? null));
  }, [store, id]);

  if (!id) return <Empty>No friend selected.</Empty>;
  if (loading) return null;
  return (
    <div>
      <Link href="/friends" className="text-sm text-ink-2 hover:text-ink">
        ‹ Friends
      </Link>
      {name && <div className="mt-3 text-sm font-semibold text-ink-2">{name}&apos;s challenge</div>}
      <div className="mt-1">
        {error ? (
          <Empty>{error}</Empty>
        ) : bundle ? (
          <ProgressView bundle={bundle} today={today} isMe={false} />
        ) : (
          <Empty>Nothing to show. They may not have a challenge yet, or you aren&apos;t friends.</Empty>
        )}
      </div>
    </div>
  );
}
