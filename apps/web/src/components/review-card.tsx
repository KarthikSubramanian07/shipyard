import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/star-rating";
import { FlareButton } from "@/components/interactions/flare-button";
import { TierBadge } from "@/components/interactions/gauntlet-rating";
import { SpoilerText } from "@/components/spoiler-text";
import type { FlareKey } from "@/db/schema";
import { ratingToStars } from "@/lib/rating";
import { relativeTime } from "@/lib/utils";

export interface ReviewData {
  id: string;
  rating: number | null;
  score: number | null;
  reviewBody: string;
  hasSpoilers: boolean;
  likeCount: number;
  createdAt: number;
  user: { username: string; displayName: string; avatarKey: string | null };
}

export function ReviewCard({
  review,
  flare = null,
  authed,
  path,
}: {
  review: ReviewData;
  flare?: FlareKey | null;
  authed: boolean;
  path: string;
}) {
  return (
    <article className="border-border space-y-3 border-b pb-5 last:border-0">
      <div className="flex items-center gap-3">
        <Avatar user={review.user} size="md" />
        <div className="flex-1">
          <Link href={`/u/${review.user.username}`} className="text-sm font-medium hover:underline">
            {review.user.displayName}
          </Link>
          <p className="text-muted-foreground text-xs">{relativeTime(review.createdAt * 1000)}</p>
        </div>
        <div className="flex items-center gap-2">
          {review.score != null ? <TierBadge score={review.score} /> : null}
          {review.rating != null ? <Stars stars={ratingToStars(review.rating)} size={15} /> : null}
        </div>
      </div>

      {review.hasSpoilers ? (
        <Badge variant="flare" className="mb-1.5">
          Spoiler-tagged
        </Badge>
      ) : null}
      <SpoilerText text={review.reviewBody} className="text-foreground/90 text-sm" />

      <FlareButton
        entityType="log"
        entityId={review.id}
        initialFlare={flare}
        initialCount={review.likeCount}
        authed={authed}
        path={path}
      />
    </article>
  );
}
