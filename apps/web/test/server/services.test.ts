import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { shelves } from "@/db/schema";
import { newId } from "@/lib/id";
import type { MediaDetail } from "@/lib/media/types";
import { getFollowingFeed } from "@/lib/services/feed";
import { createFic, getFicsForWork, toggleKudos } from "@/lib/services/fics";
import { getReviewsForWork, upsertLog } from "@/lib/services/logs";
import { searchWorks } from "@/lib/services/search";
import { addComment, follow, toggleLike } from "@/lib/services/social";
import { createUser, getProfileStats } from "@/lib/services/users";
import { getWorkAggregate, getWorkBySlug, upsertWork } from "@/lib/services/works";

const db = drizzle(env.DB, { schema });

async function makeUser(name = "fan") {
  const id = newId();
  return createUser(db, {
    username: `${name}${id}`.slice(0, 20),
    email: `${id}@example.test`,
    passwordHash: "scrypt$x",
    displayName: "Test Fan",
  });
}

function detail(overrides: Partial<MediaDetail> = {}): MediaDetail {
  return {
    source: "tmdb",
    externalId: `movie:${newId()}`,
    type: "film",
    title: "Test Work",
    year: 2018,
    posterUrl: null,
    subtitle: "Film",
    synopsis: "A media dynasty at war.",
    metadata: {},
    ...overrides,
  };
}

describe("users & shelves", () => {
  it("creates default shelves for a new user", async () => {
    const user = await makeUser();
    const rows = await db.select().from(shelves).where(eq(shelves.userId, user.id));
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.slug).sort()).toEqual(["favorites", "reading", "want", "watched"]);
  });
});

describe("works", () => {
  it("upserts idempotently on (source, external_id)", async () => {
    const d = detail();
    const a = await upsertWork(db, d);
    const b = await upsertWork(db, d);
    expect(a.id).toBe(b.id);
    expect(await getWorkBySlug(db, a.slug)).toBeTruthy();
  });
});

describe("logs & aggregates", () => {
  it("records ratings and computes the average", async () => {
    const work = await upsertWork(db, detail({ title: "Aggregate Test" }));
    const u1 = await makeUser();
    const u2 = await makeUser();
    await upsertLog(db, { userId: u1.id, workId: work.id, rating: 10 });
    await upsertLog(db, { userId: u2.id, workId: work.id, rating: 8 });
    const agg = await getWorkAggregate(db, work.id);
    expect(agg.ratingCount).toBe(2);
    expect(agg.averageStars).toBe(4.5);
  });

  it("upserting the same user+work updates rather than duplicates", async () => {
    const work = await upsertWork(db, detail());
    const user = await makeUser();
    await upsertLog(db, { userId: user.id, workId: work.id, rating: 6 });
    await upsertLog(db, { userId: user.id, workId: work.id, rating: 10 });
    const agg = await getWorkAggregate(db, work.id);
    expect(agg.ratingCount).toBe(1);
    expect(agg.averageStars).toBe(5);
  });

  it("surfaces reviews with a body", async () => {
    const work = await upsertWork(db, detail());
    const user = await makeUser();
    await upsertLog(db, { userId: user.id, workId: work.id, rating: 9, reviewBody: "Devastating." });
    const reviews = await getReviewsForWork(db, work.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.log.reviewBody).toBe("Devastating.");
  });
});

describe("social graph & feed", () => {
  it("shows a followee's activity in the feed", async () => {
    const author = await makeUser();
    const follower = await makeUser();
    const work = await upsertWork(db, detail({ title: "Feed Work" }));
    await upsertLog(db, { userId: author.id, workId: work.id, rating: 8 });
    await follow(db, follower.id, author.id);

    const feed = await getFollowingFeed(db, follower.id);
    expect(feed.length).toBeGreaterThanOrEqual(1);
    expect(feed.some((f) => f.author.id === author.id && f.activity.kind === "log")).toBe(true);
  });

  it("toggles likes and keeps the counter in sync", async () => {
    const work = await upsertWork(db, detail());
    const author = await makeUser();
    const liker = await makeUser();
    const logId = await upsertLog(db, { userId: author.id, workId: work.id, rating: 7 });

    expect(await toggleLike(db, liker.id, "log", logId)).toBe(true);
    let row = await db.select().from(schema.logs).where(eq(schema.logs.id, logId)).get();
    expect(row!.likeCount).toBe(1);

    expect(await toggleLike(db, liker.id, "log", logId)).toBe(false);
    row = await db.select().from(schema.logs).where(eq(schema.logs.id, logId)).get();
    expect(row!.likeCount).toBe(0);
  });

  it("adds comments and bumps the count", async () => {
    const work = await upsertWork(db, detail());
    const author = await makeUser();
    const logId = await upsertLog(db, { userId: author.id, workId: work.id, reviewBody: "hi" });
    const commenter = await makeUser();
    await addComment(db, {
      userId: commenter.id,
      entityType: "log",
      entityId: logId,
      body: "Great take",
      ownerId: author.id,
    });
    const row = await db.select().from(schema.logs).where(eq(schema.logs.id, logId)).get();
    expect(row!.commentCount).toBe(1);
  });
});

describe("fics", () => {
  it("publishes a fic and toggles kudos", async () => {
    const work = await upsertWork(db, detail({ title: "Fic Work" }));
    const author = await makeUser();
    const reader = await makeUser();
    const { id } = await createFic(db, author.id, work.id, {
      title: "The Ending It Deserved",
      summary: "What if?",
      type: "alternate-ending",
      rating: "general",
      canon: "canon-divergent",
      tone: ["angst", "slow burn"],
      pairing: "A/B",
      body: "Once upon a time ".repeat(50),
    });

    const forWork = await getFicsForWork(db, work.id);
    expect(forWork.some((f) => f.fic.id === id)).toBe(true);

    expect(await toggleKudos(db, reader.id, id)).toBe(true);
    const fic = await db.select().from(schema.fics).where(eq(schema.fics.id, id)).get();
    expect(fic!.kudosCount).toBe(1);
    expect(fic!.chapterCount).toBe(1);
  });

  it("counts fics in profile stats", async () => {
    const work = await upsertWork(db, detail());
    const author = await makeUser();
    await createFic(db, author.id, work.id, {
      title: "Stat Fic",
      type: "theory",
      rating: "general",
      canon: "canon",
      tone: [],
      body: "words words words",
    });
    const stats = await getProfileStats(db, author.id);
    expect(stats.fics).toBe(1);
  });
});

describe("full-text search (FTS5)", () => {
  it("finds a work by title token", async () => {
    const unique = `Zephyr${newId().slice(0, 6)}`;
    await upsertWork(db, detail({ title: `${unique} Chronicles` }));
    const hits = await searchWorks(db, unique);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]!.title).toContain(unique);
  });
});
