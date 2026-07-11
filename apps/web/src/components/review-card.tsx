import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/star-rating";
import { FlareButton } from "@/components/interactions/flare-button";
import { TierBadge } from "@/components/interactions/stack-rating";
import { SpoilerText } from "@/components/spoiler-text";
import type { FlareKey, WorkType } from "@/db/schema";
import { isAheadOfViewer, formatProgress } from "@/lib/progress";
import { ratingToStars } from "@/lib/rating";
import { relativeTime } from "@/lib/utils";

export interface ReviewData {
  id: string;
  rating: number | null;
  score: number | null;
  spoilerUpTo: number | null;
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
  workType,
  viewerProgress,
}: {
  review: ReviewData;
  flare?: FlareKey | null;
  authed: boolean;
  path: string;
  workType: WorkType;
  viewerProgress?: number | null;
}) {
  const gated = isAheadOfViewer(review.spoilerUpTo, viewerProgress);
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
      {gated ? (
        <details className="border-flare/50 bg-flare-soft/30 group rounded-lg border border-dashed p-3">
          <summary className="text-flare cursor-pointer text-sm font-medium">
            Hidden: discusses up to {formatProgress(workType, review.spoilerUpTo!)}
            {viewerProgress ? ` (you're on ${formatProgress(workType, viewerProgress)})` : ""}.
            Reveal anyway
          </summary>
          <div className="mt-2">
            <SpoilerText text={review.reviewBody} className="text-foreground/90 text-sm" />
          </div>
        </details>
      ) : (
        <SpoilerText text={review.reviewBody} className="text-foreground/90 text-sm" />
      )}

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
