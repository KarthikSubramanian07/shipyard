import type { MetadataRoute } from "next";
import { absoluteUrl, SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account screens and APIs hold no public content.
      disallow: ["/api/", "/login", "/signup", "/settings", "/notifications", "/write"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(SITE.url).host,
  };
}
