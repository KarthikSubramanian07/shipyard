import { and, count, eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { fics, follows, logs, users, works, type User } from "@/db/schema";
import { newId } from "@/lib/id";
import { ensureDefaultShelves } from "./shelves";

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash?: string | null;
  displayName?: string;
  googleId?: string | null;
  avatarKey?: string | null;
}

export async function createUser(db: DB, input: CreateUserInput): Promise<User> {
  const id = newId();
  const user = await db
    .insert(users)
    .values({
      id,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash ?? null,
      displayName: input.displayName?.trim() || input.username,
      googleId: input.googleId ?? null,
      avatarKey: input.avatarKey ?? null,
    })
    .returning()
    .get();
  await ensureDefaultShelves(db, id);
  return user;
}

export async function getUserByUsername(db: DB, username: string): Promise<User | undefined> {
  return db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.username})`, username.toLowerCase()))
    .get();
}

export async function getUserByEmail(db: DB, email: string): Promise<User | undefined> {
  return db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .get();
}

export async function getUserByGoogleId(db: DB, googleId: string): Promise<User | undefined> {
  return db.select().from(users).where(eq(users.googleId, googleId)).get();
}

export interface ProfileStats {
  films: number;
  tv: number;
  books: number;
  fics: number;
  wordsWritten: number;
  kudosReceived: number;
  followers: number;
  following: number;
}

export async function getProfileStats(db: DB, userId: string): Promise<ProfileStats> {
  const byType = await db
    .select({ type: works.type, c: count() })
    .from(logs)
    .innerJoin(works, eq(logs.workId, works.id))
    .where(eq(logs.userId, userId))
    .groupBy(works.type);

  const typeCount = (t: string) => byType.find((r) => r.type === t)?.c ?? 0;

  const ficAgg = await db
    .select({
      c: count(),
      words: sql<number | null>`sum(${fics.wordCount})`,
      kudos: sql<number | null>`sum(${fics.kudosCount})`,
    })
    .from(fics)
    .where(eq(fics.userId, userId))
    .get();

  const followerCount = await db
    .select({ c: count() })
    .from(follows)
    .where(eq(follows.followingId, userId))
    .get();

  const followingCount = await db
    .select({ c: count() })
    .from(follows)
    .where(eq(follows.followerId, userId))
    .get();

  return {
    films: typeCount("film"),
    tv: typeCount("tv"),
    books: typeCount("book"),
    fics: ficAgg?.c ?? 0,
    wordsWritten: ficAgg?.words ?? 0,
    kudosReceived: ficAgg?.kudos ?? 0,
    followers: followerCount?.c ?? 0,
    following: followingCount?.c ?? 0,
  };
}

export async function isFollowing(
  db: DB,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const row = await db
    .select({ f: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .get();
  return !!row;
}
