import { describe, expect, it } from "vitest";
import { scoreForInsertion, scoreToRating, tierForScore } from "@/lib/gauntlet";

describe("tierForScore", () => {
  it("maps scores to tiers", () => {
    expect(tierForScore(9.5)).toBe("S");
    expect(tierForScore(8)).toBe("A");
    expect(tierForScore(6.5)).toBe("B");
    expect(tierForScore(5)).toBe("C");
    expect(tierForScore(3)).toBe("D");
    expect(tierForScore(1)).toBe("F");
    expect(tierForScore(0)).toBe("F");
  });
});

describe("scoreForInsertion", () => {
  it("uses the band midpoint with no neighbors", () => {
    // loved band [7,10] -> midpoint 8.5
    expect(scoreForInsertion("loved", null, null)).toBe(8.5);
    // fine band [4,6.9] -> ~5.45
    expect(scoreForInsertion("fine", null, null)).toBeCloseTo(5.5, 1);
  });

  it("interpolates between neighbors and clamps to the band", () => {
    expect(scoreForInsertion("loved", 9, 8)).toBe(8.5);
    // inserted above the best -> between neighbor and band top, never exceeds 10
    expect(scoreForInsertion("loved", null, 9.8)).toBeLessThanOrEqual(10);
    expect(scoreForInsertion("nope", 2, null)).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreToRating", () => {
  it("mirrors a 0-10 score to the stored int (clamped 1-10)", () => {
    expect(scoreToRating(8.5)).toBe(9);
    expect(scoreToRating(0)).toBe(1);
    expect(scoreToRating(10)).toBe(10);
    expect(scoreToRating(2.4)).toBe(2);
  });
});
