# Deploying Shipyard

Target: **Cloudflare Workers** (Next.js via OpenNext) + **D1** + **R2**, with the optional **Rust OG-card worker**. All within free tiers.

Prerequisites: everything in [`SETUP.md`](./SETUP.md), plus `pnpm install` at the repo root. Authenticate wrangler once with `npx wrangler login` (or export `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).

## 1. Create the Cloudflare resources

```bash
cd apps/web

# D1 database — copy the printed database_id
npx wrangler d1 create shipyard-db

# R2 buckets (avatars + the OpenNext incremental cache)
npx wrangler r2 bucket create shipyard-media
npx wrangler r2 bucket create shipyard-next-cache
```

Open `apps/web/wrangler.jsonc` and replace `PLACEHOLDER_D1_DATABASE_ID` with the id from `d1 create`. The R2 bucket bindings are already wired to the names above.

## 2. Secrets

```bash
npx wrangler secret put TMDB_BEARER          # required
npx wrangler secret put GOOGLE_CLIENT_ID     # optional
npx wrangler secret put GOOGLE_CLIENT_SECRET # optional
```

Set `NEXT_PUBLIC_APP_URL` in `wrangler.jsonc` `vars` to your production origin (e.g. `https://shipyard.gg`). If you deploy the OG worker, also add `NEXT_PUBLIC_OG_URL` there (build-time inlined; used for share-card `<meta>` tags).

## 3. Migrate & deploy the app

```bash
pnpm db:migrate:remote      # applies drizzle/*.sql (incl. FTS5) to remote D1
pnpm db:seed:remote         # optional demo data
pnpm deploy                 # opennextjs-cloudflare build && deploy
```

`pnpm deploy` builds the OpenNext worker bundle (`.open-next/worker.js`) and uploads it with your assets. You'll get a `*.workers.dev` URL immediately.

## 4. Custom domain (optional)

Add your domain to Cloudflare, then in the dashboard: **Workers & Pages → shipyard → Settings → Domains & Routes → Add custom domain**. Update `NEXT_PUBLIC_APP_URL` and the Google OAuth redirect URI to match, and redeploy.

## 5. The Rust OG-card worker (optional but recommended)

Renders share cards. Lives in `workers/og/`.

```bash
cd workers/og
rustup target add wasm32-unknown-unknown
cargo install worker-build --version "^0.1"
# worker 0.5 needs a matching wasm-bindgen CLI:
cargo install -f wasm-bindgen-cli --version 0.2.126
npx wrangler@4 deploy
```

Point the app at it by setting `NEXT_PUBLIC_OG_URL` (e.g. `https://shipyard-og.<subdomain>.workers.dev`) in `apps/web/wrangler.jsonc` and rebuilding. Without it, pages fall back to the static OG image — nothing breaks. See `workers/og/README.md` for the wasm-bindgen version note.

## 6. Continuous deployment (optional)

Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets. On push to `main`, `.github/workflows/deploy.yml` runs remote migrations and deploys both workers. It no-ops when the secrets aren't set.

## Free-tier notes

- **D1**: 5 GB / account, 500 MB per database, 5M row-reads/day, 100k row-writes/day.
- **Workers**: 100k requests/day.
- **R2**: 10 GB storage, egress free. Posters are hot-linked (not stored); only avatars use R2.
- External API responses are cached at the edge (Workers Cache API), not KV, to avoid KV's 1k-writes/day free cap.
