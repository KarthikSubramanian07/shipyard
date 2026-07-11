import { desc, eq } from "drizzle-orm";
import type { DB } from "@/db";
import { reactions, users } from "@/db/schema";
import { newId } from "@/lib/id";
import { recordActivity } from "./activity";

export async function createReaction(
  db: DB,
  userId: string,
  workId: string,
  body: string,
): Promise<string> {
  const id = newId();
  await db.insert(reactions).values({ id, userId, workId, body: body.trim() });
  await recordActivity(db, { userId, kind: "reaction", entityId: id, workId });
  return id;
}

export async function getReactionsForWork(db: DB, workId: string, limit = 30) {
  return db
    .select({
      reaction: reactions,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
      },
    })
    .from(reactions)
    .innerJoin(users, eq(reactions.userId, users.id))
    .where(eq(reactions.workId, workId))
    .orderBy(desc(reactions.createdAt))
    .limit(limit);
}
