/**
 * A throwaway Postgres for the Elemental SQL tests (scripts/elemental-sql-check.ts)
 * and the Elemental integration tests (*.int.test.ts, jest.elemental-int.config.js).
 * Never touches a real database and needs no credentials.
 *
 *   await start();          // a fresh server: Docker, or local Postgres binaries
 *   applyAll();             // Supabase stubs + whiteboard + registration + elemental migrations
 *   connectionString();     // postgres://postgres:...@127.0.0.1:<port>/elemental
 *   stop();                 // removes the container or the temporary cluster
 *
 * Backends (ELEMENTAL_PG_BACKEND):
 *   docker  `docker run` ELEMENTAL_PG_IMAGE (default postgres:15-alpine, production's
 *           major: supabase/config.toml). CI uses this.
 *   local   initdb + pg_ctl from PG_BIN, or else the first Postgres 15+ found on this
 *           machine (Postgres 15 preferred), in a temporary folder.
 *   auto    (default) docker when its daemon answers, otherwise local.
 *
 * What applyAll() puts in the `elemental` database, in order:
 *   1. Stubs of Supabase's own schemas (the whiteboard check's, plus storage.buckets,
 *      auth.identities, the extensions schema with pgcrypto, and Supabase's default
 *      grants in public, so a missing REVOKE shows up here as it would in production).
 *   2. Every *whiteboard* migration, as scripts/whiteboard-sql-check.ts applies them.
 *   3. 20261120100519_hackathon_event_registrations.sql.
 *   4. Every *elemental*.sql migration, sorted.
 *   5. Steps 3 and 4 a second time: migrations must be safe to run twice.
 * Each file runs in one transaction, as `supabase db push` runs it. What was applied,
 * and in which pass, is recorded in test_harness.applied.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

export const ROOT = join(__dirname, "..", "..");
export const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
export const REGISTRATION_MIGRATION = "20261120100519_hackathon_event_registrations.sql";
/** The database applyAll() fills; test files run in copies of it. */
export const DATABASE = "elemental";

const PASSWORD = "elemental-harness";
const SUPERUSER = "postgres";
const DEFAULT_IMAGE = "postgres:15-alpine";
const PG_MIN_MAJOR = 15;
const PG_PREFERRED_MAJOR = 15;

export type Backend = "docker" | "local";
export type StartOptions = { backend?: Backend | "auto"; image?: string };
export type Applied = { first: string[]; again: string[] };

type Server =
  | { backend: "docker"; port: number; container: string; image: string }
  | { backend: "local"; port: number; dir: string; bin: string };

let server: Server | null = null;

/**
 * Supabase's three API roles (cluster-wide), as the shift_quests harness makes them:
 * service_role bypasses row security.
 */
const ROLES = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
`;

/** Supabase's default privileges in public: everything new is granted to the API roles. */
const SUPABASE_DEFAULTS = `
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
`;

/** Copied from scripts/whiteboard-sql-check.ts (STUBS); keep the two alike. */
const WHITEBOARD_STUBS = `
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN EXECUTE format('CREATE ROLE %I NOLOGIN', r); END IF;
  END LOOP;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::UUID $$;
