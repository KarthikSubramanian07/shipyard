import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/og";

const PUBLIC_PATHS = ["", "/about", "/discover"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${APP_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
