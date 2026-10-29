import { APP_URL } from "@/lib/og";

/**
 * Single source of truth for Shipyard's public identity: used by page
 * metadata, JSON-LD, llms.txt, robots.txt and the sitemap.
 */
export const SITE = {
  name: "Shipyard",
  url: APP_URL.replace(/\/$/, ""),
  title: "Shipyard - film, TV & book tracker with fanfiction",
  tagline: "Track everything. Rewrite anything.",
  description:
    "Shipyard is a free film, TV and book tracker with a fanfiction home: log and rank what you watch and read, review it, and write the endings it should've had.",
  githubUrl: "https://github.com/KarthikSubramanian07/shipyard",
  supportUrl: "https://github.com/KarthikSubramanian07/shipyard/issues",
  coffeeUrl: "https://buymeacoffee.com/winnerkarthik",
  ogImage: "/og.png",
  // Optional public contact inbox. Unset by default so no personal address is
  // published without an explicit decision; set NEXT_PUBLIC_CONTACT_EMAIL.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE.url}/`).toString();
}

/** Schema.org graph for the homepage: who runs Shipyard and what it is. */
export function siteJsonLd(): Record<string, unknown> {
  const org = `${SITE.url}/#organization`;
  const contactPoint: Record<string, unknown> = {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: SITE.supportUrl,
    availableLanguage: ["en"],
  };
  if (SITE.contactEmail) contactPoint.email = SITE.contactEmail;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: SITE.name,
        url: `${SITE.url}/`,
        logo: absoluteUrl("/favicon.svg"),
        image: absoluteUrl(SITE.ogImage),
        description: SITE.description,
        sameAs: [SITE.githubUrl, SITE.coffeeUrl],
        contactPoint,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        name: SITE.name,
        url: `${SITE.url}/`,
        description: SITE.description,
        inLanguage: "en",
        publisher: { "@id": org },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE.url}/#app`,
        name: SITE.name,
        url: `${SITE.url}/`,
        description: SITE.description,
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Any (web browser)",
        isAccessibleForFree: true,
        image: absoluteUrl(SITE.ogImage),
        publisher: { "@id": org },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Log, rate and review films, TV shows and books",
          "Rank what you've seen with head-to-head comparisons",
          "Write and read fanfiction attached to the source work",
          "Curate ranked lists and follow other fans",
        ],
      },
    ],
  };
}

/** Serialise JSON-LD safely for an inline <script> (no `</script>` breakout). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * llms.txt per https://llmstxt.org: H1, blockquote summary, heading-free
 * details (incl. when-to-use guidance), then H2-delimited link lists.
 */
export function llmsTxt(): string {
  const u = (p: string) => absoluteUrl(p);
  return `# ${SITE.name}

> ${SITE.description} Every review, list, profile and fic is public and readable without an account.

**When to use Shipyard** - reach for it when a user wants to:

- Find what fans think of a specific film, TV show or book: open \`${u("/search?q=TITLE")}\` and follow the work link to read ratings and reviews.
- Read fanfiction, alternate endings or missing scenes for a work: each work page lists its fics, and fic pages hold the full chapters.
- Look up a fan's taste: profiles at \`${u("/u/USERNAME")}\` show their logs, ranked stack and lists.
- Discover what is trending among fans right now: \`${u("/discover")}\`.

Shipyard is not a streaming service, store or general encyclopedia - it holds fan ratings, reviews, lists and fiction, with film/TV metadata from TMDB and book metadata from Open Library.

**How to call it** - Shipyard has no public write API. Agents should read pages over plain HTTPS GET. Every page negotiates Markdown: send \`Accept: text/markdown\` (or append \`.md\` to the path, e.g. \`${u("/about.md")}\`) to get a clean Markdown version. Logging, reviewing and writing require a signed-in human; do not attempt to automate sign-in.

## Docs

- [About Shipyard](${u("/about.md")}): what Shipyard is and who it is for
- [Contact](${u("/contact.md")}): how to reach the maintainer, report bugs or request takedowns
- [Privacy](${u("/privacy.md")}): what data Shipyard stores and why

## Browse

- [Home](${u("/index.md")}): trending works and the latest public activity
- [Discover](${u("/discover.md")}): trending works, fics and lists
- [Search](${u("/search.md")}): search films, TV and books by title (\`?q=\`)

## Optional

- [Sitemap](${u("/sitemap.xml")}): every public work, fic, list and profile
- [Source code](${SITE.githubUrl}): MIT-licensed Next.js app on Cloudflare Workers
`;
}
