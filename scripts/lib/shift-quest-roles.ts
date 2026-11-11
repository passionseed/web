/**
 * Logic for scripts/shift-quests-set-role-passwords.ts: give the SHIFT High
 * quest logins (shift_quest_bot, shift_quest_web) LOGIN and a password, or
 * check whether they can log in. Kept apart from the entry point so the tests
 * can drive it with a fake database.
 *
 * Secrets: the admin URL and the passwords come from environment variables
 * only, and nothing secret is ever printed. Postgres never sees a plain
 * password either: the script sends a SCRAM-SHA-256 verifier computed here
 * (the same thing `\password` in psql does), quoted with pg's escapeLiteral,
 * so a password cannot end up in a Postgres log or break out of the statement.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

export const ROLES = { bot: "shift_quest_bot", web: "shift_quest_web" } as const;
export type RoleKey = keyof typeof ROLES;
const ROLE_KEYS: RoleKey[] = ["bot", "web"];

export const ENV = {
  adminUrl: "SHIFT_QUEST_ADMIN_DATABASE_URL",
  bot: "SHIFT_QUEST_BOT_PASSWORD",
  web: "SHIFT_QUEST_WEB_PASSWORD",
} as const;

/** The website needs 6 (20261111091200); the bot 2. */
export const MIN_SCHEMA = 6;

/**
 * URL-unreserved characters only, so the password goes into a postgresql://
 * URL (Vercel, bot.env) without percent-encoding, and is plain ASCII, so
 * SASLprep leaves it unchanged. `openssl rand -hex 32` gives 64 of them.
 */
const PASSWORD_RULE = /^[A-Za-z0-9._~-]{32,128}$/;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const SCRAM_ITERATIONS = 4096;

export const USAGE = `usage: pnpm shift:role-passwords [--check] [--only bot|web] [--accept-exposure]

  (no flag)          give shift_quest_bot and shift_quest_web LOGIN and a new password,
                     then log in as each to prove it works
  --check            change nothing; report whether each role can log in
                     (and try a real login for each role whose password is set)
  --only bot|web     only this role (rotate one password)
  --accept-exposure  set passwords even though the logins can reach functions or
                     tables outside shift_quest_* through PUBLIC (read the list first)

environment (never printed):
  ${ENV.adminUrl}  admin Postgres URL (the postgres user), e.g. the Supabase "Direct"
                                  or session pooler connection string
  ${ENV.bot}        new password for shift_quest_bot   (openssl rand -hex 32)
  ${ENV.web}        new password for shift_quest_web   (openssl rand -hex 32)`;

/** A mistake in how the script was called: exit 2 with this message. */
export class UsageError extends Error {}

export interface Options {
  check: boolean;
  roles: RoleKey[];
  acceptExposure: boolean;
  help: boolean;
}

export function parseArgs(argv: string[]): Options {
  const options: Options = { check: false, roles: ROLE_KEYS, acceptExposure: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") options.check = true;
    else if (arg === "--accept-exposure") options.acceptExposure = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--only" || arg.startsWith("--only=")) {
      const value = arg === "--only" ? argv[++i] : arg.slice("--only=".length);
      if (value !== "bot" && value !== "web") throw new UsageError("--only takes bot or web");
      options.roles = [value];
    } else throw new UsageError(`unknown argument: ${arg}`);
  }
  return options;
}

/** Throws a UsageError that names the variable, never the value. */
export function validatePassword(envName: string, value: string): void {
  if (!PASSWORD_RULE.test(value)) {
    throw new UsageError(
      `${envName} must be 32 to 128 characters of A-Z a-z 0-9 . _ ~ - (generate one with: openssl rand -hex 32)`
    );
  }
}

/**
 * The SCRAM-SHA-256 verifier Postgres stores for a password (RFC 5802 and
 * 7677, Postgres's format). ALTER ROLE ... PASSWORD '<verifier>' stores it
 * as is, so the plain password never reaches the server.
 */
