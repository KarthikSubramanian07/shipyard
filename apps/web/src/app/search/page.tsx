import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import type { WorkType } from "@/db/schema";
import { searchMedia } from "@/lib/media";
import { searchFics, searchLists, searchUsers } from "@/lib/services/search";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { Poster } from "@/components/ui/poster";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}”` : "Search" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  if (!query) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={SearchX}
          title="Search Shipyard"
          description="Find a film, show, book, person, or fic."
        />
      </div>
    );
  }

  const { env } = getCloudflareContext();
  const db = getDb();
  const [media, people, fics, lists] = await Promise.all([
    searchMedia(query, { tmdbBearer: env.TMDB_BEARER }).catch(() => []),
    searchUsers(db, query, 8),
    searchFics(db, query, 8),
    searchLists(db, query, 8),
  ]);

  const nothing = media.length + people.length + fics.length + lists.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">
        Results for <span className="text-flare">“{query}”</span>
      </h1>

      {nothing && (
        <EmptyState
          icon={SearchX}
          title="No matches"
          description="Try a different spelling or a broader term."
        />
      )}

      {media.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-lg font-semibold">Films, TV &amp; books</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {media.map((m) => (
              <Link
                key={`${m.source}:${m.externalId}`}
                href={`/work/resolve?source=${m.source}&id=${encodeURIComponent(m.externalId)}`}
                className="group block space-y-2"
              >
                <div className="transition-transform group-hover:-translate-y-0.5">
                  <Poster
                    title={m.title}
                    posterUrl={m.posterUrl}
                    type={m.type as WorkType}
                    className="group-hover:ring-flare/40 group-hover:ring-2"
                  />
                </div>
                <p className="group-hover:text-primary line-clamp-1 text-sm font-medium">
                  {m.title}
                </p>
                {m.year ? <p className="text-muted-foreground text-xs">{m.year}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      )}

      {people.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-lg font-semibold">People</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {people.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/u/${u.username}`}
                  className="border-border bg-card flex items-center gap-3 rounded-lg border px-4 py-3 hover:shadow-sm"
                >
                  <Avatar user={u} size="md" />
                  <div>
                    <p className="text-sm font-medium">{u.displayName}</p>
                    <p className="text-muted-foreground text-xs">@{u.username}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fics.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-lg font-semibold">Fanfic</h2>
          <ul className="space-y-2">
            {fics.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/fic/${f.slug}`}
                  className="border-border bg-card block rounded-lg border px-4 py-3 hover:shadow-sm"
                >
                  <p className="font-display font-medium">{f.title}</p>
                  {f.summary ? (
                    <p className="text-muted-foreground line-clamp-1 text-sm">{f.summary}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lists.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-lg font-semibold">Lists</h2>
          <ul className="space-y-2">
            {lists.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/list/${l.slug}`}
                  className="border-border bg-card flex items-center justify-between rounded-lg border px-4 py-3 hover:shadow-sm"
                >
                  <span className="font-medium">{l.title}</span>
                  <span className="text-muted-foreground text-sm">{l.itemCount} works</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
