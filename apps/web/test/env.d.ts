import type { D1Migration } from "cloudflare:test";

// The workers pool types `env` (from cloudflare:workers / cloudflare:test) as
// Cloudflare.Env. Augment it with the bindings our tests use.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      MEDIA: R2Bucket;
      TMDB_BEARER: string;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
