"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleLikeAction } from "@/app/actions/social";
import type { EntityType } from "@/db/schema";
import { cn, formatCount } from "@/lib/utils";

export function LikeButton({
  entityType,
  entityId,
  initialLiked,
  initialCount,
  authed,
  path,
}: {
  entityType: EntityType;
  entityId: string;
  initialLiked: boolean;
  initialCount: number;
  authed: boolean;
  path?: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, start] = useTransition();

  function onClick() {
    if (!authed) {
      router.push("/login");
      return;
    }
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    start(async () => {
      const res = await toggleLikeAction(entityType, entityId, path);
      setLiked(res.liked);
    });
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
        liked && "text-primary",
      )}
      aria-pressed={liked}
    >
      <Heart className={cn("size-4", liked && "fill-current")} />
      {count > 0 ? formatCount(count) : "Like"}
    </button>
  );
}
