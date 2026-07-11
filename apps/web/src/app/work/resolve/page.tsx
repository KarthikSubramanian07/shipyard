import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { WORK_SOURCES, type WorkSource } from "@/db/schema";
import { getMediaDetail } from "@/lib/media";
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

  const { env } = getCloudflareContext();
  const detail = await getMediaDetail(source as WorkSource, id!, { tmdbBearer: env.TMDB_BEARER });
  const work = await upsertWork(getDb(), detail);
  redirect(`/work/${work.slug}`);
}
