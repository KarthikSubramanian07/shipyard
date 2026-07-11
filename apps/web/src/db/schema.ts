import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ── Enumerated value sets (kept as const tuples for typed columns) ────────── */

export const WORK_SOURCES = ["tmdb", "openlibrary", "googlebooks"] as const;
export const WORK_TYPES = ["film", "tv", "book"] as const;
export const FIC_TYPES = [
  "alternate-ending",
  "missing-scene",
  "continuation",
  "crossover",
  "rewrite",
  "theory",
  "commentary",
] as const;
export const FIC_RATINGS = ["general", "teen", "mature"] as const;
export const FIC_CANON = ["canon", "canon-divergent", "au", "crack"] as const;
export const FIC_TAG_KINDS = ["tone", "pairing", "freeform"] as const;
export const ENTITY_TYPES = ["log", "fic", "list", "reaction", "comment"] as const;
// Flares: expressive fandom reactions (one per user per entity, changeable).
export const FLARE_KEYS = ["heart", "peak", "sob", "mind", "more", "lol"] as const;
export type FlareKey = (typeof FLARE_KEYS)[number];
// The Stack: triage buckets for the pairwise rating system.
export const STACK_BUCKETS = ["loved", "fine", "nope"] as const;
export const SHELF_SLUGS = ["watched", "reading", "want", "favorites"] as const;
export const NOTIFICATION_TYPES = ["follow", "like", "comment", "kudos", "chapter"] as const;
export const ACTIVITY_KINDS = ["log", "review", "fic", "list", "reaction"] as const;

export type WorkSource = (typeof WORK_SOURCES)[number];
export type WorkType = (typeof WORK_TYPES)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];

/* ── Users & auth ──────────────────────────────────────────────────────────── */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    // Null for OAuth-only accounts.
    passwordHash: text("password_hash"),
    googleId: text("google_id"),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    pronouns: text("pronouns"),
    location: text("location"),
    // R2 object keys for self-hosted images, else null (avatar falls back to initials).
    avatarKey: text("avatar_key"),
    bannerKey: text("banner_key"),
    isPro: integer("is_pro", { mode: "boolean" }).notNull().default(false),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("users_username_unique").on(sql`lower(${t.username})`),
    uniqueIndex("users_email_unique").on(sql`lower(${t.email})`),
    uniqueIndex("users_google_unique").on(t.googleId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    // SHA-256 hash of the session token (the raw token lives only in the cookie).
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ── Works (lightweight cached references to external media) ───────────────── */

export const works = sqliteTable(
  "works",
  {
    id: text("id").primaryKey(),
    source: text("source", { enum: WORK_SOURCES }).notNull(),
    externalId: text("external_id").notNull(),
    type: text("type", { enum: WORK_TYPES }).notNull(),
    // URL-safe slug for pretty links: e.g. "succession-2018".
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    posterUrl: text("poster_url"),
    synopsis: text("synopsis"),
    // Extra provider metadata (cast/crew, authors, etc.) as JSON.
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("works_source_external_unique").on(t.source, t.externalId),
    uniqueIndex("works_slug_unique").on(t.slug),
    index("works_type_idx").on(t.type),
  ],
);

/* ── Logs & reviews ───────────────────────────────────────────────────────── */

export const logs = sqliteTable(
  "logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    // Half-star rating stored as an integer 1..10 (i.e. stars * 2). Null = unrated.
    // Derived from the Stack score; kept for aggregates + legacy display.
    rating: integer("rating"),
    // The Stack: triage bucket + derived 0-10 score (finer than `rating`).
    bucket: text("bucket", { enum: STACK_BUCKETS }),
    score: real("score"),
    // Progress-aware spoilers: this review discusses events up to this position
    // (season / chapter / part, per the work's medium). Null = no ahead-spoilers.
    spoilerUpTo: integer("spoiler_up_to"),
    // One-line reaction (the 30-second habit).
    reaction: text("reaction"),
    // Optional long-form review body (markdown).
    reviewBody: text("review_body"),
    hasSpoilers: integer("has_spoilers", { mode: "boolean" }).notNull().default(false),
    // Date the work was watched/read (unix seconds, day-precision by convention).
    loggedOn: integer("logged_on", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("logs_user_idx").on(t.userId, t.createdAt),
    index("logs_work_idx").on(t.workId, t.createdAt),
    // A user has at most one canonical log per work (re-logs update it).
    uniqueIndex("logs_user_work_unique").on(t.userId, t.workId),
  ],
);

/* ── Reactions (short-form hot takes) ─────────────────────────────────────── */

export const reactions = sqliteTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("reactions_work_idx").on(t.workId, t.createdAt)],
);

/* ── Fanfic (the moat) ────────────────────────────────────────────────────── */

