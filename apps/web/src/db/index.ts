import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "./schema";

export type DB = DrizzleD1Database<typeof schema>;

/**
 * Drizzle client bound to D1 for the current request.
 * Use in dynamic routes / server actions (sync Cloudflare context).
 */
export const getDb = cache((): DB => {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
});

/**
 * Async variant required in statically-generated (SSG/ISR) contexts, where the
 * sync Cloudflare context isn't available at build time.
 */
export const getDbAsync = cache(async (): Promise<DB> => {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
});

export { schema };
