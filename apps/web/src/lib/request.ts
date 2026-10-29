import { headers } from "next/headers";

/** Prefer Cloudflare's connecting IP; fall back carefully for local/dev. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
