"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { markAllRead } from "@/lib/services/notifications";

export async function markNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await markAllRead(getDb(), user.id);
  revalidatePath("/notifications");
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Name can't be empty").max(50),
  bio: z.string().trim().max(500).optional(),
});

export interface ProfileState {
  ok?: boolean;
  error?: string;
}

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await getDb()
    .update(users)
    .set({ displayName: parsed.data.displayName, bio: parsed.data.bio ?? null })
    .where(eq(users.id, user.id));
  revalidatePath(`/u/${user.username}`);
  return { ok: true };
}
