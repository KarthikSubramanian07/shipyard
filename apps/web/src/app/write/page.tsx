import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SearchBox } from "@/components/search-box";

export const metadata: Metadata = { title: "Write a fic" };

export default async function WriteChooserPage() {
  await requireUser("/write");
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <PenLine className="text-flare mx-auto size-8" />
      <h1 className="font-display mt-4 text-3xl font-semibold">Write a fic</h1>
      <p className="text-muted-foreground mx-auto mt-3 max-w-md text-balance">
        Every fic on Shipyard is attached to something real - so it&apos;s findable by everyone who
        loved the same story. Search for the film, show, or book you want to write for.
      </p>
      <div className="mx-auto mt-8 max-w-md">
        <SearchBox autoFocus />
      </div>
      <p className="text-muted-foreground mt-4 text-sm">
        Open the work, then hit <span className="text-foreground font-medium">Write a fic</span>.
      </p>
    </div>
  );
}
