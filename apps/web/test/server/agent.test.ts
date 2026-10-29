import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withAgentNegotiation } from "@/lib/agent/handler";
import { htmlToMarkdown } from "@/lib/agent/markdown";
import { newId } from "@/lib/id";
import { getSitemapEntries, STATIC_PATHS } from "@/lib/services/sitemap";
import { createUser } from "@/lib/services/users";

const PAGE = `<!doctype html><html lang="en"><head>
<title>Succession · Shipyard</title>
<meta name="description" content="Fans rate Succession &amp; more.">
</head><body>
<header><a href="/login">Log in</a></header>
<main>
  <h1>Track everything.<br>Rewrite anything.</h1>
  <p>Letterboxd for every story you&apos;ve ever loved - <a href="/about">learn more</a>.</p>
  <svg aria-hidden="true"><text>icon</text></svg>
  <form><input name="q"><button>Search</button></form>
  <section><h2>Trending</h2>
    <ul><li><a href="/work/succession-2018"><img alt="Succession"></a></li><li><div>Past Lives</div></li></ul>
  </section>
  <script>self.__next_f.push("secret")</script>
</main>
<footer>Footer chrome</footer>
</body></html>`;

function htmlResponse(body = PAGE, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      vary: "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch",
      "cache-control": "private, no-store",
    },
  });
}

describe("htmlToMarkdown", () => {
  it("converts <main> to clean Markdown and ignores chrome", async () => {
    const page = await htmlToMarkdown(htmlResponse(), "https://example.test/");
    expect(page.title).toBe("Succession · Shipyard");
    expect(page.description).toBe("Fans rate Succession & more.");
    expect(page.markdown).toContain("# Track everything. Rewrite anything.");
    expect(page.markdown).toContain(
      "Letterboxd for every story you've ever loved - [learn more](https://example.test/about).",
    );
    expect(page.markdown).toContain("## Trending");
    expect(page.markdown).toContain(
      "- [Succession](https://example.test/work/succession-2018)\n- Past Lives",
    );
    for (const leaked of ["Log in", "Footer chrome", "icon", "secret", "Search"]) {
      expect(page.markdown).not.toContain(leaked);
    }
  });
});

describe("withAgentNegotiation", () => {
  const next = async (req: Request) => {
    const path = new URL(req.url).pathname;
    if (path === "/llms.txt")
      return new Response("# Shipyard", { headers: { "content-type": "text/plain" } });
    if (path === "/missing")
      return htmlResponse(PAGE.replace("<main>", "<main><h1>Lost at sea</h1>"), 404);
    return htmlResponse();
  };

  it("serves Markdown with Vary: Accept for Accept: text/markdown", async () => {
    const res = await withAgentNegotiation(
      new Request("https://example.test/", { headers: { accept: "text/markdown" } }),
      next,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("vary")).toBe("Accept");
    const body = await res.text();
    expect(body.startsWith("# Track everything.")).toBe(true);
    expect(body).toContain("> Fans rate Succession & more.");
    expect(body).toContain("https://example.test/llms.txt");
  });

  it("keeps HTML for browsers and adds Accept to Vary", async () => {
    const res = await withAgentNegotiation(
      new Request("https://example.test/", { headers: { accept: "text/html" } }),
      next,
    );
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("vary")).toMatch(/rsc, .*, Accept$/);
    expect(await res.text()).toContain("<main>");
  });

  it("supports the .md suffix", async () => {
    const res = await withAgentNegotiation(new Request("https://example.test/about.md"), next);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("content-location")).toBe("/about.md");
  });

  it("returns a Markdown 404 that points agents to llms.txt", async () => {
    const res = await withAgentNegotiation(
      new Request("https://example.test/missing", { headers: { accept: "text/markdown" } }),
      next,
    );
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    const body = await res.text();
    expect(body).toContain("404 - page not found");
    expect(body).toContain("(https://example.test/llms.txt)");
    expect(body).toContain("(https://example.test/sitemap.xml)");
  });

  it("answers 406 for unsupported types", async () => {
    const res = await withAgentNegotiation(
      new Request("https://example.test/", { headers: { accept: "application/json" } }),
      next,
    );
    expect(res.status).toBe(406);
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("returns an empty body for HEAD", async () => {
    const res = await withAgentNegotiation(
      new Request("https://example.test/", {
        method: "HEAD",
        headers: { accept: "text/markdown" },
      }),
      next,
    );
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(await res.text()).toBe("");
  });

  it("leaves files, RSC fetches and non-GET requests untouched", async () => {
    const txt = await withAgentNegotiation(
      new Request("https://example.test/llms.txt", { headers: { accept: "text/markdown" } }),
      next,
    );
    expect(txt.headers.get("content-type")).toBe("text/plain");
    const rsc = await withAgentNegotiation(
      new Request("https://example.test/", { headers: { accept: "text/markdown", rsc: "1" } }),
      next,
    );
    expect(rsc.headers.get("content-type")).toContain("text/html");
    const post = await withAgentNegotiation(
      new Request("https://example.test/", {
        method: "POST",
        headers: { accept: "application/json" },
      }),
      next,
    );
    expect(post.status).toBe(200);
  });
});

describe("getSitemapEntries", () => {
  it("lists static pages and public profiles, never auth screens", async () => {
    const db = drizzle(env.DB, { schema });
    const id = newId();
    await createUser(db, {
      username: `map${id}`.slice(0, 20),
      email: `${id}@example.test`,
      passwordHash: "scrypt$x",
      displayName: "Map Fan",
    });
    const entries = await getSitemapEntries(db);
    const paths = entries.map((e) => e.path);
    for (const p of STATIC_PATHS) expect(paths).toContain(p);
    expect(paths).toContain(`/u/${`map${id}`.slice(0, 20)}`);
    expect(paths).not.toContain("/login");
    expect(paths).not.toContain("/signup");
    expect(entries.find((e) => e.path.startsWith("/u/"))?.lastModified).toBeInstanceOf(Date);
  });
});
