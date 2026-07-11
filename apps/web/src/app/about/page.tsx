import { BookText, Coffee, Heart, PenLine, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "What is Shipyard?",
  description: "The first place built for the whole fan — track, create, and connect in one home.",
};

const PILLARS = [
  {
    icon: BookText,
    title: "Track",
    body: "Log, rate, and review films, TV, and books against a live database. Thirty seconds to log. The habit.",
  },
  {
    icon: PenLine,
    title: "Create",
    body: "Write fanfic, alternate endings, missing scenes, and theories — attached directly to the source work.",
  },
  {
    icon: Users,
    title: "Connect",
    body: "Follow people whose taste you trust. Discover what they're reading and writing. Argue in the comments.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Logo className="mb-8" />
      <h1 className="font-display text-balance text-4xl font-semibold tracking-tight">
        The first place built for the whole fan.
      </h1>
      <p className="text-muted-foreground mt-4 text-balance text-lg">
        Fans have been split across Letterboxd (no fic), Goodreads (dead social layer), AO3 (no
        tracking), Tumblr (no structure), Reddit (no permanence). Shipyard puts it in one home —
        where ships get built.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="border-border bg-card rounded-xl border p-5">
            <p.icon className="text-flare size-6" />
            <h2 className="font-display mt-3 text-lg font-semibold">{p.title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="text-foreground/90 mt-12 space-y-4">
        <h2 className="font-display text-2xl font-semibold">Free forever</h2>
        <p>
          No signup wall to read. No paywall, ever. The core is complete and always will be —
          Shipyard runs on free infrastructure so it can stay that way.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/signup">
            <Heart /> Join the crew
          </Link>
        </Button>
        <a
          href="https://buymeacoffee.com/winnerkarthik"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brass-soft text-brass inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium hover:brightness-105"
        >
          <Coffee className="size-4" /> Buy the maker a coffee
        </a>
      </div>
    </div>
  );
}
