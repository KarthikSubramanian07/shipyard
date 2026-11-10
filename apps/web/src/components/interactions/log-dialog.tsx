"use client";

import { Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { submitLog } from "@/app/actions/content";
import { Button } from "@/components/ui/button";
import { ModalPanel } from "@/components/ui/dialog";
import type { WorkType } from "@/db/schema";
import type { Bucket } from "@/lib/stack";
import { progressNoun } from "@/lib/progress";
import { StackRating, type StackValue } from "./stack-rating";

interface InitialLog {
  bucket: Bucket | null;
  score: number | null;
  spoilerUpTo: number | null;
  reaction: string | null;
  reviewBody: string | null;
  hasSpoilers: boolean;
}

export function LogDialog({
  workId,
  workTitle,
  workType,
  initial,
  triggerLabel = "Log or rate",
  triggerVariant = "primary",
}: {
  workId: string;
  workTitle: string;
  workType: WorkType;
  initial?: InitialLog | null;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<StackValue | null>(
    initial?.bucket && initial?.score != null
      ? { bucket: initial.bucket, score: initial.score }
      : null,
  );
  const [reaction, setReaction] = useState(initial?.reaction ?? "");
  const [spoilerUpTo, setSpoilerUpTo] = useState(
    initial?.spoilerUpTo != null ? String(initial.spoilerUpTo) : "",
  );
  const spoilerNoun = progressNoun(workType);
  const [reviewBody, setReviewBody] = useState(initial?.reviewBody ?? "");
  const [hasSpoilers, setHasSpoilers] = useState(initial?.hasSpoilers ?? false);
  const [showReview, setShowReview] = useState(Boolean(initial?.reviewBody));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const titleId = useId();
  const reviewRef = useRef<HTMLTextAreaElement>(null);
  const [reviewRequested, setReviewRequested] = useState(false);

  // "Write a full review" swaps itself for the review box, so carry focus there.
  useEffect(() => {
    if (reviewRequested) reviewRef.current?.focus();
  }, [reviewRequested]);

  function save() {
    setError(null);
    const fd = new FormData();
    if (stack) {
      fd.set("bucket", stack.bucket);
      fd.set("score", String(stack.score));
    }
    if (reaction.trim()) fd.set("reaction", reaction.trim());
    if (showReview && reviewBody.trim()) fd.set("reviewBody", reviewBody.trim());
    if (hasSpoilers) fd.set("hasSpoilers", "on");
    if (showReview && spoilerUpTo && Number(spoilerUpTo) > 0) fd.set("spoilerUpTo", spoilerUpTo);
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
        <Star className="fill-current" aria-hidden="true" /> {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <ModalPanel
            onClose={() => setOpen(false)}
            labelledBy={titleId}
            className="border-border bg-card max-h-full w-full max-w-lg overflow-y-auto rounded-t-2xl border shadow-xl sm:rounded-2xl"
          >
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Logging</p>
                <h2 id={titleId} className="font-display line-clamp-1 text-lg font-semibold">
                  <span className="sr-only">Logging </span>
                  {workTitle}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2">
                <p id={`${titleId}-stack`} className="text-sm font-medium">
                  Where does it stack up?
                </p>
                <StackRating
                  workId={workId}
                  workTitle={workTitle}
                  workType={workType}
                  value={stack}
                  onChange={setStack}
                  labelledBy={`${titleId}-stack`}
                />
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
                    Review{" "}
                    <span className="text-muted-foreground">
                      (wrap spoilers in {">"}!like this!{"<"})
                    </span>
                  </label>
                  <textarea
                    ref={reviewRef}
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
                      className="accent-[var(--flare)] size-4"
                      checked={hasSpoilers}
                      onChange={(e) => setHasSpoilers(e.target.checked)}
                    />
                    Contains spoilers
                  </label>
                  {spoilerNoun ? (
                    <label className="text-muted-foreground flex items-center gap-2 text-sm">
                      Discusses up to {spoilerNoun.toLowerCase()}
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={spoilerUpTo}
                        onChange={(e) => setSpoilerUpTo(e.target.value)}
                        placeholder="—"
                        aria-describedby={`${titleId}-blur`}
                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 h-8 w-16 rounded-lg border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                      />
                      <span id={`${titleId}-blur`} className="text-xs">
                        (blurs for readers who aren&apos;t there yet)
                      </span>
                    </label>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowReview(true);
                    setReviewRequested(true);
                  }}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  + Write a full review
                </button>
              )}

              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="border-border flex items-center justify-end gap-3 border-t px-5 py-4">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save log"}
              </Button>
            </div>
          </ModalPanel>
        </div>
      )}
    </>
  );
}
