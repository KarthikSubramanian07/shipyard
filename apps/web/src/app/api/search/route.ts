import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { searchMedia } from "@/lib/media";
import { searchUsers } from "@/lib/services/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ media: [], users: [] });

  const { env } = getCloudflareContext();
  const [media, users] = await Promise.all([
    searchMedia(q, { tmdbBearer: env.TMDB_BEARER }).catch(() => []),
    searchUsers(getDb(), q, 5).catch(() => []),
  ]);

  return NextResponse.json(
    { media, users },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
