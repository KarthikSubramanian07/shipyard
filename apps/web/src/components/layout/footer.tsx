import { Coffee, Github } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const BMC_URL = "https://buymeacoffee.com/winnerkarthik";
const GITHUB_URL = "https://github.com/KarthikSubramanian07/shipyard";

export function SiteFooter() {
  return (
    <footer className="border-border mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-muted-foreground text-sm">
            Track everything. Rewrite anything. Ship your obsessions. Free forever - no signup wall
            to read, no paywall ever.
          </p>
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brass-soft text-brass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors hover:brightness-105"
          >
            <Coffee className="size-4" /> Buy me a coffee
          </a>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
          <FooterCol title="Explore">
            <FooterLink href="/discover">Discover</FooterLink>
            <FooterLink href="/search">Search</FooterLink>
          </FooterCol>
          <FooterCol title="Create">
            <FooterLink href="/write">Write a fic</FooterLink>
            <FooterLink href="/signup">Start tracking</FooterLink>
          </FooterCol>
          <FooterCol title="About">
            <FooterLink href="/about">What is Shipyard?</FooterLink>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <Github className="size-3.5" /> GitHub
            </a>
          </FooterCol>
        </div>
      </div>
      <div className="border-border border-t">
        <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-5 text-xs">
          Film &amp; TV data from TMDB. Book data from Open Library. Shipyard is not endorsed or
          certified by TMDB. Made for fans, by fans.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-foreground text-xs font-semibold uppercase tracking-wide">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-muted-foreground hover:text-foreground">
      {children}
    </Link>
  );
}
