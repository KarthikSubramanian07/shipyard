# What Shipyard needs from you

Everything here is free. Gather these, then follow [`DEPLOY.md`](./DEPLOY.md).

## 1. TMDB API token (required)

Film & TV search/detail comes from TMDB.

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request a key (choose "Developer", non-commercial is fine).
3. Copy the **API Read Access Token (v4)** - the long `eyJ…` bearer token, *not* the short v3 key.
4. Local: put it in `apps/web/.dev.vars` as `TMDB_BEARER="…"`.
   Production: `wrangler secret put TMDB_BEARER`.

> Books come from Open Library, which needs **no key**.

## 2. Cloudflare account (required for deploy)

1. Sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up) (free plan).
2. Note your **Account ID** (Workers & Pages → Overview, right sidebar).
3. Create an **API token** (My Profile → API Tokens → Create) with permissions:
   - Account → **Workers Scripts**: Edit
   - Account → **D1**: Edit
   - Account → **Workers R2 Storage**: Edit
   - (for `drizzle-kit studio` against remote, optionally D1 read)
4. You'll create the actual D1 database and R2 buckets in `DEPLOY.md` and paste their ids into `apps/web/wrangler.jsonc` (the `PLACEHOLDER_*` values).

## 3. Google OAuth (optional)

Email + password works without this. To enable "Continue with Google":

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID (Web application).
2. Authorized redirect URIs:
   - `http://localhost:3000/login/google/callback` (dev)
   - `https://YOUR_DOMAIN/login/google/callback` (prod)
3. Local: add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to `.dev.vars`.
   Production: `wrangler secret put GOOGLE_CLIENT_ID` (and the secret).

## 4. Domain (optional, ~$15/yr)

The only real cost. Add it to Cloudflare and route it to the Worker (see `DEPLOY.md`). Until then you get a free `*.workers.dev` URL. Set `NEXT_PUBLIC_APP_URL` (and `NEXT_PUBLIC_OG_URL` if you deploy the Rust card worker) to your real origin.

## 5. GitHub Actions secrets (optional, for auto-deploy)

In your repo → Settings → Secrets and variables → Actions, add:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The deploy workflow skips itself automatically until these exist.

---

### Summary checklist

- [ ] TMDB v4 bearer token
- [ ] Cloudflare account id + API token
- [ ] D1 id + R2 bucket names in `wrangler.jsonc`
- [ ] (optional) Google OAuth client id/secret
- [ ] (optional) domain
- [ ] (optional) GitHub secrets for CI deploy
