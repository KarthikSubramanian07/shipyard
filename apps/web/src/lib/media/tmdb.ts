import { MediaError, type MediaDetail, type MediaSearchResult } from "./types";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

/** Build a poster URL at a requested size (default detail-page width). */
export function tmdbPoster(path: string | null | undefined, size = "w342"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${size}${path}`;
}

/** Build a wide backdrop (banner) URL. */
export function tmdbBackdrop(path: string | null | undefined, size = "w1280"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${size}${path}`;
}

function yearFrom(date: string | null | undefined): number | null {
  if (!date) return null;
  const y = Number.parseInt(date.slice(0, 4), 10);
  return Number.isNaN(y) ? null : y;
}

interface TmdbMultiItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
}

/** Pure: map a /search/multi item to our shape. Returns null for non-film/tv. */
export function mapMultiItem(item: TmdbMultiItem): MediaSearchResult | null {
  if (item.media_type === "movie") {
    return {
      source: "tmdb",
      externalId: `movie:${item.id}`,
      type: "film",
      title: item.title ?? "Untitled",
      year: yearFrom(item.release_date),
      posterUrl: tmdbPoster(item.poster_path),
      subtitle: "Film",
    };
  }
  if (item.media_type === "tv") {
    return {
      source: "tmdb",
      externalId: `tv:${item.id}`,
      type: "tv",
      title: item.name ?? "Untitled",
      year: yearFrom(item.first_air_date),
      posterUrl: tmdbPoster(item.poster_path),
      subtitle: "TV series",
    };
  }
  return null;
}

/** Split our composite externalId ("movie:603") back into kind + numeric id. */
export function parseTmdbExternalId(externalId: string): { kind: "movie" | "tv"; id: string } {
  const [kind, id] = externalId.split(":");
  if ((kind !== "movie" && kind !== "tv") || !id) {
    throw new MediaError(`Invalid TMDB external id: ${externalId}`, 400);
  }
  return { kind, id };
}

async function tmdbFetch<T>(
  token: string,
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${TMDB_API}${path}`);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    // Cache successful TMDB responses at the edge for a day.
    cf: { cacheTtl: 86_400, cacheEverything: true },
  } as RequestInit);

  if (!res.ok) {
    throw new MediaError(`TMDB request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

export async function tmdbSearchMulti(token: string, query: string): Promise<MediaSearchResult[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<{ results: TmdbMultiItem[] }>(token, "/search/multi", {
    query,
    include_adult: "false",
    page: "1",
  });
  return (data.results ?? []).map(mapMultiItem).filter((r): r is MediaSearchResult => r !== null);
}

interface TmdbDetail extends TmdbMultiItem {
  genres?: { name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  vote_average?: number;
  credits?: {
    cast?: { name: string; character?: string }[];
    crew?: { name: string; job?: string }[];
  };
}

export async function tmdbGetDetail(token: string, externalId: string): Promise<MediaDetail> {
  const { kind, id } = parseTmdbExternalId(externalId);
  const data = await tmdbFetch<TmdbDetail>(token, `/${kind}/${id}`, {
    append_to_response: "credits",
  });

  const isMovie = kind === "movie";
  const cast = (data.credits?.cast ?? []).slice(0, 12).map((c) => c.name);
  const directors = (data.credits?.crew ?? [])
    .filter((c) => c.job === "Director" || c.job === "Creator")
    .map((c) => c.name);

  return {
    source: "tmdb",
    externalId,
    type: isMovie ? "film" : "tv",
    title: (isMovie ? data.title : data.name) ?? "Untitled",
    year: yearFrom(isMovie ? data.release_date : data.first_air_date),
    posterUrl: tmdbPoster(data.poster_path, "w500"),
    subtitle: isMovie ? "Film" : "TV series",
    synopsis: data.overview ?? null,
    metadata: {
      genres: (data.genres ?? []).map((g) => g.name),
      cast,
      directors,
      runtime: isMovie ? data.runtime : data.episode_run_time?.[0],
      seasons: data.number_of_seasons,
      voteAverage: data.vote_average,
      backdropUrl: tmdbBackdrop(data.backdrop_path),
    },
  };
}
