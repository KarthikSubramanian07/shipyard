import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// Use R2 for the Next incremental (ISR/SSG) cache. R2 is strongly consistent and
// egress is free, which keeps SEO-critical work pages fast and on the $0 path.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
