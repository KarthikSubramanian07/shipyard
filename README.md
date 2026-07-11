<div align="center">

# ⛵ Shipyard

### Track everything. Rewrite anything. Ship your obsessions.

**Letterboxd for every story you've ever loved - and the ones you wish existed.**

Log the films, shows, and books you love. Then write the endings they *should* have had - attached right to the source, findable by everyone who felt the same way.

No signup wall to read. No paywall, ever. Runs on $0 infrastructure.

[![CI](https://github.com/KarthikSubramanian07/shipyard/actions/workflows/ci.yml/badge.svg)](https://github.com/KarthikSubramanian07/shipyard/actions/workflows/ci.yml)
&nbsp;·&nbsp; Next.js 15 + Cloudflare Workers + D1 + a Rust OG-card worker
&nbsp;·&nbsp; [Buy me a coffee ☕](https://buymeacoffee.com/winnerkarthik)

</div>

---

## Why Shipyard?

Fans have been split across half a dozen apps - Letterboxd (no fic), Goodreads (dead social layer), AO3 (no tracking), Tumblr (no structure), Reddit (no permanence). The person who finishes a show and *immediately* needs to rate it, rewatch it, rewrite the ending, and find three people who feel the same way has never had a single home.

Shipyard is that home. Three things it does that nothing else does *together*:

| | |
|---|---|
| 📖 **Track** | Log, rate (half-stars), and review films, TV, and books against a live database - TMDB + Open Library. Thirty seconds to log. That's the habit. |
| ✍️ **Create** | Write fanfic, alternate endings, missing scenes, and theories - attached directly to the work. Chapters, kudos, tags, subscriptions. |
| 🫂 **Connect** | Follow people whose taste you trust. A chronological feed of what they're watching and writing. Likes and threaded comments on everything. |

On Letterboxd the review *is* the creative act. On Shipyard, the review is the **starting point** - every logged work is a door into fan creativity.

## Features

- **Unified search** across films/TV (TMDB) and books (Open Library) with instant typeahead - works are imported lazily, only when someone actually logs one.
- **The log dialog** - half-star ratings, a one-line reaction, an optional full markdown review, spoiler tags. Fast.
- **Inline spoilers** - wrap anything in `>!like this!<` for a tap-to-reveal redaction bar, in reviews, comments, and fanfic. No more all-or-nothing hidden reviews.
- **Work pages** built for SEO and sharing - poster, backdrop banner, overview, reviews, fanfic, and "fans also loved" (taste-overlap discovery, pure SQL).
- **The fanfic moat** - a clean, iA-Writer-style editor. Types, ratings, canon-compliance, tone tags, pairings, chapters, kudos, and WIP subscriptions.
- **The Manifest** - save films/shows/books to your watchlist/readlist, plus a Favorites shelf, from any work. Shelves: Watched / Reading / Want / Favorites.
- **Social** - asymmetric follows, a real activity feed, likes, one-level threaded comments, notifications.
- **Share cards** - every work, review, and fic gets a beautiful 1200×630 Open Graph image rendered by a **Rust → WASM Cloudflare Worker**. Every share is an ad.
- **Auth** - email + password (native `node:crypto` scrypt) and Google OAuth (PKCE). Sessions use the hash-the-token pattern; a DB leak leaks nothing usable.
- **Dark + light** warm, hand-tuned themes. No AI-slop gradients.

## The look

Shipyard commits to a point of view: **warm industrial / maritime literary.** Where ships get built.

- **Flare** - a rust-vermilion (the signal flare). Primary action + brand.
- **Verdigris** - oxidized copper-teal. Aged metal on a hull. Secondary.
- **Brass** - tarnished gold. Kudos and highlights.
- On warm paper and warm ink - never pure black or white.
- Type: **Fraunces** (display), **Geist** (UI), **Newsreader** (long-form reading).

## Tech stack - free to ~100k DAU

Everything below sits inside a free tier. The only real cost is a domain (~$15/yr).

| Layer | Choice |
|---|---|
| Framework | **Next.js 15** (App Router) on **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare) |
| Database | **Cloudflare D1** (SQLite) + **Drizzle ORM** + SQLite **FTS5** search |
| Auth | Session cookies (`@oslojs/*`) + **Arctic** for Google OAuth + `node:crypto` scrypt |
| Media | TMDB (films/TV) + Open Library (books), cached at the edge via the Workers Cache API |
| Images | User avatars in **R2**; media posters always hot-linked (never stored) |
| Share cards | **Rust** worker (`workers-rs` + `resvg`/`tiny-skia`) → PNG |
| Styling | **Tailwind CSS v4** |
| Tests | **Vitest** - unit + component (happy-dom) + integration in real `workerd` via `@cloudflare/vitest-pool-workers` |
| CI/CD | **GitHub Actions** - lint, typecheck, test, build, and gated deploy |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

## Quick start

```bash
# prerequisites: Node 20+, pnpm 9, (Rust + wasm32 target only if you touch the OG worker)
pnpm install

cd apps/web
cp .dev.vars.example .dev.vars     # add your free TMDB v4 token

pnpm db:migrate:local              # create the local D1 schema
pnpm db:seed:local                 # optional: demo users, works, a fic
pnpm dev                           # http://localhost:3000
```

Grab a free TMDB token at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (use the **v4 Read Access Token**). Book search needs no key.

```bash
pnpm test          # unit + component + D1 integration tests
pnpm typecheck
pnpm build
```

## Repo layout

```
shipyard/
├─ apps/web/            Next.js app (routes, services, D1 schema, tests)
│  ├─ src/db/           Drizzle schema + client
│  ├─ src/lib/          auth, media adapters, services, utils
│  ├─ src/app/          routes + server actions + API handlers
│  ├─ src/components/   design system + feature components
│  └─ drizzle/          SQL migrations (incl. FTS5)
├─ workers/og/          Rust → WASM Open Graph card worker
└─ .github/workflows/   CI + deploy
```

## Deploying

Shipyard deploys to Cloudflare for free. The short version:

```bash
cd apps/web
wrangler d1 create shipyard-db          # paste the id into wrangler.jsonc
wrangler r2 bucket create shipyard-media
wrangler r2 bucket create shipyard-next-cache
wrangler secret put TMDB_BEARER
pnpm db:migrate:remote
pnpm deploy
```

Full walkthrough (Google OAuth, the Rust worker, GitHub Actions secrets, custom domain): [`docs/DEPLOY.md`](docs/DEPLOY.md). What you need to provide: [`docs/SETUP.md`](docs/SETUP.md).

## Roadmap

Launch is films, TV, and books done right. Next up, in order of demand: anime/manga (AniList), games (IGDB), an explicit-content tier (18+ opt-in, AO3-style), author tipping, and Shipyard Pro. See the product spec for the full plan.

## Support

Shipyard is free forever and runs on free infrastructure so it can stay that way. If it made your fandom feel a little more at home, you can **[buy me a coffee ☕](https://buymeacoffee.com/winnerkarthik)** - it genuinely helps.

## License

MIT. Film & TV data from TMDB (this product is not endorsed or certified by TMDB). Book data from Open Library.

<div align="center"><sub>Made for fans, by fans. This is where ships get built.</sub></div>
