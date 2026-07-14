import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/og";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/settings", "/notifications", "/login", "/signup", "/write"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: new URL(APP_URL).host,
  };
}
