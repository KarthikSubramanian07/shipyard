import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, getDbAsync } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { ogImageUrl } from "@/lib/og";
import { getFicBySlug, getFicChapters, getFicTags, hasKudos } from "@/lib/services/fics";
import { getComments } from "@/lib/services/social";
import { CommentSection, type CommentView } from "@/components/interactions/comment-section";
import { KudosButton } from "@/components/interactions/kudos-button";
import { AddChapter, SubscribeButton } from "@/components/fic-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ficLength, formatCount } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  "alternate-ending": "Alternate ending",
  "missing-scene": "Missing scene",
  continuation: "Continuation",
  crossover: "Crossover",
  rewrite: "Rewrite",
  theory: "Theory",
  commentary: "Commentary",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getFicBySlug(await getDbAsync(), slug);
  if (!row) return { title: "Not found" };
  const image = ogImageUrl({
    type: "fic",
    title: row.fic.title,
    subtitle: `Fanfic for ${row.work.title}`,
    meta: `by ${row.author.displayName}`,
  });
  return {
    title: row.fic.title,
    description: row.fic.summary ?? `A fanfic for ${row.work.title} on Shipyard.`,
    openGraph: { title: row.fic.title, images: image ? [image] : undefined },
  };
}

export default async function FicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const row = await getFicBySlug(db, slug);
  if (!row) notFound();
  const { fic, author, work } = row;

  const viewer = await getCurrentUser();
  const [chapters, tags, kudosed, commentRows] = await Promise.all([
    getFicChapters(db, fic.id),
    getFicTags(db, fic.id),
    viewer ? hasKudos(db, viewer.id, fic.id) : Promise.resolve(false),
    getComments(db, "fic", fic.id),
  ]);

  const comments: CommentView[] = commentRows.map(({ comment, user }) => ({
    id: comment.id,
    parentId: comment.parentId,
    body: comment.body,
    createdAt: Math.floor(comment.createdAt.getTime() / 1000),
    user,
  }));

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-muted-foreground text-sm">
        Fanfic for{" "}
        <Link href={`/work/${work.slug}`} className="text-primary font-medium hover:underline">
          {work.title}
        </Link>
      </p>

      <h1 className="font-display mt-2 text-balance text-3xl font-semibold leading-tight tracking-tight">
        {fic.title}
      </h1>

      <Link
        href={`/u/${author.username}`}
        className="mt-4 inline-flex items-center gap-2 hover:underline"
      >
        <Avatar user={author} size="sm" />
        <span className="text-sm font-medium">{author.displayName}</span>
      </Link>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="flare">{TYPE_LABEL[fic.type] ?? fic.type}</Badge>
        <Badge variant="outline">{fic.rating}</Badge>
        <Badge variant="outline">{fic.canon}</Badge>
        <Badge variant="verdigris">{ficLength(fic.wordCount)}</Badge>
        {fic.isComplete ? <Badge variant="brass">complete</Badge> : <Badge>WIP</Badge>}
        {tags
          .filter((t) => t.kind === "pairing")
          .map((t) => (
            <Badge key={t.tag} variant="brass">
              {t.tag}
            </Badge>
          ))}
      </div>

      {tags.filter((t) => t.kind === "tone").length > 0 && (
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-2 text-xs">
          {tags
            .filter((t) => t.kind === "tone")
            .map((t) => (
              <span key={t.tag}>#{t.tag}</span>
            ))}
        </div>
      )}

      {fic.summary ? (
        <p className="border-flare bg-flare-soft/40 text-foreground/90 mt-5 rounded-lg border-l-2 px-4 py-3">
          {fic.summary}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <KudosButton
          ficId={fic.id}
          initialKudosed={kudosed}
          initialCount={fic.kudosCount}
          authed={!!viewer}
        />
        <SubscribeButton ficId={fic.id} initialSubscribed={false} authed={!!viewer} />
        <span className="text-muted-foreground text-sm">{formatCount(fic.wordCount)} words</span>
      </div>

      {/* Chapters */}
      <div className="mt-10 space-y-12">
        {chapters.map((ch, i) => (
          <section key={ch.id}>
            {chapters.length > 1 || ch.title ? (
              <h2 className="font-display mb-4 text-xl font-semibold">
                {ch.title ?? `Chapter ${i + 1}`}
              </h2>
            ) : null}
            <div className="prose-shipyard text-foreground/90 whitespace-pre-wrap">{ch.body}</div>
          </section>
        ))}
      </div>

      {/* Author: add chapter */}
      {viewer?.id === fic.userId ? (
        <div className="mt-10">
          <AddChapter ficId={fic.id} ficSlug={fic.slug} />
        </div>
      ) : null}

      {/* Kudos again + comments */}
      <div className="border-border mt-12 border-t pt-8">
        <h2 className="font-display mb-5 text-lg font-semibold">
          Comments {fic.commentCount > 0 ? `(${fic.commentCount})` : ""}
        </h2>
        <CommentSection
          entityType="fic"
          entityId={fic.id}
          ownerId={fic.userId}
          path={`/fic/${fic.slug}`}
          comments={comments}
          authed={!!viewer}
        />
      </div>
    </article>
  );
}
