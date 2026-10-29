import { Bug, Coffee, Github, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach the people behind Shipyard: bug reports, feature ideas, content and takedown requests, and account help.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    icon: Bug,
    title: "Bugs & ideas",
    body: "Open an issue on GitHub. Include the page URL, what you expected, and what happened instead - screenshots help.",
    href: `${SITE.supportUrl}/new`,
    cta: "Open an issue",
  },
  {
    icon: ShieldAlert,
    title: "Content & takedowns",
    body: "To report a review, fic, list or profile - for harassment, spoilers, copyright or anything unsafe - open a GitHub issue titled “Report” or “Takedown” with the link and a short reason.",
    href: SITE.supportUrl,
    cta: "Report on GitHub",
  },
  {
    icon: Github,
    title: "Code & contributions",
    body: "Shipyard is open source under the MIT license. Pull requests, translations and design feedback are all welcome.",
    href: SITE.githubUrl,
    cta: "View the source",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Logo className="mb-8" />
      <h1 className="font-display text-balance text-4xl font-semibold tracking-tight">
        Hail the harbor.
      </h1>
      <p className="text-muted-foreground mt-4 text-balance text-lg">
        Shipyard is built and run by one independent developer, in the open. The fastest way to
        reach us is GitHub - every message there is read, and most get a reply within a few days.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <div key={c.title} className="border-border bg-card flex flex-col rounded-xl border p-5">
            <c.icon className="text-flare size-6" />
            <h2 className="font-display mt-3 text-lg font-semibold">{c.title}</h2>
            <p className="text-muted-foreground mt-1 flex-1 text-sm">{c.body}</p>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-4 text-sm font-medium hover:underline"
            >
              {c.cta} →
            </a>
          </div>
        ))}
      </div>

      <div className="text-foreground/90 mt-12 space-y-4">
        <h2 className="font-display text-2xl font-semibold">Account help</h2>
        <p>
          Locked out, want your data exported, or want your account and everything you posted
          deleted? Open an issue asking for it (don&apos;t post your password or email publicly) and
          we&apos;ll follow up to verify it&apos;s you. Deletion removes your profile, logs,
          reviews, lists and fics from Shipyard&apos;s database.
        </p>
        {SITE.contactEmail ? (
          <p>
            Prefer email? Write to{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="text-primary hover:underline">
              {SITE.contactEmail}
            </a>
            .
          </p>
        ) : null}
        <p>
          Shipyard is free and has no sales team, ads or sponsorships to pitch. If it&apos;s made
          your watchlist a little more fun, you can{" "}
          <a
            href={SITE.coffeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brass inline-flex items-center gap-1 font-medium hover:underline"
          >
            <Coffee className="size-4" /> buy the maker a coffee
          </a>
          .
        </p>
      </div>
    </div>
  );
}
