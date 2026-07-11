import { asc, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { listItems, lists, users, works } from "@/db/schema";
import { newId } from "@/lib/id";
import { uniqueSlug } from "@/lib/slug";
import { recordActivity } from "./activity";

export async function createList(
  db: DB,
  userId: string,
  input: { title: string; description?: string; isRanked?: boolean },
): Promise<{ id: string; slug: string }> {
  const id = newId();
  const slug = uniqueSlug(input.title, id);
  await db.insert(lists).values({
    id,
    userId,
    title: input.title,
    slug,
    description: input.description ?? null,
    isRanked: input.isRanked ?? false,
  });
  await recordActivity(db, { userId, kind: "list", entityId: id });
  return { id, slug };
}

export async function addListItem(
  db: DB,
  listId: string,
  workId: string,
  note?: string,
): Promise<void> {
  const list = await db
    .select({ itemCount: lists.itemCount })
    .from(lists)
    .where(eq(lists.id, listId))
    .get();
  if (!list) return;
  const inserted = await db
    .insert(listItems)
    .values({ id: newId(), listId, workId, position: list.itemCount, note: note ?? null })
    .onConflictDoNothing()
    .returning({ id: listItems.id })
    .get();
  if (inserted) {
    await db
      .update(lists)
      .set({ itemCount: sql`${lists.itemCount} + 1`, updatedAt: new Date() })
      .where(eq(lists.id, listId));
  }
}

export async function getListBySlug(db: DB, slug: string) {
  return db
    .select({
      list: lists,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
      },
    })
    .from(lists)
    .innerJoin(users, eq(lists.userId, users.id))
    .where(eq(lists.slug, slug))
    .get();
}

export async function getListItems(db: DB, listId: string) {
  return db
    .select({ item: listItems, work: works })
    .from(listItems)
    .innerJoin(works, eq(listItems.workId, works.id))
    .where(eq(listItems.listId, listId))
    .orderBy(asc(listItems.position));
}

export async function getUserLists(db: DB, userId: string, limit = 30) {
  return db
    .select()
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(desc(lists.updatedAt))
    .limit(limit);
}
