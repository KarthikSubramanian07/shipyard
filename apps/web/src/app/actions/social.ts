"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { EntityType } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { follow, toggleLike, unfollow } from "@/lib/services/social";
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

export async function toggleLikeAction(
  entityType: EntityType,
  entityId: string,
  path?: string,
): Promise<{ liked: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { liked: false };
  const liked = await toggleLike(getDb(), user.id, entityType, entityId);
  if (path) revalidatePath(path);
  return { liked };
}
