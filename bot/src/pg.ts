import fs from "node:fs";
import path from "node:path";

import pg from "pg";

/** Supabase's own root CA: the pooler's certificate does not chain to a public one. */
const SUPABASE_CA = fs.readFileSync(path.join(__dirname, "..", "supabase-ca.pem"), "utf8");

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

/**
 * A small pool for one least-privilege database login (shift_voice_bot,
 * shift_quest_bot). TLS is verified against Supabase's CA; only a database on
 * this machine (local testing) is reached without TLS.
 */
export function createRolePool(databaseUrl: string, label: string): pg.Pool {
  const local = LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: local ? false : { ca: SUPABASE_CA, rejectUnauthorized: true },
    max: 2,
    idleTimeoutMillis: 60_000,
  });
  // An idle client dropping (pooler restart, network blip) must not crash the bot.
  pool.on("error", (error) => console.error(`[${label}] database connection error:`, error.message));
  return pool;
}
