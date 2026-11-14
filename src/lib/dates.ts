// Dates are stored as the person's local calendar day ("YYYY-MM-DD").
// Weeks run Sunday to Saturday, matching the database.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function weekStart(iso: string): string {
  const d = fromISODate(iso);
  return addDays(iso, -d.getDay());
}

export function weekDays(iso: string): string[] {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthGrid(year: number, month: number): (string | null)[] {
  // Leading blanks so the 1st lands on its weekday (Sunday first).
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toISODate(new Date(year, month, d)));
  return cells;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);
}

export const fmt = {
  long: (iso: string) => fromISODate(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  short: (iso: string) => fromISODate(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
  month: (year: number, month: number) => new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  dow: (iso: string) => fromISODate(iso).toLocaleDateString("en-US", { weekday: "short" }),
  /** "Today", "Yesterday", weekday name within the week, else "Nov 3". */
  relative: (iso: string, ref = today()) => {
    const diff = daysBetween(iso, ref);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff > 1 && diff < 7) return fromISODate(iso).toLocaleDateString("en-US", { weekday: "long" });
    return fromISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  },
};

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
