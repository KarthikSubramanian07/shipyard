import { and, desc, eq } from "drizzle-orm";
import type { DB } from "@/db";
import { newId } from "@/lib/id";
import { shelfItems, shelves, works } from "@/db/schema";

export const DEFAULT_SHELVES = [
  { name: "Watched", slug: "watched" },
  { name: "Reading", slug: "reading" },
  { name: "Want to Watch", slug: "want" },
  { name: "Favorites", slug: "favorites" },
] as const;

export async function ensureDefaultShelves(db: DB, userId: string): Promise<void> {
  await db
    .insert(shelves)
    .values(
      DEFAULT_SHELVES.map((s, i) => ({
        id: newId(),
        userId,
        name: s.name,
        slug: s.slug,
        isDefault: true,
        position: i,
      })),
    )
    .onConflictDoNothing();
}

export async function getUserShelves(db: DB, userId: string) {
  return db.select().from(shelves).where(eq(shelves.userId, userId)).orderBy(shelves.position);
}

export async function addToShelf(
  db: DB,
  userId: string,
  shelfSlug: string,
  workId: string,
): Promise<boolean> {
  const shelf = await db
    .select({ id: shelves.id })
    .from(shelves)
    .where(and(eq(shelves.userId, userId), eq(shelves.slug, shelfSlug)))
    .get();
  if (!shelf) return false;
  await db.insert(shelfItems).values({ shelfId: shelf.id, workId }).onConflictDoNothing();
  return true;
}

export async function removeFromShelf(
  db: DB,
  userId: string,
  shelfSlug: string,
  workId: string,
): Promise<void> {
  const shelf = await db
    .select({ id: shelves.id })
    .from(shelves)
    .where(and(eq(shelves.userId, userId), eq(shelves.slug, shelfSlug)))
    .get();
  if (!shelf) return;
  await db
    .delete(shelfItems)
    .where(and(eq(shelfItems.shelfId, shelf.id), eq(shelfItems.workId, workId)));
}

/** Works on a given shelf, most-recently-added first, with work metadata. */
export async function getShelfWorks(db: DB, userId: string, shelfSlug: string, limit = 60) {
  return db
    .select({ work: works, addedAt: shelfItems.addedAt })
    .from(shelfItems)
    .innerJoin(shelves, eq(shelfItems.shelfId, shelves.id))
    .innerJoin(works, eq(shelfItems.workId, works.id))
    .where(and(eq(shelves.userId, userId), eq(shelves.slug, shelfSlug)))
    .orderBy(desc(shelfItems.addedAt))
    .limit(limit);
}
