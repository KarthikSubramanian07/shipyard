import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { rateLimits } from "@/db/schema";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Fixed-window rate limiter backed by D1 (KV's free write tier is too small).
 * `key` should namespace the action + subject, e.g. `login:1.2.3.4`.
 */
export async function rateLimit(
  db: DB,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).get();

  if (!existing || existing.resetAt.getTime() <= now) {
    const resetAt = new Date(now + windowMs);
    await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, resetAt } });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  await db
    .update(rateLimits)
    .set({ count: existing.count + 1 })
    .where(eq(rateLimits.key, key));
  return { ok: true, remaining: limit - existing.count - 1, resetAt: existing.resetAt };
}
