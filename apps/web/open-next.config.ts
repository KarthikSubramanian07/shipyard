import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// R2 isn't enabled on the account yet, so we use the default (in-memory)
// incremental cache. To turn on persistent ISR caching later: enable R2, add the
// NEXT_INC_CACHE_R2_BUCKET binding in wrangler.jsonc, then:
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
export default defineCloudflareConfig();
