import fs from "node:fs";
import path from "node:path";

import pg from "pg";

import type { RosterRow } from "./roster";
import type { VoiceFlags } from "./state";

/**
 * Database access for SHIFT voice tracking, as the least-privilege
 * `shift_voice_bot` role (migration 20261109200000). That role can call the
 * four shift_voice_* functions and read no table, so this process never holds
 * the service role key.
 */

/** Supabase's own root CA: the pooler's certificate does not chain to a public one. */
const SUPABASE_CA = fs.readFileSync(path.join(__dirname, "..", "..", "supabase-ca.pem"), "utf8");

export function createVoicePool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { ca: SUPABASE_CA, rejectUnauthorized: true },
    max: 2,
    idleTimeoutMillis: 60_000,
  });
  // An idle client dropping (pooler restart, network blip) must not crash the bot.
  pool.on("error", (error) => console.error("[shift-voice] database connection error:", error.message));
  return pool;
}

/** Who a row belongs to. Null closes the open row without opening another. */
export interface TrackedStudent {
  cohort: string;
  applicationId: string | null;
  displayName: string | null;
}

/** Closes the student's open row and, when they are in voice, opens the next. Throws on failure. */
export async function voiceTransition(
  db: pg.Pool,
  discordUserId: string,
  student: TrackedStudent | null,
  flags: VoiceFlags,
  isJoin: boolean
): Promise<void> {
  await db.query("select public.shift_voice_transition($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", [
    discordUserId,
    student?.cohort ?? null,
    student?.applicationId ?? null,
    student?.displayName ?? null,
    student ? flags.channelId : null,
    flags.channelName,
    flags.micOpen,
    flags.streaming,
    flags.camera,
    isJoin,
  ]);
}

/** True when the heartbeat reached the database. */
export async function voiceBeat(db: pg.Pool): Promise<boolean> {
  try {
    await db.query("select public.shift_voice_beat()");
    return true;
  } catch (error) {
    console.error("[shift-voice] heartbeat failed:", (error as Error).message);
    return false;
  }
}

export async function voiceCloseAll(db: pg.Pool): Promise<number> {
  const { rows } = await db.query<{ n: number }>("select public.shift_voice_close_all() as n");
  return rows[0]?.n ?? 0;
}

export async function fetchRosterRows(db: pg.Pool, rounds: string[]): Promise<RosterRow[]> {
  const { rows } = await db.query<{
    application_id: string;
    cohort: string;
    discord_user_id: string;
    paid: boolean;
    created_at: Date;
  }>("select * from public.shift_voice_roster($1::text[])", [rounds]);
  return rows.map((row) => ({
    applicationId: row.application_id,
    cohort: row.cohort,
    discordUserId: row.discord_user_id,
    paid: row.paid,
    createdAt: row.created_at.toISOString(),
  }));
}
