import { MessageSquare, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, getDbAsync } from "@/db";
import type { WorkType } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ogImageUrl } from "@/lib/og";
import { getFicsForWork } from "@/lib/services/fics";
import { getReviewsForWork, getUserLogForWork } from "@/lib/services/logs";
import { getReactionsForWork } from "@/lib/services/reactions";
import { getAlsoLiked } from "@/lib/services/feed";
import { getWorkShelfSlugs } from "@/lib/services/shelves";
import { getWorkAggregate, getWorkBySlug } from "@/lib/services/works";
import { FicCard } from "@/components/fic-card";
import { ReviewCard } from "@/components/review-card";
import { WorkCard } from "@/components/work-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Poster } from "@/components/ui/poster";
import { RatingSummary } from "@/components/ui/star-rating";
import { FlareButton } from "@/components/interactions/flare-button";
import { LogDialog } from "@/components/interactions/log-dialog";
import { ReactionComposer } from "@/components/interactions/reaction-composer";
import { SaveShelf } from "@/components/interactions/save-shelf";
import { relativeTime } from "@/lib/utils";

const TYPE_LABEL: Record<WorkType, string> = { film: "Film", tv: "TV series", book: "Book" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDbAsync();
  const work = await getWorkBySlug(db, slug);
  if (!work) return { title: "Not found" };
  const agg = await getWorkAggregate(db, work.id);
  const image = ogImageUrl({
    type: "work",
    title: work.title,
    subtitle: work.year ? `${TYPE_LABEL[work.type]} · ${work.year}` : TYPE_LABEL[work.type],
    rating: agg.averageStars != null ? Math.round(agg.averageStars * 2) : null,
    poster: work.posterUrl,
  });
  return {
    title: work.title,
    description:
      work.synopsis?.slice(0, 200) ?? `Reviews and fanfic for ${work.title} on Shipyard.`,
    openGraph: { title: work.title, images: image ? [image] : undefined },
  };
}

type Tab = "overview" | "reviews" | "fanfic";

