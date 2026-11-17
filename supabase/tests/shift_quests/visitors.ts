/**
 * SHIFT High Island on the web: the plaza's visitors
 * (20261118110000_shift_quest_island_visitors, schema 18). How many members
 * checked in on today's Bangkok date, and how many of the caller's own active
 * teammates did: two integers, never an id, a name, a project or a time.
 * Every student call goes through shift_quest_web, as the website makes it.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { Client } from "pg";
import { LATEST_SCHEMA } from "./schema";

const adminUrl = process.env.SHIFT_QUESTS_TEST_DATABASE_URL;
const botUrl = process.env.SHIFT_QUESTS_BOT_DATABASE_URL;
const webUrl = process.env.SHIFT_QUESTS_WEB_DATABASE_URL;
if (!adminUrl || !botUrl || !webUrl || process.env.SHIFT_QUESTS_TEST_DISPOSABLE !== "1") {
  console.error("Run through supabase/tests/shift_quests/run-local.sh (needs a disposable database).");
  process.exit(2);
}
for (const url of [adminUrl, botUrl, webUrl]) {
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)) {
    console.error("Refusing a non-local database");
    process.exit(2);
  }
}

// Synthetic Discord IDs and names.
const ADMIN = "910000000000000001";
const A = "920000000000000001"; // project one, with B and F
const B = "920000000000000002"; // A's teammate
const C = "920000000000000003"; // project two
const D = "920000000000000004"; // invited to project one, never answered; no project of their own
const E = "920000000000000005"; // no project
const F = "920000000000000006"; // A's teammate who leaves the team after checking in
const G = "920000000000000007"; // project three: the Bangkok day's edges
const PENDING = "920000000000000008"; // known, has not finished /start, holds no role
const NOBODY = "929999999999999999";
const NAMES: Record<string, string> = {
  [ADMIN]: "Plaza Admin", [A]: "Plaza Aye", [B]: "Plaza Bee", [C]: "Plaza Cee", [D]: "Plaza Dee", [E]: "Plaza Eee",
  [F]: "Plaza Eff", [G]: "Plaza Gee",
};
const READER = "shift_quest_island_visitors(text)";

let failures = 0;
let passes = 0;
function check(ok: boolean, name: string, detail?: unknown): void {
  if (ok) {
    passes += 1;
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`not ok - ${name}${detail === undefined ? "" : ` :: ${JSON.stringify(detail)}`}`);
  }
}

type Json = Record<string, any>;

async function connect(url: string): Promise<Client> {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

async function call<T = any>(c: Client, fn: string, ...args: unknown[]): Promise<T> {
  const params = args.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await c.query(`select public.${fn}(${params}) as r`, args);
  return rows[0].r as T;
}

/** 'ok', the sq code of a refusal, or the error message. */
async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    const message = (error as Error).message;
    const match = /^sq:([a-z_]+)/.exec(message);
    return match ? match[1] : message;
  }
}

/** 'ok' or the SQLSTATE of the error (42501: insufficient privilege). */
async function sqlstate(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    return (error as { code?: string }).code ?? (error as Error).message;
  }
}

