# Architecture

Shipyard is a monorepo with one app and one auxiliary worker, chosen so the whole thing runs inside Cloudflare's free tiers.

```
apps/web        Next.js 15 (App Router) → Cloudflare Workers via OpenNext
workers/og      Rust → WASM worker that renders OG share-card PNGs
```

## Request flow

- **Rendering.** Next.js runs on the Workers Node.js runtime (via `@opennextjs/cloudflare`). SEO-critical work/profile/fic/list pages are server-rendered on demand; the OpenNext incremental cache lives in R2 (strongly consistent, free egress).
- **Bindings.** `getCloudflareContext()` exposes `env` (D1, R2) inside route handlers, server components, and server actions. `src/db/index.ts` wraps `drizzle(env.DB)` in React `cache()` for a per-request client (sync in dynamic routes, `{ async: true }` for static/metadata contexts).
- **Mutations** go through **server actions** (`src/app/actions/*`). Interactive components (`use client`) call them with optimistic UI and `router.refresh()`.

## Data model (D1 / SQLite)

`src/db/schema.ts` is the single source of truth (Drizzle). Highlights:

- **`works`** - lightweight references to external media, unique on `(source, external_id)`. We store almost nothing: title, year, poster URL, a synopsis, and a JSON metadata blob. Imported lazily the first time someone logs a title.
- **`logs`** - one canonical log per `(user, work)`; carries a half-star rating (stored as an int 1-10), a one-line reaction, and an optional markdown review. This *is* the review - no separate table.
- **`fics` / `fic_chapters` / `fic_tags` / `kudos` / `fic_subscriptions`** - the fanfic system. Fics attach to a work; chapters support WIPs; kudos are one-per-reader; subscriptions drive new-chapter notifications.
- **`follows` / `likes` / `comments`** - the social graph. Likes and comments are polymorphic over an `(entity_type, entity_id)` pair; hot counters (`like_count`, `comment_count`, `kudos_count`) are denormalized and kept in sync in the service layer.
- **`activities`** - fan-out-on-write feed. Every log/review/fic/reaction/list append writes one row; the feed is a single indexed query over `activities` filtered to the people you follow.
- **`shelves` / `shelf_items`**, **`notifications`**, **`flags`** (moderation), **`rate_limits`** (D1-backed, since KV's free write tier is too small).

### Full-text search

`drizzle/0001_fts.sql` adds SQLite **FTS5** virtual tables (`works_fts`, `fics_fts`) kept in sync by triggers. They key off our text ids via an `UNINDEXED work_id` column (external-content FTS assumes integer rowids, which our ids aren't). Queries build a safe `MATCH` expression in `lib/services/search.ts` - each token quoted with a prefix `*`.

## Layers

```
app/(routes, actions, api)   ← Next.js - thin; resolves auth + calls services
lib/services/*               ← business logic; every fn takes `db` as its first arg
lib/media/*                  ← TMDB + Open Library adapters (pure mappers + fetch)
lib/auth/*                   ← sessions, password (scrypt), cookies, OAuth
db/                          ← Drizzle schema + client
components/                  ← design system (ui/) + feature components
```

The **services take `db` explicitly** rather than reaching for a global - that's what makes them testable in the `workerd` pool without a request context.

## Auth

- Password hashing uses native `node:crypto` **scrypt** (CPU-friendly on Workers; pure-JS Argon2/scrypt blow the CPU budget, and native bindings don't load).
- Sessions use the **hash-the-token** pattern: a random 20-byte base32 token goes in an `HttpOnly` cookie; the DB stores only its SHA-256. Sliding 30-day expiry.
- Google OAuth via **Arctic** (PKCE); the `id_token` is decoded for profile claims.

## Media & caching

TMDB and Open Library are queried live. Successful responses are cached at the edge for a day using the Workers Cache API (`fetch(url, { cf: { cacheTtl, cacheEverything } })`) - not KV, avoiding the 1k-writes/day free cap. Posters are hot-linked from the providers at request-appropriate sizes, so we never store or optimize images (that keeps us off any paid image tier). Only user avatars live in R2.

## Share cards (Rust)

`workers/og` builds a 1200×630 SVG per request from query params and rasterizes it to PNG with `resvg`/`usvg`/`tiny-skia` (all pure Rust, wasm-clean). Fonts are embedded via `include_bytes!`. All user text is XML-escaped before insertion (no SVG injection). Pages reference it through `og:image` `<meta>` tags built by `lib/og.ts`.

## Testing

Vitest runs two projects:

- **unit** (happy-dom) - pure logic (rating, slug, media mappers, password/session, FTS query builder) and React component tests.
- **workers** (`@cloudflare/vitest-pool-workers`) - integration tests against a real local D1 with migrations applied, exercising the service layer end-to-end (users, works, logs, aggregates, feed, likes, comments, fics, kudos, FTS).

The Rust worker has its own `cargo test` suite.
