import type { WorkSource } from "@/db/schema";
import { olGetDetail, olSearch } from "./openlibrary";
import { tmdbGetDetail, tmdbSearchMulti } from "./tmdb";
import { MediaError, type MediaDetail, type MediaSearchResult } from "./types";

export * from "./types";
export { tmdbPoster } from "./tmdb";
export { olCover } from "./openlibrary";

export interface MediaCredentials {
  tmdbBearer: string;
}

/** Simple relevance score so exact/prefix title matches float to the top. */
export function scoreResult(result: MediaSearchResult, query: string): number {
  const t = result.title.toLowerCase();
  const q = query.toLowerCase().trim();
  if (t === q) return 3;
  if (t.startsWith(q)) return 2;
  if (t.includes(q)) return 1;
  return 0;
}

/**
 * Unified search across films/TV (TMDB) and books (Open Library). Failure of one
 * provider never sinks the whole query — we return whatever succeeded.
 */
export async function searchMedia(
  query: string,
  creds: MediaCredentials,
): Promise<MediaSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [films, books] = await Promise.allSettled([
    tmdbSearchMulti(creds.tmdbBearer, trimmed),
    olSearch(trimmed),
  ]);

  const results: MediaSearchResult[] = [];
  if (films.status === "fulfilled") results.push(...films.value);
  if (books.status === "fulfilled") results.push(...books.value.slice(0, 12));

  return results
    .map((r) => ({ r, score: scoreResult(r, trimmed) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((x) => x.r);
}

export async function getMediaDetail(
  source: WorkSource,
  externalId: string,
  creds: MediaCredentials,
): Promise<MediaDetail> {
  switch (source) {
    case "tmdb":
      return tmdbGetDetail(creds.tmdbBearer, externalId);
    case "openlibrary":
      return olGetDetail(externalId);
    default:
      throw new MediaError(`Unsupported source: ${source}`, 400);
  }
}
