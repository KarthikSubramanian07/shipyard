import type { WorkType } from "@/db/schema";

/** The unit of "how far are you?" per medium. Films are single-unit (no gate). */
export function progressUnit(type: WorkType): "season" | "part" | null {
  if (type === "tv") return "season";
  if (type === "book") return "part";
  return null;
}

export function progressNoun(type: WorkType): string {
  const u = progressUnit(type);
  return u === "season" ? "Season" : u === "part" ? "Part" : "";
}

/** Human label for a position, e.g. "Season 3" / "Part 2". Empty when N/A. */
export function formatProgress(type: WorkType, position: number): string {
  const noun = progressNoun(type);
  if (!noun || position <= 0) return "";
  return `${noun} ${position}`;
}

/**
 * Should a review be hidden from a viewer on progress grounds?
 * True when the review discusses events past where the viewer currently is.
 */
export function isAheadOfViewer(
  spoilerUpTo: number | null | undefined,
  viewerPosition: number | null | undefined,
): boolean {
  if (spoilerUpTo == null || spoilerUpTo <= 0) return false;
  return (viewerPosition ?? 0) < spoilerUpTo;
}
