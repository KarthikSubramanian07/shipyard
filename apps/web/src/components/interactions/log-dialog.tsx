"use client";

import { Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { submitLog } from "@/app/actions/content";
import { Button } from "@/components/ui/button";

interface InitialLog {
  rating: number | null;
  reaction: string | null;
  reviewBody: string | null;
  hasSpoilers: boolean;
}

/** Interactive half-star picker. `value` is the stored int (1..10). */
function StarInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const leftVal = i * 2 + 1;
          const rightVal = i * 2 + 2;
          const fill = Math.max(0, Math.min(2, active - i * 2));
          return (
            <div key={i} className="relative">
              <Star
                className="text-muted-foreground/30 size-8"
                fill={fill > 0 ? "var(--flare)" : "none"}
                stroke="var(--flare)"
                style={{ clipPath: fill === 1 ? "inset(0 50% 0 0)" : undefined }}
              />
              <button
                type="button"
                aria-label={`${(leftVal / 2).toFixed(1)} stars`}
                className="absolute inset-y-0 left-0 w-1/2"
                onMouseEnter={() => setHover(leftVal)}
                onClick={() => onChange(value === leftVal ? null : leftVal)}
              />
              <button
                type="button"
                aria-label={`${(rightVal / 2).toFixed(1)} stars`}
                className="absolute inset-y-0 right-0 w-1/2"
                onMouseEnter={() => setHover(rightVal)}
                onClick={() => onChange(value === rightVal ? null : rightVal)}
              />
            </div>
          );
        })}
      </div>
      <span className="text-muted-foreground w-10 text-sm font-medium tabular-nums">
        {active > 0 ? (active / 2).toFixed(1) : "—"}
      </span>
    </div>
  );
}

export function LogDialog({
  workId,
  workTitle,
  initial,
  triggerLabel = "Log or rate",
  triggerVariant = "primary",
}: {
  workId: string;
  workTitle: string;
  initial?: InitialLog | null;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [reaction, setReaction] = useState(initial?.reaction ?? "");
  const [reviewBody, setReviewBody] = useState(initial?.reviewBody ?? "");
  const [hasSpoilers, setHasSpoilers] = useState(initial?.hasSpoilers ?? false);
  const [showReview, setShowReview] = useState(Boolean(initial?.reviewBody));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function save() {
    setError(null);
    const fd = new FormData();
    if (rating != null) fd.set("rating", String(rating));
    if (reaction.trim()) fd.set("reaction", reaction.trim());
    if (showReview && reviewBody.trim()) fd.set("reviewBody", reviewBody.trim());
    if (hasSpoilers) fd.set("hasSpoilers", "on");
    start(async () => {
      const res = await submitLog(workId, fd);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong");
      }
    });
  }

  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        <Star className="fill-current" /> {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="border-border bg-card w-full max-w-lg rounded-t-2xl border shadow-xl sm:rounded-2xl">
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Logging</p>
                <h2 className="font-display line-clamp-1 text-lg font-semibold">{workTitle}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </Button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">Your rating</p>
                <StarInput value={rating} onChange={setRating} />
              </div>

              <div className="space-y-2">
                <label htmlFor="reaction" className="text-sm font-medium">
                  One-line reaction
                </label>
                <input
                  id="reaction"
                  value={reaction}
                  onChange={(e) => setReaction(e.target.value)}
                  maxLength={280}
                  placeholder="The 30-second take…"
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                />
              </div>

              {showReview ? (
                <div className="space-y-2">
                  <label htmlFor="review" className="text-sm font-medium">
                    Review <span className="text-muted-foreground">(markdown ok)</span>
                  </label>
                  <textarea
                    id="review"
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    rows={6}
                    placeholder="Say more…"
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                  />
                  <label className="text-muted-foreground flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasSpoilers}
                      onChange={(e) => setHasSpoilers(e.target.checked)}
                      className="accent-[var(--flare)]"
                    />
                    Contains spoilers
                  </label>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReview(true)}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  + Write a full review
                </button>
              )}

              {error ? <p className="text-destructive text-sm">{error}</p> : null}
            </div>

            <div className="border-border flex items-center justify-end gap-3 border-t px-5 py-4">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save log"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
