import { or, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { lists, users } from "@/db/schema";

export interface SearchWorkRow {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  type: string;
}

export interface SearchFicRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
}

const FTS_MAX_INPUT = 100;
const FTS_MAX_TOKENS = 10;

/** Escape `%` and `_` so user input cannot broaden SQLite LIKE patterns. */
export function escapeLike(input: string): string {
  return input.replace(/([%_\\])/g, "\\$1");
}

/**
 * Turn free text into a safe FTS5 MATCH expression: each token quoted (so
 * punctuation can't break the query) with a trailing `*` for prefix search.
 */
export function toFtsMatch(input: string): string | null {
  const clipped = input.slice(0, FTS_MAX_INPUT);
  const tokens = (clipped.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, FTS_MAX_TOKENS);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(" ");
}

export async function searchWorks(db: DB, query: string, limit = 10): Promise<SearchWorkRow[]> {
  const match = toFtsMatch(query);
  if (!match) return [];
  return db.all<SearchWorkRow>(sql`
    SELECT w.id AS id, w.slug AS slug, w.title AS title, w.year AS year,
           w.poster_url AS posterUrl, w.type AS type
    FROM works_fts f
    JOIN works w ON w.id = f.work_id
    WHERE works_fts MATCH ${match}
    ORDER BY rank
    LIMIT ${limit}
  `);
}

export async function searchFics(db: DB, query: string, limit = 10): Promise<SearchFicRow[]> {
  const match = toFtsMatch(query);
  if (!match) return [];
  return db.all<SearchFicRow>(sql`
    SELECT c.id AS id, c.slug AS slug, c.title AS title, c.summary AS summary
    FROM fics_fts f
    JOIN fics c ON c.id = f.fic_id
    WHERE fics_fts MATCH ${match} AND c.published_at IS NOT NULL
    ORDER BY rank
    LIMIT ${limit}
  `);
}

export async function searchUsers(db: DB, query: string, limit = 6) {
  const q = `%${escapeLike(query.toLowerCase())}%`;
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarKey: users.avatarKey,
    })
    .from(users)
    .where(
      or(
        sql`lower(${users.username}) LIKE ${q} ESCAPE '\\'`,
        sql`lower(${users.displayName}) LIKE ${q} ESCAPE '\\'`,
      ),
    )
    .limit(limit);
}

export async function searchLists(db: DB, query: string, limit = 6) {
  const q = `%${escapeLike(query.toLowerCase())}%`;
  return db
    .select({ id: lists.id, slug: lists.slug, title: lists.title, itemCount: lists.itemCount })
    .from(lists)
    .where(sql`lower(${lists.title}) LIKE ${q} ESCAPE '\\'`)
    .limit(limit);
}

export async function searchAll(db: DB, query: string) {
  const [works, fics, people, listResults] = await Promise.all([
    searchWorks(db, query, 12),
    searchFics(db, query, 8),
    searchUsers(db, query, 6),
    searchLists(db, query, 6),
  ]);
  return { works, fics, users: people, lists: listResults };
}