async function scalar<T = any>(c: Client, sql: string, args: unknown[] = []): Promise<T> {
  const { rows } = await c.query(sql, args);
  return Object.values(rows[0])[0] as T;
}

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: onboarding and invites, as Discord does them
  const web = await connect(webUrl!); // shift_quest_web: every read and check-in, as the website makes them

  const read = (who: string | null) => call<Json>(web, "shift_quest_island_visitors", who);
  const tap = (who: string) => call<Json>(web, "shift_quest_checkin", who, null);
  const memberId = (who: string) => scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [who]);
  const seen = async (who: string) => {
    const r = await read(who);
    return [r.count, r.team];
  };

  // --- Schema, privileges --------------------------------------------------------------------------
  check(Number(await call(web, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 18,
    "the website reads schema 18 or later (the plaza's visitors)");
  const grants: Json = (await db.query(
    `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
            has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web,
            has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
            has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
            has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') as service_role,
            p.proacl is null or exists (
              select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'
            ) as public,
            p.prosecdef as definer, p.provolatile as volatility,
            coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned,
            format_type(p.prorettype, null) as returns
     from pg_proc p where p.oid = $1::regprocedure`,
    [`public.${READER}`],
  )).rows[0];
  check(grants.web === true && grants.bot === false && grants.anon === false && grants.authenticated === false &&
      grants.public === false && grants.service_role === true && grants.definer === true && grants.pinned === true,
    `${READER}: security definer with a pinned search_path, the website's only`, grants);
  check(grants.volatility === "s" && grants.returns === "jsonb", `${READER} is a STABLE read returning jsonb`, grants);
  check((await sqlstate(call(bot, "shift_quest_island_visitors", A))) === "42501", "the bot cannot read the visitors (42501)");
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_island_visitors", A))) === "42501", `${r} cannot read the visitors`);
    await db.query("reset role");
  }
  check(await scalar<boolean>(db,
      "select exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'shift_quest_progress_tap_day')"),
    "one Bangkok day's taps have their own index");

  // --- Who may read ----------------------------------------------------------------------------------
  check(await code(read(NOBODY)) === "not_started", "an unknown caller is not_started");
  check(await code(read(null)) === "not_started", "a null caller is not_started");
  await db.query("insert into public.shift_quest_members (discord_user_id, display_name) values ($1, 'Plaza Pending')", [PENDING]);
  check(await code(read(PENDING)) === "not_started", "a member who has not finished /start and holds no role is not_started");

  // --- Fixtures --------------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  for (const id of [A, B, C, D, E, F, G]) await call(bot, "shift_quest_start", id, NAMES[id], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "Plaza One", "software", null);
  for (const mate of [B, F]) {
    await call(bot, "shift_quest_project_invite", A, p1, mate);
    await call(web, "shift_quest_project_respond", mate, p1, true);
  }
  await call(bot, "shift_quest_project_invite", A, p1, D);
  await call(web, "shift_quest_project_create", C, "Plaza Two", "creative", null);
  const p3: string = await call(web, "shift_quest_project_create", G, "Plaza Three", "software", null);

  // --- Nobody yet ------------------------------------------------------------------------------------
  const empty = await read(A);
  check(Object.keys(empty).sort().join(",") === "count,team" && empty.count === 0 && empty.team === 0,
    "before anyone checks in: count 0, team 0, and only those two keys", empty);
  check(JSON.stringify(await seen(ADMIN)) === "[0,0]", "an admin without a project reads it too");

  // --- Check-ins -------------------------------------------------------------------------------------
  const audits = () => scalar<number>(db, "select count(*)::int from public.shift_quest_audit");
  await tap(A);
  const before = await audits();
  check(JSON.stringify(await seen(A)) === "[1,0]", "A's own check-in counts once, and never as A's teammate");
  check(JSON.stringify(await seen(B)) === "[1,1]", "B sees A as one teammate who came today");
  check(JSON.stringify(await seen(C)) === "[1,0]", "another team sees the count only");
  check(JSON.stringify(await seen(D)) === "[1,0]", "someone only invited to the team is not told about it");
  check(JSON.stringify(await seen(E)) === "[1,0]", "a student with no project sees the count only");
  check(await audits() === before, "reading writes no audit row");

  await tap(A);
  check(JSON.stringify(await seen(B)) === "[1,1]", "a second tap the same day adds nobody");
  await call(web, "shift_quest_checkin", C, "เขียนหน้าแรกเสร็จ");
  check(JSON.stringify(await seen(E)) === "[1,0]", "a journal note is not a check-in");

  await tap(B);
  await tap(C);
  check(JSON.stringify(await seen(A)) === "[3,1]", "A: three people today, one of them A's teammate");
  check(JSON.stringify(await seen(B)) === "[3,1]", "B: the same, with A as the teammate");
  check(JSON.stringify(await seen(C)) === "[3,0]", "C: three people, none of C's team but C");

  // A teammate who checks in and then leaves the team still came to the island, but is no longer A's team.
  await tap(F);
  check(JSON.stringify(await seen(A)) === "[4,2]", "F counts for A's team while on it");
  await db.query("update public.shift_quest_project_members set status = 'left' where project_id = $1 and member_id = $2",
    [p1, await memberId(F)]);
  check(JSON.stringify(await seen(A)) === "[4,1]", "once F has left, F counts on the island only");

  // --- The Bangkok day's edges (fixtures written directly, as only the clock could) ------------------
  const gId = await memberId(G);
  const insertTap = (at: string) => db.query(
    "insert into public.shift_quest_progress (member_id, project_id, kind, visibility, created_at) values ($1, $2, 'tap', 'private', " + at + ")",
    [gId, p3]);
  await insertTap("public.shift_quest__bkk_start(public.shift_quest__bkk_today()) - interval '1 second'");
  check(JSON.stringify(await seen(E)) === "[4,0]", "a tap one second before Bangkok midnight is yesterday's");
  await insertTap("public.shift_quest__bkk_start(public.shift_quest__bkk_today() + 1)");
  check(JSON.stringify(await seen(E)) === "[4,0]", "a tap at tomorrow's Bangkok midnight is not today's");
  await insertTap("public.shift_quest__bkk_start(public.shift_quest__bkk_today())");
  check(JSON.stringify(await seen(E)) === "[5,0]", "a tap at today's Bangkok midnight is today's");

  // --- Erased members (marked as an erasure leaves them, should a tap row ever outlive it) -------------
  const erase = (id: string) => db.query(
    "update public.shift_quest_members set erased_at = now(), discord_user_id = null, display_name = null where id = $1", [id]);
  await erase(gId);
  check(JSON.stringify(await seen(E)) === "[4,0]", "an erased member is never counted");
  await erase(await memberId(B));
  check(JSON.stringify(await seen(A)) === "[3,0]", "nor counted as a teammate");

  // --- Nothing that names anyone ----------------------------------------------------------------------
  const out = JSON.stringify(await read(A));
  const leaks = [...Object.values(NAMES), A, B, C, F, G, p1, p3, "Plaza One"].filter((s) => out.includes(s));
  check(leaks.length === 0 && /^\{"team": ?\d+, ?"count": ?\d+\}$|^\{"count": ?\d+, ?"team": ?\d+\}$/.test(out),
    "the answer is two integers: no id, name, project or time", out);

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
