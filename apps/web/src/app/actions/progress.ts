"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { setProgress } from "@/lib/services/progress";

export async function setProgressAction(
  workId: string,
  position: number,
  label: string | null,
  path: string,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await setProgress(getDb(), user.id, workId, Math.max(0, Math.floor(position)), label);
  revalidatePath(path);
  return { ok: true };
}
