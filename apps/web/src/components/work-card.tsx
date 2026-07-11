import Link from "next/link";
import type { WorkType } from "@/db/schema";
import { Poster } from "@/components/ui/poster";
import { Stars } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";

export interface WorkCardData {
  slug: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  type: WorkType;
}

export function WorkCard({
  work,
  stars,
  className,
}: {
  work: WorkCardData;
  stars?: number | null;
  className?: string;
}) {
  return (
    <Link href={`/work/${work.slug}`} className={cn("group block space-y-2", className)}>
      <div className="transition-transform group-hover:-translate-y-0.5">
        <Poster
          title={work.title}
          posterUrl={work.posterUrl}
          type={work.type}
          className="group-hover:ring-flare/40 ring-0 group-hover:ring-2"
        />
      </div>
      <div>
        <p className="group-hover:text-primary line-clamp-1 text-sm font-medium">{work.title}</p>
        <div className="flex items-center gap-2">
          {work.year ? <span className="text-muted-foreground text-xs">{work.year}</span> : null}
          {stars != null ? <Stars stars={stars} size={12} /> : null}
        </div>
      </div>
    </Link>
  );
}