export function scramVerifier(password: string, salt: Buffer = crypto.randomBytes(16)): string {
  const salted = crypto.pbkdf2Sync(password, salt, SCRAM_ITERATIONS, 32, "sha256");
  const clientKey = crypto.createHmac("sha256", salted).update("Client Key").digest();
  const storedKey = crypto.createHash("sha256").update(clientKey).digest();
  const serverKey = crypto.createHmac("sha256", salted).update("Server Key").digest();
  return `SCRAM-SHA-256$${SCRAM_ITERATIONS}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
}

/** The one statement that changes anything. The role is from ROLES, never input. */
export function alterRoleSql(role: string, verifier: string): string {
  return `ALTER ROLE ${pg.escapeIdentifier(role)} WITH LOGIN PASSWORD ${pg.escapeLiteral(verifier)}`;
}

export const ROLE_STATE_SQL =
  "select rolname, rolcanlogin, rolconnlimit from pg_catalog.pg_roles where rolname = any($1::text[]) order by rolname";

export const SCHEMA_SQL = "select public.shift_quest_schema_version() as v";

/**
 * What else the logins could run or read through PUBLIC, outside
 * shift_quest_* (docs/features/shift-high-quests.md, "Web board and
 * shift_quest_web", step 2). Expect no rows before giving either role LOGIN.
 */
export const EXPOSURE_SQL = `
select r.role, p.oid::regprocedure::text as object, 'definer function' as kind
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace,
  unnest($1::text[]) as r(role)
where n.nspname = 'public'
  and p.proname not like 'shift\\_quest\\_%'
  and p.prosecdef
  and has_function_privilege(r.role, p.oid, 'EXECUTE')
union all
select r.role, c.oid::regclass::text, 'table or view'
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace,
  unnest($1::text[]) as r(role)
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
  and has_table_privilege(r.role, c.oid, 'SELECT, INSERT, UPDATE, DELETE')
order by 1, 2`;

export const LOGIN_SQL = "select current_user as who, public.shift_quest_schema_version() as v";

let cachedCa: string | null = null;
function supabaseCa(): string {
  // bot/supabase-ca.pem: Supabase's root CA (public). The direct database and
  // the pooler certificates chain to it, not to a public root.
  cachedCa ??= fs.readFileSync(path.join(__dirname, "..", "..", "bot", "supabase-ca.pem"), "utf8");
  return cachedCa;
}

/**
 * Connection settings field by field (never a connection string), so a
 * `?sslmode=` in the URL cannot turn TLS verification off.
 */
export function adminClientConfig(raw: string): pg.ClientConfig {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UsageError(`${ENV.adminUrl} is not a valid URL`);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new UsageError(`${ENV.adminUrl} must be a postgresql:// URL`);
  }
  const user = decodeURIComponent(url.username);
  if (!user || /^shift_quest_/.test(user)) {
    throw new UsageError(`${ENV.adminUrl} must log in as an admin (postgres), not as a shift_quest_* role`);
  }
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1");
  if (!host) throw new UsageError(`${ENV.adminUrl} has no host`);
  return {
    host,
    port: url.port ? Number(url.port) : 5432,
    user,
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    ssl: LOCAL_HOSTS.has(host) ? false : { ca: supabaseCa(), rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000,
    application_name: "shift-quests-role-passwords",
  };
}

/**
 * The same host as the admin URL, logged in as the role. On the Supavisor
 * pooler the admin user is postgres.<project ref>, so the role becomes
 * shift_quest_web.<project ref>; on a direct connection it is the bare name.
 */
export function roleClientConfig(admin: pg.ClientConfig, role: string, password: string): pg.ClientConfig {
  const suffix = /^[^.]+(\.[A-Za-z0-9]+)$/.exec(String(admin.user ?? ""))?.[1] ?? "";
  return { ...admin, user: `${role}${suffix}`, password, application_name: "shift-quests-role-check" };
}

export interface DbClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

export interface Deps {
  env: NodeJS.ProcessEnv;
  connect(config: pg.ClientConfig): Promise<DbClient>;
  out(line: string): void;
  err(line: string): void;
}

/** A database error as SQLSTATE plus message, with every secret blanked out. */
function describe(error: unknown, secrets: string[]): string {
  const e = error as { code?: string; message?: string };
  let text = `${e?.code ? `SQLSTATE ${e.code}: ` : ""}${e?.message ?? "unknown error"}`;
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join("***");
  }
  return text;
}

async function tryLogin(
  deps: Deps,
  admin: pg.ClientConfig,
  role: string,
  password: string,
  secrets: string[]
): Promise<boolean> {
  let client: DbClient | null = null;
  try {
    client = await deps.connect(roleClientConfig(admin, role, password));
    const { rows } = await client.query(LOGIN_SQL);
    deps.out(`  ${role}: login ok as ${String(rows[0]?.who)}, sees schema ${String(rows[0]?.v)}`);
    return true;
  } catch (error) {
    deps.err(`  ${role}: login FAILED (${describe(error, secrets)})`);
    return false;
  } finally {
    await client?.end().catch(() => undefined);
  }
}

interface Inputs {
  admin: pg.ClientConfig;
  passwords: Partial<Record<RoleKey, string>>;
}

/** The admin connection and the passwords from the environment. Throws UsageError. */
function readInputs(options: Options, env: NodeJS.ProcessEnv): Inputs {
  const adminUrl = env[ENV.adminUrl]?.trim();
  if (!adminUrl) throw new UsageError(`Missing required environment variable: ${ENV.adminUrl}`);
  const admin = adminClientConfig(adminUrl);

  const passwords: Inputs["passwords"] = {};
  for (const key of options.roles) {
    const value = env[ENV[key]]?.trim();
    if (!value) {
      if (options.check) continue; // check only tries the logins it has a password for
      const other = key === "bot" ? "web" : "bot";
      throw new UsageError(`Missing required environment variable: ${ENV[key]} (or pass --only ${other})`);
    }
    validatePassword(ENV[key], value);
    passwords[key] = value;
  }
  if (passwords.bot && passwords.web && passwords.bot === passwords.web) {
    throw new UsageError(`${ENV.bot} and ${ENV.web} must be different passwords`);
  }
  return { admin, passwords };
}

