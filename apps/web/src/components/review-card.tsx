import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/star-rating";
import { LikeButton } from "@/components/interactions/like-button";
import { ratingToStars } from "@/lib/rating";
import { relativeTime } from "@/lib/utils";

export interface ReviewData {
  id: string;
  rating: number | null;
  reviewBody: string;
  hasSpoilers: boolean;
  likeCount: number;
  createdAt: number;
  user: { username: string; displayName: string; avatarKey: string | null };
}

export function ReviewCard({
  review,
  liked,
  authed,
  path,
}: {
  review: ReviewData;
  liked: boolean;
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
        {review.rating != null ? <Stars stars={ratingToStars(review.rating)} size={15} /> : null}
      </div>

      {review.hasSpoilers ? (
        <div className="group relative">
          <Badge variant="flare" className="mb-1.5">
            Spoilers · hover to reveal
          </Badge>
          <p className="prose-shipyard text-foreground/90 whitespace-pre-wrap text-sm blur-sm transition group-hover:blur-none">
            {review.reviewBody}
          </p>
        </div>
      ) : (
        <p className="text-foreground/90 whitespace-pre-wrap text-sm">{review.reviewBody}</p>
      )}

      <LikeButton
        entityType="log"
        entityId={review.id}
        initialLiked={liked}
        initialCount={review.likeCount}
        authed={authed}
        path={path}
      />
    </article>
  );
}
