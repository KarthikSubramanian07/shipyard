import { and, eq, sql } from "drizzle-orm";
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

/* ── Likes ────────────────────────────────────────────────────────────────── */

const LIKE_COUNTER = {
  log: logs,
  reaction: reactions,
  list: lists,
} as const;

function bumpLikeCounter(db: DB, entityType: EntityType, entityId: string, delta: number) {
  const table = LIKE_COUNTER[entityType as keyof typeof LIKE_COUNTER];
  if (!table) return;
  return db
    .update(table)
    .set({ likeCount: sql`max(0, ${table.likeCount} + ${delta})` })
    .where(eq(table.id, entityId));
}

/** Toggle a like. Returns the resulting liked state. */
export async function toggleLike(
  db: DB,
  userId: string,
  entityType: EntityType,
  entityId: string,
): Promise<boolean> {
  const existing = await db
    .select({ u: likes.userId })
    .from(likes)
    .where(
      and(eq(likes.userId, userId), eq(likes.entityType, entityType), eq(likes.entityId, entityId)),
    )
    .get();

  if (existing) {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.entityType, entityType),
          eq(likes.entityId, entityId),
        ),
      );
    await bumpLikeCounter(db, entityType, entityId, -1);
    return false;
  }

  await db.insert(likes).values({ userId, entityType, entityId });
  await bumpLikeCounter(db, entityType, entityId, 1);
  return true;
}

export async function hasLiked(
  db: DB,
  userId: string,
  entityType: EntityType,
  entityId: string,
): Promise<boolean> {
  const row = await db
    .select({ u: likes.userId })
    .from(likes)
    .where(
      and(eq(likes.userId, userId), eq(likes.entityType, entityType), eq(likes.entityId, entityId)),
    )
    .get();
  return !!row;
}

/* ── Comments (one level of threading) ───────────────────────────────────── */

// Only log & fic carry a commentCount column; lists/reactions are skipped.
const COMMENT_COUNTER = { log: logs, fic: fics } as const;

export async function addComment(
  db: DB,
  input: {
    userId: string;
    entityType: EntityType;
    entityId: string;
    body: string;
    parentId?: string | null;
    ownerId?: string | null;
  },
): Promise<string> {
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

  if (input.ownerId) {
    await notify(db, {
      userId: input.ownerId,
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
