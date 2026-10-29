import { describe, expect, it } from "vitest";
import {
  appendVary,
  isNegotiablePath,
  negotiate,
  stripMarkdownSuffix,
} from "@/lib/agent/negotiate";
import { absoluteUrl, jsonLdScript, llmsTxt, SITE, siteJsonLd } from "@/lib/site";

describe("negotiate", () => {
  it("defaults to HTML for browsers and missing headers", () => {
    expect(negotiate(null)).toBe("html");
    expect(negotiate("")).toBe("html");
    expect(negotiate("*/*")).toBe("html");
    expect(negotiate("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")).toBe(
      "html",
    );
  });

  it("serves Markdown when agents ask for it", () => {
    expect(negotiate("text/markdown")).toBe("markdown");
    expect(negotiate("text/markdown, text/html;q=0.9")).toBe("markdown");
    expect(negotiate("text/markdown, */*")).toBe("markdown");
    expect(negotiate("text/*;q=0.5, text/markdown")).toBe("markdown");
  });

  it("honours q-values", () => {
    expect(negotiate("text/markdown;q=0.5, text/html")).toBe("html");
    expect(negotiate("text/html;q=0.1, text/markdown;q=0.2")).toBe("markdown");
    expect(negotiate("text/markdown;q=0, */*")).toBe("html");
  });

  it("rejects types it cannot serve", () => {
    expect(negotiate("application/json")).toBe("unacceptable");
    expect(negotiate("image/png, application/pdf")).toBe("unacceptable");
    expect(negotiate("text/html;q=0, text/markdown;q=0")).toBe("unacceptable");
  });
});

describe("isNegotiablePath", () => {
  it("covers page routes and .md URLs only", () => {
    expect(isNegotiablePath("/")).toBe(true);
    expect(isNegotiablePath("/work/succession-2018")).toBe(true);
    expect(isNegotiablePath("/about.md")).toBe(true);
    expect(isNegotiablePath("/llms.txt")).toBe(false);
    expect(isNegotiablePath("/sitemap.xml")).toBe(false);
    expect(isNegotiablePath("/_next/static/chunk.js")).toBe(false);
    expect(isNegotiablePath("/api/search")).toBe(false);
  });
});

describe("stripMarkdownSuffix", () => {
  it("maps .md URLs to their page", () => {
    expect(stripMarkdownSuffix("/about.md")).toBe("/about");
    expect(stripMarkdownSuffix("/index.md")).toBe("/");
    expect(stripMarkdownSuffix("/u/ada.md")).toBe("/u/ada");
    expect(stripMarkdownSuffix("/about")).toBeNull();
  });
});

describe("appendVary", () => {
  it("adds Accept without duplicating", () => {
    const h = new Headers({ vary: "rsc, next-router-state-tree" });
    appendVary(h, "Accept");
    expect(h.get("vary")).toBe("rsc, next-router-state-tree, Accept");
    appendVary(h, "Accept");
    expect(h.get("vary")).toBe("rsc, next-router-state-tree, Accept");
    const empty = new Headers();
    appendVary(empty, "Accept");
    expect(empty.get("vary")).toBe("Accept");
  });
});

describe("site identity", () => {
  it("builds absolute URLs on the site origin", () => {
    expect(absoluteUrl("/about")).toBe(`${SITE.url}/about`);
  });

  it("describes the product (not just the brand) in the title", () => {
    expect(SITE.title).toMatch(/Shipyard/);
    expect(SITE.title).toMatch(/tracker/);
  });

  it("emits Organization, WebSite and WebApplication JSON-LD", () => {
    const graph = (siteJsonLd()["@graph"] as Record<string, unknown>[]).map((n) => n["@type"]);
    expect(graph).toEqual(["Organization", "WebSite", "WebApplication"]);
    const org = (siteJsonLd()["@graph"] as Record<string, unknown>[])[0]!;
    expect(org.contactPoint).toMatchObject({
      "@type": "ContactPoint",
      contactType: "customer support",
    });
    expect(org.sameAs).toContain(SITE.githubUrl);
  });

  it("escapes JSON-LD so it cannot close its script tag", () => {
    expect(jsonLdScript({ x: "</script><b>" })).not.toContain("</script>");
  });
});

describe("llms.txt", () => {
  const txt = llmsTxt();

  it("follows the llmstxt.org structure", () => {
    const lines = txt.split("\n");
    expect(lines[0]).toBe("# Shipyard");
    expect(lines[2]?.startsWith("> ")).toBe(true);
    // Only one H1, and every other heading is an H2 section.
    expect(txt.match(/^# /gm)).toHaveLength(1);
    expect(txt.match(/^#{3,} /gm)).toBeNull();
    const h2 = txt.match(/^## .+$/gm);
    expect(h2).toEqual(["## Docs", "## Browse", "## Optional"]);
  });

  it("has only link-list entries inside H2 sections", () => {
    const sections = txt.split(/^## .+$/m).slice(1);
    for (const section of sections) {
      for (const line of section.split("\n").filter((l) => l.trim())) {
        expect(line).toMatch(/^- \[[^\]]+\]\([^)]+\)(: .+)?$/);
      }
    }
  });

  it("tells agents when and how to use Shipyard", () => {
    expect(txt).toContain("When to use Shipyard");
    expect(txt).toContain("Accept: text/markdown");
  });
});
