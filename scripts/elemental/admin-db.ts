/**
 * What the Elemental staff scripts share: the admin connection from
 * ELEMENTAL_ADMIN_DATABASE_URL, a fake-able database client, error text with
 * every secret blanked out, and the entry-point wrapper.
 *
 *   scripts/elemental/seed.ts               guild settings, editions, element boards
 *   scripts/elemental/issue-claims.ts       /join codes for paid registrations
 *   scripts/elemental/set-role-password.ts  LOGIN and a password for elemental_bot
 *
 * Secrets: the admin URL is read from the environment only (never a file,
 * never a flag), is never printed, and is taken apart field by field so a
 * `?sslmode=` in it cannot turn TLS verification off.
 */
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

export const ADMIN_URL_ENV = "ELEMENTAL_ADMIN_DATABASE_URL";

/** The repo root (scripts/elemental/..). */
export const REPO_ROOT = path.join(__dirname, "..", "..");

/** Git-ignored output folder for codes and the local seed config. */
export const LOCAL_DIR = path.join(__dirname, "local");

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

/** A mistake in how a script was called or configured: exit 2 with this message. */
export class UsageError extends Error {}

/** A refusal or failure the operator must act on: exit 1 with this message. */
export class StopError extends Error {}

export interface DbClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

/** Environment variables (process.env in the entry points). */
export type Env = Record<string, string | undefined>;

export interface Deps {
  env: Env;
  connect(config: pg.ClientConfig): Promise<DbClient>;
  out(line: string): void;
  err(line: string): void;
}

let cachedCa: string | null = null;
function supabaseCa(): string {
  // bot/supabase-ca.pem: Supabase's root CA (public). Direct and pooler
  // certificates chain to it, not to a public root.
  cachedCa ??= fs.readFileSync(path.join(REPO_ROOT, "bot", "supabase-ca.pem"), "utf8");
  return cachedCa;
}

/** Connection settings for the admin URL. Throws UsageError naming the variable, never its value. */
export function adminClientConfig(raw: string, application: string): pg.ClientConfig {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UsageError(`${ADMIN_URL_ENV} is not a valid URL`);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new UsageError(`${ADMIN_URL_ENV} must be a postgresql:// URL`);
  }
  const user = decodeURIComponent(url.username);
  if (!user || /^elemental_bot(\.|$)/.test(user)) {
    throw new UsageError(`${ADMIN_URL_ENV} must log in as an admin (postgres), not as elemental_bot`);
  }
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1");
  if (!host) throw new UsageError(`${ADMIN_URL_ENV} has no host`);
  return {
    host,
    port: url.port ? Number(url.port) : 5432,
    user,
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    ssl: LOCAL_HOSTS.has(host) ? false : { ca: supabaseCa(), rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000,
    application_name: application,
  };
}

/** The admin connection settings from the environment, plus the strings that must never be printed. */
export function readAdmin(env: Env, application: string): { config: pg.ClientConfig; secrets: string[] } {
  const raw = env[ADMIN_URL_ENV]?.trim();
  if (!raw) throw new UsageError(`Missing required environment variable: ${ADMIN_URL_ENV}`);
  const config = adminClientConfig(raw, application);
  return { config, secrets: [raw, String(config.password ?? "")] };
}

/** 'el:<code>' raised on purpose by the Elemental SQL, as <code>; else null. */
export function elCode(error: unknown): string | null {
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" && /^el:[a-z_]+$/.test(message) ? message.slice(3) : null;
}

/** A database error as SQLSTATE, message and detail, with every secret blanked out. */
export function describeError(error: unknown, secrets: string[]): string {
  const e = error as { code?: string; message?: string; detail?: string };
  let text = `${e?.code ? `SQLSTATE ${e.code}: ` : ""}${e?.message ?? "unknown error"}${e?.detail ? ` (${e.detail})` : ""}`;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) text = text.split(secret).join("***");
  }
  return text;
}

/** Real database access for the entry points. */
export async function connectPg(config: pg.ClientConfig): Promise<DbClient> {
  const client = new pg.Client(config);
  // A dropped connection after connect must not crash with an unhandled event.
  client.on("error", () => undefined);
  await client.connect();
  return client;
}

export type Main = (argv: string[], deps: Deps) => Promise<number>;

/** Runs a script's main with the real environment, database and console. */
export function runMain(main: Main): void {
  main(process.argv.slice(2), {
    env: process.env,
    connect: connectPg,
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  })
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      // Unexpected: the kind of failure only, never the error object (it could
      // carry connection settings).
      console.error(`Unexpected failure: ${error instanceof Error ? error.name : "unknown"}`);
      process.exitCode = 1;
    });
}

/** Prints a UsageError with the script's usage; returns the exit code 2. */
export function usageFailure(deps: Deps, error: UsageError, usage: string): number {
  deps.err(error.message);
  deps.err("");
  deps.err(usage);
  return 2;
}
