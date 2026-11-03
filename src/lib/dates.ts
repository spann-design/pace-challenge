// All dates are local calendar days as "YYYY-MM-DD" strings. We parse them at
// noon UTC so day arithmetic never drifts across daylight-saving changes.

const DAY_MS = 86_400_000;

function toUtcNoon(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtcNoon(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcNoon(b) - toUtcNoon(a)) / DAY_MS);
}

export function formatShort(iso: string): string {
  return new Date(toUtcNoon(iso)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatLong(iso: string): string {
  return new Date(toUtcNoon(iso)).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function minDate(a: string, b: string): string {
  return a < b ? a : b;
}
