import { BookText, Clapperboard, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkType } from "@/db/schema";

const TYPE_ICON = { film: Clapperboard, tv: Tv, book: BookText } as const;

export function Poster({
  title,
  posterUrl,
  type,
  className,
}: {
  title: string;
  posterUrl?: string | null;
  type: WorkType;
  className?: string;
}) {
  const Icon = TYPE_ICON[type];
  return (
    <div
      className={cn(
        "border-border bg-muted relative aspect-[2/3] w-full overflow-hidden rounded-lg border shadow-sm",
        className,
      )}
    >
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt={title} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="bg-flare-wash flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
          <Icon className="text-muted-foreground size-6" />
          <span className="font-display text-foreground/80 line-clamp-4 text-sm font-medium">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
