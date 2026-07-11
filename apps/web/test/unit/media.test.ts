import { describe, expect, it } from "vitest";
import { scoreResult } from "@/lib/media";
import { olCover, mapOlDoc } from "@/lib/media/openlibrary";
import { mapMultiItem, parseTmdbExternalId, tmdbPoster } from "@/lib/media/tmdb";

describe("tmdb mapping", () => {
  it("maps a movie", () => {
    const r = mapMultiItem({ id: 603, media_type: "movie", title: "The Matrix", release_date: "1999-03-31", poster_path: "/x.jpg" });
    expect(r).toMatchObject({ source: "tmdb", externalId: "movie:603", type: "film", title: "The Matrix", year: 1999 });
    expect(r?.posterUrl).toBe("https://image.tmdb.org/t/p/w342/x.jpg");
  });

  it("maps a tv series", () => {
    const r = mapMultiItem({ id: 1399, media_type: "tv", name: "Game of Thrones", first_air_date: "2011-04-17" });
    expect(r).toMatchObject({ externalId: "tv:1399", type: "tv", title: "Game of Thrones", year: 2011 });
  });

  it("skips people and other media types", () => {
    expect(mapMultiItem({ id: 1, media_type: "person", name: "Someone" })).toBeNull();
  });

  it("parses composite external ids", () => {
    expect(parseTmdbExternalId("movie:603")).toEqual({ kind: "movie", id: "603" });
    expect(() => parseTmdbExternalId("bad")).toThrow();
  });

  it("builds poster urls", () => {
    expect(tmdbPoster(null)).toBeNull();
    expect(tmdbPoster("/a.jpg", "w500")).toBe("https://image.tmdb.org/t/p/w500/a.jpg");
  });
});

describe("open library mapping", () => {
  it("maps a search doc", () => {
    const r = mapOlDoc({ key: "/works/OL45883W", title: "Dune", author_name: ["Frank Herbert"], first_publish_year: 1965, cover_i: 240727 });
    expect(r).toMatchObject({ source: "openlibrary", externalId: "OL45883W", type: "book", title: "Dune", year: 1965, subtitle: "Frank Herbert" });
    expect(r.posterUrl).toBe("https://covers.openlibrary.org/b/id/240727-M.jpg");
  });

  it("builds cover urls", () => {
    expect(olCover(null)).toBeNull();
    expect(olCover(1, "L")).toBe("https://covers.openlibrary.org/b/id/1-L.jpg");
  });
});

describe("scoreResult", () => {
  const base = { source: "tmdb" as const, externalId: "movie:1", type: "film" as const, year: null, posterUrl: null, subtitle: null };
  it("ranks exact > prefix > includes > none", () => {
    expect(scoreResult({ ...base, title: "Dune" }, "dune")).toBe(3);
    expect(scoreResult({ ...base, title: "Dune: Part Two" }, "dune")).toBe(2);
    expect(scoreResult({ ...base, title: "A Dune Story" }, "dune")).toBe(1);
    expect(scoreResult({ ...base, title: "Nope" }, "dune")).toBe(0);
  });
});
