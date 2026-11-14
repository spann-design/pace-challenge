"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Flame, Icon } from "./icon";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Buttons: pills, 44px+ tall.
// ---------------------------------------------------------------------------

type Variant = "accent" | "dark" | "outline" | "plain";
const VARIANTS: Record<Variant, string> = {
  accent: "bg-accent",
  dark: "bg-ink text-bg",
  outline: "bg-surface text-ink border-[1.5px] border-line",
  plain: "bg-surface text-ink",
};
const SIZES = {
  sm: "h-11 px-4 text-[14px]",
  md: "h-[52px] px-6 text-[16px]",
  lg: "h-14 px-7 text-[17px]",
};

export function Button({
  variant = "accent",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-opacity disabled:cursor-default disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  size = 18,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...rest}
      className={cx(
        "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-ink",
        className,
      )}
    >
      <Icon name={icon} size={size} strokeWidth={2} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-card bg-surface shadow-card", className)}>{children}</div>;
}

export function Avatar({
  emoji,
  bg,
  size = 44,
  ring = false,
}: {
  emoji: string;
  bg: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.5),
        boxShadow: ring ? "0 0 0 2px var(--surface), 0 0 0 4px var(--a1)" : bg === "#FFFFFF" ? "inset 0 0 0 1px var(--hairline)" : undefined,
      }}
    >
      {emoji}
    </span>
  );
}

export function StreakChip({ days, className }: { days: number; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-full bg-subtle px-3 text-[13px] font-semibold text-ink",
        className,
      )}
    >
      <Flame />
      {days}-day streak
    </span>
  );
}

export function StatusChip({ onTrack }: { onTrack: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold",
        onTrack ? "bg-good-bg text-good-ink" : "bg-warn-bg text-warn-ink",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {onTrack ? "On track" : "Slipping"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

/** − value + control. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  format = (v) => String(v),
  lessLabel = "Less",
  moreLabel = "More",
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  lessLabel?: string;
  moreLabel?: string;
}) {
  const btn =
    "h-11 w-11 cursor-pointer rounded-full border-[1.5px] border-line bg-surface text-[20px] font-semibold text-ink disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={lessLabel} className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <span className="min-w-[72px] text-center font-display text-[22px] font-semibold tabular" aria-live="polite">
        {format(value)}
      </span>
      <button type="button" aria-label={moreLabel} className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </div>
  );
}

/** Pill option (selected = gradient). */
export function Chip({
  selected,
  onClick,
  children,
  className,
  ...rest
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      {...rest}
      className={cx(
        "h-11 shrink-0 cursor-pointer rounded-full px-4 text-[14px] font-semibold text-ink",
        selected ? "bg-accent" : "border-[1.5px] border-line bg-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-[60px] shrink-0 cursor-pointer items-center"
    >
      <span
        className={cx("flex h-8 w-[52px] items-center rounded-full p-1 transition-colors", checked ? "bg-accent justify-end" : "justify-start bg-ink-3")}
      >
        <span className="h-6 w-6 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet
// ---------------------------------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  role = "dialog",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="animate-fade fixed inset-0 z-50 flex flex-col justify-end bg-[var(--scrim)]" onClick={onClose}>
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet pb-safe mx-auto flex max-h-[92dvh] w-full max-w-[480px] flex-col gap-[18px] overflow-y-auto rounded-t-[32px] bg-bg px-5 pt-3 outline-none"
      >
        <span className="h-[5px] w-10 shrink-0 self-center rounded-full bg-line" />
        {title !== undefined && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[28px] leading-tight">{title}</h2>
              {subtitle && <span className="text-[13px] text-ink-2">{subtitle}</span>}
            </div>
            <IconButton icon="close" label="Close" onClick={onClose} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toasts: dark pill above the tab bar.
// ---------------------------------------------------------------------------

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string) => {
    setMsg({ text, key: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2400);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-6 bottom-[108px] z-[60] mx-auto flex max-w-[420px] justify-center">
        {msg && (
          <div
            key={msg.key}
            role="status"
            className="animate-fade flex h-[52px] items-center gap-2.5 rounded-full bg-[#2A2233] px-5 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(42,34,51,0.25)]"
          >
            <span className="bg-accent flex h-6 w-6 items-center justify-center rounded-full">
              <Icon name="check" size={14} strokeWidth={3} />
            </span>
            {msg.text}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex justify-center py-16">
      <span className="sr-only">{label}</span>
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-hairline border-t-[var(--a2)]" />
    </div>
  );
}
