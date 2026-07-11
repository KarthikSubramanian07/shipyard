import type { D1Migration } from "cloudflare:test";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    MEDIA: R2Bucket;
    TMDB_BEARER: string;
    TEST_MIGRATIONS: D1Migration[];
  }
}
