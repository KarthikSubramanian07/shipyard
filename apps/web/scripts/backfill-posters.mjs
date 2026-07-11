#!/usr/bin/env node
// Backfill posters + backdrops for TMDB works that were seeded without images.
// Requires a TMDB_BEARER token (env var, or apps/web/.dev.vars).
//
//   node scripts/backfill-posters.mjs            # local D1
//   node scripts/backfill-posters.mjs --remote   # production D1
//
// This is a one-shot convenience for the demo seed. Works imported through the
// app's search/resolve flow already get their images automatically.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REMOTE = process.argv.includes("--remote");
const DB = "shipyard-db";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/";

function tmdbToken() {
  if (process.env.TMDB_BEARER) return process.env.TMDB_BEARER;
  try {
    const vars = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8");
    const m = vars.match(/^\s*TMDB_BEARER\s*=\s*"?([^"\n]+)"?/m);
    if (m) return m[1].trim();
  } catch {
    /* no .dev.vars */
  }
  return null;
}

function d1(sql, json = false) {
  const args = ["wrangler", "d1", "execute", DB, REMOTE ? "--remote" : "--local", "--command", sql];
  if (json) args.push("--json");
  const out = execFileSync("npx", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  return json ? JSON.parse(out) : out;
}

const q = (s) => String(s).replace(/'/g, "''");

async function main() {
  const token = tmdbToken();
  if (!token) {
    console.error("No TMDB_BEARER found (env or .dev.vars). Set it first.");
    process.exit(1);
  }

  const rows =
    d1(
      "SELECT id, external_id, metadata FROM works WHERE source='tmdb' AND (poster_url IS NULL OR poster_url='')",
      true,
    )[0]?.results ?? [];

  if (rows.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }
  console.log(`Backfilling ${rows.length} work(s) on ${REMOTE ? "remote" : "local"} D1...`);

  for (const row of rows) {
    const [kind, tmdbId] = String(row.external_id).split(":");
    if ((kind !== "movie" && kind !== "tv") || !tmdbId) continue;

    const res = await fetch(`https://api.themoviedb.org/3/${kind}/${tmdbId}?language=en-US`, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`  ! ${row.external_id}: TMDB ${res.status}`);
      continue;
    }
    const data = await res.json();
    const posterUrl = data.poster_path ? `${TMDB_IMAGE}w500${data.poster_path}` : null;
    const backdropUrl = data.backdrop_path ? `${TMDB_IMAGE}w1280${data.backdrop_path}` : null;

    const meta = { ...(safeJson(row.metadata) ?? {}), backdropUrl };
    d1(
      `UPDATE works SET poster_url='${q(posterUrl ?? "")}', metadata='${q(JSON.stringify(meta))}' WHERE id='${q(row.id)}'`,
    );
    console.log(`  ✓ ${data.title ?? data.name}`);
  }
  console.log("Done.");
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