CREATE TABLE IF NOT EXISTS public.user_roles (user_id UUID NOT NULL, role TEXT NOT NULL);
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE TABLE IF NOT EXISTS realtime.messages (topic TEXT, extension TEXT, event TEXT, payload JSONB, private BOOLEAN);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION realtime.topic() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT NULL::TEXT $$;
`;

/**
 * More of Supabase's schemas, used by the registration migration (storage.buckets,
 * 20261120100519:94-96) and the Elemental canvas link (auth.identities with
 * provider 'discord'). Columns follow Supabase's own tables.
 */
const ELEMENTAL_STUBS = `
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner UUID,
  public BOOLEAN DEFAULT false,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth.identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  identity_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT NOT NULL,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider_id, provider)
);
CREATE SCHEMA IF NOT EXISTS test_harness;
CREATE TABLE IF NOT EXISTS test_harness.applied (
  seq SERIAL PRIMARY KEY,
  file TEXT NOT NULL,
  pass INTEGER NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
`;

// ---------------------------------------------------------------- the server

function run(command: string, args: string[], input?: string) {
  return spawnSync(command, args, { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function dockerAnswers(): boolean {
  return run("docker", ["info", "--format", "{{.ServerVersion}}"]).status === 0;
}

function pgMajor(bin: string): number {
  const out = run(join(bin, "postgres"), ["--version"]).stdout ?? "";
  const match = /\(PostgreSQL\)\s+(\d+)/.exec(out);
  return match ? Number(match[1]) : 0;
}

function completeBin(dir: string): boolean {
  return ["initdb", "pg_ctl", "postgres", "psql"].every((b) => existsSync(join(dir, b)));
}

/** PG_BIN, else the Postgres 15+ folders this machine has, Postgres 15 first (see pg-preflight.sh). */
export function findPgBin(): string {
  const fromEnv = process.env.PG_BIN;
  if (fromEnv) {
    if (!completeBin(fromEnv)) throw new Error(`PG_BIN=${fromEnv} does not hold initdb, pg_ctl, postgres and psql.`);
    if (pgMajor(fromEnv) < PG_MIN_MAJOR) throw new Error(`PG_BIN=${fromEnv} is older than Postgres ${PG_MIN_MAJOR}.`);
    return fromEnv;
  }
  const dirs: string[] = [];
  const onPath = run("sh", ["-c", "command -v postgres"]).stdout?.trim();
  if (onPath) dirs.push(join(onPath, ".."));
  for (const parent of ["/usr/lib/postgresql", "/opt/homebrew/opt", "/usr/local/opt"]) {
    if (!existsSync(parent)) continue;
    for (const name of readdirSync(parent)) {
      if (parent.endsWith("postgresql") || name.startsWith("postgresql")) dirs.push(join(parent, name, "bin"));
    }
  }
  dirs.push("/Applications/Postgres.app/Contents/Versions/latest/bin");
  const found = dirs
    .filter((d) => existsSync(d) && completeBin(d))
    .map((d) => ({ dir: d, major: pgMajor(d) }))
    .filter((d) => d.major >= PG_MIN_MAJOR)
    .sort((a, b) => Number(b.major === PG_PREFERRED_MAJOR) - Number(a.major === PG_PREFERRED_MAJOR) || b.major - a.major);
  if (!found.length) {
    throw new Error(
      `No Docker daemon and no local Postgres ${PG_MIN_MAJOR}+ (initdb, pg_ctl, postgres, psql in one folder).\n` +
        "  macOS: brew install postgresql@15, or start Docker/OrbStack.\n" +
        "  Elsewhere: set PG_BIN to the folder holding initdb and postgres.",
    );
  }
  return found[0].dir;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startDocker(image: string): Promise<Server> {
  const container = `elemental-sql-${process.pid}-${Date.now().toString(36)}`;
  const started = run("docker", [
    "run", "-d", "--rm", "--name", container,
    "-e", `POSTGRES_PASSWORD=${PASSWORD}`,
    "-p", "127.0.0.1::5432",
    // Read-only, so psql -f names the real file (and \ir works) in error messages.
    "-v", `${ROOT}:/repo:ro`,
    image,
    "-c", "fsync=off", "-c", "full_page_writes=off", "-c", "synchronous_commit=off",
  ]);
  if (started.status !== 0) throw new Error(`docker run ${image} failed: ${started.stderr}`);
  const candidate: Server = { backend: "docker", port: 0, container, image };
  server = candidate;
  // Over TCP: while the image sets itself up it runs a temporary server on the socket only.
  for (let i = 0; i < 240; i++) {
    if (run("docker", ["exec", ...dockerPsqlArgs(candidate, SUPERUSER), "-d", "postgres", "-c", "SELECT 1"]).status === 0) {
      const mapped = run("docker", ["port", container, "5432/tcp"]).stdout ?? "";
      const port = Number(/127\.0\.0\.1:(\d+)/.exec(mapped)?.[1] ?? 0);
      if (!port) throw new Error(`docker port gave no host port: ${mapped}`);
      candidate.port = port;
      return candidate;
    }
    await wait(500);
  }
  throw new Error(`Postgres in ${image} did not start`);
}

async function startLocal(): Promise<Server> {
  const bin = findPgBin();
  const dir = mkdtempSync(join(tmpdir(), "elemental-pg-"));
  writeFileSync(join(dir, "pw"), PASSWORD);
  const init = run(join(bin, "initdb"), [
    "-D", join(dir, "db"), "-U", SUPERUSER, "--pwfile", join(dir, "pw"),
    "--auth-local=trust", "--auth-host=scram-sha-256", "--encoding=UTF8", "--locale=C",
  ]);
  if (init.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(`initdb failed: ${init.stderr}`);
  }
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const port = await freePort();
    // TCP only (no socket path length limits), and no durability: it is thrown away.
    const options = [
      `-p ${port}`, "-c listen_addresses=127.0.0.1", "-c unix_socket_directories=''",
      "-c fsync=off", "-c full_page_writes=off", "-c synchronous_commit=off",
    ].join(" ");
    const ctl = run(join(bin, "pg_ctl"), ["-D", join(dir, "db"), "-o", options, "-l", join(dir, "postgres.log"), "-w", "start"]);
    if (ctl.status === 0) return { backend: "local", port, dir, bin };
    lastError = existsSync(join(dir, "postgres.log")) ? readFileSync(join(dir, "postgres.log"), "utf8").slice(-2000) : ctl.stderr;
  }
  rmSync(dir, { recursive: true, force: true });
  throw new Error(`Local Postgres did not start: ${lastError}`);
}

/** Starts a fresh, empty Postgres. One per process; call stop() when done. */
export async function start(options: StartOptions = {}): Promise<{ backend: Backend; port: number; detail: string }> {
  if (server) throw new Error("The elemental harness is already running in this process; call stop() first.");
  const wanted = options.backend ?? (process.env.ELEMENTAL_PG_BACKEND as StartOptions["backend"]) ?? "auto";
  if (!["auto", "docker", "local"].includes(wanted)) throw new Error(`ELEMENTAL_PG_BACKEND must be docker, local or auto, not ${wanted}`);
  const backend: Backend = wanted === "auto" ? (dockerAnswers() ? "docker" : "local") : wanted;
  const image = options.image ?? process.env.ELEMENTAL_PG_IMAGE ?? DEFAULT_IMAGE;
  server = backend === "docker" ? await startDocker(image) : await startLocal();
  process.once("exit", stop);
  const detail = server.backend === "docker" ? server.image : server.bin;
  return { backend: server.backend, port: server.port, detail };
}

/** Removes the container or the temporary cluster. Safe to call twice. */
export function stop(): void {
  const current = server;
  server = null;
  if (!current) return;
  if (current.backend === "docker") {
    run("docker", ["rm", "-f", current.container]);
  } else {
    run(join(current.bin, "pg_ctl"), ["-D", join(current.dir, "db"), "-m", "immediate", "stop"]);
    rmSync(current.dir, { recursive: true, force: true });
  }
}

function running(): Server {
  if (!server) throw new Error("The elemental harness is not running; await start() first.");
  return server;
}

/** A URL for node-postgres (`pg`) or psql on this machine. The superuser by default. */
export function connectionString(database: string = DATABASE, user: string = SUPERUSER, password: string = PASSWORD): string {
  const { port } = running();
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`;
}

