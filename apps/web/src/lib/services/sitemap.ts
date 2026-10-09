import { desc, isNotNull } from "drizzle-orm";
import type { DB } from "@/db";
import { fics, lists, users, works } from "@/db/schema";

export interface SitemapEntry {
  path: string;
  lastModified?: Date;
}

/** Hard ceiling per section, keeping the whole sitemap under the 50k-URL limit. */
const PER_SECTION = 10_000;

/** Static, always-public pages. Auth screens are excluded on purpose. */
export const STATIC_PATHS = ["/", "/discover", "/search", "/about", "/contact", "/privacy"];

/** Every public, indexable URL with its last-modified date. */
export async function getSitemapEntries(db: DB): Promise<SitemapEntry[]> {
  const [workRows, ficRows, listRows, userRows] = await Promise.all([
    db
      .select({ slug: works.slug, at: works.createdAt })
      .from(works)
      .orderBy(desc(works.createdAt))
      .limit(PER_SECTION),
    db
      .select({ slug: fics.slug, at: fics.updatedAt })
      .from(fics)
      .where(isNotNull(fics.publishedAt))
      .orderBy(desc(fics.updatedAt))
      .limit(PER_SECTION),
    db
      .select({ slug: lists.slug, at: lists.updatedAt })
      .from(lists)
      .orderBy(desc(lists.updatedAt))
      .limit(PER_SECTION),
    db
      .select({ username: users.username, at: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(PER_SECTION),
  ]);

  return [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...workRows.map((r) => ({ path: `/work/${r.slug}`, lastModified: r.at })),
    ...ficRows.map((r) => ({ path: `/fic/${r.slug}`, lastModified: r.at })),
    ...listRows.map((r) => ({ path: `/list/${r.slug}`, lastModified: r.at })),
    ...userRows.map((r) => ({ path: `/u/${encodeURIComponent(r.username)}`, lastModified: r.at })),
  ];
}
