import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { WORK_SOURCES, type WorkSource } from "@/db/schema";
import { getMediaDetail } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { upsertWork } from "@/lib/services/works";

export const dynamic = "force-dynamic";

/** Imports an external work (fetch detail → upsert) then redirects to its page. */
export default async function ResolveWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; id?: string }>;
}) {
  const { source, id } = await searchParams;
  if (!source || !id || !WORK_SOURCES.includes(source as WorkSource)) redirect("/");

  const db = getDb();
  const limited = await rateLimit(db, `resolve:${await clientIp()}`, 30, 60 * 1000);
  if (!limited.ok) redirect("/");

  const { env } = getCloudflareContext();
  const detail = await getMediaDetail(source as WorkSource, id!, { tmdbBearer: env.TMDB_BEARER });
  const work = await upsertWork(db, detail);
  redirect(`/work/${work.slug}`);
}
