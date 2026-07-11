import { cn } from "@/lib/utils";

/** The Shipyard mark: a flare-lit slipway launching a hull. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true" fill="none">
      <rect width="32" height="32" rx="8" fill="var(--flare)" />
      {/* hull + mast, launching upward */}
      <path
        d="M9 20.5h14l-2.4 3.2a2 2 0 0 1-1.6.8h-6a2 2 0 0 1-1.6-.8L9 20.5Z"
        fill="var(--primary-foreground)"
      />
      <path d="M16 6.5 20 18H12L16 6.5Z" fill="var(--primary-foreground)" opacity="0.92" />
    </svg>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("font-display text-xl font-semibold tracking-tight", textClassName)}>
        Shipyard
      </span>
    </span>
  );
}
