/**
 * Build a share-card URL served by the Rust OG worker. Returns undefined when
 * NEXT_PUBLIC_OG_URL isn't configured, so pages fall back to the static card.
 */
export function ogImageUrl(params: {
  type: "work" | "log" | "review" | "fic" | "list";
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  rating?: number | null;
  poster?: string | null;
}): string | undefined {
  const base = process.env.NEXT_PUBLIC_OG_URL;
  if (!base) return undefined;
  const u = new URL(`${base.replace(/\/$/, "")}/og`);
  u.searchParams.set("type", params.type);
  u.searchParams.set("title", params.title);
  if (params.subtitle) u.searchParams.set("subtitle", params.subtitle);
  if (params.meta) u.searchParams.set("meta", params.meta);
  if (params.rating != null) u.searchParams.set("rating", String(params.rating));
  if (params.poster) u.searchParams.set("poster", params.poster);
  return u.toString();
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
