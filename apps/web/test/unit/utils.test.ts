import { describe, expect, it } from "vitest";
import { ficLength, formatCount, pluralize, relativeTime, wordCount } from "@/lib/utils";

describe("formatCount", () => {
  it("formats compactly", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1000)).toBe("1k");
    expect(formatCount(1240)).toBe("1.2k");
    expect(formatCount(12400)).toBe("12k");
    expect(formatCount(2_000_000)).toBe("2M");
  });
});

describe("pluralize", () => {
  it("pluralizes with counts", () => {
    expect(pluralize(1, "chapter")).toBe("1 chapter");
    expect(pluralize(3, "chapter")).toBe("3 chapters");
    expect(pluralize(2, "ch")).toBe("2 chs");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-07-11T12:00:00Z").getTime();
  it("handles recent and past", () => {
    expect(relativeTime(now, now)).toBe("just now");
    expect(relativeTime(now - 5 * 60 * 1000, now)).toBe("5 minutes ago");
    expect(relativeTime(now - 3 * 24 * 60 * 60 * 1000, now)).toBe("3 days ago");
  });
});

describe("wordCount + ficLength", () => {
  it("counts words", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("  ")).toBe(0);
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("hello\n\nworld  again")).toBe(3);
  });

  it("classifies length", () => {
    expect(ficLength(500)).toBe("flash");
    expect(ficLength(999)).toBe("flash");
    expect(ficLength(1000)).toBe("short");
    expect(ficLength(9999)).toBe("short");
    expect(ficLength(10_000)).toBe("long");
  });
});
