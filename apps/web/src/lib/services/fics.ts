import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { ficChapters, ficSubscriptions, ficTags, fics, kudos, users, works } from "@/db/schema";
import { newId } from "@/lib/id";
import { uniqueSlug } from "@/lib/slug";
import { wordCount } from "@/lib/utils";
import type { FicInput } from "@/lib/validation";
import { recordActivity } from "./activity";
import { notify } from "./notifications";

export async function createFic(
  db: DB,
  userId: string,
  workId: string,
  input: FicInput,
  inspiredByFicId?: string | null,
): Promise<{ id: string; slug: string }> {
  const id = newId();
  const slug = uniqueSlug(input.title, id);
  const words = wordCount(input.body);
  const now = new Date();

  await db.insert(fics).values({
    id,
    userId,
    workId,
    title: input.title,
    slug,
    summary: input.summary ?? null,
    type: input.type,
    rating: input.rating,
    canon: input.canon,
    isComplete: false,
    wordCount: words,
    chapterCount: 1,
    inspiredByFicId: inspiredByFicId ?? null,
    publishedAt: now,
    updatedAt: now,
  });

  await db.insert(ficChapters).values({
    id: newId(),
    ficId: id,
    idx: 0,
    title: input.chapterTitle ?? null,
    body: input.body,
    wordCount: words,
    publishedAt: now,
  });

  const tags = [
    ...input.tone.map((tag) => ({ ficId: id, kind: "tone" as const, tag })),
    ...(input.pairing ? [{ ficId: id, kind: "pairing" as const, tag: input.pairing }] : []),
  ];
  if (tags.length) await db.insert(ficTags).values(tags).onConflictDoNothing();

  await recordActivity(db, { userId, kind: "fic", entityId: id, workId });
  return { id, slug };
}

export async function addChapter(
  db: DB,
  ficId: string,
  input: { title?: string | null; body: string },
): Promise<string> {
  const fic = await db.select().from(fics).where(eq(fics.id, ficId)).get();
  if (!fic) throw new Error("Fic not found");

  const words = wordCount(input.body);
  const chapterId = newId();
  const now = new Date();

  await db.insert(ficChapters).values({
    id: chapterId,
    ficId,
    idx: fic.chapterCount,
    title: input.title ?? null,
    body: input.body,
    wordCount: words,
    publishedAt: now,
  });

  await db
    .update(fics)
    .set({
      chapterCount: fic.chapterCount + 1,
      wordCount: fic.wordCount + words,
      updatedAt: now,
    })
    .where(eq(fics.id, ficId));

  // Notify subscribers of the new chapter (the WIP retention loop).
  const subs = await db
    .select({ userId: ficSubscriptions.userId })
    .from(ficSubscriptions)
    .where(eq(ficSubscriptions.ficId, ficId));
  for (const s of subs) {
    await notify(db, {
      userId: s.userId,
      type: "chapter",
      actorId: fic.userId,
      entityType: "fic",
      entityId: ficId,
    });
  }
  return chapterId;
}

export async function getFicBySlug(db: DB, slug: string) {
  return db
    .select({
      fic: fics,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
      },
      work: works,
    })
    .from(fics)
    .innerJoin(users, eq(fics.userId, users.id))
    .innerJoin(works, eq(fics.workId, works.id))
    .where(eq(fics.slug, slug))
    .get();
}

export async function getFicChapters(db: DB, ficId: string) {
  return db.select().from(ficChapters).where(eq(ficChapters.ficId, ficId)).orderBy(ficChapters.idx);
}

export async function getFicTags(db: DB, ficId: string) {
  return db.select().from(ficTags).where(eq(ficTags.ficId, ficId));
}

export async function getFicsForWork(db: DB, workId: string, limit = 30) {
  return db
    .select({
      fic: fics,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
      },
    })
    .from(fics)
    .innerJoin(users, eq(fics.userId, users.id))
    .where(and(eq(fics.workId, workId), sql`${fics.publishedAt} is not null`))
    .orderBy(desc(fics.kudosCount), desc(fics.publishedAt))
    .limit(limit);
}

export async function getUserFics(db: DB, userId: string, limit = 40) {
  return db
    .select({ fic: fics, work: works })
    .from(fics)
    .innerJoin(works, eq(fics.workId, works.id))
    .where(eq(fics.userId, userId))
    .orderBy(desc(fics.createdAt))
    .limit(limit);
}

/** Toggle a kudos (one per reader). Returns the resulting state. */
export async function toggleKudos(db: DB, userId: string, ficId: string): Promise<boolean> {
  const existing = await db
    .select({ u: kudos.userId })
    .from(kudos)
    .where(and(eq(kudos.userId, userId), eq(kudos.ficId, ficId)))
    .get();

  if (existing) {
    await db.delete(kudos).where(and(eq(kudos.userId, userId), eq(kudos.ficId, ficId)));
    await db
      .update(fics)
      .set({ kudosCount: sql`max(0, ${fics.kudosCount} - 1)` })
      .where(eq(fics.id, ficId));
    return false;
  }

  await db.insert(kudos).values({ userId, ficId });
  const fic = await db
    .update(fics)
    .set({ kudosCount: sql`${fics.kudosCount} + 1` })
    .where(eq(fics.id, ficId))
    .returning({ userId: fics.userId })
    .get();
  if (fic)
    await notify(db, {
      userId: fic.userId,
      type: "kudos",
      actorId: userId,
      entityType: "fic",
      entityId: ficId,
    });
  return true;
}

export async function hasKudos(db: DB, userId: string, ficId: string): Promise<boolean> {
  const row = await db
    .select({ u: kudos.userId })
    .from(kudos)
    .where(and(eq(kudos.userId, userId), eq(kudos.ficId, ficId)))
    .get();
  return !!row;
}

export async function toggleSubscription(db: DB, userId: string, ficId: string): Promise<boolean> {
  const existing = await db
    .select({ u: ficSubscriptions.userId })
    .from(ficSubscriptions)
    .where(and(eq(ficSubscriptions.userId, userId), eq(ficSubscriptions.ficId, ficId)))
    .get();
  if (existing) {
    await db
      .delete(ficSubscriptions)
      .where(and(eq(ficSubscriptions.userId, userId), eq(ficSubscriptions.ficId, ficId)));
    return false;
  }
  await db.insert(ficSubscriptions).values({ userId, ficId });
  return true;
}