export const fics = sqliteTable(
  "fics",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    type: text("type", { enum: FIC_TYPES }).notNull(),
    rating: text("rating", { enum: FIC_RATINGS }).notNull().default("general"),
    canon: text("canon", { enum: FIC_CANON }).notNull().default("canon-divergent"),
    isComplete: integer("is_complete", { mode: "boolean" }).notNull().default(false),
    // Denormalised counters kept in sync in the service layer.
    wordCount: integer("word_count").notNull().default(0),
    chapterCount: integer("chapter_count").notNull().default(0),
    kudosCount: integer("kudos_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    // The "inspired by" chain - spawns alternate-alternate endings.
    inspiredByFicId: text("inspired_by_fic_id"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("fics_work_idx").on(t.workId, t.publishedAt),
    index("fics_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("fics_slug_unique").on(t.slug),
    index("fics_inspired_idx").on(t.inspiredByFicId),
  ],
);

export const ficChapters = sqliteTable(
  "fic_chapters",
  {
    id: text("id").primaryKey(),
    ficId: text("fic_id")
      .notNull()
      .references(() => fics.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("chapters_fic_idx_unique").on(t.ficId, t.idx)],
);

export const ficTags = sqliteTable(
  "fic_tags",
  {
    ficId: text("fic_id")
      .notNull()
      .references(() => fics.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: FIC_TAG_KINDS }).notNull(),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.ficId, t.kind, t.tag] }), index("fic_tags_tag_idx").on(t.tag)],
);

export const kudos = sqliteTable(
  "kudos",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ficId: text("fic_id")
      .notNull()
      .references(() => fics.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ficId] })],
);

export const ficSubscriptions = sqliteTable(
  "fic_subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ficId: text("fic_id")
      .notNull()
      .references(() => fics.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ficId] })],
);

/* ── Lists ────────────────────────────────────────────────────────────────── */

export const lists = sqliteTable(
  "lists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isRanked: integer("is_ranked", { mode: "boolean" }).notNull().default(false),
    likeCount: integer("like_count").notNull().default(0),
    itemCount: integer("item_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("lists_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("lists_slug_unique").on(t.slug),
  ],
);

export const listItems = sqliteTable(
  "list_items",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("list_items_unique").on(t.listId, t.workId),
    index("list_items_list_idx").on(t.listId, t.position),
  ],
);

/* ── Shelves ──────────────────────────────────────────────────────────────── */

export const shelves = sqliteTable(
  "shelves",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("shelves_user_slug_unique").on(t.userId, t.slug)],
);

export const shelfItems = sqliteTable(
  "shelf_items",
  {
    shelfId: text("shelf_id")
      .notNull()
      .references(() => shelves.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    addedAt: integer("added_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.shelfId, t.workId] }),
    index("shelf_items_added_idx").on(t.shelfId, t.addedAt),
  ],
);

/* ── Media progress (powers progress-aware spoilers) ──────────────────────── */

export const mediaProgress = sqliteTable(
  "media_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    // Generic ordinal: season (tv), chapter/part (book), 0 for films.
    position: integer("position").notNull().default(0),
    label: text("label"),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.workId] })],
);

/* ── Social graph & interactions ──────────────────────────────────────────── */

export const follows = sqliteTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId),
  ],
);

export const likes = sqliteTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: text("entity_id").notNull(),
    // Which flare the user threw. One per user per entity, changeable.
    flare: text("flare", { enum: FLARE_KEYS }).notNull().default("heart"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.entityType, t.entityId] }),
    index("likes_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: text("entity_id").notNull(),
    // One level of threading only: a reply points at a top-level comment.
    parentId: text("parent_id"),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("comments_entity_idx").on(t.entityType, t.entityId, t.createdAt)],
);

/* ── Activity feed (fan-out-on-write) ─────────────────────────────────────── */

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ACTIVITY_KINDS }).notNull(),
    // Points at a log / fic / list / reaction id depending on kind.
    entityId: text("entity_id").notNull(),
    workId: text("work_id").references(() => works.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("activities_user_created_idx").on(t.userId, t.createdAt)],
);

/* ── Notifications ────────────────────────────────────────────────────────── */

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ENTITY_TYPES }),
    entityId: text("entity_id"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead, t.createdAt)],
);

/* ── Moderation ───────────────────────────────────────────────────────────── */

export const flags = sqliteTable(
  "flags",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: text("entity_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["open", "reviewed", "actioned", "dismissed"] })
      .notNull()
      .default("open"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("flags_reporter_entity_unique").on(t.reporterId, t.entityType, t.entityId),
    index("flags_status_idx").on(t.status, t.createdAt),
  ],
);

/* ── Rate limiting (D1-backed; KV free tier is too write-constrained) ─────── */

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at", { mode: "timestamp" }).notNull(),
});

/* ── Type exports ─────────────────────────────────────────────────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Work = typeof works.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type Fic = typeof fics.$inferSelect;
export type FicChapter = typeof ficChapters.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