// ---------------------------------------------------------------- psql

function dockerPsqlArgs(s: Extract<Server, { backend: "docker" }>, user: string): string[] {
  return ["-i", "-e", `PGPASSWORD=${PASSWORD}`, "-e", "PGOPTIONS=-c client_min_messages=warning", s.container, "psql", "-h", "127.0.0.1", "-U", user];
}

/** psql against `database`, reading SQL from stdin or running a file. */
function psqlRun(database: string, args: string[], input?: string) {
  const s = running();
  const common = ["-X", "-v", "ON_ERROR_STOP=1", "-d", database, ...args];
  if (s.backend === "docker") {
    return run("docker", ["exec", ...dockerPsqlArgs(s, SUPERUSER), ...common], input);
  }
  return spawnSync(join(s.bin, "psql"), ["-h", "127.0.0.1", "-p", String(s.port), "-U", SUPERUSER, ...common], {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PGPASSWORD: PASSWORD, PGOPTIONS: "-c client_min_messages=warning" },
  });
}

/** Runs SQL as the superuser and returns its unaligned, tuples-only output. Throws on any error. */
export function psql(sql: string, database: string = DATABASE, { singleTransaction = false } = {}): string {
  const result = psqlRun(database, ["-q", "-At", ...(singleTransaction ? ["--single-transaction"] : [])], sql);
  if (result.status !== 0) throw new Error(result.stderr || `psql exited with ${result.status}`);
  return result.stdout.trim();
}

