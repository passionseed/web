import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

import { createQuestApi, type QuestApi } from "@/bot/src/quests/api";

import { SUPABASE_CA } from "./ca";

/**
 * The web island's only door into the quest database: a direct pg pool as the
 * least-privilege login shift_quest_web, which may EXECUTE an allowlist of
 * public.shift_quest_* functions and nothing else. Never supabase-js rpc:
 * those functions trust the actor they are given.
 *
 * Nothing here runs at import time. The pool is made on the first call
 * (the build and prerender run with placeholder env and no database) and kept
 * on globalThis, so one Fluid Compute instance shares it across concurrent
 * requests and dev hot reload does not leak pools.
 *
 * Serverless-safe on Vercel: the pool is attached to the function lifecycle
 * with attachDatabasePool, so an instance stays alive just long enough for
 * idle connections to close before it is suspended (no phantom connections
 * left on the pooler), and the idle timeout is short.
 *
 * Pooler-safe: in production this talks to Supavisor in transaction mode
 * (port 6543), where consecutive queries may land on different server
 * connections. So nothing here keeps session state (no SET, no LISTEN, no
 * temp tables, no pool.connect() transactions) and every query is a single
 * parameterized statement with no `name`, which pg sends as an unnamed
 * prepared statement. Per-role settings (statement_timeout) live on the role.
 */

/** 6: 20261111091200_shift_quest_ownership_web (quest 5 reads the ownership checklist). The bot still needs 2. */
export const REQUIRED_SCHEMA = 6;

const ENV_KEY = "SHIFT_QUEST_DATABASE_URL";
const NOT_CONFIGURED = "shift_quest_db_not_configured";
const SCHEMA_OUTDATED = "shift_quest_schema_outdated";
/** shift_quest_web, or shift_quest_web.<project ref> on the Supavisor pooler. */
const WEB_LOGIN = /^shift_quest_web(?:\.[A-Za-z0-9]+)?$/;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
/** Supavisor's transaction-mode port; 5432 on the pooler host is session mode. */
const TRANSACTION_POOLER_PORT = 6543;
const POOLER_HOST = /\.pooler\.supabase\.com$/;
/** Short, so Fluid Compute can let the instance sleep soon after the last request. */
export const IDLE_TIMEOUT_MS = 5_000;

interface QuestDb {
  url: string;
  pool: pg.Pool;
  api: QuestApi;
  /** Memoized schema check; cleared on failure so the next request retries. */
  schema: Promise<void> | null;
}

const globalForQuestDb = globalThis as typeof globalThis & { __shiftQuestWebPool?: QuestDb };

function notConfigured(): Error {
  return new Error(NOT_CONFIGURED);
}

/**
 * Pool settings from the URL, field by field rather than as a connection
 * string, so a `?sslmode=` in the URL can never loosen the TLS settings.
 */
function poolConfig(raw: string): pg.PoolConfig {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // The URL holds a password: never log it.
    console.error(`[shift-island] ${ENV_KEY} is not a valid URL`);
    throw notConfigured();
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    console.error(`[shift-island] ${ENV_KEY} must be a postgresql:// URL`);
    throw notConfigured();
  }
  const user = decodeURIComponent(url.username);
  if (!WEB_LOGIN.test(user)) {
    console.error(`[shift-island] ${ENV_KEY} must log in as shift_quest_web`);
    throw notConfigured();
  }
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1");
  if (!host) throw notConfigured();
  const local = LOCAL_HOSTS.has(host);
  const port = url.port ? Number(url.port) : 5432;
  if (POOLER_HOST.test(host) && port !== TRANSACTION_POOLER_PORT) {
    // Session mode holds one server connection per client for its lifetime,
    // which many function instances exhaust fast. It still works, so warn only.
    console.warn(`[shift-island] ${ENV_KEY} uses pooler port ${port}; use ${TRANSACTION_POOLER_PORT} (transaction mode)`);
  }

  return {
    host,
    port,
    user,
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    ssl: local ? false : { ca: SUPABASE_CA, rejectUnauthorized: true },
    // Above 1 so concurrent requests on one instance do not queue (Vercel's
    // advice), small because every warm instance holds its own pool.
    max: 2,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: 5_000,
    application_name: "shift-island-web",
  };
}

/**
 * Lets Vercel keep the instance alive until idle connections are closed. A
 * no-op outside a Vercel function (dev, tests, the build): the helper only
 * waits when VERCEL_URL and VERCEL_REGION are set. It never fails a request.
 */
function attachToFunctionLifecycle(pool: pg.Pool): void {
  try {
    attachDatabasePool(pool);
  } catch (error) {
    console.error("[shift-island] could not attach the database pool:", error instanceof Error ? error.message : "unknown");
  }
}

function questDb(): QuestDb {
  const url = process.env[ENV_KEY]?.trim();
  if (!url) throw notConfigured();

  const existing = globalForQuestDb.__shiftQuestWebPool;
  if (existing?.url === url) return existing;

  const pool = new pg.Pool(poolConfig(url));
  pool.on("error", (error) => console.error("[shift-island] database connection error:", error.message));
  attachToFunctionLifecycle(pool);
  if (existing) {
    // The URL changed (dev): retire the old pool.
    existing.pool.end().catch(() => undefined);
  }
  const db: QuestDb = { url, pool, api: createQuestApi(pool), schema: null };
  globalForQuestDb.__shiftQuestWebPool = db;
  return db;
}

/**
 * The shift_quest_* caller. Throws Error("shift_quest_db_not_configured") when
 * SHIFT_QUEST_DATABASE_URL is missing, malformed, or not the web login.
 */
export function questApi(): QuestApi {
  return questDb().api;
}

/**
 * Checks once per pool that the database has the board migrations
 * (shift_quest_schema_version() >= REQUIRED_SCHEMA). Throws Error("shift_quest_schema_outdated")
 * when it is older, or the QuestError / QuestDbError of the call.
 */
export function ensureSchema(): Promise<void> {
  const db = questDb();
  if (!db.schema) {
    const check = db.api.call<number>("shift_quest_schema_version").then((version) => {
      if (!(Number(version) >= REQUIRED_SCHEMA)) {
        console.error(`[shift-island] quest schema ${version} is older than ${REQUIRED_SCHEMA}`);
        throw new Error(SCHEMA_OUTDATED);
      }
    });
    db.schema = check;
    check.catch(() => {
      if (db.schema === check) db.schema = null;
    });
  }
  return db.schema;
}
