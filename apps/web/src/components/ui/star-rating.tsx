import { cn } from "@/lib/utils";

function StarSvg({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
    </svg>
  );
}

/** Read-only star display. `stars` is on the 0–5 scale (halves allowed). */
export function Stars({
  stars,
  size = 16,
  className,
}: {
  stars: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${stars} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, stars - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <StarSvg
              className="text-muted-foreground/25 absolute inset-0"
              style={{ width: size, height: size }}
            />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarSvg className="text-flare" style={{ width: size, height: size }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingSummary({
  average,
  count,
  size = 18,
}: {
  average: number | null;
  count: number;
  size?: number;
}) {
  if (average == null) {
    return <span className="text-muted-foreground text-sm">Not yet rated</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Stars stars={average} size={size} />
      <span className="text-sm font-medium tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted-foreground text-sm">({count.toLocaleString()})</span>
    </span>
  );
}