/** The path psql sees for a file in this repo. */
function psqlPath(file: string): string {
  const s = running();
  if (s.backend === "local") return file;
  const rel = relative(ROOT, file);
  if (rel.startsWith("..")) throw new Error(`${file} is outside the repo, so the container cannot read it`);
  return `/repo/${rel.split(sep).join("/")}`;
}

/** Runs one SQL file with ON_ERROR_STOP. Never throws: returns what psql said. */
export function runSqlFile(
  file: string,
  database: string = DATABASE,
  { singleTransaction = false } = {},
): { ok: boolean; output: string } {
  const result = psqlRun(database, ["-q", ...(singleTransaction ? ["--single-transaction"] : []), "-f", psqlPath(file)]);
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
}

// ---------------------------------------------------------------- databases

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;
const quoteLiteral = (text: string) => `'${text.replace(/'/g, "''")}'`;

/** Supabase's search_path. Per database, because CREATE DATABASE ... TEMPLATE does not copy it. */
function configure(database: string) {
  psql(`ALTER DATABASE ${quoteIdent(database)} SET search_path TO "$user", public, extensions;`, "postgres");
}

/**
 * A new database. With `template`, a copy of it (fast, and isolated from it):
 * no one may be connected to the template while it is copied.
 */
export function createDatabase(name: string, template?: string): void {
  psql(`DROP DATABASE IF EXISTS ${quoteIdent(name)};`, "postgres");
  psql(`CREATE DATABASE ${quoteIdent(name)}${template ? ` TEMPLATE ${quoteIdent(template)}` : ""};`, "postgres");
  configure(name);
}

export function dropDatabase(name: string): void {
  psql(`DROP DATABASE IF EXISTS ${quoteIdent(name)} WITH (FORCE);`, "postgres");
}

/** The migrations applyAll() runs, in order (file names; the elemental ones run twice). */
export function migrationPlan(): { whiteboard: string[]; registration: string; elemental: string[] } {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  if (!files.includes(REGISTRATION_MIGRATION)) throw new Error(`${REGISTRATION_MIGRATION} is missing`);
  return {
    whiteboard: files.filter((f) => /whiteboard/.test(f)),
    registration: REGISTRATION_MIGRATION,
    elemental: files.filter((f) => /elemental/.test(f)),
  };
}

function applyFile(database: string, file: string, pass: number) {
  const { ok, output } = runSqlFile(join(MIGRATIONS_DIR, file), database, { singleTransaction: true });
  if (!ok) throw new Error(`${file} did not apply (pass ${pass}):\n${output}`);
  psql(`INSERT INTO test_harness.applied (file, pass) VALUES (${quoteLiteral(file)}, ${pass});`, database);
}

/**
 * Creates `database` (default `elemental`) and applies the stubs and the migrations
 * listed at the top of this file. Throws, naming the file, when one does not apply.
 */
export function applyAll(database: string = DATABASE): Applied {
  const plan = migrationPlan();
  psql(ROLES, "postgres");
  createDatabase(database);
  psql(SUPABASE_DEFAULTS + WHITEBOARD_STUBS + ELEMENTAL_STUBS, database, { singleTransaction: true });
  const first = [...plan.whiteboard, plan.registration, ...plan.elemental];
  for (const file of first) applyFile(database, file, 1);
  const again = [plan.registration, ...plan.elemental];
  for (const file of again) applyFile(database, file, 2);
  return { first, again };
}

/** Every supabase/tests/elemental/**\/*.test.sql, sorted by path, optionally filtered by substrings. */
export function sqlTestFiles(filters: string[] = []): string[] {
  const dir = join(ROOT, "supabase", "tests", "elemental");
  if (!existsSync(dir)) return [];
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter((f) => f.endsWith(".test.sql"))
    .map((f) => join(dir, f))
    .filter((f) => !filters.length || filters.some((needle) => relative(ROOT, f).includes(needle)))
    .sort();
}
