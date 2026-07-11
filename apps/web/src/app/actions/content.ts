"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { EntityType } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { upsertLog } from "@/lib/services/logs";
import { createReaction } from "@/lib/services/reactions";
import { addComment } from "@/lib/services/social";
import { addToShelf, removeFromShelf } from "@/lib/services/shelves";
import { getWorkById } from "@/lib/services/works";
import { commentSchema, logSchema, reactionSchema } from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function submitLog(workId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = logSchema.safeParse({
    rating: formData.get("rating") || null,
    bucket: formData.get("bucket") || null,
    score: formData.get("score") || null,
    spoilerUpTo: formData.get("spoilerUpTo") || null,
    reaction: formData.get("reaction") || undefined,
    reviewBody: formData.get("reviewBody") || undefined,
    hasSpoilers: formData.get("hasSpoilers") === "on",
    loggedOn: formData.get("loggedOn") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const db = getDb();
  const work = await getWorkById(db, workId);
  if (!work) return { ok: false, error: "Unknown work" };

  await upsertLog(db, { userId: user.id, workId, ...parsed.data });
  revalidatePath(`/work/${work.slug}`);
  revalidatePath(`/u/${user.username}`);
  return { ok: true };
}

export async function postReaction(workId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = reactionSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const db = getDb();
  const work = await getWorkById(db, workId);
  if (!work) return { ok: false, error: "Unknown work" };
  await createReaction(db, user.id, workId, parsed.data.body);
  revalidatePath(`/work/${work.slug}`);
  return { ok: true };
}

export async function submitComment(
  entityType: EntityType,
  entityId: string,
  ownerId: string | null,
  path: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = commentSchema.safeParse({
    body: formData.get("body"),
    parentId: formData.get("parentId") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await addComment(getDb(), {
    userId: user.id,
    entityType,
    entityId,
    body: parsed.data.body,
    parentId: parsed.data.parentId,
    ownerId,
  });
  revalidatePath(path);
  return { ok: true };
}

export async function toggleShelfAction(
  shelfSlug: string,
  workId: string,
  add: boolean,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  if (add) await addToShelf(db, user.id, shelfSlug, workId);
  else await removeFromShelf(db, user.id, shelfSlug, workId);
  revalidatePath(`/u/${user.username}`);
  return { ok: true };
}
