"use server";

import { getDb } from "@/db";
import type { WorkType } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { Bucket } from "@/lib/stack";
import { getRankedOpponents } from "@/lib/services/logs";

export interface Opponent {
  workId: string;
  title: string;
  posterUrl: string | null;
  score: number;
}

/** The current user's ranked works in a medium + bucket, for head-to-heads. */
export async function getOpponentsAction(
  workType: WorkType,
  bucket: Bucket,
  excludeWorkId: string,
): Promise<Opponent[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await getRankedOpponents(getDb(), user.id, workType, bucket, excludeWorkId);
  return rows
    .filter((r) => r.workId !== excludeWorkId && r.score != null)
    .map((r) => ({ workId: r.workId, title: r.title, posterUrl: r.posterUrl, score: r.score! }));
}
