import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, getDbAsync } from "@/db";
import { ogImageUrl } from "@/lib/og";
import { getListBySlug, getListItems } from "@/lib/services/lists";
import { WorkCard } from "@/components/work-card";
import { Avatar } from "@/components/ui/avatar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getListBySlug(await getDbAsync(), slug);
  if (!row) return { title: "Not found" };
  const image = ogImageUrl({
    type: "list",
    title: row.list.title,
    subtitle: `A list by ${row.author.displayName}`,
    meta: `${row.list.itemCount} works`,
  });
  return {
    title: row.list.title,
    description: row.list.description ?? `A list of ${row.list.itemCount} works on Shipyard.`,
    openGraph: { title: row.list.title, images: image ? [image] : undefined },
  };
}

export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const row = await getListBySlug(db, slug);
  if (!row) notFound();
  const { list, author } = row;
  const items = await getListItems(db, list.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-balance text-3xl font-semibold tracking-tight">
        {list.title}
      </h1>
      <Link
        href={`/u/${author.username}`}
        className="mt-3 inline-flex items-center gap-2 hover:underline"
      >
        <Avatar user={author} size="sm" />
        <span className="text-sm font-medium">{author.displayName}</span>
      </Link>
      {list.description ? (
        <p className="text-foreground/90 mt-4 max-w-2xl">{list.description}</p>
      ) : null}

      <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {items.map(({ item, work }, i) => (
          <div key={item.id} className="relative">
            {list.isRanked ? (
              <span className="font-display bg-flare text-primary-foreground absolute -left-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full text-sm font-semibold shadow">
                {i + 1}
              </span>
            ) : null}
            <WorkCard work={work} />
            {item.note ? <p className="text-muted-foreground mt-1 text-xs">{item.note}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
