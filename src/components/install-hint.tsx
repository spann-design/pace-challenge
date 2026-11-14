"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

type Mode = "installed" | "ios" | "other";

function detect(): Mode {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "other";
}

/** How to put Pace on the home screen (iPhone has no install prompt, so we explain). */
export function InstallHint() {
  const mode = useSyncExternalStore<Mode | null>(
    () => () => {},
    detect,
    () => null,
  );
  if (!mode || mode === "installed") return null;
  return (
    <div className="flex items-start gap-3 rounded-panel bg-subtle p-4">
      <span className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon name="share" size={18} strokeWidth={2} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">Add Pace to your Home Screen</span>
        <span className="text-[13px] leading-snug text-ink-2">
          {mode === "ios"
            ? "In Safari, tap the Share button, then “Add to Home Screen”. Pace opens full screen like an app."
            : "In your browser menu, choose “Install app” or “Add to Home screen”."}
        </span>
      </span>
    </div>
  );
}
