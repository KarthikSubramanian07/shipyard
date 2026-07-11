"use client";

import { Anchor, Check, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleShelfAction } from "@/app/actions/content";
import { Button } from "@/components/ui/button";
import type { WorkType } from "@/db/schema";

/**
 * Save-for-later control. The "want" shelf is Shipyard's watchlist/readlist -
 * the Manifest (what you're carrying to consume). Plus a Favorites toggle.
 */
export function SaveShelf({
  workId,
  type,
  initialInManifest,
  initialFavorite,
  authed,
}: {
  workId: string;
  type: WorkType;
  initialInManifest: boolean;
  initialFavorite: boolean;
  authed: boolean;
}) {
  const router = useRouter();
  const [inManifest, setInManifest] = useState(initialInManifest);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [, start] = useTransition();
  const wantLabel = type === "book" ? "Want to read" : "Want to watch";

  function toggle(slug: "want" | "favorites") {
    if (!authed) {
      router.push("/login");
      return;
    }
    const isWant = slug === "want";
    const current = isWant ? inManifest : favorite;
    const next = !current;
    (isWant ? setInManifest : setFavorite)(next);
    start(async () => {
      await toggleShelfAction(slug, workId, next);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant={inManifest ? "verdigris" : "secondary"}
        size="sm"
        onClick={() => toggle("want")}
        title={`${wantLabel} - add to your Manifest`}
      >
        {inManifest ? <Check /> : <Anchor />}
        {inManifest ? "On Manifest" : "Manifest"}
      </Button>
      <Button
        variant={favorite ? "primary" : "secondary"}
        size="sm"
        onClick={() => toggle("favorites")}
      >
        <Heart className={favorite ? "fill-current" : ""} />
        {favorite ? "Favorited" : "Favorite"}
      </Button>
    </div>
  );
}
