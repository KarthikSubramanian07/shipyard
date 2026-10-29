import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { getSitemapEntries } from "@/lib/services/sitemap";
import { absoluteUrl } from "@/lib/site";

// Built from D1 on each request so new works, fics and lists show up at once.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries(getDb());
  const now = new Date();
  return entries.map((e) => ({
    url: absoluteUrl(e.path),
    lastModified: e.lastModified ?? now,
  }));
}
