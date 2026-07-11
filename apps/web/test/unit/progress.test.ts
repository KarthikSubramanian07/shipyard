import { describe, expect, it } from "vitest";
import { formatProgress, isAheadOfViewer, progressUnit } from "@/lib/progress";

describe("progressUnit / formatProgress", () => {
  it("uses seasons for tv, parts for books, nothing for film", () => {
    expect(progressUnit("tv")).toBe("season");
    expect(progressUnit("book")).toBe("part");
    expect(progressUnit("film")).toBe(null);
    expect(formatProgress("tv", 3)).toBe("Season 3");
    expect(formatProgress("book", 2)).toBe("Part 2");
    expect(formatProgress("film", 1)).toBe("");
    expect(formatProgress("tv", 0)).toBe("");
  });
});

describe("isAheadOfViewer", () => {
  it("hides only when the review is past the viewer's position", () => {
    expect(isAheadOfViewer(3, 2)).toBe(true); // review covers S3, viewer on S2
    expect(isAheadOfViewer(3, 3)).toBe(false); // caught up
    expect(isAheadOfViewer(3, 5)).toBe(false); // ahead of the review
    expect(isAheadOfViewer(3, null)).toBe(true); // no progress set -> treat as 0
    expect(isAheadOfViewer(null, 0)).toBe(false); // review has no scope
    expect(isAheadOfViewer(0, 0)).toBe(false);
  });
});
