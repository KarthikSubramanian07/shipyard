/**
 * The Gauntlet - Shipyard's rating system. You triage into a bucket, then quick
 * head-to-head comparisons rank a title within that bucket. A 0-10 score is
 * derived (and mirrored to logs.rating for aggregates), surfaced as an S-F tier.
 */

import { GAUNTLET_BUCKETS } from "@/db/schema";

export const BUCKETS = GAUNTLET_BUCKETS;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_META: Record<Bucket, { label: string; band: [number, number] }> = {
  loved: { label: "Loved it", band: [7, 10] },
  fine: { label: "It was fine", band: [4, 6.9] },
  nope: { label: "Not for me", band: [0, 3.9] },
};

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

const TIER_BANDS: [Tier, number][] = [
  ["S", 9],
  ["A", 7.5],
  ["B", 6],
  ["C", 4],
  ["D", 2],
  ["F", 0],
];

export function tierForScore(score: number): Tier {
  for (const [tier, min] of TIER_BANDS) if (score >= min) return tier;
  return "F";
}

/**
 * Score for a new item inserted between an upper (better, higher-scored) and a
 * lower (worse) neighbor within a bucket. Nulls mean "top/bottom of the band".
 */
export function scoreForInsertion(
  bucket: Bucket,
  upper: number | null,
  lower: number | null,
): number {
  const [lo, hi] = BUCKET_META[bucket].band;
  const top = upper ?? hi;
  const bottom = lower ?? lo;
  const score = (top + bottom) / 2;
  return Math.min(hi, Math.max(lo, Math.round(score * 10) / 10));
}

/** Mirror a 0-10 Gauntlet score to the stored int rating (1-10, = stars*2). */
export function scoreToRating(score: number): number {
  return Math.min(10, Math.max(1, Math.round(score)));
}

/**
 * Binary-search insertion step. Given the sorted-desc opponent scores and the
 * current [lo, hi) search window plus the latest comparison outcome, return the
 * next window or the final insertion index. Pure, so the client can drive the
 * comparison UI deterministically.
 */
export function nextComparison(
  windowLo: number,
  windowHi: number,
): { mid: number; done: false } | { index: number; done: true } {
  if (windowLo >= windowHi) return { index: windowLo, done: true };
  return { mid: Math.floor((windowLo + windowHi) / 2), done: false };
}
