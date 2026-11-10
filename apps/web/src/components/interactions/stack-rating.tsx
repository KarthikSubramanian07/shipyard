"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getOpponentsAction, type Opponent } from "@/app/actions/stack";
import type { WorkType } from "@/db/schema";
import { BUCKET_META, scoreForInsertion, tierForScore, type Bucket } from "@/lib/stack";
import { cn } from "@/lib/utils";

export interface StackValue {
  bucket: Bucket;
  score: number;
}

const MAX_COMPARISONS = 5;
const BUCKET_STYLE: Record<Bucket, string> = {
  loved:
    "border-verdigris/50 hover:bg-verdigris-soft data-[on=true]:bg-verdigris data-[on=true]:text-secondary-foreground",
  fine: "border-brass/50 hover:bg-brass-soft data-[on=true]:bg-brass data-[on=true]:text-accent-foreground",
  nope: "border-border hover:bg-muted data-[on=true]:bg-muted-foreground data-[on=true]:text-background",
};

/** The Stack: pick a bucket, then rank via head-to-heads. Controlled. */
export function StackRating({
  workId,
  workTitle,
  workType,
  value,
  onChange,
  labelledBy,
}: {
  workId: string;
  workTitle: string;
  workType: WorkType;
  value: StackValue | null;
  onChange: (v: StackValue | null) => void;
  /** Id of the visible question that names the bucket choice. */
  labelledBy?: string;
}) {
  const [phase, setPhase] = useState<"pick" | "compare">("pick");
  const [bucket, setBucket] = useState<Bucket | null>(value?.bucket ?? null);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);
  const [comparisons, setComparisons] = useState(0);
  const [pending, start] = useTransition();
  const promptRef = useRef<HTMLParagraphElement>(null);
  const bucketsRef = useRef<HTMLDivElement>(null);
  const movedFocus = useRef(false);

  // The two phases swap whole button sets, so keep keyboard focus with the
  // question being asked instead of letting it fall back to the page (WCAG 2.4.3).
  useEffect(() => {
    if (!movedFocus.current) return;
    if (phase === "compare") promptRef.current?.focus();
    else bucketsRef.current?.querySelector<HTMLButtonElement>("[aria-pressed=true]")?.focus();
  }, [phase, lo, hi]);

  function finalize(b: Bucket, ops: Opponent[], index: number) {
    const upper = index > 0 ? (ops[index - 1]?.score ?? null) : null;
    const lower = ops[index]?.score ?? null;
    const score = scoreForInsertion(b, upper, lower);
    onChange({ bucket: b, score });
    setPhase("pick");
  }

  function pickBucket(b: Bucket) {
    setBucket(b);
    start(async () => {
      const ops = await getOpponentsAction(workType, b, workId);
      if (ops.length === 0) {
        finalize(b, ops, 0);
        return;
      }
      setOpponents(ops);
      setLo(0);
      setHi(ops.length);
      setComparisons(0);
      movedFocus.current = true;
      setPhase("compare");
    });
  }

  function choose(newIsBetter: boolean) {
    if (!bucket) return;
    const mid = Math.floor((lo + hi) / 2);
    const nextLo = newIsBetter ? lo : mid + 1;
    const nextHi = newIsBetter ? mid : hi;
    const nextCount = comparisons + 1;
    if (nextLo >= nextHi || nextCount >= MAX_COMPARISONS) {
      finalize(bucket, opponents, newIsBetter ? mid : nextLo);
      return;
    }
    setLo(nextLo);
    setHi(nextHi);
    setComparisons(nextCount);
  }

  if (phase === "compare" && bucket) {
    const mid = Math.floor((lo + hi) / 2);
    const opp = opponents[mid];
    return (
      <div className="border-border bg-muted/40 space-y-3 rounded-lg border p-3">
        <p
          ref={promptRef}
          id={`${workId}-compare`}
          tabIndex={-1}
          className="text-center text-sm font-medium outline-none"
        >
          Which did you like more?
          <span className="sr-only">
            {" "}
            Comparison {comparisons + 1} of at most {MAX_COMPARISONS}.
          </span>
        </p>
        <div role="group" aria-labelledby={`${workId}-compare`} className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => choose(true)}
            className="border-flare/50 bg-card hover:bg-flare-soft rounded-lg border px-3 py-3 text-sm font-medium"
          >
            {workTitle}
          </button>
          <button
            type="button"
            onClick={() => choose(false)}
            className="border-border bg-card hover:bg-muted rounded-lg border px-3 py-3 text-sm font-medium"
          >
            {opp?.title ?? "The other one"}
          </button>
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span aria-hidden="true">
            Comparison {comparisons + 1} of ≤{MAX_COMPARISONS}
          </span>
          <button
            type="button"
            onClick={() => finalize(bucket, opponents, Math.floor((lo + hi) / 2))}
            className="text-primary font-medium hover:underline"
          >
            Skip ranking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={bucketsRef} role="group" aria-labelledby={labelledBy} className="grid grid-cols-3 gap-2">
        {(Object.keys(BUCKET_META) as Bucket[]).map((b) => (
          <button
            key={b}
            type="button"
            disabled={pending}
            data-on={bucket === b}
            aria-pressed={bucket === b}
            onClick={() => pickBucket(b)}
            className={cn(
              "rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
              BUCKET_STYLE[b],
            )}
          >
            {BUCKET_META[b].label}
          </button>
        ))}
      </div>
      <div role="status">
      {value ? (
        <div className="flex items-center gap-2 text-sm">
          <TierBadge score={value.score} />
          <span className="text-muted-foreground">
            {value.score.toFixed(1)} / 10 · ranked in {BUCKET_META[value.bucket].label}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground ml-auto text-xs font-medium"
          >
            Clear
          </button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Triage it, then a couple of quick head-to-heads rank it.
        </p>
      )}
      </div>
    </div>
  );
}

export function TierBadge({ score, className }: { score: number; className?: string }) {
  const tier = tierForScore(score);
  const tone: Record<string, string> = {
    S: "bg-flare text-primary-foreground",
    A: "bg-verdigris text-secondary-foreground",
    B: "bg-brass text-accent-foreground",
    C: "bg-muted text-foreground",
    D: "bg-muted text-muted-foreground",
    F: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "font-display inline-flex size-7 items-center justify-center rounded-md text-sm font-bold",
        tone[tier],
        className,
      )}
      title={`Tier ${tier} · ${score.toFixed(1)}/10`}
    >
      <span className="sr-only">Tier </span>
      {tier}
    </span>
  );
}
