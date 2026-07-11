import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-label="Loading" />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-grain border-border flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="text-muted-foreground size-8" /> : null}
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** A dividing rule with an optional centered label. */
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn("border-border", className)} />;
  return (
    <div className={cn("text-muted-foreground flex items-center gap-3 text-xs", className)}>
      <span className="bg-border h-px flex-1" />
      <span className="uppercase tracking-wider">{label}</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
