// Accent gradients and avatar options from the design (Palette-2, Accent-Picker).

export const ACCENTS = [
  { id: "golden", name: "Golden Hour", light: ["#F6B46E", "#B48AF0"], dark: ["#F8BF80", "#BC97F3"] },
  { id: "peach", name: "Peach Fizz", light: ["#F59A6B", "#EC6F8E"], dark: ["#F7A57C", "#F07F9C"] },
  { id: "berry", name: "Berry", light: ["#F48FB1", "#A07EF0"], dark: ["#F6A0BE", "#B096F4"] },
  { id: "lagoon", name: "Lagoon", light: ["#4CC4AE", "#6E95F2"], dark: ["#5CD0BB", "#86A6F6"] },
  { id: "sky", name: "Sky", light: ["#78C4F2", "#9A92F2"], dark: ["#8CCDF5", "#A9A2F5"] },
  { id: "matcha", name: "Matcha", light: ["#F2C75C", "#86C77A"], dark: ["#F5D070", "#97D18B"] },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "golden";
export const ACCENT_STORAGE_KEY = "pace-accent";

export function isAccentId(v: unknown): v is AccentId {
  return typeof v === "string" && ACCENTS.some((a) => a.id === v);
}

/** Apply an accent to the page and remember it so the next load paints in the right color. */
export function applyAccent(id: AccentId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.accent = id;
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
  } catch {
    // storage blocked: the accent still applies for this visit
  }
}

export const AVATAR_BGS = [
  { id: "butter", name: "Butter", hex: "#FBF0D9" },
  { id: "blush", name: "Blush", hex: "#FBE3EC" },
  { id: "lavender", name: "Lavender", hex: "#E6E3F7" },
  { id: "sky", name: "Sky", hex: "#DDEFF7" },
  { id: "mint", name: "Mint", hex: "#E3F1E8" },
  { id: "peach", name: "Peach", hex: "#FBE1DF" },
  { id: "mist", name: "Mist", hex: "#F2ECF0" },
  { id: "white", name: "White", hex: "#FFFFFF" },
] as const;

export const AVATAR_EMOJIS = [
  "🌻", "🌸", "🌊", "🍓", "🐝", "🌙", "🍋", "🦋",
  "🌿", "🍑", "🐢", "🦊", "☀️", "⭐", "🔥", "💫",
];

export const CHEER_EMOJIS = ["🔥", "👏", "💪", "❤️"] as const;
