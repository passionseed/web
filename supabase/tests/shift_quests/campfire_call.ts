/**
 * SHIFT High Island in Discord: the 18:50 campfire call and the evening
 * guest's drop (20261118150000_shift_quest_campfire_call, schema 21). At fixed
 * times:
 *   * the call: on by default, every day while a news and a coworking channel
 *     are set (a season or not); due from 18:50:00 to 19:14:59, a stale claim
 *     (3 minutes, no message) until 19:29:59, never later; claim and mark
 *     (one call a day, compare-and-set); the ping roles only while the ping
 *     is on, frozen at the claim; the previous day's call to delete;
 *   * the guest: a fixed rotation by season day (boat, gull, fireflies,
 *     turtle), never the same two nights running, none without an active
 *     season;
 *   * the drop: only in the guest's first rest (19:25 to 19:30), decided by
 *     who sits there at the first call (the guest's arrival), even with no
 *     team there, so nobody is rewarded for arriving first; one roll per
 *     team per night however many teammates sit there and however often it is
 *     called (two processes at once included); staff and mentors never win;
 *     no member id, Discord id or presence stored (one row per team and
 *     night, deleted the next day, also by pg_cron's voice purge and on an
 *     erasure); a win is a one-option gift of the guest's own looks with no
 *     member; a team with both looks is recorded with none; round and quest
 *     gifts never offer a guest look; the chance is 1 in 2; nothing touches
 *     the ledger, the stage or the voice tables;
 *   * the public count: how many teams got a look shows only when 3 or more
 *     teams rolled and neither all nor none won (else withheld), 0 when no
 *     team rolled or the drop's rest passed with no drop;
 *   * the call switched off: the latest recorded call comes back to be
 *     retired, and tonight's drop still answers the private check;
 *   * the private check: gone, arriving, quiet, away, won (with the waiting
 *     gift), lost, full, noplot, about the caller's own team only;
 *   * the grants: the five entry points are the bot's (and service_role's),
 *     never the website's or the Data API's; the helpers nobody's; the new
 *     tables have row level security and no grants.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { Client } from "pg";
import { TREE_ITEMS } from "../../../lib/shift-island/tree-style";
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

// Synthetic Discord ids, channels and roles.
const ADMIN = "941100000000000001";
const A = "951100000000000001"; // team one, with B
const B = "951100000000000002";
const C = "951100000000000003"; // team two
const E = "951100000000000005"; // team four, never at the fire
const M = "951100000000000006"; // a mentor with a team of their own
const N = "951100000000000007"; // started, no project
const NOBODY = "951199999999999999";
const NAMES = ["Call Admin", "Call Aye", "Call Bee", "Call Cee", "Call Eee", "Call Mentor", "Call Enn"];
const NEWS_CH = "961100000000000001";
const ROOM = "961100000000000002";
const ROLE = "971100000000000001";
const MSG1 = "981100000000000001";
const MSG2 = "981100000000000002";

/** The season: starts on a boat night. Night k of the season has guest GUESTS[k % 4]. */
const STARTS = "2026-03-01";
const GUESTS = ["boat", "gull", "fireflies", "turtle"];
const dayAfter = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** A Bangkok time on a day, as timestamptz text. */
const bkk = (day: string, hms: string) => `${day} ${hms}+07`;

const BOT_FNS = [
  "shift_quest_call_today()",
  "shift_quest_call_claim(date,text)",
  "shift_quest_call_mark(date,text,text)",
  "shift_quest_campfire_drop(date,text[])",
  "shift_quest_guest_status(text)",
];
const HELPERS = [
  "shift_quest__call_at(date,text)",
  "shift_quest__call_on()",
  "shift_quest__guest_of(date)",
  "shift_quest__guest_tonight(date)",
  "shift_quest__call_due(date,timestamp with time zone)",
  "shift_quest__call_today(timestamp with time zone)",
  "shift_quest__call_claim(date,text,timestamp with time zone)",
  "shift_quest__guest_drop_chance()",
  "shift_quest__guest_purge(date)",
  "shift_quest__guest_reveal(date,timestamp with time zone)",
  "shift_quest__guest_drop(timestamp with time zone,text[],double precision)",
  "shift_quest__guest_status(uuid,timestamp with time zone)",
];
const TABLES = ["shift_quest_call_posts", "shift_quest_guest_nights", "shift_quest_guest_drops"];
const GUEST_LOOKS: Record<string, string[]> = Object.fromEntries(
  GUESTS.map((g) => [g, TREE_ITEMS.filter((i) => i.guest === g).map((i) => i.id)])
);
const COMMON = TREE_ITEMS.filter((i) => !i.guest).map((i) => i.id);

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

