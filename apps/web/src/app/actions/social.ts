"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { EntityType, FlareKey } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { follow, setFlare, unfollow } from "@/lib/services/social";
import { isFollowing } from "@/lib/services/users";

export async function toggleFollowAction(targetUserId: string): Promise<{ following: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { following: false };
  const db = getDb();
  const already = await isFollowing(db, user.id, targetUserId);
  if (already) await unfollow(db, user.id, targetUserId);
  else await follow(db, user.id, targetUserId);
  return { following: !already };
}

/** Set, change, or clear (flare=null) the current user's flare on an entity. */
export async function setFlareAction(
  entityType: EntityType,
  entityId: string,
  flare: FlareKey | null,
  path?: string,
): Promise<{ flare: FlareKey | null }> {
  const user = await getCurrentUser();
  if (!user) return { flare: null };
  const result = await setFlare(getDb(), user.id, entityType, entityId, flare);
  if (path) revalidatePath(path);
  return { flare: result };
}
