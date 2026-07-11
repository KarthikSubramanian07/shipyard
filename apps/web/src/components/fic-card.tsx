import { BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ficLength, formatCount, pluralize } from "@/lib/utils";

export interface FicCardData {
  slug: string;
  title: string;
  summary: string | null;
  type: string;
  rating: string;
  canon: string;
  wordCount: number;
  chapterCount: number;
  kudosCount: number;
  isComplete: boolean;
  author: { username: string; displayName: string; avatarKey: string | null };
}

const TYPE_LABEL: Record<string, string> = {
  "alternate-ending": "Alternate ending",
  "missing-scene": "Missing scene",
  continuation: "Continuation",
  crossover: "Crossover",
  rewrite: "Rewrite",
  theory: "Theory",
  commentary: "Commentary",
};

export function FicCard({ fic }: { fic: FicCardData }) {
  return (
    <article className="border-border bg-card space-y-3 rounded-xl border p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/fic/${fic.slug}`} className="min-w-0">
          <h3 className="font-display hover:text-primary text-lg font-semibold leading-tight">
            {fic.title}
          </h3>
        </Link>
        <Badge variant="flare">{TYPE_LABEL[fic.type] ?? fic.type}</Badge>
      </div>

      {fic.summary ? (
        <p className="text-muted-foreground line-clamp-2 text-sm">{fic.summary}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{fic.rating}</Badge>
        <Badge variant="outline">{fic.canon}</Badge>
        <Badge variant="verdigris">{ficLength(fic.wordCount)}</Badge>
        {fic.isComplete ? <Badge variant="brass">complete</Badge> : <Badge>WIP</Badge>}
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <Link
          href={`/u/${fic.author.username}`}
          className="hover:text-foreground flex items-center gap-1.5"
        >
          <Avatar user={fic.author} size="sm" /> {fic.author.displayName}
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" /> {pluralize(fic.chapterCount, "ch")}
          </span>
          <span>{formatCount(fic.wordCount)} words</span>
          <span className="text-verdigris inline-flex items-center gap-1">
            <Sparkles className="size-3.5" /> {formatCount(fic.kudosCount)}
          </span>
        </div>
      </div>
    </article>
  );
}