/** 'ok' or the SQLSTATE of the error (42501: insufficient privilege). */
async function sqlstate(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    return (error as { code?: string }).code ?? (error as Error).message;
  }
}

/** The quest refusal code ('sq:<code>' raised by shift_quest__fail), or 'ok'. */
async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    const m = /sq:([a-z_]+)/.exec((error as Error).message);
    return m ? m[1] : (error as Error).message;
  }
}

async function scalar<T = any>(c: Client, sql: string, args: unknown[] = []): Promise<T> {
  const { rows } = await c.query(sql, args);
  return Object.values(rows[0])[0] as T;
}

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures, the helpers at fixed times, inspection
  const db2 = await connect(adminUrl!); // a second bot process, for the race
  const bot = await connect(botUrl!); // shift_quest_bot: as Discord runs it
  const web = await connect(webUrl!); // shift_quest_web: the website
  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const adminSet = (key: string, value: string | null) => call<Json>(bot, "shift_quest_admin_set", ADMIN, key, value);
  const today = (at: string) => call<Json | null>(db, "shift_quest__call_today", at);
  const due = (day: string, at: string) => scalar<boolean>(db, "select public.shift_quest__call_due($1::date, $2::timestamptz)", [day, at]);
  const claim = (day: string, at: string, channel = NEWS_CH) =>
    scalar<string | null>(db, "select public.shift_quest__call_claim($1::date, $2, $3::timestamptz)", [day, channel, at]);
  const mark = (c: Client, day: string, message: string) => call<string>(c, "shift_quest_call_mark", day, NEWS_CH, message);
  const guestOf = (day: string) => scalar<string | null>(db, "select public.shift_quest__guest_of($1::date)", [day]);
  const drop = (c: Client, at: string, ids: string[], chance: number) =>
    scalar<Json | null>(c, "select public.shift_quest__guest_drop($1::timestamptz, $2::text[], $3)", [at, ids, chance]);
  const memberId = (discord: string) => scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [discord]);
  const status = async (discord: string, at: string) =>
    scalar<Json>(db, "select public.shift_quest__guest_status($1::uuid, $2::timestamptz)", [await memberId(discord), at]);
  const dropRows = (day: string) =>
    db.query("select project_id, guest, look from public.shift_quest_guest_drops where day = $1::date order by project_id", [day]).then((r) => r.rows);
  const gifts = (project: string) =>
    db.query("select id, member_id, source, options, picked from public.shift_quest_tree_gifts where project_id = $1 order by created_at, id", [project]).then((r) => r.rows);
  const setOwned = (project: string, owned: string[]) =>
    db.query(
      "insert into public.shift_quest_tree_style (project_id, owned) values ($1, $2) on conflict (project_id) do update set owned = excluded.owned",
      [project, owned],
    );

  // --- Schema, privileges, row security ---------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 21,
    "the bot reads schema 21 or later (the campfire call)");
  check(Number(await call(web, "shift_quest_schema_version")) === LATEST_SCHEMA, "the website reads the same version");
  const fnInfo = async (sig: string): Promise<Json> => (await db.query(
    `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
            has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web,
            has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
            has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
            has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') as service_role,
            p.proacl is null or exists (
              select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'
            ) as public,
            p.prosecdef as definer,
            coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
     from pg_proc p where p.oid = $1::regprocedure`,
    [`public.${sig}`],
  )).rows[0];
  for (const sig of BOT_FNS) {
    const g = await fnInfo(sig);
    check(g.bot === true && g.service_role === true && !g.web && !g.anon && !g.authenticated && !g.public && g.definer && g.pinned,
      `${sig}: security definer, pinned search_path, the bot's (and service_role's) only`, g);
  }
  for (const sig of HELPERS) {
    const g = await fnInfo(sig);
    check(!g.bot && !g.web && !g.anon && !g.authenticated && !g.public && !g.service_role && g.pinned,
      `${sig}: a helper no login can run, service_role included`, g);
  }
  for (const [label, sql, args] of [
    ["the call's reader", "select public.shift_quest_call_today()", []],
    ["the call's claim", "select public.shift_quest_call_claim($1::date, $2)", ["2026-03-01", NEWS_CH]],
    ["the call's writer", "select public.shift_quest_call_mark($1::date, $2, $3)", ["2026-03-01", NEWS_CH, MSG1]],
    ["the guest's drop", "select public.shift_quest_campfire_drop($1::date, $2::text[])", ["2026-03-01", [A]]],
    ["the guest's check", "select public.shift_quest_guest_status($1)", [A]],
  ] as [string, string, unknown[]][]) {
    check((await sqlstate(web.query(sql, args))) === "42501", `the website is refused ${label} (42501)`);
    for (const r of ["anon", "authenticated"]) {
      await db.query(`set role ${r}`);
      check((await sqlstate(db.query(sql, args))) === "42501", `${r} is refused ${label}`);
      await db.query("reset role");
    }
  }
  check((await sqlstate(bot.query("select public.shift_quest__guest_drop(now(), $1::text[], 1)", [[A]]))) === "42501",
    "the bot cannot roll with a chance or a time of its choosing (42501)");
  check((await sqlstate(bot.query("select public.shift_quest__call_claim(current_date, $1, now())", [NEWS_CH]))) === "42501",
    "nor claim at a time of its choosing");
  for (const t of TABLES) {
    const r = (await db.query(
      `select c.relrowsecurity as rls,
              has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT')
                or has_table_privilege('shift_quest_bot', c.oid, 'SELECT') or has_table_privilege('shift_quest_web', c.oid, 'SELECT') as readable
       from pg_class c where c.oid = $1::regclass`, [`public.${t}`])).rows[0];
    check(r.rls === true && r.readable === false, `${t}: row level security on, no login can read it`, r);
  }
  const dropColumns = (await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'shift_quest_guest_drops' order by ordinal_position",
  )).rows.map((r) => r.column_name);
  check(JSON.stringify(dropColumns) === JSON.stringify(["day", "project_id", "guest", "look"]),
    "a drop row has no column for a member, a Discord id, a time or a count of people", dropColumns);
  const nightColumns = (await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'shift_quest_guest_nights' order by ordinal_position",
  )).rows.map((r) => r.column_name);
  check(JSON.stringify(nightColumns) === JSON.stringify(["day", "guest", "dropped_at"]), "a night row names no one and no team", nightColumns);

  // --- The catalog: the guests' 8 looks ------------------------------------------------------------------
  const catalog = (await db.query("select id, slot, guest from public.shift_quest_tree_items where guest is not null order by sort")).rows;
  check(JSON.stringify(catalog.map((r) => [r.id, r.guest])) ===
      JSON.stringify(TREE_ITEMS.filter((i) => i.guest).map((i) => [i.id, i.guest])),
    "shift_quest_tree_items holds the guests' 8 looks with their guests, as TREE_ITEMS", catalog);
  check(catalog.every((r) => r.slot !== "shape"), "colour looks only: no new canopy shape");
  check(Number(await scalar(db, "select public.shift_quest__guest_drop_chance()")) === 0.5, "the win chance is one constant: 1 in 2");

  // --- Fixtures ----------------------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  const s0 = (await db.query("select campfire_call_enabled, campfire_call_ping from public.shift_quest_settings where id")).rows[0];
  check(s0.campfire_call_enabled === true && s0.campfire_call_ping === true,
    "the call and its ping are on by default (founder decisions 1 and 3)", s0);
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[0]);
  for (const [k, id] of [A, B, C, E, M, N].entries()) await call(bot, "shift_quest_start", id, NAMES[k + 1], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "Call One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "Call Two", "creative", null);
  const p4: string = await call(web, "shift_quest_project_create", E, "Call Four", "service", null);
  const p3: string = await call(web, "shift_quest_project_create", M, "Call Three", "software", null);
  await call(bot, "shift_quest_admin_role", ADMIN, M, NAMES[5], "reviewer", true);

  // --- The call: when it runs ------------------------------------------------------------------------------
  const D = dayAfter(STARTS, 8); // a boat night once the season exists
  check(await today(bkk(D, "18:50:00")) === null, "no news channel: no call");
  await adminSet("news_channel", NEWS_CH);
  check(await today(bkk(D, "18:50:00")) === null, "no coworking channel: no call (nowhere to invite people to)");
  await adminSet("coworking_channel", ROOM);
  await adminSet("student_role_add", ROLE);
  let t = await today(bkk(D, "18:50:00"));
  check(t !== null && t.day === D && t.guest === null && t.due === true,
    "no active season: the call still runs, with no guest (founder decision 3)", t);
  await db.query(
    "insert into public.shift_quest_seasons (name, starts_on, ends_on, demo_day, status) values ('Call Season', $1::date, $1::date + 120, $1::date + 90, 'active')",
    [STARTS]);
  t = await today(bkk(D, "18:50:00"));
  const callAt = Date.parse(`${D}T18:50:00+07:00`) / 1000;
  check(t?.guest === "boat" && t.call_at === callAt && t.lit_at === callAt + 600 && t.guest_from === callAt + 2100 &&
      t.guest_until === callAt + 7800,
    "an active season: tonight's guest, and the clock 18:50, 19:00, 19:25, 21:00 Bangkok in unix seconds", t);
  check(t?.channel_id === NEWS_CH && t.coworking_channel_id === ROOM && JSON.stringify(t.ping_role_ids) === JSON.stringify([ROLE]) &&
      t.message_id === null && t.previous === null && t.drop === null,
    "the news channel, the coworking channel, the student role to ping, nothing posted yet", t);
  const text = JSON.stringify(t);
  check(![A, B, C, NAMES[1], "Call One"].some((x) => text.includes(x)) && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(text),
    "no member, name, team or uuid in the call's answer", text);

  for (const [at, want] of [
    ["18:49:59", false], ["18:50:00", true], ["19:00:00", true], ["19:14:59", true], ["19:15:00", false], ["23:00:00", false],
  ] as [string, boolean][]) {
    check(await due(D, bkk(D, at)) === want, `${at} Bangkok with no claim: ${want ? "due" : "not due"}`);
  }
  await adminSet("campfire_call", "off");
  check(await today(bkk(D, "18:50:00")) === null && await due(D, bkk(D, "18:50:00")) === false,
    "/admin feature campfire_call off: no call at all");
  check(await count("select count(*) from public.shift_quest_audit where action = 'settings_campfire_call'") === 1,
    "and the switch is audited like every setting");
  const st = await call<Json>(bot, "shift_quest_admin_status", ADMIN);
  check(st.settings.campfire_call_enabled === false && st.settings.campfire_call_ping === true,
    "/admin status shows both switches", st.settings);
  await adminSet("campfire_call", "on");
  await adminSet("campfire_call_ping", "off");
  check(JSON.stringify((await today(bkk(D, "18:50:00")))?.ping_role_ids) === "[]", "the ping off: no roles to ping");
  await adminSet("campfire_call_ping", "on");

  // --- Claim and mark ------------------------------------------------------------------------------------------
  check(await code(claim(D, bkk(D, "18:50:00"), "#news")) === "bad_input", "a claim for a channel that is no snowflake is refused");
  check(await claim(D, bkk(D, "18:49:00")) === null, "before 18:50: no claim");
  check(await claim(dayAfter(D, 1), bkk(D, "18:55:00")) === null, "a claim for another day than now's: none");
  check(await claim(D, bkk(D, "18:50:10")) === "new", "18:50: the claim is new");
  // The ping switch flips after the claim: the call keeps what it was claimed with.
  await adminSet("campfire_call_ping", "off");
  check(JSON.stringify((await today(bkk(D, "18:51:00")))?.ping_role_ids) === JSON.stringify([ROLE]),
    "whether the call pings is frozen at the claim");
  await adminSet("campfire_call_ping", "on");
  check(await claim(D, bkk(D, "18:52:00")) === null && await due(D, bkk(D, "18:53:09")) === false,
    "a claim under 3 minutes old blocks another (a second process waits)");
  check(await due(D, bkk(D, "18:53:10")) === true, "3 minutes on with no message: the stale claim is due");
  check(await claim(D, bkk(D, "19:20:00")) === "stale", "and is offered as stale, even after 19:15");
  check(await due(D, bkk(D, "19:22:59")) === false, "a fresh stale claim blocks again for 3 minutes");
  check(await due(D, bkk(D, "19:23:00")) === true && await due(D, bkk(D, "19:29:59")) === true && await due(D, bkk(D, "19:30:00")) === false,
    "a stale claim is recovered until 19:29:59, never after");
  check(await mark(bot, D, MSG1) === MSG1, "the bot records tonight's call");
  check(await mark(bot, D, MSG2) === MSG1, "a second process's mark gets the first id back (compare-and-set)");
  check(await due(D, bkk(D, "19:00:00")) === false && await claim(D, bkk(D, "19:00:00")) === null, "recorded: never due again that day");
  check(await code(mark(bot, D, "x")) === "bad_input", "a mark of a message that is no snowflake is refused");
  t = await today(bkk(D, "20:00:00"));
  check(t?.message_id === MSG1 && t.message_channel_id === NEWS_CH && t.due === false, "the call reads as recorded, with its channel", t);
  const D2 = dayAfter(D, 1);
  await db.query("insert into public.shift_quest_call_posts (day, channel_id, claimed_at) values ($1::date - 3, $2, now())", [D2, NEWS_CH]);
  t = await today(bkk(D2, "18:55:00"));
  check(JSON.stringify(t?.previous) === JSON.stringify({ channel_id: NEWS_CH, message_id: MSG1 }) && t?.message_id === null,
    "the next evening: yesterday's recorded call is the one to delete (an unposted claim is not)", t?.previous);

  // --- The guest rotation ------------------------------------------------------------------------------------------
  const seen: (string | null)[] = [];
  for (let k = 0; k < 400; k++) seen.push(await guestOf(dayAfter(STARTS, k)));
  check(seen.every((g, k) => g === GUESTS[k % 4]), "400 nights from the season's start: boat, gull, fireflies, turtle, in turn",
    seen.slice(0, 8));
  check(seen.every((g, k) => k === 0 || g !== seen[k - 1]), "never the same guest two nights running");
  check(await guestOf(dayAfter(STARTS, -1)) === null, "no guest before the season starts");
  await db.query("update public.shift_quest_seasons set status = 'closed' where name = 'Call Season'");
  check(await guestOf(D) === null && (await today(bkk(D, "18:55:00")))?.guest === null,
    "no active season: the guest pauses, the call does not");
  await db.query("update public.shift_quest_seasons set status = 'active' where name = 'Call Season'");

  // --- The drop ------------------------------------------------------------------------------------------------------
  const ledger0 = await count("select count(*) from public.shift_quest_ledger");
  const voice0 = await count("select count(*) from public.shift_quest_voice_presence");
  const work0 = await count("select count(*) from public.shift_quest_work_sessions");
  const subs0 = await count("select count(*) from public.shift_quest_submissions");
  const stage0 = await call<Json>(web, "shift_quest_tree_get", A);
  const AT = (day: string) => bkk(day, "19:25:05");
  const all = [A, B, C, M, N, NOBODY, "not-a-snowflake"];

  check(await drop(db, bkk(D, "19:24:59"), all, 1) === null, "19:24:59: the guest has not arrived, no drop");
  check(await drop(db, bkk(D, "19:30:00"), all, 1) === null, "19:30: the first rest is over, no drop");
  await adminSet("campfire_call", "off");
  check(await drop(db, AT(D), all, 1) === null, "the call off: no drop");
  await adminSet("campfire_call", "on");
  // The moment is the guest's arrival (the first call in its rest), never the first student to come.
  const N0 = dayAfter(STARTS, 4); // a boat night
  let r = await drop(db, AT(N0), [M, N, NOBODY], 1);
  check(r?.done === true && r.fresh === true && r.teams === 0 && (await dropRows(N0)).length === 0 &&
      await count("select count(*) from public.shift_quest_guest_nights where day = $1::date", [N0]) === 1,
    "only a mentor, someone with no team and an unknown id at the fire when the guest arrives: the night is recorded, nobody rolls", r);
  r = await drop(db, bkk(N0, "19:26:40"), [A, C], 1);
  check(r?.fresh === false && (await dropRows(N0)).length === 0 && (await gifts(p1)).length === 0 && (await gifts(p2)).length === 0,
    "students who sit down after the guest arrived get no roll that night: no reward for being first", r);
  const NE = dayAfter(STARTS, 32); // a boat night
  r = await drop(db, AT(NE), [], 1);
  check(r?.done === true && r.teams === 0 && await count("select count(*) from public.shift_quest_guest_nights where day = $1::date", [NE]) === 1,
    "nobody at the fire when the guest arrives: the night is recorded with no roll", r);

  r = await drop(db, AT(D), all, 1);
  check(r?.done === true && r.fresh === true && r.guest === "boat" && r.teams === null,
    "the guest arrives with A, B (one team), C, a mentor and others at the fire: 2 teams roll; fewer than 3, so the count is withheld", r);
  let rows = await dropRows(D);
  check(rows.length === 2 && rows.every((x) => x.look !== null), "both teams won at chance 1", rows);
  check(JSON.stringify((await today(bkk(D, "19:40:00")))?.drop) === JSON.stringify({ teams: null }),
    "the call's count is withheld too: with 1 or 2 teams it would point at who won", (await today(bkk(D, "19:40:00")))?.drop);
  check(JSON.stringify(rows.map((x) => x.project_id).sort()) === JSON.stringify([p1, p2].sort()),
    "one row per team: A and B sitting together give their team one roll; the mentor's team and the unknown ids none", rows);
  check(rows.every((x) => x.guest === "boat" && GUEST_LOOKS.boat.includes(x.look)), "each won one of the boat's own looks", rows);
  const g1 = await gifts(p1);
  check(g1.length === 1 && g1[0].member_id === null && g1[0].source === `drop:${D}` && g1[0].options.length === 1 &&
      g1[0].options[0] === rows.find((x) => x.project_id === p1)!.look && g1[0].picked === null,
    "a win is a one-option gift on the team's tree, source drop:<day>, with no member", g1);
  check((await gifts(p3)).length === 0 && (await gifts(p4)).length === 0, "the mentor's team and the absent team got nothing");

  // Called again (a restart, another tick) with other people now at the fire: the night is done.
  r = await drop(db, bkk(D, "19:28:00"), [E, A], 1);
  check(r?.done === true && r.fresh === false && r.teams === null && (await dropRows(D)).length === 2 && (await gifts(p4)).length === 0,
    "called again that night (E's team now there too): nothing new, the same answer", r);
  check(await count("select count(*) from public.shift_quest_guest_nights where day = $1::date", [D]) === 1, "one night row");

  // Two processes at once, on another night: one roll each team, one night.
  const N2 = dayAfter(STARTS, 12); // a boat night
  await db.query("begin");
  await db2.query("begin");
  const first = await drop(db, AT(N2), [C], 0);
  const second = drop(db2, AT(N2), [A, C, E], 0); // waits for the first's lock
  await db.query("commit");
  const late = await second;
  await db2.query("commit");
  check(first?.fresh === true && late?.fresh === false && (await dropRows(N2)).length === 1,
    "two bot processes at once: the second waits, then finds the night done (one roll, one row)", { first, late });

  // A night where luck says no: every team that was there is recorded with no look.
  const N3 = dayAfter(STARTS, 13); // a gull night
  r = await drop(db, AT(N3), [A, C], 0);
  rows = await dropRows(N3);
  check(r?.teams === null && rows.length === 2 && rows.every((x) => x.look === null && x.guest === "gull"),
    "chance 0: each team rolls once and gets nothing, recorded as no look", rows);

  // A team with both of tonight's guest's looks: recorded, no look, even at chance 1; a held look is never offered twice.
  const N4 = dayAfter(STARTS, 16); // a boat night
  await setOwned(p2, GUEST_LOOKS.boat);
  await drop(db, AT(N4), [A, C], 1);
  rows = await dropRows(N4);
  const p1won = (await gifts(p1)).map((g) => g.options[0]);
  check(rows.find((x) => x.project_id === p2)?.look === null && rows.find((x) => x.project_id === p1)?.look !== null,
    "a team with both of the boat's looks is recorded with none; the other team still wins", rows);
  check(new Set(p1won).size === p1won.length && p1won.every((id) => GUEST_LOOKS.boat.includes(id)),
    "a look a waiting gift already offers is never offered again (team one's two boat gifts differ)", p1won);
  const N5 = dayAfter(STARTS, 20); // a boat night: team one now holds both boat looks in waiting gifts
  await drop(db, AT(N5), [A], 1);
  check((await dropRows(N5))[0]?.look === null, "both looks waiting in unpicked gifts: nothing left to give, none");

  // Round and quest gifts never offer a guest look.
  await setOwned(p4, COMMON.filter((id) => id !== "leaf:sky"));
  const g4 = await scalar<Json | null>(db, "select public.shift_quest__gift_create($1::uuid, $2::uuid, 'test:one')", [p4, await memberId(E)]);
  check(JSON.stringify(g4?.options) === JSON.stringify(["leaf:sky"]), "a round or quest gift offers only common looks", g4);
  await setOwned(p4, COMMON);
  check(await scalar(db, "select public.shift_quest__gift_create($1::uuid, $2::uuid, 'test:two')", [p4, await memberId(E)]) === null,
    "and none once the team owns every common look, though no guest look is owned");

  // The chance, over many nights: about half the rolls win.
  let wins = 0;
  let rolls = 0;
  for (let k = 0; k < 100; k++) {
    const night = dayAfter(STARTS, 200 + k);
    for (const p of [p1, p2]) {
      await db.query("delete from public.shift_quest_tree_gifts where project_id = $1", [p]);
      await setOwned(p, []);
    }
    await scalar<Json>(db, "select public.shift_quest__guest_drop($1::timestamptz, $2::text[], public.shift_quest__guest_drop_chance())",
      [AT(night), [A, C]]);
    wins += (await dropRows(night)).filter((x) => x.look !== null).length;
    rolls += 2;
  }
  check(rolls === 200 && wins >= 60 && wins <= 140, "at the real chance about half of 200 rolls win (60 to 140)", { wins, rolls });

  // The public count: exact only when 3 or more teams rolled and some, not all, won.
  for (const p of [p1, p2, p4]) {
    await db.query("delete from public.shift_quest_tree_gifts where project_id = $1", [p]);
    await setOwned(p, []);
  }
  await setOwned(p4, GUEST_LOOKS.boat);
  const NF = dayAfter(STARTS, 36); // a boat night
  r = await drop(db, AT(NF), [A, C, E], 1);
  check(r?.teams === 2 && JSON.stringify((await today(bkk(NF, "20:00:00")))?.drop) === JSON.stringify({ teams: 2 }),
    "3 teams rolled and 2 won: the count shows (nobody can tell which 2)", r);
  await setOwned(p4, []);
  const NG = dayAfter(STARTS, 40); // a boat night
  r = await drop(db, AT(NG), [A, C, E], 1);
  check(r?.teams === null && JSON.stringify((await today(bkk(NG, "20:00:00")))?.drop) === JSON.stringify({ teams: null }),
    "3 teams rolled and all 3 won: withheld, it would tell each of them", r);
  const NH = dayAfter(STARTS, 44); // a boat night
  r = await drop(db, AT(NH), [A, C, E], 0);
  check(r?.teams === null, "3 teams rolled and none won: withheld too", r);
  const NI = dayAfter(STARTS, 48); // a boat night
  check(await today(bkk(NI, "19:29:59")).then((x) => x?.drop) === null,
    "before the rest is over with no drop made: no count yet");
  check(JSON.stringify((await today(bkk(NI, "19:30:00")))?.drop) === JSON.stringify({ teams: 0 }) &&
      JSON.stringify((await today(bkk(NI, "21:30:00")))?.drop) === JSON.stringify({ teams: 0 }),
    "the guest's first rest over with no drop (the bot was away): the drop is closed, nobody got a look");
  check((await status(A, bkk(NI, "19:31:00"))).state === "quiet",
    "and the private check says the guest only stopped by, not that the team was away");
  check((await status(A, bkk(NE, "20:00:00"))).state === "away",
    "a night recorded with nobody's team at the fire: the team was away");

  // Nothing else moves.
  check(await count("select count(*) from public.shift_quest_ledger") === ledger0, "the drop never writes the ledger (no coins)");
  check(await count("select count(*) from public.shift_quest_voice_presence") === voice0 &&
      await count("select count(*) from public.shift_quest_work_sessions") === work0 &&
      await count("select count(*) from public.shift_quest_submissions") === subs0,
    "nor the voice tables, the work sessions or any submission");
  check((await call<Json>(web, "shift_quest_tree_get", A)).stage === stage0.stage, "and never the tree's stage");

  // --- The private check -----------------------------------------------------------------------------------------------
  const N6 = dayAfter(STARTS, 24); // a boat night
  for (const p of [p1, p2]) {
    await db.query("delete from public.shift_quest_tree_gifts where project_id = $1", [p]);
    await setOwned(p, []);
  }
  check((await status(A, bkk(N6, "19:24:59"))).state === "gone", "before the guest: gone");
  check((await status(A, bkk(N6, "19:26:00"))).state === "arriving", "the guest here, no drop yet: arriving");
  check((await status(A, bkk(N6, "19:31:00"))).state === "quiet",
    "no drop by 19:30 (the bot was away): the guest only stopped by, never 'your team was away'");
  check((await status(N, bkk(N6, "19:26:00"))).state === "noplot", "no project: noplot");
  await drop(db, AT(N6), [A], 1);
  await setOwned(p2, GUEST_LOOKS.boat);
  await drop(db, AT(N6), [C], 1); // the night is done: C's team gets no roll
  let s = await status(B, bkk(N6, "20:00:00"));
  const giftNow = (await gifts(p1))[0];
  check(s.state === "won" && s.guest === "boat" && GUEST_LOOKS.boat.includes(s.look) && s.gift?.id === giftNow.id &&
      JSON.stringify(s.looks) === JSON.stringify(GUEST_LOOKS.boat),
    "a teammate who was not there sees the team's win and its waiting gift", s);
  const sText = JSON.stringify(s);
  check(![A, B, C, NAMES[1], NAMES[2], await memberId(A), await memberId(B)].some((x) => sText.includes(x)),
    "the check names nobody and carries no member id", sText);
  await call(web, "shift_quest_tree_pick", B, giftNow.id, giftNow.options[0]);
  s = await status(A, bkk(N6, "23:59:00"));
  check(s.state === "won" && s.gift === null, "once picked, the win shows with no gift waiting", s);
  check((await status(C, bkk(N6, "20:00:00"))).state === "away", "C's team was not there when the guest arrived: away");
  const N7 = dayAfter(STARTS, 28); // a boat night: C's team owns both boat looks
  await drop(db, AT(N7), [A, C], 0);
  check((await status(C, bkk(N7, "20:00:00"))).state === "full", "no look, and the team has both of the guest's: full");
  check((await status(A, bkk(N7, "20:00:00"))).state === "lost", "no look, something left to give: lost");
  check((await status(A, bkk(dayAfter(N7, 1), "01:00:00"))).state === "gone", "the next day: gone");
  await adminSet("campfire_call", "off");
  check((await status(A, bkk(N7, "20:00:00"))).state === "lost",
    "the call switched off after tonight's drop: the private check still answers about it");
  check((await status(A, bkk(dayAfter(STARTS, 52), "20:00:00"))).state === "gone", "the call off on a night with no drop: gone");
  t = await today(bkk(N7, "20:00:00"));
  check(JSON.stringify(t) === JSON.stringify({ day: D, off: true, message_id: MSG1, message_channel_id: NEWS_CH }),
    "the call off: the latest recorded call comes back only to be retired (no times, no roles, no guest)", t);
  await adminSet("campfire_call", "on");
  check(await code(call(bot, "shift_quest_guest_status", NOBODY)) === "not_started", "the bot's check is for started members");
  check(typeof (await call<Json>(bot, "shift_quest_guest_status", A)).state === "string", "the bot can run the check now");

  // --- Earlier nights' rolls do not stay ---------------------------------------------------------------------------------
  const todayBkk: string = await scalar(db, "select public.shift_quest__bkk_today()::text");
  const pastRolls = () => count("select count(*) from public.shift_quest_guest_drops where day < $1::date", [todayBkk]);
  const oldRoll = () => db.query(
    "insert into public.shift_quest_guest_drops (day, project_id, guest, look) values ($1::date - 1, $2, 'boat', null) on conflict do nothing",
    [todayBkk, p1]);
  check(await pastRolls() > 0, "rolls of past nights exist before the purge", await pastRolls());
  // pg_cron runs the voice purge every 5 minutes in production: no bot needed, an old or stopped one included.
  await db.query("select public.shift_quest__voice_purge()");
  check(await pastRolls() === 0, "the 5-minute voice purge (pg_cron) deletes every earlier night's rolls, with no bot running");
  await oldRoll();
  await call(bot, "shift_quest_call_today");
  check(await pastRolls() === 0, "so does the bot's read of the call (wins stay as the team's gifts)");
  await oldRoll();
  await call(bot, "shift_quest_campfire_drop", "2026-03-02", [A]);
  check(await pastRolls() === 0, "and any call of the drop, even one for another day");
  check(await count("select count(*) from public.shift_quest_tree_gifts where source like 'drop:%'") > 0, "the won gifts stay");

  // --- The bot's entry points on the real clock ---------------------------------------------------------------------------
  check(await call(bot, "shift_quest_campfire_drop", "2026-03-02", [A]) === null, "the drop for a day that is not today: none");
  check(["ok"].includes(await sqlstate(call(bot, "shift_quest_campfire_drop", todayBkk, [A, "x"]))),
    "the bot can run the drop for today (it decides by the clock)");
  check(await code(call(bot, "shift_quest_call_claim", todayBkk, "#news")) === "bad_input", "the bot's claim checks the channel");
  check(["ok"].includes(await sqlstate(call(bot, "shift_quest_call_claim", dayAfter(todayBkk, 1), NEWS_CH))),
    "the bot can claim (a day that is not today: none)");

  // --- An erasure takes a one-person team's drops ------------------------------------------------------------------------
  // Team two is C alone: its rolls and its drop gifts say C sat at the fire on those nights.
  const dropGifts = (p: string) => count("select count(*) from public.shift_quest_tree_gifts where project_id = $1 and source like 'drop:%'", [p]);
  await db.query("insert into public.shift_quest_guest_drops (day, project_id, guest, look) values ($1::date, $2, 'boat', null)", [todayBkk, p2]);
  for (const p of [p1, p2]) {
    await db.query(
      "insert into public.shift_quest_tree_gifts (project_id, member_id, source, options) values ($1, null, $2, array['bloom:shell']) on conflict do nothing",
      [p, `drop:${dayAfter(STARTS, 57)}`]);
  }
  check(await dropGifts(p2) > 0 && await dropGifts(p1) > 0, "teams one and two hold drop gifts before the erasures");
  await call(bot, "shift_quest_admin_erase", ADMIN, await call(bot, "shift_quest_data_request", C, "erasure", null));
  check(await dropGifts(p2) === 0 && await count("select count(*) from public.shift_quest_guest_drops where project_id = $1", [p2]) === 0,
    "erasing the only member of a team deletes the team's drop gifts and rolls: no dated record that they sat at the fire");
  await call(bot, "shift_quest_admin_erase", ADMIN, await call(bot, "shift_quest_data_request", B, "erasure", null));
  check(await dropGifts(p1) > 0, "erasing one of two teammates leaves the team's gifts (they name no one, and the team goes on)");

  await Promise.all([db.end(), db2.end(), bot.end(), web.end()]);
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