export default async function WorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const db = getDb();
  const work = await getWorkBySlug(db, slug);
  if (!work) notFound();

  const user = await getCurrentUser();
  const tab: Tab = tabParam === "reviews" || tabParam === "fanfic" ? tabParam : "overview";

  const [agg, userLog, reviews, reactions, fics, alsoLiked, shelfSlugs] = await Promise.all([
    getWorkAggregate(db, work.id),
    user ? getUserLogForWork(db, user.id, work.id) : Promise.resolve(undefined),
    getReviewsForWork(db, work.id, 20),
    getReactionsForWork(db, work.id, 20),
    getFicsForWork(db, work.id, 20),
    getAlsoLiked(db, work.id, 8),
    user ? getWorkShelfSlugs(db, user.id, work.id) : Promise.resolve<string[]>([]),
  ]);

  const meta = (work.metadata ?? {}) as {
    genres?: string[];
    cast?: string[];
    directors?: string[];
    subjects?: string[];
    backdropUrl?: string;
  };
  const path = `/work/${work.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {meta.backdropUrl ? (
        <div className="border-border relative mb-6 h-40 w-full overflow-hidden rounded-xl border sm:h-56 md:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meta.backdropUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="from-background/90 via-background/20 absolute inset-0 bg-gradient-to-t to-transparent" />
        </div>
      ) : null}
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        {/* Left rail */}
        <div className="space-y-4">
          <div className="mx-auto w-40 md:w-full">
            <Poster title={work.title} posterUrl={work.posterUrl} type={work.type} />
          </div>
          <LogDialog
            workId={work.id}
            workTitle={work.title}
            initial={
              userLog
                ? {
                    rating: userLog.rating,
                    reaction: userLog.reaction,
                    reviewBody: userLog.reviewBody,
                    hasSpoilers: userLog.hasSpoilers,
                  }
                : null
            }
            triggerLabel={userLog ? "Edit your log" : "Log or rate"}
          />
          <SaveShelf
            workId={work.id}
            type={work.type}
            initialInManifest={shelfSlugs.includes("want")}
            initialFavorite={shelfSlugs.includes("favorites")}
            authed={!!user}
          />
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/write/${work.slug}`}>
              <PenLine /> Write a fic
            </Link>
          </Button>
        </div>

        {/* Main */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="flare">{TYPE_LABEL[work.type]}</Badge>
              {work.year ? (
                <span className="text-muted-foreground text-sm">{work.year}</span>
              ) : null}
            </div>
            <h1 className="font-display text-balance text-3xl font-semibold tracking-tight">
              {work.title}
            </h1>
            <RatingSummary average={agg.averageStars} count={agg.ratingCount} />
            {(meta.directors?.length || meta.cast?.length) && (
              <p className="text-muted-foreground text-sm">
                {meta.directors?.length ? <>By {meta.directors.join(", ")}. </> : null}
                {meta.cast?.length ? <>Starring {meta.cast.slice(0, 4).join(", ")}.</> : null}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="border-border flex gap-1 border-b">
            <TabLink slug={slug} tab="overview" active={tab} label="Overview" />
            <TabLink slug={slug} tab="reviews" active={tab} label={`Reviews (${reviews.length})`} />
            <TabLink slug={slug} tab="fanfic" active={tab} label={`Fanfic (${fics.length})`} />
          </div>

          {tab === "overview" && (
            <div className="space-y-8">
              {work.synopsis ? (
                <p className="text-foreground/90 max-w-2xl leading-relaxed">{work.synopsis}</p>
              ) : null}
              {meta.genres?.length || meta.subjects?.length ? (
                <div className="flex flex-wrap gap-2">
                  {(meta.genres ?? meta.subjects ?? []).slice(0, 8).map((g) => (
                    <Badge key={g} variant="outline">
                      {g}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Reactions</h2>
                <ReactionComposer workId={work.id} authed={!!user} />
                <div className="space-y-3 pt-2">
                  {reactions.map(({ reaction, user: ru }) => (
                    <div
                      key={reaction.id}
                      className="border-border flex gap-3 border-b pb-3 last:border-0"
                    >
                      <Avatar user={ru} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <Link href={`/u/${ru.username}`} className="font-medium hover:underline">
                            {ru.displayName}
                          </Link>{" "}
                          <span className="text-muted-foreground text-xs">
                            {relativeTime(reaction.createdAt)}
                          </span>
                        </p>
                        <p className="text-foreground/90 text-sm">{reaction.body}</p>
                        <div className="mt-1">
                          <FlareButton
                            entityType="reaction"
                            entityId={reaction.id}
                            initialCount={reaction.likeCount}
                            authed={!!user}
                            path={path}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {reactions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No reactions yet.</p>
                  ) : null}
                </div>
              </section>

              {alsoLiked.length > 0 && (
                <section className="space-y-3">
                  <h2 className="font-display text-lg font-semibold">Fans also loved</h2>
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                    {alsoLiked.map((w) => (
                      <WorkCard
                        key={w.id}
                        work={{
                          slug: w.slug,
                          title: w.title,
                          year: null,
                          posterUrl: w.poster_url,
                          type: w.type as WorkType,
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === "reviews" && (
            <div className="max-w-2xl space-y-5">
              {reviews.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No reviews yet"
                  description="Be the first to write one - log this and add a review."
                />
              ) : (
                reviews.map(({ log, user: ru }) => (
                  <ReviewCard
                    key={log.id}
                    review={{
                      id: log.id,
                      rating: log.rating,
                      reviewBody: log.reviewBody!,
                      hasSpoilers: log.hasSpoilers,
                      likeCount: log.likeCount,
                      createdAt: Math.floor(log.createdAt.getTime() / 1000),
                      user: ru,
                    }}
                    authed={!!user}
                    path={path}
                  />
                ))
              )}
            </div>
          )}

          {tab === "fanfic" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Every fic written for {work.title}, in one place.
                </p>
                <Button asChild size="sm">
                  <Link href={`/write/${work.slug}`}>
                    <PenLine /> Write one
                  </Link>
                </Button>
              </div>
              {fics.length === 0 ? (
                <EmptyState
                  icon={PenLine}
                  title="Nothing written yet"
                  description="The blank page is yours. Write the ending it deserved."
                  action={
                    <Button asChild>
                      <Link href={`/write/${work.slug}`}>Start writing</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {fics.map(({ fic, author }) => (
                    <FicCard key={fic.id} fic={{ ...fic, author }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabLink({
  slug,
  tab,
  active,
  label,
}: {
  slug: string;
  tab: Tab;
  active: Tab;
  label: string;
}) {
  const isActive = tab === active;
  return (
    <Link
      href={`/work/${slug}${tab === "overview" ? "" : `?tab=${tab}`}`}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "border-flare text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent"
      }`}
    >
      {label}
    </Link>
  );
}
