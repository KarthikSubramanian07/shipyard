import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Compact count: 1240 -> "1.2k", 2_000_000 -> "2M". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const m = n / 1_000_000;
  return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(n)} ${n === 1 ? singular : plural}`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 days ago", "just now" - deterministic given an explicit `now`. */
export function relativeTime(date: Date | number, now: Date | number = Date.now()): string {
  const then = typeof date === "number" ? date : date.getTime();
  const ref = typeof now === "number" ? now : now.getTime();
  const diffSeconds = Math.round((then - ref) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 45) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secs] of RELATIVE_UNITS) {
    if (abs >= secs) return rtf.format(Math.round(diffSeconds / secs), unit);
  }
  return "just now";
}

export function formatDate(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Count words in prose - used for fic length classification. */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export const FIC_LENGTHS = ["flash", "short", "long"] as const;
export type FicLength = (typeof FIC_LENGTHS)[number];

/** flash (<1k) / short (1k-10k) / long (10k+) per the spec. */
export function ficLength(words: number): FicLength {
  if (words < 1000) return "flash";
  if (words < 10_000) return "short";
  return "long";
}
