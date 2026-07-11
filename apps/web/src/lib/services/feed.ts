import { desc, eq, gte, inArray, count as sqlCount, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { activities, fics, follows, lists, logs, reactions, users, works } from "@/db/schema";

const authorCols = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarKey: users.avatarKey,
};

const feedSelection = {
  activity: activities,
  author: authorCols,
  work: works,
  log: logs,
  reaction: reactions,
  fic: fics,
  list: lists,
};

function feedQuery(db: DB) {
  return db
    .select(feedSelection)
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .leftJoin(works, eq(activities.workId, works.id))
    .leftJoin(logs, eq(logs.id, activities.entityId))
    .leftJoin(reactions, eq(reactions.id, activities.entityId))
    .leftJoin(fics, eq(fics.id, activities.entityId))
    .leftJoin(lists, eq(lists.id, activities.entityId));
}

export type FeedItem = Awaited<ReturnType<typeof feedQuery>>[number];

/** Chronological feed of the people a user follows (plus their own activity). */
export async function getFollowingFeed(db: DB, userId: string, limit = 40): Promise<FeedItem[]> {
  const followees = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));
  const ids = [userId, ...followees.map((f) => f.id)];

  return feedQuery(db)
    .where(inArray(activities.userId, ids))
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}

/** Site-wide recent activity — powers the logged-out home + discovery. */
export async function getGlobalFeed(db: DB, limit = 40): Promise<FeedItem[]> {
  return feedQuery(db).orderBy(desc(activities.createdAt)).limit(limit);
}

/** Works logged most in the trailing window — "trending this week". */
export async function getTrendingWorks(db: DB, days = 14, limit = 12) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({ work: works, logCount: sqlCount(logs.id) })
    .from(logs)
    .innerJoin(works, eq(logs.workId, works.id))
    .where(gte(logs.createdAt, cutoff))
    .groupBy(works.id)
    .orderBy(desc(sqlCount(logs.id)))
    .limit(limit);
}

/** "Also liked" — works highly rated by people who also rated this work highly. */
export async function getAlsoLiked(db: DB, workId: string, limit = 8) {
  const rows = await db.all<{
    id: string;
    slug: string;
    title: string;
    poster_url: string | null;
    type: string;
    overlap: number;
  }>(
    sql`
      SELECT w.id, w.slug, w.title, w.poster_url, w.type, COUNT(*) as overlap
      FROM logs a
      JOIN logs b ON a.user_id = b.user_id AND b.work_id != a.work_id
      JOIN works w ON w.id = b.work_id
      WHERE a.work_id = ${workId} AND a.rating >= 8 AND b.rating >= 8
      GROUP BY w.id
      ORDER BY overlap DESC
      LIMIT ${limit}
    `,
  );
  return rows;
}
