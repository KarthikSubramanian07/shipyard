import Link from "next/link";
import type { FeedItem as FeedRow } from "@/lib/services/feed";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/ui/poster";
import { Stars } from "@/components/ui/star-rating";
import { FlareButton } from "@/components/interactions/flare-button";
import { ratingToStars } from "@/lib/rating";
import { relativeTime } from "@/lib/utils";

const VERB: Record<string, string> = {
  log: "logged",
  review: "reviewed",
  reaction: "reacted to",
  fic: "published a fic for",
  list: "made a list",
};

export function FeedItemCard({ item, authed }: { item: FeedRow; authed: boolean }) {
  const { activity, author, work, log, reaction, fic, list } = item;

  return (
    <article className="border-border flex gap-3 border-b py-5 last:border-0">
      <Avatar user={author} size="md" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link
            href={`/u/${author.username}`}
            className="text-foreground font-medium hover:underline"
          >
            {author.displayName}
          </Link>{" "}
          {VERB[activity.kind] ?? "shared"}{" "}
          {work ? (
            <Link
              href={`/work/${work.slug}`}
              className="text-foreground font-medium hover:underline"
            >
              {work.title}
            </Link>
          ) : list ? (
            <Link
              href={`/list/${list.slug}`}
              className="text-foreground font-medium hover:underline"
            >
              {list.title}
            </Link>
          ) : null}
          <span className="ml-1 text-xs">· {relativeTime(activity.createdAt)}</span>
        </p>

        {(activity.kind === "log" || activity.kind === "review") && log ? (
          <div className="flex gap-3">
            {work ? (
              <Link href={`/work/${work.slug}`} className="w-14 shrink-0">
                <Poster title={work.title} posterUrl={work.posterUrl} type={work.type} />
              </Link>
            ) : null}
            <div className="space-y-1.5">
              {log.rating != null ? <Stars stars={ratingToStars(log.rating)} size={14} /> : null}
              {log.reaction ? <p className="text-foreground/90 text-sm">{log.reaction}</p> : null}
              {log.reviewBody ? (
                <p className="text-muted-foreground line-clamp-3 text-sm">{log.reviewBody}</p>
              ) : null}
              <FlareButton
                entityType="log"
                entityId={log.id}
                initialCount={log.likeCount}
                authed={authed}
              />
            </div>
          </div>
        ) : null}

        {activity.kind === "reaction" && reaction ? (
          <div className="space-y-1.5">
            <p className="text-foreground/90 text-sm">{reaction.body}</p>
            <FlareButton
              entityType="reaction"
              entityId={reaction.id}
              initialCount={reaction.likeCount}
              authed={authed}
            />
          </div>
        ) : null}

        {activity.kind === "fic" && fic ? (
          <Link
            href={`/fic/${fic.slug}`}
            className="border-border bg-card block rounded-lg border p-3 hover:shadow-sm"
          >
            <p className="font-display font-semibold">{fic.title}</p>
            {fic.summary ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">{fic.summary}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <Badge variant="flare">{fic.type}</Badge>
              <Badge variant="verdigris">{fic.kudosCount} kudos</Badge>
            </div>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
