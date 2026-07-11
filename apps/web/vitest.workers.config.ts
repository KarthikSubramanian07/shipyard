import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  // Parse Drizzle-generated SQL migrations so the pool can apply them to the
  // local test D1 (see test/apply-migrations.ts).
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "drizzle"));

  return {
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
    test: {
      name: "workers",
      include: ["test/server/**/*.test.ts", "src/**/*.workers.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.test.jsonc" },
          miniflare: {
            // Exposed to the setup file so it can run migrations against DB.
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
