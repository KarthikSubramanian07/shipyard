import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Makes Cloudflare bindings (D1, R2, KV) available in `next dev` via
// getCloudflareContext(). No-op in production builds.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the tracing root to this app (avoids picking a stray parent lockfile).
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
  // Media posters are hotlinked from TMDB / Open Library at request-appropriate
  // sizes, so we skip Next's image optimizer entirely (keeps us on the $0 path —
  // no runtime image processing on Workers).
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
    ],
  },
  experimental: {
    // Trim the client bundle for these heavy icon/util packages.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
