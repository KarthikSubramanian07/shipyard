import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { getWorkBySlug } from "@/lib/services/works";
import { FicEditor } from "@/components/fic-editor";

export const metadata: Metadata = {
  title: "Write a fic",
  robots: { index: false, follow: false },
};

export default async function WritePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser(`/write/${slug}`);
  const work = await getWorkBySlug(getDb(), slug);
  if (!work) notFound();
  return <FicEditor workId={work.id} workTitle={work.title} />;
}
