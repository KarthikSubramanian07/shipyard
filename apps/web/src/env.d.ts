// Cloudflare bindings available via `getCloudflareContext().env`.
// Keep in sync with wrangler.jsonc. (Can be regenerated with `pnpm cf-typegen`.)
declare global {
  interface CloudflareEnv {
    /** D1 (SQLite) - primary datastore. */
    DB: D1Database;
    /** R2 - user-uploaded avatars. Present only once R2 is enabled. */
    MEDIA?: R2Bucket;
    /** R2 - OpenNext incremental (ISR/SSG) cache. Optional. */
    NEXT_INC_CACHE_R2_BUCKET?: R2Bucket;
    /** Static assets fetcher (OpenNext). */
    ASSETS: Fetcher;

    // ---- vars ----
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_SITE_NAME: string;

    // ---- secrets (wrangler secret put / .dev.vars) ----
    /** TMDB v4 Read Access Token (Bearer). */
    TMDB_BEARER: string;
    /** Google OAuth 2.0 credentials (optional; email/password works without). */
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  }
}

export {};
