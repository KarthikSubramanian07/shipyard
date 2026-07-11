import { describe, expect, it } from "vitest";
import {
  averageStars,
  clampRating,
  isValidRating,
  ratingLabel,
  ratingToStars,
  starsToRating,
} from "@/lib/rating";

describe("rating conversions", () => {
  it("converts stored ints to stars and back", () => {
    expect(ratingToStars(10)).toBe(5);
    expect(ratingToStars(7)).toBe(3.5);
    expect(ratingToStars(1)).toBe(0.5);
    expect(starsToRating(4.5)).toBe(9);
    expect(starsToRating(2)).toBe(4);
  });

  it("validates the 1..10 range", () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(10)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(11)).toBe(false);
    expect(isValidRating(5.5)).toBe(false);
  });

  it("clamps input", () => {
    expect(clampRating(12)).toBe(10);
    expect(clampRating(0)).toBe(null);
    expect(clampRating(null)).toBe(null);
    expect(clampRating(NaN)).toBe(null);
    expect(clampRating(6)).toBe(6);
  });

  it("labels ratings with half-stars", () => {
    expect(ratingLabel(10)).toBe("★★★★★");
    expect(ratingLabel(7)).toBe("★★★½");
    expect(ratingLabel(1)).toBe("½");
  });

  it("averages ratings on the star scale", () => {
    expect(averageStars([])).toBe(null);
    expect(averageStars([10, 8])).toBe(4.5);
    expect(averageStars([10, 10, 10])).toBe(5);
    // ignores out-of-range values
    expect(averageStars([10, 99])).toBe(5);
  });
});
