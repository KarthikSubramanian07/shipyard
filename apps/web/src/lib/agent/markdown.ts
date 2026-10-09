/**
 * Streaming HTML -> Markdown for agent responses, built on the Workers-native
 * HTMLRewriter (no DOM, no dependency). It reads only the page's <main>, so
 * site chrome (header, footer, inline scripts, RSC payload) never leaks in.
 */

type Token =
  | { kind: "open"; tag: string; attrs: Record<string, string> }
  | { kind: "close"; tag: string }
  | { kind: "text"; text: string };

export interface ExtractedPage {
  title: string;
  description: string;
  markdown: string;
}

const VOID = new Set(["img", "br", "hr", "input", "meta", "link", "source", "wbr", "area", "col"]);
const SKIP = new Set([
  "script",
  "style",
  "svg",
  "noscript",
  "template",
  "form",
  "button",
  "select",
]);
const BLOCK = new Set([
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "nav",
  "main",
  "figure",
  "figcaption",
  "table",
  "tr",
  "dl",
  "dt",
  "dd",
  "details",
  "summary",
]);

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  middot: "·",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code =
        e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

function resolveHref(href: string, base: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Turn the token stream from <main> into Markdown blocks. */
export function tokensToMarkdown(tokens: Token[], baseUrl: string): string {
  const blocks: { text: string; list: boolean }[] = [];
  let buf = "";
  let prefix = "";
  let isListItem = false;
  let skipDepth = 0;
  const lists: ("ul" | "ol")[] = [];
  const olCounters: number[] = [];
  const links: { start: number; href: string | null }[] = [];
  const hiddenStack: string[] = [];

  const flush = () => {
    let text = buf
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      // Link padding must not leave a gap before punctuation: "[x](y) ." -> "[x](y)."
      .replace(/\) ([.,;:!?])/g, ")$1")
      .trim();
    // Headings must stay on one line (e.g. an <h1> split with <br>).
    if (prefix.startsWith("#")) text = text.replace(/\n+/g, " ");
    if (text) blocks.push({ text: prefix + text, list: isListItem });
    buf = "";
    prefix = "";
    isListItem = false;
  };

  for (const t of tokens) {
    if (t.kind === "open") {
      const hidden = t.attrs["aria-hidden"] === "true" || "hidden" in t.attrs;
      if (skipDepth > 0 || SKIP.has(t.tag) || hidden) {
        if (!VOID.has(t.tag)) {
          skipDepth++;
          hiddenStack.push(t.tag);
        }
        continue;
      }
      const heading = /^h([1-6])$/.exec(t.tag);
      if (heading) {
        flush();
        prefix = `${"#".repeat(Number(heading[1]))} `;
      } else if (t.tag === "ul" || t.tag === "ol") {
        flush();
        lists.push(t.tag);
        olCounters.push(0);
      } else if (t.tag === "li") {
        flush();
        const depth = Math.max(lists.length - 1, 0);
        const ordered = lists[lists.length - 1] === "ol";
        if (ordered) olCounters[olCounters.length - 1]! += 1;
        prefix = "  ".repeat(depth) + (ordered ? `${olCounters[olCounters.length - 1]}. ` : "- ");
        isListItem = true;
      } else if (t.tag === "blockquote") {
        flush();
        prefix = "> ";
      } else if (t.tag === "hr") {
        flush();
        blocks.push({ text: "---", list: false });
      } else if (t.tag === "br") {
        buf += "\n";
      } else if (t.tag === "a") {
        links.push({ start: buf.length, href: resolveHref(t.attrs.href ?? "", baseUrl) });
      } else if (t.tag === "img") {
        const alt = (t.attrs.alt ?? "").trim();
        if (alt) buf += ` ${alt} `;
      } else if (BLOCK.has(t.tag)) {
        // Keep a list item's inline content together even when it's wrapped in divs.
        if (!isListItem) flush();
      }
    } else if (t.kind === "close") {
      if (skipDepth > 0) {
        if (hiddenStack[hiddenStack.length - 1] === t.tag) {
          hiddenStack.pop();
          skipDepth--;
        }
        continue;
      }
      if (/^h[1-6]$/.test(t.tag) || t.tag === "li" || t.tag === "blockquote") {
        flush();
      } else if (t.tag === "ul" || t.tag === "ol") {
        flush();
        lists.pop();
        olCounters.pop();
      } else if (t.tag === "a") {
        const link = links.pop();
        if (!link) continue;
        const inner = buf.slice(link.start).replace(/\s+/g, " ").trim();
        if (!inner) continue;
        buf = buf.slice(0, link.start) + (link.href ? ` [${inner}](${link.href}) ` : ` ${inner} `);
      } else if (BLOCK.has(t.tag) && !isListItem) {
        flush();
      }
    } else if (skipDepth === 0) {
      buf += decodeEntities(t.text).replace(/\s+/g, " ");
    }
  }
  flush();

  let out = "";
  blocks.forEach((b, i) => {
    if (i > 0) out += b.list && blocks[i - 1]!.list ? "\n" : "\n\n";
    out += b.text;
  });
  return out;
}

/** Extract title, description and Markdown body from an HTML response. */
export async function htmlToMarkdown(html: Response, baseUrl: string): Promise<ExtractedPage> {
  const tokens: Token[] = [];
  let title = "";
  let description = "";
  let mainDepth = 0;

  const rewriter = new HTMLRewriter()
    .on("title", {
      text(t) {
        title += t.text;
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        description = el.getAttribute("content") ?? "";
      },
    })
    .on("main", {
      element(el) {
        mainDepth++;
        el.onEndTag(() => {
          mainDepth--;
        });
      },
    })
    .on("main *", {
      element(element) {
        // The DOM lib's `Element` shadows HTMLRewriter's; narrow to what we use.
        const el = element as unknown as {
          tagName: string;
          attributes: Iterable<[string, string]>;
          selfClosing: boolean;
          onEndTag(handler: () => void): void;
        };
        const attrs: Record<string, string> = {};
        for (const [k, v] of el.attributes) attrs[k] = v;
        const tag = el.tagName.toLowerCase();
        tokens.push({ kind: "open", tag, attrs });
        if (!VOID.has(tag) && !el.selfClosing) {
          el.onEndTag(() => {
            tokens.push({ kind: "close", tag });
          });
        }
      },
    })
    .onDocument({
      text(t) {
        if (mainDepth > 0 && t.text) tokens.push({ kind: "text", text: t.text });
      },
    });

  await rewriter.transform(html).arrayBuffer();

  return {
    title: decodeEntities(title).trim(),
    description: decodeEntities(description).trim(),
    markdown: tokensToMarkdown(tokens, baseUrl),
  };
}
