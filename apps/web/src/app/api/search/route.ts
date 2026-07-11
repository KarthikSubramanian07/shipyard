import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { searchMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { searchUsers } from "@/lib/services/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ media: [], users: [] });
  if (q.length > 100) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const db = getDb();
  const limited = await rateLimit(db, `search:${await clientIp()}`, 60, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { env } = getCloudflareContext();
  const [media, users] = await Promise.all([
    searchMedia(q, { tmdbBearer: env.TMDB_BEARER }).catch(() => []),
    searchUsers(db, q, 5).catch(() => []),
  ]);

  return NextResponse.json(
    { media, users },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
