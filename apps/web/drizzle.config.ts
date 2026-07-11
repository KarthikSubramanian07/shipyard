import { defineConfig } from "drizzle-kit";

// Generate-only config: drizzle-kit emits SQL into ./drizzle, and
// `wrangler d1 migrations apply` (which reads migrations_dir: "drizzle")
// applies it. We never let drizzle-kit talk to D1 directly.
export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
});
