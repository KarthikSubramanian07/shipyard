import { and, count, desc, eq, isNotNull, ne } from "drizzle-orm";
import type { DB } from "@/db";
import { logs, users, works, type Log } from "@/db/schema";
import { scoreToRating, type Bucket } from "@/lib/stack";
import { newId } from "@/lib/id";
import { recordActivity } from "./activity";

export interface LogInput {
  userId: string;
  workId: string;
  rating?: number | null;
  bucket?: Bucket | null;
  score?: number | null;
  spoilerUpTo?: number | null;
  reaction?: string | null;
  reviewBody?: string | null;
  hasSpoilers?: boolean;
  loggedOn?: Date;
}

/** Create or update a user's single canonical log for a work. Returns its id. */
export async function upsertLog(db: DB, input: LogInput): Promise<string> {
  const existing = await db
    .select({ id: logs.id })
    .from(logs)
    .where(and(eq(logs.userId, input.userId), eq(logs.workId, input.workId)))
    .get();

  // The Stack score is the source of truth; mirror it to the int rating.
  const derivedRating = input.score != null ? scoreToRating(input.score) : (input.rating ?? null);

  const values = {
    rating: derivedRating,
    bucket: input.bucket ?? null,
    score: input.score ?? null,
    spoilerUpTo: input.spoilerUpTo ?? null,
    reaction: input.reaction?.trim() || null,
    reviewBody: input.reviewBody?.trim() || null,
    hasSpoilers: input.hasSpoilers ?? false,
    loggedOn: input.loggedOn ?? new Date(),
  };

  if (existing) {
    await db.update(logs).set(values).where(eq(logs.id, existing.id));
    return existing.id;
  }

  const id = newId();
  await db.insert(logs).values({ id, userId: input.userId, workId: input.workId, ...values });
  await recordActivity(db, {
    userId: input.userId,
    kind: values.reviewBody ? "review" : "log",
    entityId: id,
    workId: input.workId,
  });
  return id;
}

/**
 * A user's already-ranked works in a given medium + bucket, best first.
 * Powers The Stack's head-to-head comparisons (excludes the work being rated).
 */
export async function getRankedOpponents(
  db: DB,
  userId: string,
  workType: "film" | "tv" | "book",
  bucket: Bucket,
  excludeWorkId: string,
) {
  return db
    .select({
      workId: works.id,
      title: works.title,
      posterUrl: works.posterUrl,
      score: logs.score,
    })
    .from(logs)
    .innerJoin(works, eq(logs.workId, works.id))
    .where(
      and(
        eq(logs.userId, userId),
        eq(logs.bucket, bucket),
        eq(works.type, workType),
        isNotNull(logs.score),
        ne(logs.workId, excludeWorkId),
      ),
    )
    .orderBy(desc(logs.score))
    .limit(200);
}

/** Distribution of a user's ratings across the 10 half-star buckets (1..10). */
export async function getRatingHistogram(db: DB, userId: string): Promise<number[]> {
  const rows = await db
    .select({ rating: logs.rating, c: count() })
    .from(logs)
    .where(and(eq(logs.userId, userId), isNotNull(logs.rating)))
    .groupBy(logs.rating);
  const buckets = Array<number>(10).fill(0);
  for (const r of rows) {
    if (r.rating != null && r.rating >= 1 && r.rating <= 10) buckets[r.rating - 1] = r.c;
  }
  return buckets;
}

export async function getUserLogForWork(
  db: DB,
  userId: string,
  workId: string,
): Promise<Log | undefined> {
  return db
    .select()
    .from(logs)
    .where(and(eq(logs.userId, userId), eq(logs.workId, workId)))
    .get();
}

export async function deleteLog(db: DB, userId: string, logId: string): Promise<void> {
  await db.delete(logs).where(and(eq(logs.id, logId), eq(logs.userId, userId)));
}

const logWithAuthor = {
  log: logs,
  user: {
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    avatarKey: users.avatarKey,
  },
};

/** Reviews (logs with a body) for a work, newest first. */
export async function getReviewsForWork(db: DB, workId: string, limit = 20) {
  return db
    .select(logWithAuthor)
    .from(logs)
    .innerJoin(users, eq(logs.userId, users.id))
    .where(and(eq(logs.workId, workId), isNotNull(logs.reviewBody)))
    .orderBy(desc(logs.likeCount), desc(logs.createdAt))
    .limit(limit);
}

/** A user's recent logs with work metadata for their profile/diary. */
export async function getUserLogs(db: DB, userId: string, limit = 40) {
  return db
    .select({ log: logs, work: works })
    .from(logs)
    .innerJoin(works, eq(logs.workId, works.id))
    .where(eq(logs.userId, userId))
    .orderBy(desc(logs.createdAt))
    .limit(limit);
}