/** Runs the script. Returns the process exit code: 0 ok, 1 failed check, 2 usage. */
export async function run(argv: string[], deps: Deps): Promise<number> {
  let options: Options;
  let admin: pg.ClientConfig;
  let passwords: Inputs["passwords"];
  try {
    options = parseArgs(argv);
    if (options.help) {
      deps.out(USAGE);
      return 0;
    }
    ({ admin, passwords } = readInputs(options, deps.env));
  } catch (error) {
    if (error instanceof UsageError) {
      deps.err(error.message);
      deps.err("");
      deps.err(USAGE);
      return 2;
    }
    throw error;
  }

  const secrets = [String(admin.password ?? ""), ...Object.values(passwords)];
  const roles = options.roles.map((key) => ROLES[key]);
  let client: DbClient;
  try {
    client = await deps.connect(admin);
  } catch (error) {
    deps.err(`Could not connect as the admin user (${describe(error, secrets)})`);
    return 1;
  }

  try {
    deps.out(options.check ? "Checking SHIFT quest logins (changes nothing)" : "Setting SHIFT quest login passwords");

    const { rows: states } = await client.query(ROLE_STATE_SQL, [roles]);
    const missing = roles.filter((role) => !states.some((row) => row.rolname === role));
    if (missing.length > 0) {
      deps.err(`Role(s) missing: ${missing.join(", ")}. Apply the migrations first (supabase db push).`);
      return 1;
    }

    const { rows: schemaRows } = await client.query(SCHEMA_SQL);
    const schema = Number(schemaRows[0]?.v);
    deps.out(`  quest schema: ${schema} (website needs ${MIN_SCHEMA}, bot needs 2)`);
    if (!(schema >= MIN_SCHEMA)) {
      deps.err(`Quest schema ${schema} is older than ${MIN_SCHEMA}. Apply the migrations first (supabase db push).`);
      return 1;
    }

    const { rows: exposed } = await client.query(EXPOSURE_SQL, [roles]);
    if (exposed.length === 0) {
      deps.out("  exposure through PUBLIC outside shift_quest_*: none");
    } else {
      deps.err(`  exposure through PUBLIC outside shift_quest_*: ${exposed.length} object(s)`);
      for (const row of exposed) deps.err(`    ${String(row.role)}  ${String(row.kind)}  ${String(row.object)}`);
    }

    if (options.check) {
      let ok = exposed.length === 0;
      for (const role of roles) {
        const state = states.find((row) => row.rolname === role)!;
        deps.out(`  ${role}: LOGIN ${state.rolcanlogin ? "on" : "off"}, connection limit ${String(state.rolconnlimit)}`);
        if (!state.rolcanlogin) ok = false;
      }
      for (const key of options.roles) {
        const password = passwords[key];
        if (!password) {
          deps.out(`  ${ROLES[key]}: login not tried (set ${ENV[key]} to try it)`);
          continue;
        }
        if (!(await tryLogin(deps, admin, ROLES[key], password, secrets))) ok = false;
      }
      deps.out(ok ? "Check passed." : "Check found problems (see above).");
      return ok ? 0 : 1;
    }

    if (exposed.length > 0 && !options.acceptExposure) {
      deps.err(
        "Refusing to give these roles LOGIN: revoke the objects above from PUBLIC in an additive migration first " +
          "(docs/features/shift-high-quests.md, step 2), or rerun with --accept-exposure after reviewing the list."
      );
      return 1;
    }

    for (const key of options.roles) {
      const role = ROLES[key];
      await client.query(alterRoleSql(role, scramVerifier(passwords[key]!)));
      deps.out(`  ${role}: LOGIN on, new password set (SCRAM-SHA-256 verifier)`);
    }
  } catch (error) {
    deps.err(`Database call failed (${describe(error, secrets)})`);
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }

  // Prove each new password works, over the same host as the admin URL.
  let ok = true;
  for (const key of options.roles) {
    if (!(await tryLogin(deps, admin, ROLES[key], passwords[key]!, secrets))) ok = false;
  }
  if (!ok) {
    deps.err("A login failed. On the pooler a changed password can take a minute to be picked up: rerun with --check.");
    return 1;
  }
  deps.out("Done. Put each password in its URL (Vercel / bot.env), never in the repo.");
  return 0;
}

/** Real database access for the entry point. */
export async function connectPg(config: pg.ClientConfig): Promise<DbClient> {
  const client = new pg.Client(config);
  // A dropped connection after connect must not crash with an unhandled event.
  client.on("error", () => undefined);
  await client.connect();
  return client;
}
