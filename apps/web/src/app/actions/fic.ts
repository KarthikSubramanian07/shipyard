"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { addChapter, createFic, toggleKudos, toggleSubscription } from "@/lib/services/fics";
import { getWorkById } from "@/lib/services/works";
import { chapterSchema, ficSchema } from "@/lib/validation";

export async function createFicAction(
  workId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = ficSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    type: formData.get("type"),
    rating: formData.get("rating") || "general",
    canon: formData.get("canon") || "canon-divergent",
    tone: formData
      .getAll("tone")
      .map((t) => String(t).trim())
      .filter(Boolean),
    pairing: formData.get("pairing") || undefined,
    chapterTitle: formData.get("chapterTitle") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const db = getDb();
  const work = await getWorkById(db, workId);
  if (!work) return { error: "Unknown work" };

  const { slug } = await createFic(db, user.id, workId, parsed.data);
  revalidatePath(`/work/${work.slug}`);
  redirect(`/fic/${slug}`);
}

export async function addChapterAction(
  ficId: string,
  ficSlug: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = chapterSchema.safeParse({
    title: formData.get("title") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Write something" };

  await addChapter(getDb(), ficId, parsed.data);
  revalidatePath(`/fic/${ficSlug}`);
  redirect(`/fic/${ficSlug}`);
}

export async function toggleKudosAction(ficId: string): Promise<{ kudosed: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { kudosed: false };
  return { kudosed: await toggleKudos(getDb(), user.id, ficId) };
}

export async function toggleSubscriptionAction(ficId: string): Promise<{ subscribed: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { subscribed: false };
  return { subscribed: await toggleSubscription(getDb(), user.id, ficId) };
}
