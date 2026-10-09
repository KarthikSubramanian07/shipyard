import { htmlToMarkdown } from "./markdown";
import { appendVary, isNegotiablePath, negotiate, stripMarkdownSuffix } from "./negotiate";

type Next = (request: Request) => Promise<Response>;

const RSC_HEADERS = [
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
];
const MARKDOWN_TYPE = "text/markdown; charset=utf-8";

function isRscRequest(request: Request, url: URL): boolean {
  return url.searchParams.has("_rsc") || RSC_HEADERS.some((h) => request.headers.has(h));
}

function agentFooter(origin: string, status: number): string {
  const links =
    `[llms.txt](${origin}/llms.txt) · [sitemap](${origin}/sitemap.xml) · ` +
    `[search](${origin}/search) · [home](${origin}/index.md)`;
  if (status === 404) {
    return (
      `\n\n---\n\n**404 - page not found.** Nothing lives at this address on Shipyard. ` +
      `It may have been renamed or deleted. Start from the site index for agents instead: ${links}\n`
    );
  }
  return `\n\n---\n\nMore for agents: ${links}\n`;
}

async function renderMarkdown(
  request: Request,
  url: URL,
  pathname: string,
  next: Next,
): Promise<Response> {
  const target = new URL(url);
  target.pathname = pathname;
  const headers = new Headers(request.headers);
  headers.set("accept", "text/html");
  for (const h of RSC_HEADERS) headers.delete(h);
  const upstream = await next(new Request(target, { method: "GET", headers, redirect: "manual" }));

  const type = upstream.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) {
    const passthrough = new Response(upstream.body, upstream);
    appendVary(passthrough.headers, "Accept");
    return passthrough;
  }

  const page = await htmlToMarkdown(upstream, target.toString());
  let body = page.markdown;
  if (!/^# /m.test(body) && page.title) body = `# ${page.title}\n\n${body}`;
  if (page.description) body = body.replace(/^(# .*\n)/m, `$1\n> ${page.description}\n`);
  body += agentFooter(url.origin, upstream.status);

  const out = new Headers();
  out.set("content-type", MARKDOWN_TYPE);
  out.set("vary", "Accept");
  out.set("cache-control", upstream.headers.get("cache-control") ?? "no-store");
  out.set("content-location", target.pathname === "/" ? "/index.md" : `${target.pathname}.md`);
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);

  return new Response(request.method === "HEAD" ? null : body, {
    status: upstream.status,
    headers: out,
  });
}

/**
 * Wraps the Next.js handler so agents can ask any page for Markdown, either via
 * `Accept: text/markdown` or a `.md` suffix, while browsers keep getting HTML.
 * HTML page responses gain `Vary: Accept` so caches keep the two apart.
 */
export async function withAgentNegotiation(request: Request, next: Next): Promise<Response> {
  const url = new URL(request.url);
  const negotiable =
    (request.method === "GET" || request.method === "HEAD") &&
    isNegotiablePath(url.pathname) &&
    !isRscRequest(request, url);
  if (!negotiable) return next(request);

  const mdPath = stripMarkdownSuffix(url.pathname);
  if (mdPath !== null) return renderMarkdown(request, url, mdPath, next);

  const representation = negotiate(request.headers.get("accept"));
  if (representation === "markdown") return renderMarkdown(request, url, url.pathname, next);
  if (representation === "unacceptable") {
    return new Response(
      "406 Not Acceptable. Available representations: text/html, text/markdown.\n",
      {
        status: 406,
        headers: { "content-type": "text/plain; charset=utf-8", vary: "Accept" },
      },
    );
  }

  const response = await next(request);
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  const html = new Response(response.body, response);
  appendVary(html.headers, "Accept");
  return html;
}
