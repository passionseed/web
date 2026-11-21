/**
 * Gives the Elemental bot's database login (elemental_bot) LOGIN and a new
 * password, or checks that it can log in. The core migration creates the role
 * NOLOGIN; this is the out-of-band step that switches it on. (SHIFT's roles
 * have their own script, scripts/shift-quests-set-role-passwords.ts.)
 *
 *   read -rs ELEMENTAL_ADMIN_DATABASE_URL && export ELEMENTAL_ADMIN_DATABASE_URL
 *   read -rs ELEMENTAL_BOT_PASSWORD && export ELEMENTAL_BOT_PASSWORD   # openssl rand -hex 32
 *   pnpm exec tsx scripts/elemental/set-role-password.ts --check   # changes nothing
 *   pnpm exec tsx scripts/elemental/set-role-password.ts           # set it, then log in as it
 *
 * Reads only environment variables (never .env files) and prints nothing
 * secret: not the admin URL, not the password. Postgres never sees the plain
 * password either: the script sends a SCRAM-SHA-256 verifier computed here
 * (scripts/lib/shift-quest-roles.ts scramVerifier). The bot's URL is then
 *   postgresql://elemental_bot[.<project ref>]:<password>@<pooler host>:5432/postgres
 * in bot.env as ELEMENTAL_DATABASE_URL, never in the repo.
 */
import type pg from "pg";

import { alterRoleSql, scramVerifier } from "../lib/shift-quest-roles";

import {
  ADMIN_URL_ENV,
  UsageError,
  describeError,
  readAdmin,
  runMain,
  usageFailure,
  type DbClient,
  type Deps,
} from "./admin-db";

export const ROLE = "elemental_bot";
export const PASSWORD_ENV = "ELEMENTAL_BOT_PASSWORD";

/**
 * URL-unreserved characters only, so the password goes into a postgresql://
 * URL without percent-encoding and SASLprep leaves it unchanged.
 */
const PASSWORD_RULE = /^[A-Za-z0-9._~-]{32,128}$/;

export const USAGE = `usage: pnpm exec tsx scripts/elemental/set-role-password.ts [--check] [--accept-exposure]

  (no flag)          give ${ROLE} LOGIN and the password in ${PASSWORD_ENV}, then log in as it
  --check            change nothing; report whether ${ROLE} can log in (and try a real
                     login when ${PASSWORD_ENV} is set)
  --accept-exposure  set the password even though ${ROLE} can reach functions or tables
                     outside elemental_bot_* (read the list first)

environment (never printed):
  ${ADMIN_URL_ENV}  admin Postgres URL (the postgres user): Supabase "Direct" or session pooler
  ${PASSWORD_ENV}        the new password for ${ROLE} (openssl rand -hex 32)`;

export interface Options {
  check: boolean;
  acceptExposure: boolean;
  help: boolean;
}

export function parseArgs(argv: string[]): Options {
  const options: Options = { check: false, acceptExposure: false, help: false };
  for (const arg of argv) {
    if (arg === "--check") options.check = true;
    else if (arg === "--accept-exposure") options.acceptExposure = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new UsageError(`unknown argument: ${arg}`);
  }
  return options;
}

export const ROLE_STATE_SQL =
  "select rolname, rolcanlogin, rolconnlimit from pg_catalog.pg_roles where rolname = $1";

/** elemental_bot_* functions (not the elemental_bot__ helpers), and how many the role may execute. */
export const FUNCTIONS_SQL = `
select count(*)::int as total,
       count(*) filter (where has_function_privilege($1, p.oid, 'EXECUTE'))::int as granted
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'elemental\\_bot\\_%'
  and p.proname not like 'elemental\\_bot\\_\\_%'`;

/**
 * What else the role could run or read: SECURITY DEFINER functions outside
 * elemental_bot_* it may execute (through PUBLIC or a grant), and tables or
 * views it may touch. Expect no rows before giving it LOGIN.
 */
export const EXPOSURE_SQL = `
select p.oid::regprocedure::text as object, 'definer function' as kind
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and not (p.proname like 'elemental\\_bot\\_%' and p.proname not like 'elemental\\_bot\\_\\_%')
  and p.prosecdef
  and has_function_privilege($1, p.oid, 'EXECUTE')
union all
select c.oid::regclass::text, 'table or view'
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
  and has_table_privilege($1, c.oid, 'SELECT, INSERT, UPDATE, DELETE')
order by 1`;

/**
 * Run as elemental_bot: who it is, that one of its functions answers (an
 * unknown guild gives NULL), that it reads no table, and what it may execute.
 */
export const LOGIN_SQL = `
select current_user as who,
       public.elemental_bot_settings_get('10000000000000000') is null as settings_ok,
       has_table_privilege('public.elemental_claims', 'SELECT') as reads_claims,
       (select count(*)::int from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname like 'elemental\\_bot\\_%'
          and has_function_privilege(p.oid, 'EXECUTE')) as functions`;

/**
 * The same host as the admin URL, logged in as the role. On the Supavisor
 * pooler the admin user is postgres.<project ref>, so the role becomes
 * elemental_bot.<project ref>; on a direct connection it is the bare name.
 */
export function roleClientConfig(admin: pg.ClientConfig, password: string): pg.ClientConfig {
  const suffix = /^[^.]+(\.[A-Za-z0-9]+)$/.exec(String(admin.user ?? ""))?.[1] ?? "";
  return { ...admin, user: `${ROLE}${suffix}`, password, application_name: "elemental-role-check" };
}

