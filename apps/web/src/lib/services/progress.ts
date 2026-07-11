import { and, eq } from "drizzle-orm";
import type { DB } from "@/db";
import { mediaProgress } from "@/db/schema";

export async function setProgress(
  db: DB,
  userId: string,
  workId: string,
  position: number,
  label?: string | null,
): Promise<void> {
  await db
    .insert(mediaProgress)
    .values({ userId, workId, position, label: label ?? null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [mediaProgress.userId, mediaProgress.workId],
      set: { position, label: label ?? null, updatedAt: new Date() },
    });
}

export async function getProgress(db: DB, userId: string, workId: string): Promise<number | null> {
  const row = await db
    .select({ position: mediaProgress.position })
    .from(mediaProgress)
    .where(and(eq(mediaProgress.userId, userId), eq(mediaProgress.workId, workId)))
    .get();
  return row?.position ?? null;
}
