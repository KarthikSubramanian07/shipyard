/**
 * HTTP content negotiation between HTML (browsers) and Markdown (agents),
 * following https://acceptmarkdown.com: honour q-values, answer
 * `Accept: text/markdown` with Markdown, and 406 anything we can't serve.
 */

export type Representation = "html" | "markdown" | "unacceptable";

interface MediaRange {
  type: string;
  subtype: string;
  q: number;
}

function parseAccept(header: string): MediaRange[] {
  const ranges: MediaRange[] = [];
  for (const part of header.split(",")) {
    const [range, ...params] = part.trim().split(";");
    const [type, subtype] = (range ?? "").trim().toLowerCase().split("/");
    if (!type || !subtype) continue;
    let q = 1;
    for (const p of params) {
      const [k, v] = p.trim().split("=");
      if (k?.trim().toLowerCase() === "q") {
        const n = Number(v);
        q = Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : 0;
      }
    }
    ranges.push({ type, subtype, q });
  }
  return ranges;
}

/** Quality + specificity (3 exact, 2 type/*, 1 *\/*, 0 no match) for a media type. */
function score(ranges: MediaRange[], mediaType: string): { q: number; specificity: number } {
  const [type, subtype] = mediaType.split("/");
  let best = { q: 0, specificity: 0 };
  for (const r of ranges) {
    const specificity =
      r.type === type && r.subtype === subtype
        ? 3
        : r.type === type && r.subtype === "*"
          ? 2
          : r.type === "*" && r.subtype === "*"
            ? 1
            : 0;
    // The most specific matching range decides the quality (RFC 9110 §12.5.1).
    if (specificity > best.specificity) best = { q: r.q, specificity };
  }
  return best;
}

export function negotiate(accept: string | null | undefined): Representation {
  if (!accept || !accept.trim()) return "html";
  const ranges = parseAccept(accept);
  if (ranges.length === 0) return "html";

  const html = score(ranges, "text/html");
  const xhtml = score(ranges, "application/xhtml+xml");
  const htmlBest = xhtml.q > html.q ? xhtml : html;
  const md = score(ranges, "text/markdown");

  if (htmlBest.q <= 0 && md.q <= 0) return "unacceptable";
  if (md.q > htmlBest.q) return "markdown";
  if (md.q < htmlBest.q) return "html";
  // Equal quality: the explicitly named type wins (e.g. "text/markdown, */*").
  return md.specificity > htmlBest.specificity ? "markdown" : "html";
}

/** Page routes take part in negotiation; assets, APIs and RSC fetches don't. */
export function isNegotiablePath(pathname: string): boolean {
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/cdn-cgi/")) return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  // Files (robots.txt, og.png, ...) are served as-is; `.md` is our own suffix.
  return !last.includes(".") || last.endsWith(".md");
}

/** `/about.md` -> `/about`, `/index.md` -> `/`. Returns null when not a `.md` URL. */
export function stripMarkdownSuffix(pathname: string): string | null {
  if (!pathname.endsWith(".md")) return null;
  const base = pathname.slice(0, -3);
  if (base === "/index" || base === "") return "/";
  return base;
}

export function appendVary(headers: Headers, value: string): void {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", value);
    return;
  }
  const parts = existing.split(",").map((p) => p.trim().toLowerCase());
  if (parts.includes("*") || parts.includes(value.toLowerCase())) return;
  headers.set("vary", `${existing}, ${value}`);
}
