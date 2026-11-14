/** The Pace mark: a sunrise on the accent gradient. */
export function Logo({ size = 72 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="bg-accent flex items-center justify-center shadow-[0_12px_30px_rgba(42,34,51,0.15)]"
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <svg width={size * 0.47} height={size * 0.47} viewBox="0 0 24 24" fill="none" stroke="#2A2233" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16a8 8 0 0 1 16 0" />
        <path d="M12 4v3M5 8l2 2M19 8l-2 2" />
        <path d="M3 20h18" />
      </svg>
    </span>
  );
}
