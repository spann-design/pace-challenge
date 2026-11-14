import type { ReactNode } from "react";

// Activity icons (from the design's ActIcon) plus the UI icons used across screens.
// All are 24×24 line icons drawn with currentColor.

const ACTIVITY: Record<string, ReactNode> = {
  run: (
    <>
      <circle cx="14" cy="4" r="2" />
      <path d="M7 21l3-6 3 2v4" />
      <path d="M10 15l1.5-6 3.5 3 3-1" />
      <path d="M6 11l3-2h2.5" />
    </>
  ),
  cycle: (
    <>
      <circle cx="5.5" cy="17" r="3.5" />
      <circle cx="18.5" cy="17" r="3.5" />
      <path d="M5.5 17l4-7h6l3 7" />
      <path d="M9.5 10l3 7h-7" />
      <path d="M14 6h2.5l-1 4" />
    </>
  ),
  power: <path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" />,
  yoga: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 7v6" />
      <path d="M4.5 10l7.5 2 7.5-2" />
      <path d="M8 21l4-8 4 8" />
    </>
  ),
  swim: (
    <>
      <circle cx="17" cy="6.5" r="2" />
      <path d="M5 13l4.5-4 3 2.5 2.5-2" />
      <path d="M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="M10 21l2-6 3 3v3" />
      <path d="M12 15l1-6-3 2-1 3" />
      <path d="M13 9l2.5 3H18" />
    </>
  ),
  journal: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  read: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  meditate: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v5" />
      <path d="M7 14l5-2 5 2" />
      <path d="M4 18.5c2.5-2 5-2.5 8-2.5s5.5.5 8 2.5" />
    </>
  ),
  sleep: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  leaf: (
    <>
      <path d="M5 19C5 11 11 5 20 5c0 9-6 15-14 15" />
      <path d="M5 19l7-7" />
    </>
  ),
  star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" />,
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  stretch: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v6l-4 7" />
      <path d="M12 13l4 7" />
      <path d="M5 9l7 1 7-1" />
    </>
  ),
  pill: (
    <>
      <path d="M10.5 20.5l-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z" />
      <path d="M8.5 8.5l7 7" />
    </>
  ),
  glass: (
    <>
      <path d="M7 3h10l-1 8a4 4 0 0 1-8 0z" />
      <path d="M12 15v6M8 21h8" />
      <path d="M4 4l16 16" />
    </>
  ),
};

/** Icons a user can pick for a goal, in picker order. */
export const GOAL_ICONS = [
  "run", "walk", "cycle", "swim", "power", "yoga", "stretch", "meditate",
  "journal", "read", "sleep", "sun", "drop", "pill", "glass", "heart", "leaf", "star", "music",
] as const;

const UI: Record<string, ReactNode> = {
  home: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  trends: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14a6.5 6.5 0 0 1 3 6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </>
  ),
  send: (
    <>
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4z" />
    </>
  ),
  comment: <path d="M20 14a3 3 0 0 1-3 3H8l-4 4V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  group: (
    <>
      <circle cx="12" cy="7.5" r="3" />
      <circle cx="5" cy="10" r="2.3" />
      <circle cx="19" cy="10" r="2.3" />
      <path d="M7 20a5 5 0 0 1 10 0" />
      <path d="M1.5 19a3.6 3.6 0 0 1 5-3.3M22.5 19a3.6 3.6 0 0 0-5-3.3" />
    </>
  ),
  signout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
    </>
  ),
};

export type IconName = keyof typeof ACTIVITY | keyof typeof UI | string;

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** When set, the icon is announced to screen readers; otherwise it's decorative. */
  label?: string;
}) {
  const body = ACTIVITY[name] ?? UI[name] ?? ACTIVITY.star;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {body}
    </svg>
  );
}

/** Small filled flame used on streak chips. */
export function Flame({ size = 15 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="var(--a1)"
      stroke="var(--ink)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 4 0-2-1-4-3-6-1 4-3 6-3 11 0 4 3 7 7 7z" />
    </svg>
  );
}
