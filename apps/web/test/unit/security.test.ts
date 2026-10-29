import { describe, expect, it } from "vitest";
import { sanitizeMediaObjectKey } from "@/lib/media/keys";
import { safeNextPath } from "@/lib/redirect";
import { hasSpoilerMarkers, parseSpoilers } from "@/lib/spoilers";

describe("safeNextPath (open-redirect guard)", () => {
  it("allows same-site absolute paths", () => {
    expect(safeNextPath("/u/ada")).toBe("/u/ada");
    expect(safeNextPath("/work/dune-2021?tab=fanfic")).toBe("/work/dune-2021?tab=fanfic");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("falls back for empty / non-string / missing", () => {
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(42)).toBe("/");
    expect(safeNextPath("relative", "/home")).toBe("/home");
  });
});

describe("sanitizeMediaObjectKey", () => {
  it("accepts simple object keys", () => {
    expect(sanitizeMediaObjectKey("user_abc.jpg")).toBe("user_abc.jpg");
    expect(sanitizeMediaObjectKey("a.b-c_1")).toBe("a.b-c_1");
  });

  it("rejects path traversal and separators", () => {
    expect(sanitizeMediaObjectKey("../secrets")).toBeNull();
    expect(sanitizeMediaObjectKey("a/b")).toBeNull();
    expect(sanitizeMediaObjectKey("a\\b")).toBeNull();
    expect(sanitizeMediaObjectKey("")).toBeNull();
  });
});

describe("parseSpoilers", () => {
  it("returns a single segment when there are no markers", () => {
    expect(parseSpoilers("just text")).toEqual([{ text: "just text", spoiler: false }]);
  });

  it("splits around a spoiler", () => {
    expect(parseSpoilers("before >!the twist!< after")).toEqual([
      { text: "before ", spoiler: false },
      { text: "the twist", spoiler: true },
      { text: " after", spoiler: false },
    ]);
  });

  it("handles multiple spoilers and multiline", () => {
    const segs = parseSpoilers(">!a!< mid >!b\nc!<");
    expect(segs.filter((s) => s.spoiler).map((s) => s.text)).toEqual(["a", "b\nc"]);
  });

  it("leaves an unterminated marker as plain text", () => {
    expect(parseSpoilers("a >! not closed")).toEqual([{ text: "a >! not closed", spoiler: false }]);
  });

  it("detects markers", () => {
    expect(hasSpoilerMarkers("x >!y!< z")).toBe(true);
    expect(hasSpoilerMarkers("no markers here")).toBe(false);
  });
});
