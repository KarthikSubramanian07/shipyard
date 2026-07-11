import { Star } from "lucide-react";

/** Ten half-star buckets (rating 1..10). A compact Letterboxd-style histogram. */
export function RatingHistogram({ buckets }: { buckets: number[] }) {
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const max = Math.max(...buckets, 1);

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-0.5">
          <Star className="fill-flare text-flare size-3" /> ratings
        </span>
        <span>{total.toLocaleString()} rated</span>
      </div>
      <div className="flex h-20 items-end gap-1">
        {buckets.map((count, i) => (
          <div
            key={i}
            className="bg-flare/70 hover:bg-flare flex-1 rounded-t transition-colors"
            style={{ height: `${Math.max(3, (count / max) * 100)}%` }}
            title={`${(i + 1) / 2} stars · ${count}`}
          />
        ))}
      </div>
      <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px]">
        <span>½</span>
        <span>★★★</span>
        <span>★★★★★</span>
      </div>
    </div>
  );
}
