import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { logs, works, type Work } from "@/db/schema";
import { newId } from "@/lib/id";
import type { MediaDetail } from "@/lib/media/types";
import { uniqueSlug, workSlug } from "@/lib/slug";

/**
 * Save (or return the existing) lightweight reference for an external work.
 * Idempotent on (source, external_id).
 */
export async function upsertWork(db: DB, detail: MediaDetail): Promise<Work> {
  const existing = await db
    .select()
    .from(works)
    .where(and(eq(works.source, detail.source), eq(works.externalId, detail.externalId)))
    .get();
  if (existing) return existing;

  let slug = workSlug(detail.title, detail.year);
  const clash = await db.select({ id: works.id }).from(works).where(eq(works.slug, slug)).get();
  if (clash) slug = uniqueSlug(detail.title, newId());

  const inserted = await db
    .insert(works)
    .values({
      id: newId(),
      source: detail.source,
      externalId: detail.externalId,
      type: detail.type,
      slug,
      title: detail.title,
      year: detail.year,
      posterUrl: detail.posterUrl,
      synopsis: detail.synopsis,
      metadata: detail.metadata,
    })
    .onConflictDoNothing()
    .returning()
    .get();

  if (inserted) return inserted;
  // Lost a race — fetch the row the other writer created.
  return (await db
    .select()
    .from(works)
    .where(and(eq(works.source, detail.source), eq(works.externalId, detail.externalId)))
    .get())!;
}

export async function getWorkBySlug(db: DB, slug: string): Promise<Work | undefined> {
  return db.select().from(works).where(eq(works.slug, slug)).get();
}

export async function getWorkById(db: DB, id: string): Promise<Work | undefined> {
  return db.select().from(works).where(eq(works.id, id)).get();
}

export interface WorkAggregate {
  /** Mean rating on the 0.5–5 star scale, or null when unrated. */
  averageStars: number | null;
  ratingCount: number;
}

export async function getWorkAggregate(db: DB, workId: string): Promise<WorkAggregate> {
  const row = await db
    .select({
      avg: sql<number | null>`avg(${logs.rating})`,
      cnt: count(logs.rating),
    })
    .from(logs)
    .where(and(eq(logs.workId, workId), isNotNull(logs.rating)))
    .get();

  const avg = row?.avg ?? null;
  return {
    averageStars: avg == null ? null : Math.round((avg / 2) * 10) / 10,
    ratingCount: row?.cnt ?? 0,
  };
}
