/**
 * Ratings are stored as an integer 1..10 (stars * 2) so half-stars need no
 * floating-point. This module is the single source of truth for conversions.
 */

export const MIN_RATING = 1; // 0.5 stars
export const MAX_RATING = 10; // 5 stars

/** Stored int (1..10) -> star value (0.5..5). */
export function ratingToStars(value: number): number {
  return value / 2;
}

/** Star value (0.5..5, half-step) -> stored int (1..10). */
export function starsToRating(stars: number): number {
  return Math.round(stars * 2);
}

export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING;
}

/** Clamp any numeric input to a valid stored rating, or null if out of usable range. */
export function clampRating(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_RATING) return null;
  return Math.min(rounded, MAX_RATING);
}

/** "★★★½" style display for a stored rating. */
export function ratingLabel(value: number): string {
  const stars = ratingToStars(value);
  const full = Math.floor(stars);
  const half = stars % 1 !== 0;
  return "★".repeat(full) + (half ? "½" : "");
}

/** Average of stored ratings, rounded to 1 decimal on the 0.5..5 star scale. */
export function averageStars(ratings: number[]): number | null {
  const rated = ratings.filter((r) => isValidRating(r));
  if (rated.length === 0) return null;
  const mean = rated.reduce((a, b) => a + b, 0) / rated.length;
  return Math.round(ratingToStars(mean) * 10) / 10;
}
