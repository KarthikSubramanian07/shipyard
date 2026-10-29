import { and, count, eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import {
  comments,
  fics,
  follows,
  likes,
  lists,
  logs,
  reactions,
  users,
  type EntityType,
  type FlareKey,
} from "@/db/schema";
import { newId } from "@/lib/id";
import { notify } from "./notifications";

/* ── Follows ──────────────────────────────────────────────────────────────── */

export async function follow(db: DB, followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return;
  const res = await db
    .insert(follows)
    .values({ followerId, followingId })
    .onConflictDoNothing()
    .returning({ f: follows.followerId })
    .get();
  if (res) await notify(db, { userId: followingId, type: "follow", actorId: followerId });
}

export async function unfollow(db: DB, followerId: string, followingId: string): Promise<void> {
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
}

/* ── Flares (expressive reactions) ────────────────────────────────────────── */

// Tables that carry a denormalized total-flare counter (kept as `likeCount`).
const FLARE_COUNTER = {
  log: logs,
  reaction: reactions,
  list: lists,
} as const;

function bumpFlareCounter(db: DB, entityType: EntityType, entityId: string, delta: number) {
  const table = FLARE_COUNTER[entityType as keyof typeof FLARE_COUNTER];
  if (!table) return;
  return db
    .update(table)
    .set({ likeCount: sql`max(0, ${table.likeCount} + ${delta})` })
    .where(eq(table.id, entityId));
}

const flareWhere = (userId: string, entityType: EntityType, entityId: string) =>
  and(eq(likes.userId, userId), eq(likes.entityType, entityType), eq(likes.entityId, entityId));

/**
 * Set (or change, or clear) a user's flare on an entity. One flare per user per
 * entity. Pass `null` to remove. Returns the resulting flare (or null). The
 * total counter only moves when a flare is added or removed, not when changed.
 */
export async function setFlare(
  db: DB,
  userId: string,
  entityType: EntityType,
  entityId: string,
  flare: FlareKey | null,
): Promise<FlareKey | null> {
  const existing = await db
    .select({ flare: likes.flare })
    .from(likes)
    .where(flareWhere(userId, entityType, entityId))
    .get();

  if (flare === null) {
    if (existing) {
      await db.delete(likes).where(flareWhere(userId, entityType, entityId));
      await bumpFlareCounter(db, entityType, entityId, -1);
    }
    return null;
  }

  if (existing) {
    if (existing.flare !== flare) {
      await db
        .update(likes)
        .set({ flare })
        .where(flareWhere(userId, entityType, entityId));
    }
    return flare;
  }

  await db.insert(likes).values({ userId, entityType, entityId, flare });
  await bumpFlareCounter(db, entityType, entityId, 1);
  return flare;
}

export async function getFlare(
  db: DB,
  userId: string,
  entityType: EntityType,
  entityId: string,
): Promise<FlareKey | null> {
  const row = await db
    .select({ flare: likes.flare })
    .from(likes)
    .where(flareWhere(userId, entityType, entityId))
    .get();
  return row?.flare ?? null;
}

/** Per-flare tallies for an entity, e.g. { peak: 12, sob: 3 }. */
export async function getFlareCounts(
  db: DB,
  entityType: EntityType,
  entityId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ flare: likes.flare, c: count() })
    .from(likes)
    .where(and(eq(likes.entityType, entityType), eq(likes.entityId, entityId)))
    .groupBy(likes.flare);
  return Object.fromEntries(rows.map((r) => [r.flare, r.c]));
}

/* ── Comments (one level of threading) ───────────────────────────────────── */

// Only log & fic carry a commentCount column; lists/reactions are skipped.
const COMMENT_COUNTER = { log: logs, fic: fics } as const;

const COMMENT_OWNER = {
  log: logs,
  fic: fics,
  list: lists,
  reaction: reactions,
} as const;

export class CommentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentValidationError";
  }
}

/** Resolve the entity owner server-side; never trust a client-supplied ownerId. */
async function resolveCommentOwner(
  db: DB,
  entityType: EntityType,
  entityId: string,
): Promise<string | null> {
  const table = COMMENT_OWNER[entityType as keyof typeof COMMENT_OWNER];
  if (!table) {
    throw new CommentValidationError("Comments are not supported on this entity");
  }
  const row = await db
    .select({ userId: table.userId })
    .from(table)
    .where(eq(table.id, entityId))
    .get();
  if (!row) throw new CommentValidationError("Unknown entity");
  return row.userId;
}

export async function addComment(
  db: DB,
  input: {
    userId: string;
    entityType: EntityType;
    entityId: string;
    body: string;
    parentId?: string | null;
  },
): Promise<string> {
  const ownerId = await resolveCommentOwner(db, input.entityType, input.entityId);

  if (input.parentId) {
    const parent = await db
      .select({
        id: comments.id,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
      })
      .from(comments)
      .where(eq(comments.id, input.parentId))
      .get();
    if (
      !parent ||
      parent.entityType !== input.entityType ||
      parent.entityId !== input.entityId ||
      parent.parentId !== null
    ) {
      throw new CommentValidationError("Invalid parent comment");
    }
  }

  const id = newId();
  await db.insert(comments).values({
    id,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    parentId: input.parentId ?? null,
    body: input.body.trim(),
  });

  const table = COMMENT_COUNTER[input.entityType as keyof typeof COMMENT_COUNTER];
  if (table) {
    await db
      .update(table)
      .set({ commentCount: sql`${table.commentCount} + 1` })
      .where(eq(table.id, input.entityId));
  }

  if (ownerId && ownerId !== input.userId) {
    await notify(db, {
      userId: ownerId,
      type: "comment",
      actorId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }
  return id;
}

export async function getComments(db: DB, entityType: EntityType, entityId: string) {
  return db
    .select({
      comment: comments,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
    .orderBy(comments.createdAt);
}
