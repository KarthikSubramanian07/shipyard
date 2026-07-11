import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { DB } from "@/db";
import { logs, users, works, type Log } from "@/db/schema";
import { newId } from "@/lib/id";
import { recordActivity } from "./activity";

export interface LogInput {
  userId: string;
  workId: string;
  rating?: number | null;
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

  const values = {
    rating: input.rating ?? null,
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
