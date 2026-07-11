import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Runs once per worker before tests. applyD1Migrations is idempotent (it tracks
// applied migrations in a table), so this is safe even if invoked multiple times.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
