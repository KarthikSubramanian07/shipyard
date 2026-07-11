import { BookMarked, Film, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, getDbAsync } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { ratingToStars } from "@/lib/rating";
import { getUserFics } from "@/lib/services/fics";
import { getUserLists } from "@/lib/services/lists";
import { getUserLogs } from "@/lib/services/logs";
import { getShelfWorks } from "@/lib/services/shelves";
import { getProfileStats, getUserByUsername, isFollowing } from "@/lib/services/users";
import { FicCard } from "@/components/fic-card";
import { WorkCard } from "@/components/work-card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { FollowButton } from "@/components/interactions/follow-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(await getDbAsync(), username);
  if (!user) return { title: "Not found" };
  return {
    title: `${user.displayName} (@${user.username})`,
    description: user.bio ?? `${user.displayName}'s films, books, and fanfic on Shipyard.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = getDb();
  const profile = await getUserByUsername(db, username);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;

  const [stats, logs, fics, lists, favorites, watched, following] = await Promise.all([
    getProfileStats(db, profile.id),
    getUserLogs(db, profile.id, 18),
    getUserFics(db, profile.id, 6),
    getUserLists(db, profile.id, 6),
    getShelfWorks(db, profile.id, "favorites", 12),
    getShelfWorks(db, profile.id, "watched", 12),
    viewer && !isSelf ? isFollowing(db, viewer.id, profile.id) : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar user={profile} size="xl" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold">{profile.displayName}</h1>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
          {profile.bio ? (
            <p className="text-foreground/90 mt-2 max-w-xl text-sm">{profile.bio}</p>
          ) : null}
        </div>
        {!isSelf ? (
          <FollowButton targetUserId={profile.id} initialFollowing={following} authed={!!viewer} />
        ) : null}
      </header>

      {/* Stats */}
      <div className="border-border mt-6 flex flex-wrap gap-x-8 gap-y-2 border-y py-4 text-sm">
        <Stat n={stats.films + stats.tv} label="watched" />
        <Stat n={stats.books} label="read" />
        <Stat n={stats.fics} label="fics" />
        <Stat n={stats.followers} label="followers" />
        <Stat n={stats.following} label="following" />
      </div>

      <div className="mt-8 space-y-12">
        {favorites.length > 0 && (
          <Section title="Favorites" icon={BookMarked}>
            <WorkGrid items={favorites.map((f) => f.work)} />
          </Section>
        )}

        <Section title="Recent activity" icon={Film}>
          {logs.length === 0 ? (
            <EmptyState
              icon={Film}
              title={isSelf ? "You haven't logged anything yet" : "Nothing logged yet"}
              description={
                isSelf ? "Search for something you watched or read to get started." : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {logs.map(({ log, work }) => (
                <WorkCard
                  key={log.id}
                  work={work}
                  stars={log.rating != null ? ratingToStars(log.rating) : null}
                />
              ))}
            </div>
          )}
        </Section>

        {fics.length > 0 && (
          <Section title="Fanfic" icon={PenLine}>
            <div className="grid gap-4 md:grid-cols-2">
              {fics.map(({ fic }) => (
                <FicCard
                  key={fic.id}
                  fic={{
                    ...fic,
                    author: {
                      username: profile.username,
                      displayName: profile.displayName,
                      avatarKey: profile.avatarKey,
                    },
                  }}
                />
              ))}
            </div>
          </Section>
        )}

        {lists.length > 0 && (
          <Section title="Lists" icon={BookMarked}>
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
          </Section>
        )}

        {watched.length > 0 && (
          <Section title="Watched shelf" icon={Film}>
            <WorkGrid items={watched.map((w) => w.work)} />
          </Section>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <span className="font-display text-xl font-semibold">{n.toLocaleString()}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
        <Icon className="text-flare size-5" /> {title}
      </h2>
      {children}
    </section>
  );
}

function WorkGrid({
  items,
}: {
  items: {
    id: string;
    slug: string;
    title: string;
    year: number | null;
    posterUrl: string | null;
    type: "film" | "tv" | "book";
  }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
      {items.map((w) => (
        <WorkCard key={w.id} work={w} />
      ))}
    </div>
  );
}
