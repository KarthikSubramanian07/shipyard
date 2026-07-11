import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug, workSlug } from "@/lib/slug";

describe("slugify", () => {
  it("normalizes text", () => {
    expect(slugify("Succession")).toBe("succession");
    expect(slugify("The Left Hand of Darkness")).toBe("the-left-hand-of-darkness");
    expect(slugify("Pedro Páramo")).toBe("pedro-paramo");
    expect(slugify("  Spaced  Out!! ")).toBe("spaced-out");
    expect(slugify("It's Complicated")).toBe("its-complicated");
  });

  it("never returns empty", () => {
    expect(slugify("")).toBe("untitled");
    expect(slugify("!!!")).toBe("untitled");
  });
});

describe("workSlug", () => {
  it("appends the year", () => {
    expect(workSlug("Succession", 2018)).toBe("succession-2018");
    expect(workSlug("Dune", null)).toBe("dune");
  });
});

describe("uniqueSlug", () => {
  it("appends an id suffix", () => {
    expect(uniqueSlug("My Fic", "abcdef123456")).toBe("my-fic-abcdef");
  });
});
