import { MediaError, type MediaDetail, type MediaSearchResult } from "./types";

const OL_API = "https://openlibrary.org";
const OL_COVERS = "https://covers.openlibrary.org/b/id";

// Open Library asks for a descriptive User-Agent with contact info; identified
// clients get a higher rate limit (~3 rps vs ~1 rps).
const USER_AGENT = "Shipyard/1.0 (+https://shipyard.gg; hello@shipyard.gg)";

export function olCover(
  coverId: number | null | undefined,
  size: "S" | "M" | "L" = "M",
): string | null {
  if (!coverId) return null;
  return `${OL_COVERS}/${coverId}-${size}.jpg`;
}

interface OlDoc {
  key: string; // e.g. "/works/OL45883W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

/** Pure: map an Open Library search doc to our shape. */
export function mapOlDoc(doc: OlDoc): MediaSearchResult {
  // key is "/works/OL...W" — store just the work OLID.
  const externalId = doc.key.replace(/^\/works\//, "");
  return {
    source: "openlibrary",
    externalId,
    type: "book",
    title: doc.title,
    year: doc.first_publish_year ?? null,
    posterUrl: olCover(doc.cover_i, "M"),
    subtitle: doc.author_name?.[0] ?? "Book",
  };
}

async function olFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${OL_API}${path}`, {
    headers: { "User-Agent": USER_AGENT, accept: "application/json" },
    cf: { cacheTtl: 86_400, cacheEverything: true },
  } as RequestInit);
  if (!res.ok) throw new MediaError(`Open Library request failed (${res.status})`, res.status);
  return (await res.json()) as T;
}

export async function olSearch(query: string): Promise<MediaSearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query,
    fields: "key,title,author_name,first_publish_year,cover_i",
    limit: "20",
  });
  const data = await olFetch<{ docs: OlDoc[] }>(`/search.json?${params}`);
  return (data.docs ?? []).map(mapOlDoc);
}

interface OlWork {
  title: string;
  description?: string | { value: string };
  covers?: number[];
  subjects?: string[];
}

function descriptionText(d: OlWork["description"]): string | null {
  if (!d) return null;
  return typeof d === "string" ? d : d.value;
}

export async function olGetDetail(externalId: string): Promise<MediaDetail> {
  const data = await olFetch<OlWork>(`/works/${externalId}.json`);
  // Fetch author + year via the search endpoint keyed by title is unreliable; the
  // work document alone gives us enough for a solid detail page.
  return {
    source: "openlibrary",
    externalId,
    type: "book",
    title: data.title,
    year: null,
    posterUrl: olCover(data.covers?.[0], "L"),
    subtitle: "Book",
    synopsis: descriptionText(data.description),
    metadata: {
      subjects: (data.subjects ?? []).slice(0, 12),
    },
  };
}
