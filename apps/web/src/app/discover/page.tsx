import { Compass, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { getGlobalFeed, getTrendingWorks } from "@/lib/services/feed";
import { FeedItemCard } from "@/components/feed-item";
import { WorkCard } from "@/components/work-card";
import { EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Discover",
  description: "What fans are watching, reading, and rewriting on Shipyard right now.",
};

// Reads live data from D1 per request — never prerender at build.
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const db = getDb();
  const [trending, recent] = await Promise.all([
    getTrendingWorks(db, 30, 18),
    getGlobalFeed(db, 30),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">Discover</h1>

      {trending.length === 0 && recent.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nothing here yet"
          description="The yard is brand new. Log something to get it going."
        />
      ) : null}

      {trending.length > 0 && (
        <section>
          <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="text-flare size-5" /> Trending this month
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {trending.map(({ work }) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
            <Compass className="text-flare size-5" /> Fresh activity
          </h2>
          <div className="max-w-2xl">
            {recent.map((item) => (
              <FeedItemCard key={item.activity.id} item={item} authed={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