async function tryLogin(deps: Deps, admin: pg.ClientConfig, password: string, secrets: string[]): Promise<boolean> {
  let client: DbClient | null = null;
  try {
    client = await deps.connect(roleClientConfig(admin, password));
    const { rows } = await client.query(LOGIN_SQL);
    const row = rows[0] ?? {};
    if (row.settings_ok !== true || row.reads_claims !== false) {
      deps.err(`  ${ROLE}: logged in, but ${row.reads_claims !== false ? "it can read elemental_claims" : "elemental_bot_settings_get did not answer"}`);
      return false;
    }
    deps.out(`  ${ROLE}: login ok as ${String(row.who)}, may execute ${String(row.functions)} elemental_bot_* functions, reads no table`);
    return true;
  } catch (error) {
    deps.err(`  ${ROLE}: login FAILED (${describeError(error, secrets)})`);
    return false;
  } finally {
    await client?.end().catch(() => undefined);
  }
}

/** Runs the script. Returns the exit code: 0 ok, 1 failed check, 2 usage. */
export async function run(argv: string[], deps: Deps): Promise<number> {
  let options: Options;
  let admin: ReturnType<typeof readAdmin>;
  let password: string | null;
  try {
    options = parseArgs(argv);
    if (options.help) {
      deps.out(USAGE);
      return 0;
    }
    admin = readAdmin(deps.env, "elemental-role-password");
    password = deps.env[PASSWORD_ENV]?.trim() || null;
    if (!password && !options.check) throw new UsageError(`Missing required environment variable: ${PASSWORD_ENV}`);
    if (password && !PASSWORD_RULE.test(password)) {
      throw new UsageError(
        `${PASSWORD_ENV} must be 32 to 128 characters of A-Z a-z 0-9 . _ ~ - (generate one with: openssl rand -hex 32)`,
      );
    }
    if (password && password === admin.config.password) {
      throw new UsageError(`${PASSWORD_ENV} must not be the admin password`);
    }
  } catch (error) {
    if (error instanceof UsageError) return usageFailure(deps, error, USAGE);
    throw error;
  }

  const secrets = password ? [...admin.secrets, password] : admin.secrets;
  let client: DbClient;
  try {
    client = await deps.connect(admin.config);
  } catch (error) {
    deps.err(`Could not connect as the admin user (${describeError(error, secrets)})`);
    return 1;
  }

  try {
    deps.out(options.check ? `Checking the ${ROLE} login (changes nothing)` : `Setting the ${ROLE} login password`);

    const { rows: states } = await client.query(ROLE_STATE_SQL, [ROLE]);
    const state = states[0];
    if (!state) {
      deps.err(`Role ${ROLE} is missing. Apply the Elemental migrations first (supabase db push).`);
      return 1;
    }

    const { rows: fnRows } = await client.query(FUNCTIONS_SQL, [ROLE]);
    const total = Number(fnRows[0]?.total ?? 0);
    const granted = Number(fnRows[0]?.granted ?? 0);
    const grantsOk = total > 0 && granted === total;
    (grantsOk ? deps.out : deps.err)(`  elemental_bot_* functions: ${total}, executable by ${ROLE}: ${granted}`);

    const { rows: exposed } = await client.query(EXPOSURE_SQL, [ROLE]);
    if (exposed.length === 0) {
      deps.out("  exposure outside elemental_bot_*: none");
    } else {
      deps.err(`  exposure outside elemental_bot_*: ${exposed.length} object(s)`);
      for (const row of exposed) deps.err(`    ${String(row.kind)}  ${String(row.object)}`);
    }

    if (options.check) {
      let ok = exposed.length === 0 && grantsOk;
      deps.out(`  ${ROLE}: LOGIN ${state.rolcanlogin ? "on" : "off"}, connection limit ${String(state.rolconnlimit)}`);
      if (!state.rolcanlogin) ok = false;
      if (password) {
        if (!(await tryLogin(deps, admin.config, password, secrets))) ok = false;
      } else {
        deps.out(`  ${ROLE}: login not tried (set ${PASSWORD_ENV} to try it)`);
      }
      deps.out(ok ? "Check passed." : "Check found problems (see above).");
      return ok ? 0 : 1;
    }

    if (!grantsOk) {
      deps.err(`Refusing: ${ROLE} cannot execute every elemental_bot_* function. Apply the Elemental migrations first.`);
      return 1;
    }
    if (exposed.length > 0 && !options.acceptExposure) {
      deps.err(
        `Refusing to give ${ROLE} LOGIN: revoke the objects above from PUBLIC or ${ROLE} in an additive migration first, ` +
          "or rerun with --accept-exposure after reviewing the list.",
      );
      return 1;
    }

    await client.query(alterRoleSql(ROLE, scramVerifier(password!)));
    deps.out(`  ${ROLE}: LOGIN on, new password set (SCRAM-SHA-256 verifier)`);
  } catch (error) {
    deps.err(`Database call failed (${describeError(error, secrets)})`);
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }

  if (!(await tryLogin(deps, admin.config, password!, secrets))) {
    deps.err("The login failed. On the pooler a changed password can take a minute to be picked up: rerun with --check.");
    return 1;
  }
  deps.out(`Done. Put the password in ELEMENTAL_DATABASE_URL in bot.env (container #2), never in the repo.`);
  return 0;
}

if (require.main === module) runMain(run);
