import { Compass, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getFollowingFeed, getGlobalFeed, getTrendingWorks } from "@/lib/services/feed";
import { FeedItemCard } from "@/components/feed-item";
import { SearchBox } from "@/components/search-box";
import { WorkCard } from "@/components/work-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default async function HomePage() {
  const user = await getCurrentUser();
  const db = getDb();

  if (user) {
    const [feed, trending] = await Promise.all([
      getFollowingFeed(db, user.id, 40),
      getTrendingWorks(db, 14, 6),
    ]);
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_300px]">
        <section>
          <h1 className="font-display mb-5 text-2xl font-semibold">Your feed</h1>
          {feed.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Your harbor is quiet"
              description="Follow a few people, or log what you watched last — your feed fills up fast."
              action={
                <Button asChild>
                  <Link href="/discover">Find people to follow</Link>
                </Button>
              }
            />
          ) : (
            <div>
              {feed.map((item) => (
                <FeedItemCard key={item.activity.id} item={item} authed />
              ))}
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <TrendingPanel trending={trending} />
        </aside>
      </div>
    );
  }

  const [trending, recent] = await Promise.all([
    getTrendingWorks(db, 30, 12),
    getGlobalFeed(db, 12),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-flare-wash border-border border-b">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="bg-card/70 text-flare mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
            <Sparkles className="size-3.5" /> Free forever · no signup wall
          </p>
          <h1 className="font-display text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Track everything.
            <br />
            Rewrite anything.
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-balance text-lg">
            Letterboxd for every story you&apos;ve ever loved — and the ones you wish existed. Log
            films, TV and books, then write the ending they should&apos;ve had.
          </p>
          <div className="mx-auto mt-8 max-w-md">
            <SearchBox />
            <p className="text-muted-foreground mt-2 text-xs">
              Try “Succession”, “The Left Hand of Darkness”, or “Past Lives”.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        {trending.length > 0 && (
          <section>
            <SectionHeading icon={TrendingUp} title="Trending this month" href="/discover" />
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {trending.map(({ work }) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section>
            <SectionHeading icon={Compass} title="Fresh from the yard" />
            <div className="max-w-2xl">
              {recent.map((item) => (
                <FeedItemCard key={item.activity.id} item={item} authed={false} />
              ))}
            </div>
          </section>
        )}

        {trending.length === 0 && recent.length === 0 && (
          <EmptyState
            icon={Compass}
            title="The yard is brand new"
            description="Be the first to log something. Search for a film, show, or book above."
          />
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
        <Icon className="text-flare size-5" /> {title}
      </h2>
      {href ? (
        <Link href={href} className="text-primary text-sm font-medium hover:underline">
          See all
        </Link>
      ) : null}
    </div>
  );
}

function TrendingPanel({
  trending,
}: {
  trending: {
    work: {
      id: string;
      slug: string;
      title: string;
      year: number | null;
      posterUrl: string | null;
      type: "film" | "tv" | "book";
    };
  }[];
}) {
  if (trending.length === 0) return null;
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="text-flare size-4" /> Trending
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {trending.map(({ work }) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
    </div>
  );
}
