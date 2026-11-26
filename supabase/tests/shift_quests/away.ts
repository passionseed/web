/**
 * SHIFT High Island: the come-back DM and the return card (code name away,
 * 20261121090000_shift_quest_away, schema 23).
 *   * consent: away_dm null means never asked, set only by the student
 *     (staff 'not_allowed'), audited; no drops what is queued. From schema
 *     24 (20261126100000) a new member starts with it on (the default is
 *     true; nudges.ts covers that): this suite sets its students back to
 *     null so the never-asked path stays covered;
 *   * the switch: /admin feature away (shift_quest_admin_set key 'away'), off
 *     by default; off means no strip, no card, no DM;
 *   * activity: the Bangkok day of the latest write (journal, quest started,
 *     submission, work session start or end, help request, evidence photo,
 *     peer check), floored at onboarding and at the season's start; reads
 *     count for nothing; the end of a hold (a mentor's decision, waking from a
 *     rest) starts a fresh stretch, for the team's milestone too;
 *   * the state: ask_consent and ask_return, for students only, never while
 *     resting or waiting on a mentor (their own quest or their team's
 *     milestone), never on the day a hold ends, never between seasons, once
 *     per stretch (answered or skipped), gone the day after the return;
 *   * the answer: the right gap only, one of six reasons or a skip, a line of
 *     140 characters at most, saved once, came_by_dm, audited without text;
 *   * the queue: only at away_hour with the switch on in a season, one DM per
 *     stretch and per 14 days, never to notify_dm alone, resting, waiting,
 *     staff, erased or unstarted members, nor after the card was answered;
 *   * the claim: the DM CASE ('reminder', 'nudge', 'away', anything else
 *     dropped), 09:00 to 19:59 Bangkok, dropped for someone who came back;
 *   * the admin report: counts with "1-2" floors and nameless lines by week,
 *     admins only; the audited reveal; 90-day lines;
 *   * erasure, /data and the admin reset; the grants: the queue the bot's,
 *     the state and the choice both's, the answer and the admin reads the
 *     website's, the helpers nobody's; the table has row level security on,
 *     no policies, and no grant but service_role's.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { randomUUID } from "node:crypto";
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

// Synthetic Discord ids.
const ADMIN = "991300000000000001";
const R1 = "991300000000000002"; // a reviewer (a mentor), not an admin
const A = "992300000000000001"; // the main path: says yes, gets the DM, answers
const B = "992300000000000002"; // notify_dm only, never says yes
const C = "992300000000000003"; // resting
const D = "992300000000000004"; // waiting on a mentor
const E = "992300000000000005"; // every kind of activity, erased at the end
const H = "992300000000000006"; // says no, then the day boundary and the hour
const K = "992300000000000007"; // the answer's checks
const L = "992300000000000008"; // the day after the return
const M = "992300000000000009"; // no display name (the reveal's fallback)
const P = "992300000000000010"; // the 14-day cooldown, then opts out
const Q = "992300000000000011"; // a dropped DM does not block the next
const W = "992300000000000012"; // answered the card before the hour
const Y = "992300000000000013"; // skips the card
const Z = "992300000000000014"; // rests, then wakes: the rest is never time away
const TA = "992300000000000015"; // holds the team's milestone quest
const TB = "992300000000000016"; // TA's teammate: waits on the mentor with the team
const PENDING = "992300000000000090"; // known, has not finished /start, holds no role
const NOBODY = "992399999999999999";
const STUDENTS = [A, B, C, D, E, H, K, L, M, P, Q, W, Y, Z, TA, TB];
const NAMES: Record<string, string> = {
  [ADMIN]: "Away Admin", [R1]: "Away Reviewer", [A]: "Away Aye", [B]: "Away Bee", [C]: "Away Cee",
  [D]: "Away Dee", [E]: "Away Eee", [H]: "Away Aitch", [K]: "Away Kay", [L]: "Away Ell", [M]: "Away Em",
  [P]: "Away Pea", [Q]: "Away Queue", [W]: "Away Dub", [Y]: "Away Why", [Z]: "Away Zed", [TA]: "Away Team A",
  [TB]: "Away Team B",
};

const REASONS = ["busy", "stuck", "unclear", "team", "island", "break"];
const FALLBACK_NAME = "ไม่ระบุชื่อ";

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

/** 'ok' or the SQLSTATE of the error (42501: insufficient privilege, 23514: a CHECK). */
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

const keys = (o: Json | null | undefined) => (o ? Object.keys(o).sort().join(",") : String(o));
/** What the admin report shows for a count. */
const floor = (n: number): number | string => (n === 1 || n === 2 ? "1-2" : n);
/** JSON with object keys sorted (jsonb reorders keys). */
const canon = (v: unknown): string => JSON.stringify(v, (_, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x);
const isCount = (v: unknown) => v === "1-2" || (Number.isInteger(v) && (v as number) >= 0 && v !== 1 && v !== 2);

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures, the clock, inspection
  const bot = await connect(botUrl!); // shift_quest_bot: as Discord runs it
  const web = await connect(webUrl!); // shift_quest_web: the website

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const T = await scalar<string>(db, "select public.shift_quest__bkk_today()::text");
  /** The Bangkok date n days before today. */
  const day = (n: number) => {
    const d = new Date(`${T}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };
  /** Today (Bangkok) at hh:mm, as a timestamptz literal. */
  const at = (hhmm: string, date = T) => `${date}T${hhmm}:00+07:00`;

  const ids: Record<string, string> = {};
  const mid = async (discord: string) => {
    if (!ids[discord]) ids[discord] = await scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [discord]);
    return ids[discord];
  };
  const state = (who: string | null, c: Client = web) => call<Json>(c, "shift_quest_away_state", who);
  const setDm = (who: string | null, on: boolean | null, c: Client = web) => call<Json>(c, "shift_quest_away_set", who, on);
  const answer = (who: string | null, gap: string | null, reason: string | null, line: string | null) =>
    call<Json>(web, "shift_quest_away_answer", who, gap, reason, line);
  const enqueue = (when: string) => call<number>(bot, "shift_quest_enqueue_away", when);
  const report = (who: string = ADMIN) => call<Json>(web, "shift_quest_admin_away", who);
  const reveal = (id: string, who: string = ADMIN) => call<Json>(web, "shift_quest_admin_away_reveal", who, id);
  const feature = (value: string, actor = ADMIN) => call<Json>(bot, "shift_quest_admin_set", actor, "away", value);
  const gapOf = async (who: string) => (await state(who)).ask_return?.gap_from ?? null;
  /** The member's only journal row, n days ago (everything else they wrote stays). */
  const awayFor = async (who: string, n: number) => {
    const m = await mid(who);
    await db.query("delete from public.shift_quest_progress where member_id = $1", [m]);
    await db.query(
      "insert into public.shift_quest_progress (member_id, kind, changed, created_at) values ($1, 'note', 'บันทึก', now() - make_interval(days => $2))",
      [m, n],
    );
  };
  /** A journal row written now (coming back). */
  const writeNow = async (who: string) => (await db.query(
    "insert into public.shift_quest_progress (member_id, kind, changed) values ($1, 'note', 'กลับมาแล้ว') returning id::text",
    [await mid(who)],
  )).rows[0].id as string;
  const awayRows = async (who: string): Promise<Json[]> => (await db.query(
    "select id::text, dedupe_key, target_kind, channel_key, member_id::text, kind, params, status, last_error " +
    "from public.shift_quest_outbox where kind = 'away' and member_id = $1 order by created_at, id",
    [await mid(who)],
  )).rows;
  const keyOf = async (who: string, n: number) => `away:${await mid(who)}:${day(n)}`;
  const due = async (who: string, key: string | null, when: string) =>
    scalar<boolean>(db, "select public.shift_quest__away_due($1::uuid, $2, $3::timestamptz)", [await mid(who), key, when]);
  const audits = (action: string) => count("select count(*) from public.shift_quest_audit where action = $1", [action]);
  const answerRow = async (who: string, gap: string): Promise<Json | undefined> => (await db.query(
    "select id::text, gap_from::text, reason, line, came_by_dm from public.shift_quest_away_answers where member_id = $1 and gap_from = $2::date",
    [await mid(who), gap],
  )).rows[0];

  // --- Schema, privileges, row security -----------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 23,
    "the bot reads schema 23 or later (the come-back DM)");
  check(Number(await call(web, "shift_quest_schema_version")) === LATEST_SCHEMA, "the website reads the same version");

  const FNS: [string, "bot" | "web" | "both", string, string][] = [
    ["shift_quest_enqueue_away(timestamp with time zone)", "bot", "v", "integer"],
    ["shift_quest_away_state(text)", "both", "s", "jsonb"],
    ["shift_quest_away_set(text,boolean)", "both", "v", "jsonb"],
    ["shift_quest_away_answer(text,date,text,text)", "web", "v", "jsonb"],
    ["shift_quest_admin_away(text)", "web", "s", "jsonb"],
    ["shift_quest_admin_away_reveal(text,uuid)", "web", "v", "jsonb"],
  ];
  const HELPERS = [
    "shift_quest__away_hold_end(uuid)", "shift_quest__away_last(uuid,date)", "shift_quest__away_held(uuid)", "shift_quest__away_gap(uuid,date)",
    "shift_quest__away_live(date)", "shift_quest__away_key(uuid,date)", "shift_quest__away_n(bigint)",
    "shift_quest__away_json(uuid)", "shift_quest__away_due(uuid,text,timestamp with time zone)",
  ];
  const grants = async (sig: string): Promise<Json> => (await db.query(
    `select has_function_privilege('shift_quest_bot', p.oid, 'EXECUTE') as bot,
            has_function_privilege('shift_quest_web', p.oid, 'EXECUTE') as web,
            has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
            has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role,
            p.proacl is null or exists (
              select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'
            ) as public,
            p.prosecdef as definer, p.provolatile as volatility, format_type(p.prorettype, null) as returns,
            coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
     from pg_proc p where p.oid = $1::regprocedure`,
    [`public.${sig}`],
  )).rows[0];
  for (const [sig, who, volatility, returns] of FNS) {
    const g = await grants(sig);
    check(g?.bot === (who !== "web") && g.web === (who !== "bot") && g.anon === false && g.authenticated === false &&
        g.public === false && g.service_role === true && g.definer === true && g.pinned === true &&
        g.returns === returns && g.volatility === volatility,
      `${sig}: security definer, pinned search_path, ${volatility === "s" ? "STABLE, " : ""}returns ${returns}, ` +
        (who === "both" ? "the bot's and the website's" : who === "bot" ? "the bot's only" : "the website's only"), g);
  }
  for (const sig of HELPERS) {
    const g = await grants(sig);
    check(g && !g.bot && !g.web && !g.anon && !g.authenticated && !g.service_role && !g.public && g.pinned === true,
      `${sig}: a helper with a pinned search_path that no login runs`, g);
  }
  const awayFns: string[] = (await db.query(
    "select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace " +
    "where n.nspname = 'public' and p.proname like 'shift\\_quest%away%'",
  )).rows.map((r) => r.sig).sort();
  check(JSON.stringify(awayFns) === JSON.stringify([...FNS.map((f) => f[0]), ...HELPERS].sort()),
    "these are every away function", awayFns);
  // The replaced functions keep their grants.
  const kept: [string, boolean, boolean][] = [
    ["shift_quest_outbox_claim(integer)", true, false],
    ["shift_quest_admin_status(text)", true, false],
    ["shift_quest_admin_reset_self(text)", false, true],
    ["shift_quest__set_feature(text,boolean)", false, false],
    ["shift_quest__island_erase(uuid)", false, false],
    ["shift_quest__island_export(uuid)", false, false],
  ];
  for (const [sig, botOk, webOk] of kept) {
    const g = await grants(sig);
    check(g?.bot === botOk && g.web === webOk && !g.anon && !g.authenticated && !g.public,
      `${sig} keeps its grants (bot ${botOk}, website ${webOk})`, g);
  }
  check((await sqlstate(web.query("select public.shift_quest_enqueue_away()"))) === "42501",
    "the website cannot queue DMs (42501)");
  for (const [label, sql, args] of [
    ["answer", "select public.shift_quest_away_answer($1, $2::date, null, null)", [A, T]],
    ["read the admin report", "select public.shift_quest_admin_away($1)", [ADMIN]],
    ["reveal a writer", "select public.shift_quest_admin_away_reveal($1, $2::uuid)", [ADMIN, randomUUID()]],
  ] as [string, string, unknown[]][]) {
    check((await sqlstate(bot.query(sql, args))) === "42501", `the bot cannot ${label} (42501)`);
  }
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    for (const [sig] of FNS) {
      const name = sig.split("(")[0];
      const args = sig.slice(sig.indexOf("(") + 1, -1).split(",").filter(Boolean).map((t) => `null::${t}`).join(", ");
      check((await sqlstate(db.query(`select public.${name}(${args})`))) === "42501", `${r} cannot run ${name}`);
    }
    check((await sqlstate(db.query("select * from public.shift_quest_away_answers"))) === "42501",
      `${r} cannot read shift_quest_away_answers`);
    await db.query("reset role");
  }

  const TABLE = "shift_quest_away_answers";
  const table: Json = (await db.query(
    "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies " +
    "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = $1", [TABLE],
  )).rows[0];
  check(table?.rls === true && table.policies === 0, `${TABLE} has row level security on and no policies`, table);
  for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
    const has = await scalar<boolean>(db,
      `select has_table_privilege($1, 'public.${TABLE}', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')`, [role]);
    check(has === false, `${role} holds no privilege on ${TABLE}`);
  }
  check(await scalar<boolean>(db, `select has_table_privilege('service_role', 'public.${TABLE}', 'SELECT, INSERT, UPDATE, DELETE')`),
    `service_role keeps its table grant on ${TABLE}, as on every quest table`);
  check((await sqlstate(web.query(`select * from public.${TABLE}`))) === "42501", `the website cannot read ${TABLE} directly (42501)`);
  check((await sqlstate(bot.query(`delete from public.${TABLE}`))) === "42501", `the bot cannot write ${TABLE} directly (42501)`);
  const columns = (await db.query(
    "select string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' order by ordinal_position) as c " +
    "from information_schema.columns where table_schema = 'public' and table_name = $1", [TABLE],
  )).rows[0].c;
  check(columns === "id:uuid:NO,member_id:uuid:NO,gap_from:date:NO,reason:text:YES,line:text:YES,came_by_dm:boolean:NO,created_at:timestamp with time zone:NO",
    `${TABLE}: id, member_id, gap_from, reason, line, came_by_dm, created_at`, columns);
  const cons: string[] = (await db.query(
    "select pg_get_constraintdef(oid) as d from pg_constraint where conrelid = $1::regclass and contype in ('u', 'f') order by 1",
    [`public.${TABLE}`],
  )).rows.map((r) => r.d);
  check(cons.length === 2 && cons.some((d) => d === "UNIQUE (member_id, gap_from)") &&
      cons.some((d) => /^FOREIGN KEY \(member_id\) REFERENCES (public\.)?shift_quest_members\(id\)$/.test(d)),
    "one answer per member and stretch, linked to the member", cons);
  const cols: Json[] = (await db.query(
    "select table_name || '.' || column_name as col, data_type, is_nullable, column_default from information_schema.columns " +
    "where table_schema = 'public' and ((table_name = 'shift_quest_members' and column_name like '%away%') " +
    "or (table_name = 'shift_quest_settings' and column_name like 'away\\_%'))",
  )).rows.sort((x, y) => (x.col < y.col ? -1 : 1));
  check(JSON.stringify(cols) === JSON.stringify([
    // Schema 24 (20261126100000_shift_quest_nudges_on): on unless the student turns it off.
    { col: "shift_quest_members.away_dm", data_type: "boolean", is_nullable: "YES", column_default: "true" },
    { col: "shift_quest_members.away_dm_at", data_type: "timestamp with time zone", is_nullable: "YES", column_default: null },
    { col: "shift_quest_settings.away_after_days", data_type: "smallint", is_nullable: "NO", column_default: "7" },
    { col: "shift_quest_settings.away_enabled", data_type: "boolean", is_nullable: "NO", column_default: "false" },
    { col: "shift_quest_settings.away_hour", data_type: "smallint", is_nullable: "NO", column_default: "17" },
  ]), "the columns: away_dm (true by default from schema 24; null: never asked) and away_dm_at, the switch (off), N (7) and the hour (17); no history of days away", cols);
  check(!/away/.test(String(await scalar(db,
      "select string_agg(table_name, ',') from information_schema.tables where table_schema = 'public' and table_name like 'shift\\_quest\\_%' and table_name <> $1",
      [TABLE]))),
    "no other away table (days away are computed, never stored)");
  for (const [column, value, ok] of [
    ["away_hour", 8, false], ["away_hour", 20, false], ["away_hour", 9, true], ["away_hour", 19, true],
    ["away_after_days", 2, false], ["away_after_days", 22, false], ["away_after_days", 3, true], ["away_after_days", 21, true],
  ] as [string, number, boolean][]) {
    const got = await sqlstate(db.query(`update public.shift_quest_settings set ${column} = $1 where id`, [value]));
    check(got === (ok ? "ok" : "23514"), `settings.${column} = ${value} is ${ok ? "allowed" : "refused (CHECK 9 to 19, 3 to 21)"}`, got);
  }
  await db.query("update public.shift_quest_settings set away_hour = 17, away_after_days = 7 where id");
  const s0 = (await db.query("select away_enabled, away_after_days, away_hour from public.shift_quest_settings where id")).rows[0];
  check(s0.away_enabled === false && s0.away_after_days === 7 && s0.away_hour === 17, "the switch starts off", s0);
  check(await count("select count(*) from pg_indexes where schemaname = 'public' and indexname = 'shift_quest_outbox_away'") === 1,
    "the outbox has an index for a member's 'away' DMs");

  // --- Fixtures --------------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of STUDENTS) await call(web, "shift_quest_start", id, NAMES[id], false);
  await db.query("insert into public.shift_quest_members (discord_user_id, display_name) values ($1, 'Away Pending')", [PENDING]);
  // Everyone joined 60 days ago (staff too, so they would count as away if they were students).
  await db.query("update public.shift_quest_members set onboarded_at = now() - interval '60 days' where discord_user_id = any($1)",
    [[...STUDENTS, ADMIN, R1]]);
  await db.query("update public.shift_quest_members set display_name = null where discord_user_id = $1", [M]);
  await db.query(
    "insert into public.shift_quest_seasons (name, starts_on, ends_on, demo_day, status) values ('Away Season', $1::date - 60, $1::date + 60, $1::date + 30, 'active')",
    [T],
  );
  for (const id of STUDENTS) await mid(id);
  await mid(ADMIN);
  await mid(R1);
  // Schema 24 starts every new member with the come-back DM on (nudges.ts). This suite is about the choice
  // itself, so everyone starts where a member reset by an admin does: never asked.
  await db.query("update public.shift_quest_members set away_dm = null, away_dm_at = null");

  check(await count(`select count(*) from public.shift_quest_members where away_dm is not null or away_dm_at is not null`) === 0,
    "consent is null for everyone by default: never asked");

  // Reasons and lines are checked by the table too.
  check((await sqlstate(db.query(`insert into public.${TABLE} (member_id, gap_from, reason) values ($1, $2, 'bored')`, [ids[K], T]))) === "23514",
    "the table refuses a reason outside the six");
  check((await sqlstate(db.query(`insert into public.${TABLE} (member_id, gap_from, line) values ($1, $2, $3)`, [ids[K], T, "x".repeat(141)]))) === "23514",
    "the table refuses a line over 140 characters");

  // --- Off by default -----------------------------------------------------------------------------------
  await awayFor(A, 10);
  let st = await state(A);
  check(keys(st) === "ask_consent,ask_return,days,dm,enabled" && st.enabled === false && st.days === 7 && st.dm === null &&
      st.ask_consent === false && st.ask_return === null,
    "switch off: {enabled: false, days: 7, dm: null, ask_consent: false, ask_return: null}, even away 10 days with a journal row", st);
  let status = await call<Json>(bot, "shift_quest_admin_status", ADMIN);
  check(status.settings.away_enabled === false, "admin_status shows away_enabled: false", status.settings);
  let webStatus = await call<Json>(web, "shift_quest_admin_web_status", ADMIN);
  check(webStatus.settings.away_enabled === false, "and so does the website's admin status", webStatus.settings);
  st = await setDm(A, true);
  check(st.dm === true && st.enabled === false, "a student can still record a yes while the switch is off (Discord /settings)", st);
  check(await enqueue(at("17:00")) === 0 && (await awayRows(A)).length === 0, "switch off: nothing is queued at 17:00");

  // --- The switch: /admin feature away -------------------------------------------------------------------
  check(await code(feature("on", R1)) === "not_authorized", "a reviewer cannot switch it on");
  check(await code(feature("on", A)) === "not_authorized", "a student cannot switch it on");
  status = await feature("on");
  check(status.settings.away_enabled === true && await audits("settings_away") === 1,
    "/admin feature away on: admin_set answers with away_enabled: true, audited settings_away", status.settings);
  webStatus = await call<Json>(web, "shift_quest_admin_web_status", ADMIN);
  check(webStatus.settings.away_enabled === true, "the website's admin status passes it through", webStatus.settings);
  check((await feature("off")).settings.away_enabled === false, "off switches it off");
  await feature("on");

  // --- Who may call ----------------------------------------------------------------------------------------
  for (const who of [NOBODY, null, PENDING]) {
    const label = who === null ? "a null actor" : who === NOBODY ? "an unknown actor" : "a member who has not finished /start";
    check(await code(state(who)) === "not_started", `state: ${label} is not_started`);
    check(await code(setDm(who, true)) === "not_started", `set: ${label} is not_started`);
    check(await code(answer(who, day(10), "busy", null)) === "not_started", `answer: ${label} is not_started`);
  }
  check(await code(state(A, bot)) === "ok" && await code(state(R1)) === "ok",
    "the bot reads the state (Discord /settings); a reviewer who never ran /start reads it (they hold a role)");
  await db.query("update public.shift_quest_members set away_dm = true where id = $1", [ids[ADMIN]]);
  for (const who of [ADMIN, R1]) {
    st = await state(who);
    check(st.enabled === true && st.dm === null && st.ask_consent === false && st.ask_return === null,
      `staff (${who === ADMIN ? "an admin" : "a reviewer"}): dm null, never asked, never a card, even with no write in 60 days`, st);
    check(await code(setDm(who, true)) === "not_allowed", `staff cannot choose the come-back DM (${who === ADMIN ? "admin" : "reviewer"}: not_allowed)`);
    check(await code(answer(who, day(60), "busy", null)) === "not_found", "staff have no card to answer (not_found)");
  }
  check(await code(setDm(A, null)) === "bad_input", "a null choice is bad_input");

  // --- Consent first ------------------------------------------------------------------------------------
  st = await state(B);
  check(st.dm === null && st.ask_consent === false, "never asked, but no journal row yet: no consent strip", st);
  await awayFor(B, 10);
  st = await state(B);
  check(st.dm === null && st.ask_consent === true, "a journal row and never asked: the consent strip shows", st);
  const onBefore = await audits("away_dm_on");
  st = await setDm(B, false);
  check(keys(st) === "ask_consent,ask_return,days,dm,enabled" && st.dm === false && st.ask_consent === false,
    "a no is an answer: the strip goes and does not come back", st);
  let row = (await db.query("select away_dm, away_dm_at > now() - interval '1 minute' as fresh from public.shift_quest_members where id = $1", [ids[B]])).rows[0];
  check(row.away_dm === false && row.fresh === true && await audits("away_dm_off") === 1, "stored with its time, audited away_dm_off", row);
  st = await setDm(B, true, bot);
  check(st.dm === true && await audits("away_dm_on") === onBefore + 1, "Discord /settings can turn it on (the bot), audited away_dm_on", st);
  const audit = (await db.query("select actor_id::text, resource_type, resource_id::text from public.shift_quest_audit where action = 'away_dm_on' order by id desc limit 1")).rows[0];
  check(audit.actor_id === ids[B] && audit.resource_type === "member" && audit.resource_id === ids[B], "the audit names the member, nothing else", audit);
  await setDm(B, false);
  // B keeps DMs for notices (notify_dm) but never says yes to the come-back DM.
  await db.query("update public.shift_quest_members set away_dm = null, away_dm_at = null where id = $1", [ids[B]]);
  const prefs = await call<Json>(web, "shift_quest_update_prefs", B, false, null, null, true);
  check(prefs.prefs?.notify_dm === true && (await state(B)).dm === null, "B turns on notice DMs (notify_dm) only: the come-back choice stays unasked", prefs.prefs);

  // --- Activity: what counts ------------------------------------------------------------------------------
  const e = ids[E];
  check(await gapOf(E) === day(60), "no write at all: the stretch starts on the day they joined (floored at onboarding)", await state(E));
  const inst = (await db.query(
    "insert into public.shift_quest_instances (member_id, title, goal, next_step, criteria, state, created_at) " +
    "values ($1, 'เควสต์', 'เป้า', 'ขั้นต่อไป', 'เกณฑ์', 'approved', now() - interval '50 days') returning id::text", [e])).rows[0].id;
  check(await gapOf(E) === day(50), "a quest started counts");
  const sub = (await db.query(
    "insert into public.shift_quest_submissions (instance_id, revision, submitted_by, status, created_at) " +
    "values ($1, 1, $2, 'approved', now() - interval '45 days') returning id::text", [inst, e])).rows[0].id;
  check(await gapOf(E) === day(45), "a submission counts");
  await db.query("insert into public.shift_quest_work_sessions (member_id, intention, started_at) values ($1, 'ตั้งใจ', now() - interval '40 days')", [e]);
  check(await gapOf(E) === day(40), "a work session started (its intention) counts");
  await db.query("update public.shift_quest_work_sessions set ended_at = now() - interval '35 days', reflection = 'ได้เรียนรู้' where member_id = $1", [e]);
  check(await gapOf(E) === day(35), "a work session ended (its reflection) counts");
  await db.query("insert into public.shift_quest_help_requests (member_id, summary, visibility, created_at) values ($1, 'ขอช่วย', 'community', now() - interval '30 days')", [e]);
  check(await gapOf(E) === day(30), "a help request counts");
  await db.query(
    "insert into public.shift_quest_evidence_photos (submission_id, member_id, object_path, bytes, width, height, created_at) " +
    "values ($1::uuid, $2, $1::text || '/' || gen_random_uuid() || '.webp', 100, 10, 10, now() - interval '25 days')", [sub, e]);
  check(await gapOf(E) === day(25), "an evidence photo counts");
  await db.query("insert into public.shift_quest_peer_checks (submission_id, peer_id, line, created_at) values ($1, $2, 'ดีมาก', now() - interval '20 days')", [sub, e]);
  check(await gapOf(E) === day(20), "a peer check counts");
  await db.query("insert into public.shift_quest_progress (member_id, kind, created_at) values ($1, 'tap', now() - interval '15 days')", [e]);
  check(await gapOf(E) === day(15), "a check-in tap counts");
  await db.query("update public.shift_quest_members set onboarded_at = now() - interval '12 days' where id = $1", [e]);
  check(await gapOf(E) === day(12), "a write from before they joined never makes the stretch start earlier than the day they joined");
  await db.query("update public.shift_quest_members set onboarded_at = now() - interval '60 days' where id = $1", [e]);
  for (const [fn, args] of [
    ["shift_quest_island", [E]], ["shift_quest_board", [E]], ["shift_quest_island_map", [E]],
    ["shift_quest_campfire", [E, false]], ["shift_quest_deepfire", [E]], ["shift_quest_away_state", [E]],
  ] as [string, unknown[]][]) {
    await code(call(web, fn, ...args));
  }
  check(await gapOf(E) === day(15), "reading the island, the board, the map, the campfire and the deep fire counts for nothing");
  await db.query("insert into public.shift_quest_progress (member_id, kind) values ($1, 'tap')", [e]);
  check(await gapOf(E) === day(15),
    "a write today does not close the card: it asks about the stretch they came back from (the latest active day before today)");
  check(await scalar<string>(db, "select public.shift_quest__away_last($1, $2::date + 1)::text", [e, T]) === T,
    "and the latest active day is today");

  // --- ask_return -------------------------------------------------------------------------------------------
  st = await state(A);
  check(keys(st.ask_return) === "gap_from" && st.ask_return.gap_from === day(10) && st.dm === true,
    "away 10 days, N = 7: ask_return {gap_from: the last active day}", st);
  await awayFor(H, 6);
  check(await gapOf(H) === null, "6 days away: no card");
  await awayFor(H, 7);
  check(await gapOf(H) === day(7), "7 days away: the card");
  await db.query("update public.shift_quest_settings set away_after_days = 12 where id");
  st = await state(A);
  check(st.days === 12 && st.ask_return === null, "N = 12: 10 days is not a stretch yet, and days says 12", st);
  await db.query("update public.shift_quest_settings set away_after_days = 7 where id");
  await feature("off");
  st = await state(A);
  check(st.enabled === false && st.ask_return === null && st.ask_consent === false, "switch off: no card, no strip", st);
  await feature("on");

  // Seasons: the break between them is never asked about.
  await db.query("update public.shift_quest_seasons set status = 'closed' where name = 'Away Season'");
  st = await state(A);
  check(st.enabled === true && st.ask_return === null, "no active season (a break): no card", st);
  check(await code(answer(A, day(10), "busy", null)) === "not_found", "and nothing to answer (not_found)");
  // (Demo Day stays inside the season's dates: a CHECK.)
  await db.query("update public.shift_quest_seasons set status = 'active', ends_on = $1::date - 1, demo_day = $1::date - 1 where name = 'Away Season'", [T]);
  check(await gapOf(A) === null, "an active season that ended yesterday: no card");
  await db.query("update public.shift_quest_seasons set ends_on = $1::date + 60, demo_day = $1::date + 30, starts_on = $1::date where name = 'Away Season'", [T]);
  check(await gapOf(A) === null,
    "the first day of a new season, last write in the break: no card (the stretch starts with the season)");
  check(await enqueue(at("17:00")) === 0 && (await awayRows(A)).length === 0,
    "and no DM on the season's first day for a student who said yes and last wrote before it");
  check(await due(A, await keyOf(A, 10), at("12:00")) === false, "a DM queued for the stretch before the season is not sent");
  // As if the day before the season were the last active day: N = 7 days after it, the card.
  await db.query("update public.shift_quest_seasons set starts_on = $1::date - 5 where name = 'Away Season'", [T]);
  check(await gapOf(A) === null, "the season's sixth day, nothing written in it: still no card");
  await db.query("update public.shift_quest_seasons set starts_on = $1::date - 6 where name = 'Away Season'", [T]);
  check(await gapOf(A) === day(7), "its seventh day: the card, for the stretch since the day before the season");
  await db.query("update public.shift_quest_seasons set starts_on = $1::date - 60 where name = 'Away Season'", [T]);
  check(await gapOf(A) === day(10), "the season back as it was: A's own stretch again");

  // Resting and waiting on a mentor.
  await awayFor(C, 10);
  const quest = async (who: string, s: string) => (await db.query(
    "insert into public.shift_quest_instances (member_id, title, goal, next_step, criteria, state, created_at) " +
    "values ($1, 'เควสต์', 'เป้า', 'ขั้นต่อไป', 'เกณฑ์', $2, now() - interval '50 days') returning id::text", [await mid(who), s])).rows[0].id as string;
  const cPaused = await quest(C, "paused");
  check(await gapOf(C) === null, "resting (a paused quest, none active): no card");
  const cActive = await quest(C, "active");
  check(await gapOf(C) === day(10), "a paused quest and an active one is not resting: the card");
  await db.query("update public.shift_quest_instances set state = 'clarification' where id = $1", [cActive]);
  check(await gapOf(C) === day(10), "nor a paused quest and one in clarification");
  await db.query("delete from public.shift_quest_instances where id = $1", [cActive]);
  check(await gapOf(C) === null && cPaused.length > 0, "resting again: no card");
  await awayFor(D, 10);
  const dQuest = await quest(D, "submitted");
  check(await gapOf(D) === null, "waiting on a mentor (a quest submitted): no card");
  await db.query("update public.shift_quest_instances set state = 'appealed' where id = $1", [dQuest]);
  check(await gapOf(D) === null, "waiting on an appeal: no card");
  // The work went in 10 days ago, as D's last write; the mentor decides today.
  const dSub = (await db.query(
    "insert into public.shift_quest_submissions (instance_id, revision, submitted_by, status, created_at) " +
    "values ($1, 1, $2, 'pending', now() - interval '10 days') returning id::text", [dQuest, ids[D]])).rows[0].id as string;
  await db.query("update public.shift_quest_submissions set status = 'approved', decided_at = now() where id = $1", [dSub]);
  await db.query("update public.shift_quest_instances set state = 'approved' where id = $1", [dQuest]);
  check(await gapOf(D) === null,
    "the mentor decided today: no card, the 10 days of waiting on us are never time away");
  check(await scalar<string>(db, "select public.shift_quest__away_last($1, $2::date + 1)::text", [ids[D], T]) === T,
    "the decision starts a fresh stretch: the latest active day is today");
  await db.query("update public.shift_quest_submissions set decided_at = now() - interval '1 day' where id = $1", [dSub]);
  check(await gapOf(D) === null, "the day after the decision: no card (one day since it)");
  await db.query("update public.shift_quest_submissions set decided_at = now() - interval '8 days' where id = $1", [dSub]);
  check(await gapOf(D) === day(8), "8 days after the decision with nothing written: the card, for the stretch since the decision");
  // D waits on the mentor again for the rest of the file.
  await db.query("update public.shift_quest_submissions set status = 'pending', decided_at = null where id = $1", [dSub]);
  await db.query("update public.shift_quest_instances set state = 'submitted' where id = $1", [dQuest]);
  check(await gapOf(D) === null, "waiting again: no card");

  // --- The answer -------------------------------------------------------------------------------------------
  await awayFor(K, 10);
  const answersOf = (who: string) => count("select count(*) from public.shift_quest_away_answers where member_id = $1", [ids[who]]);
  check(await code(answer(K, day(9), "busy", null)) === "not_found", "a gap that is not the card's is not_found");
  check(await code(answer(K, day(11), "busy", null)) === "not_found", "nor the day before it");
  check(await code(answer(K, null, "busy", null)) === "not_found", "a null gap is not_found");
  for (const bad of ["bored", "", "BUSY", "busy "]) {
    check(await code(answer(K, day(10), bad, null)) === "bad_input", `the reason ${JSON.stringify(bad)} is bad_input (one of six, or null)`);
  }
  check(await code(answer(K, day(10), "stuck", "ก".repeat(141))) === "text_too_long", "a line of 141 characters is text_too_long");
  await feature("off");
  check(await code(answer(K, day(10), "stuck", null)) === "not_found", "switch off: there is no card to answer (not_found)");
  await feature("on");
  check(await answersOf(K) === 0, "nothing was saved by a refusal");
  const answerAudits = await audits("away_answer");
  const LINE_K = "ก".repeat(140);
  let saved = await answer(K, day(10), "stuck", `  ${LINE_K}\n `);
  check(keys(saved) === "saved" && saved.saved === true, "an answer: {saved: true}", saved);
  row = await answerRow(K, day(10));
  check(row?.reason === "stuck" && row.line === LINE_K && row.came_by_dm === false && row.gap_from === day(10),
    "stored: the reason, the line trimmed to its 140 characters, came_by_dm false (no DM for that stretch)", row);
  check((await state(K)).ask_return === null, "answered: the card does not come back for that stretch");
  saved = await answer(K, day(10), "busy", "อีกครั้ง");
  check(saved.saved === false && (await answerRow(K, day(10)))?.reason === "stuck" && await answersOf(K) === 1,
    "a second answer for the stretch is {saved: false}; the first stays", saved);
  check(await audits("away_answer") === answerAudits + 1, "audited away_answer once");
  check(await count("select count(*) from public.shift_quest_audit where outcome like '%ก%' or action like '%stuck%'") === 0,
    "the audit holds neither the line nor the reason");

  // A skip: closing the card.
  await awayFor(Y, 9);
  saved = await answer(Y, day(9), null, "   ");
  row = await answerRow(Y, day(9));
  check(saved.saved === true && row?.reason === null && row.line === null, "closing the card is a skip: reason and line null (blank is null)", row);
  check((await state(Y)).ask_return === null, "after a skip the card never reopens for that stretch");
  check((await answer(Y, day(9), "busy", null)).saved === false, "and a later answer for it is {saved: false}");

  // The day after the return.
  await awayFor(L, 10);
  await writeNow(L);
  check(await gapOf(L) === day(10), "back today with a write and no answer yet: the card is still there today");
  await db.query("update public.shift_quest_progress set created_at = now() - interval '1 day' where member_id = $1 and created_at > now() - interval '1 hour'", [ids[L]]);
  check(await gapOf(L) === null, "the day after the return the stretch is over: no card");
  check(await code(answer(L, day(10), "busy", null)) === "not_found", "and that stretch can no longer be answered");
  check(await code(answer(C, day(10), "busy", null)) === "not_found", "a resting student has no card to answer");

  // --- The queue ----------------------------------------------------------------------------------------------
  // A: yes, away 10 days (from above). B: notify_dm only. C resting and D waiting, both say yes.
  await setDm(C, true);
  await setDm(D, true);
  // H says no, away 7 days.
  await setDm(H, false);
  // E says yes but wrote today.
  await setDm(E, true);
  // Staff with a yes (the admin, set above; the reviewer here), never through away_set.
  await db.query("update public.shift_quest_members set away_dm = true where id = $1", [ids[R1]]);
  // PENDING has not finished /start, a member without onboarding but a yes, and an erased member with a yes.
  await db.query("update public.shift_quest_members set away_dm = true where discord_user_id = $1", [PENDING]);
  const ghost = (await db.query(
    "insert into public.shift_quest_members (discord_user_id, display_name, away_dm) values ('992300000000000091', 'Away Ghost', true) returning id::text")).rows[0].id;
  const erased = (await db.query(
    "insert into public.shift_quest_members (onboarded_at, away_dm, erased_at) values (now() - interval '60 days', true, now()) returning id::text")).rows[0].id;
  // W says yes and answered the card before the hour.
  await awayFor(W, 10);
  await setDm(W, true);
  check((await answer(W, day(10), "busy", null)).saved === true, "W answered the card this morning");
  const awayCount = () => count("select count(*) from public.shift_quest_outbox where kind = 'away'");
  await feature("off");
  check(await enqueue(at("17:00")) === 0 && await awayCount() === 0, "switch off: nothing at 17:00");
  await feature("on");
  for (const t of ["08:00", "16:59", "18:00", "19:30", "23:00"]) {
    check(await enqueue(at(t)) === 0, `${t} is not away_hour (17): nothing queued`);
  }
  check(await awayCount() === 0, "and nothing was queued outside the hour");
  await db.query("update public.shift_quest_seasons set status = 'closed' where name = 'Away Season'");
  check(await enqueue(at("17:00")) === 0, "between seasons (none active): nothing");
  await db.query("update public.shift_quest_seasons set status = 'active', starts_on = $1::date + 1 where name = 'Away Season'", [T]);
  check(await enqueue(at("17:00")) === 0, "an active season that starts tomorrow: nothing");
  await db.query("update public.shift_quest_seasons set starts_on = $1::date - 60 where name = 'Away Season'", [T]);
  check(await awayCount() === 0, "still nothing queued");

  let queued = await enqueue(at("17:00"));
  const aRows = await awayRows(A);
  check(queued === 1 && aRows.length === 1, "17:00, the switch on, in season: one DM, A's", { queued, aRows });
  const KA = await keyOf(A, 10);
  check(aRows[0]?.dedupe_key === KA && aRows[0].target_kind === "dm" && aRows[0].channel_key === null &&
      aRows[0].kind === "away" && JSON.stringify(aRows[0].params) === "{}" && aRows[0].status === "pending",
    "a content-free DM: kind 'away', params {}, dedupe 'away:<member>:<last active day>'", aRows[0]);
  for (const [who, why] of [
    [B, "notify_dm alone (never said yes)"], [C, "resting"], [D, "waiting on a mentor"], [H, "said no"],
    [E, "wrote today"], [W, "answered the card for this stretch"], [K, "never said yes (answered the card)"],
    [ADMIN, "an admin with a yes"], [R1, "a reviewer with a yes"], [PENDING, "has not finished /start"],
  ] as [string, string][]) {
    check((await awayRows(who)).length === 0, `none for ${why}`);
  }
  check(await count("select count(*) from public.shift_quest_outbox where kind = 'away' and member_id = any($1::uuid[])", [[ghost, erased]]) === 0,
    "none for a member who never onboarded, nor an erased one");
  check(await enqueue(at("17:00")) === 0 && await enqueue(at("17:59")) === 0 && (await awayRows(A)).length === 1,
    "the rest of the hour queues nothing more: one DM per stretch");

  // The day boundary and away_hour.
  await setDm(H, true);
  await awayFor(H, 6);
  check(await enqueue(at("17:00")) === 0, "H says yes but has been away 6 days: nothing");
  await awayFor(H, 7);
  await db.query("update public.shift_quest_settings set away_hour = 9 where id");
  check(await enqueue(at("17:00")) === 0, "away_hour 9: 17:00 queues nothing");
  check(await enqueue(at("09:00")) === 1 && (await awayRows(H))[0]?.dedupe_key === await keyOf(H, 7),
    "away 7 days, at away_hour 9: H's DM");
  await db.query("update public.shift_quest_settings set away_hour = 17 where id");

  // The 14-day cooldown.
  await awayFor(P, 20);
  await setDm(P, true);
  await db.query(
    "insert into public.shift_quest_outbox (dedupe_key, target_kind, member_id, kind, status, created_at, sent_at) " +
    "values ($1, 'dm', $2, 'away', 'sent', now() - interval '10 days', now() - interval '10 days')", [await keyOf(P, 40), ids[P]]);
  check(await enqueue(at("17:00")) === 0 && (await awayRows(P)).length === 1, "a new stretch, but a DM went 10 days ago: none (14-day cooldown)");
  await db.query("update public.shift_quest_outbox set created_at = now() - interval '15 days' where dedupe_key = $1", [await keyOf(P, 40)]);
  check(await enqueue(at("17:00")) === 1 && (await awayRows(P)).length === 2, "15 days later: the next DM");
  await awayFor(Q, 12);
  await setDm(Q, true);
  await db.query(
    "insert into public.shift_quest_outbox (dedupe_key, target_kind, member_id, kind, status, last_error, created_at) " +
    "values ($1, 'dm', $2, 'away', 'dropped', 'opted_out', now() - interval '1 day')", [await keyOf(Q, 30), ids[Q]]);
  check(await enqueue(at("17:00")) === 1 && (await awayRows(Q)).some((r) => r.dedupe_key === (`away:${ids[Q]}:${day(12)}`) && r.status === "pending"),
    "a DM that was dropped yesterday never went out: it does not block the next");
  check(await count("select count(*) from public.shift_quest_outbox where kind = 'away' and params <> '{}'::jsonb") === 0,
    "every 'away' DM carries no params");

  // --- Opting out drops what is queued ----------------------------------------------------------------------
  const pPending = (await awayRows(P)).find((r) => r.status === "pending");
  st = await setDm(P, false);
  const pAfter = (await awayRows(P)).find((r) => r.id === pPending?.id);
  check(st.dm === false && pAfter?.status === "dropped" && pAfter.last_error === "opted_out",
    "a no drops the queued DM (opted_out)", pAfter);
  check((await awayRows(P)).some((r) => r.status === "sent"), "a DM already sent stays as it was");

  // --- The claim's check, at fixed times ------------------------------------------------------------------------
  check(await due(A, KA, at("08:59")) === false, "08:59 Bangkok: not sent");
  check(await due(A, KA, at("09:00")) === true, "09:00: sent");
  check(await due(A, KA, at("12:30")) === true, "12:30: sent");
  check(await due(A, KA, at("19:59")) === true, "19:59: sent");
  check(await due(A, KA, at("20:00")) === false, "20:00: not sent");
  check(await due(A, KA, at("02:00")) === false, "02:00: not sent");
  check(await due(A, await keyOf(A, 11), at("12:00")) === false, "a key for another stretch: not sent");
  check(await due(A, `away:${ids[B]}:${day(10)}`, at("12:00")) === false, "another member's key: not sent");
  check(await due(A, `away:${ids[A]}:soon`, at("12:00")) === false && await due(A, null, at("12:00")) === false, "a malformed or null key: not sent");
  const flip = async (sql: string, label: string, args: unknown[] = []) => {
    await db.query(sql, args);
    check(await due(A, KA, at("12:00")) === false, label);
  };
  await flip("update public.shift_quest_members set away_dm = false where id = $1", "said no since: not sent", [ids[A]]);
  await flip("update public.shift_quest_members set away_dm = null where id = $1", "a choice cleared: not sent", [ids[A]]);
  await db.query("update public.shift_quest_members set away_dm = true where id = $1", [ids[A]]);
  await flip("update public.shift_quest_settings set away_enabled = false where id", "the switch off since: not sent");
  await db.query("update public.shift_quest_settings set away_enabled = true where id");
  await flip("update public.shift_quest_seasons set status = 'closed' where name = 'Away Season'", "the season closed since: not sent");
  await db.query("update public.shift_quest_seasons set status = 'active' where name = 'Away Season'");
  await flip("update public.shift_quest_members set roles = '{reviewer}' where id = $1", "became staff since: not sent", [ids[A]]);
  await db.query("update public.shift_quest_members set roles = '{}' where id = $1", [ids[A]]);
  const aPaused = await quest(A, "paused");
  check(await due(A, KA, at("12:00")) === false, "resting since: not sent");
  await db.query("update public.shift_quest_instances set state = 'submitted' where id = $1", [aPaused]);
  check(await due(A, KA, at("12:00")) === false, "waiting on a mentor since: not sent");
  await db.query("delete from public.shift_quest_instances where id = $1", [aPaused]);
  await db.query("insert into public.shift_quest_away_answers (member_id, gap_from, reason) values ($1, $2, 'busy')", [ids[A], day(10)]);
  check(await due(A, KA, at("12:00")) === false, "answered the card since: not sent");
  await db.query("delete from public.shift_quest_away_answers where member_id = $1", [ids[A]]);
  const back = await writeNow(A);
  check(await due(A, KA, at("12:00")) === false, "wrote something since it was queued (came back): not sent");
  await db.query("delete from public.shift_quest_progress where id = $1", [back]);
  check(await due(A, KA, at("12:00")) === true, "still away, still yes, in hours: sent");

  // --- The claim itself ------------------------------------------------------------------------------------------
  const claim = async (): Promise<Json[]> => (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows;
  const statusOf = async (id: string): Promise<Json> =>
    (await db.query("select status, last_error from public.shift_quest_outbox where id = $1", [id])).rows[0];
  const dmRow = async (key: string, who: string, kind: string) => (await db.query(
    "insert into public.shift_quest_outbox (dedupe_key, target_kind, member_id, kind) values ($1, 'dm', $2, $3) returning id::text",
    [key, await mid(who), kind])).rows[0].id as string;
  const nudge = await dmRow(`test-nudge:${randomUUID()}`, B, "nudge");
  const mystery = await dmRow(`test-mystery:${randomUUID()}`, B, "mystery");
  const reminder = await dmRow(`test-remind:${randomUUID()}`, B, "reminder");
  const bAway = await dmRow(await keyOf(B, 10), B, "away");
  // H came back after the DM was queued.
  const hRow = (await awayRows(H))[0];
  await writeNow(H);
  const inHours = await scalar<boolean>(db, "select extract(hour from now() at time zone 'Asia/Bangkok') between 9 and 19");
  let claimed = await claim();
  const got = (id: string) => claimed.find((r) => r.id === id);
  check(got(nudge)?.dm_user_id === B && got(nudge)?.kind === "nudge", "a nudge still goes to someone with notify_dm (unchanged)", got(nudge));
  check(!got(reminder) && (await statusOf(reminder)).status === "dropped", "a reminder with reminders off is dropped (unchanged)");
  check(!got(mystery) && JSON.stringify(await statusOf(mystery)) === JSON.stringify({ status: "dropped", last_error: "opted_out" }),
    "a DM of any other kind is dropped (the CASE's ELSE is false now)", await statusOf(mystery));
  check(!got(bAway) && JSON.stringify(await statusOf(bAway)) === JSON.stringify({ status: "dropped", last_error: "opted_out" }),
    "an 'away' DM for notify_dm alone is dropped at send time too");
  check(!got(hRow.id) && JSON.stringify(await statusOf(hRow.id)) === JSON.stringify({ status: "dropped", last_error: "opted_out" }),
    "someone who came back after the DM was queued: dropped", await statusOf(hRow.id));
  const aClaimed = got(aRows[0].id);
  if (inHours) {
    check(aClaimed?.kind === "away" && aClaimed.dm_user_id === A && JSON.stringify(aClaimed.params) === "{}" &&
        aClaimed.channel_id === null && aClaimed.member_user_id === null && aClaimed.peer_user_id === null,
      "in hours (09:00 to 19:59 Bangkok now): A's DM is leased to the bot, to A, with no params", aClaimed);
    await call(bot, "shift_quest_outbox_done", aRows[0].id, true, null, "990000000000000001", false);
  } else {
    check(!aClaimed && JSON.stringify(await statusOf(aRows[0].id)) === JSON.stringify({ status: "dropped", last_error: "opted_out" }),
      "outside 09:00 to 19:59 Bangkok now: A's DM is dropped", await statusOf(aRows[0].id));
    // As if it had gone out at 17:00.
    await db.query("update public.shift_quest_outbox set status = 'sent', sent_at = now(), last_error = null where id = $1", [aRows[0].id]);
  }
  check((await statusOf(aRows[0].id)).status === "sent", "A's DM went out");
  st = await setDm(A, false);
  check((await statusOf(aRows[0].id)).status === "sent" && st.dm === false, "a no after it was sent leaves it as sent");
  await setDm(A, true);

  // --- came_by_dm -----------------------------------------------------------------------------------------------
  const LINE_A = "เพื่อนในทีมไม่ว่าง เลยรอก่อน";
  check((await gapOf(A)) === day(10), "A opens the island after the DM: the card for that stretch");
  saved = await answer(A, day(10), "team", LINE_A);
  row = await answerRow(A, day(10));
  check(saved.saved === true && row?.came_by_dm === true && row.reason === "team" && row.line === LINE_A,
    "came_by_dm: an 'away' DM for that stretch was sent", row);
  check(await enqueue(at("17:00")) === 0 && (await awayRows(A)).length === 1, "and no second DM for that stretch");

  // --- The end of a hold starts a fresh stretch ------------------------------------------------------------------
  // Z rests (every quest paused) from 10 days ago, said yes, and wakes today.
  await awayFor(Z, 10);
  const zQuest = await quest(Z, "paused");
  await setDm(Z, true);
  check(await gapOf(Z) === null && await enqueue(at("17:00")) === 0 && (await awayRows(Z)).length === 0,
    "Z rests: no card and no DM");
  const woke = await call<Json>(web, "shift_quest_rest", Z, false);
  check(woke.resumed === 1 && await gapOf(Z) === null,
    "Z wakes today (rest off): no card asking about the rest they declared", woke);
  check(await enqueue(at("17:00")) === 0 && (await awayRows(Z)).length === 0, "and no come-back DM at 17:00 on the day they woke");
  check(await due(Z, await keyOf(Z, 10), at("12:00")) === false, "a DM queued for the stretch before the rest is not sent");
  check(await scalar<string>(db, "select public.shift_quest__away_last($1, $2::date + 1)::text", [ids[Z], T]) === T,
    "waking is the start of a fresh stretch: the latest active day is today");
  await db.query("update public.shift_quest_audit set created_at = now() - interval '8 days' where action = 'quest_resume' and resource_id = $1",
    [zQuest]);
  check(await gapOf(Z) === day(8), "8 days after waking with nothing written: the card, for the stretch since waking");
  check(await enqueue(at("17:00")) === 1 && (await awayRows(Z))[0]?.dedupe_key === await keyOf(Z, 8),
    "and the DM for that stretch");
  // Putting the quest away is the end of a hold too (it would have been, from a rest).
  await db.query("select public.shift_quest_set_state($1::text, $2::uuid, null::integer, 'archive')", [Z, zQuest]);
  check(await gapOf(Z) === null && await due(Z, await keyOf(Z, 8), at("12:00")) === false,
    "archiving a quest today: no card, and the queued DM is no longer due");

  // TA submitted the team's milestone 10 days ago; TB, on the same team, said yes and has written nothing since.
  const tProject = (await db.query(
    "insert into public.shift_quest_projects (name, route, created_by) values ('ทีมห่างเกาะ', 'software', $1) returning id::text",
    [ids[TA]])).rows[0].id as string;
  await db.query("insert into public.shift_quest_project_members (project_id, member_id, status) values ($1, $2, 'active'), ($1, $3, 'active')",
    [tProject, ids[TA], ids[TB]]);
  const tQuest = (await db.query(
    "insert into public.shift_quest_instances (member_id, project_id, milestone, title, goal, next_step, criteria, state, created_at) " +
    "values ($1, $2, 2, 'เควสต์ทีม', 'เป้า', 'ขั้นต่อไป', 'เกณฑ์', 'submitted', now() - interval '50 days') returning id::text",
    [ids[TA], tProject])).rows[0].id as string;
  const tSub = (await db.query(
    "insert into public.shift_quest_submissions (instance_id, revision, submitted_by, status, created_at) " +
    "values ($1, 1, $2, 'pending', now() - interval '10 days') returning id::text", [tQuest, ids[TA]])).rows[0].id as string;
  await awayFor(TB, 10);
  await setDm(TB, true);
  check(await gapOf(TB) === null && await gapOf(TA) === null,
    "the team's milestone waits on a mentor: no card for the teammate either (it is the team's quest)");
  check(await enqueue(at("17:00")) === 0 && (await awayRows(TB)).length === 0, "and no DM for the teammate");
  check(await scalar<string>(db, "select public.shift_quest__away_held($1)", [ids[TB]]) === "waiting",
    "the teammate counts as waiting on a mentor");
  await db.query("update public.shift_quest_project_members set status = 'left' where project_id = $1 and member_id = $2", [tProject, ids[TB]]);
  check(await gapOf(TB) === day(10), "a teammate who left the team is not held by its milestone");
  await db.query("update public.shift_quest_project_members set status = 'active' where project_id = $1 and member_id = $2", [tProject, ids[TB]]);
  await db.query("update public.shift_quest_submissions set status = 'approved', decided_at = now() where id = $1", [tSub]);
  await db.query("update public.shift_quest_instances set state = 'approved' where id = $1", [tQuest]);
  check(await gapOf(TB) === null && await gapOf(TA) === null,
    "the mentor decides the milestone today: no card for the team about the wait");
  check(await enqueue(at("17:00")) === 0 && (await awayRows(TB)).length === 0 &&
      await due(TB, await keyOf(TB, 10), at("12:00")) === false,
    "and no DM for the teammate that day, nor one queued for the stretch before");
  await db.query("update public.shift_quest_submissions set decided_at = now() - interval '8 days' where id = $1", [tSub]);
  check(await gapOf(TB) === day(8), "8 days after the decision with nothing written: the teammate's card, since the decision");

  // --- Lines live 90 days --------------------------------------------------------------------------------------------
  const m = ids[M];
  const old = (await db.query(
    "insert into public.shift_quest_away_answers (member_id, gap_from, reason, line, created_at) values ($1, $2, 'busy', 'เก่ามากแล้ว', now() - interval '91 days') returning id::text",
    [m, day(100)])).rows[0].id;
  const recent = (await db.query(
    "insert into public.shift_quest_away_answers (member_id, gap_from, reason, line, created_at) values ($1, $2, 'island', 'แผนที่งงนิดหน่อย', now() - interval '89 days') returning id::text",
    [m, day(95)])).rows[0].id;
  const lineOnly = (await db.query(
    "insert into public.shift_quest_away_answers (member_id, gap_from, reason, line) values ($1, $2, null, 'อยากพักสักหน่อย') returning id::text",
    [m, day(20)])).rows[0].id;
  let rep = await report();
  check(!rep.lines.some((l: Json) => l.id === old) && rep.lines.some((l: Json) => l.id === recent),
    "a line older than 90 days is never shown, even before the clean-up");
  check(await code(reveal(old)) === "not_found", "nor revealed");
  await feature("off");
  check(await enqueue(at("03:00")) === 0, "the bot's tick at 03:00 with the switch off queues nothing");
  const lines: Json[] = (await db.query("select id::text, reason, line from public.shift_quest_away_answers where member_id = $1 order by created_at", [m])).rows;
  check(lines.find((l) => l.id === old)?.line === null && lines.find((l) => l.id === old)?.reason === "busy" &&
      lines.find((l) => l.id === recent)?.line === "แผนที่งงนิดหน่อย",
    "but it clears lines older than 90 days, whatever the switch (the reason stays)", lines);
  await feature("on");

  // --- The admin report ----------------------------------------------------------------------------------------------
  // Three more students answered busy, so one count is over the floor.
  for (let i = 0; i < 3; i += 1) {
    const x = (await db.query(
      "insert into public.shift_quest_members (discord_user_id, display_name, onboarded_at) values ($1, $2, now() - interval '30 days') returning id::text",
      [`99230000000000010${i}`, `Away Extra ${i}`])).rows[0].id;
    await db.query("insert into public.shift_quest_away_answers (member_id, gap_from, reason) values ($1, $2, 'busy')", [x, day(10)]);
  }
  rep = await report();
  check(keys(rep) === "answers,away_now,consent,dms,lines", "the report: consent, away_now, dms, answers, lines", keys(rep));
  check(keys(rep.consent) === "no,unasked,yes" && keys(rep.away_now) === "other,resting,waiting" &&
      keys(rep.dms) === "dropped,queued,sent,unreachable" && keys(rep.answers) === "by_reason,came_by_dm,skipped" &&
      keys(rep.answers.by_reason) === [...REASONS].sort().join(","),
    "each part has exactly its counts", rep);
  const counts = [
    ...Object.values(rep.consent), ...Object.values(rep.away_now), ...Object.values(rep.dms),
    ...Object.values(rep.answers.by_reason), rep.answers.skipped, rep.answers.came_by_dm,
  ];
  check(counts.length === 18 && counts.every(isCount), "every count is an integer other than 1 and 2, or \"1-2\"", counts);
  const expect: Json = (await db.query(`
    with students as (
      select m.id, m.away_dm from public.shift_quest_members m
      where m.roles = '{}' and m.onboarded_at is not null and m.erased_at is null
    ), away as (
      select public.shift_quest__away_held(s.id) as held from students s
      where public.shift_quest__bkk_today() - public.shift_quest__away_last(s.id, public.shift_quest__bkk_today() + 1) >= 7
    ), o as (select status from public.shift_quest_outbox where kind = 'away'),
    a as (select * from public.shift_quest_away_answers)
    select
      (select count(*) filter (where away_dm) from students)::int as yes,
      (select count(*) filter (where not away_dm) from students)::int as no,
      (select count(*) filter (where away_dm is null) from students)::int as unasked,
      (select count(*) filter (where held = 'resting') from away)::int as resting,
      (select count(*) filter (where held = 'waiting') from away)::int as waiting,
      (select count(*) filter (where held is null) from away)::int as other,
      (select count(*) filter (where status in ('pending', 'sending', 'blocked')) from o)::int as queued,
      (select count(*) filter (where status = 'sent') from o)::int as sent,
      (select count(*) filter (where status = 'failed') from o)::int as unreachable,
      (select count(*) filter (where status = 'dropped') from o)::int as dropped,
      (select count(*) filter (where reason = 'busy') from a)::int as busy,
      (select count(*) filter (where reason = 'stuck') from a)::int as stuck,
      (select count(*) filter (where reason = 'unclear') from a)::int as unclear,
      (select count(*) filter (where reason = 'team') from a)::int as team,
      (select count(*) filter (where reason = 'island') from a)::int as island,
      (select count(*) filter (where reason = 'break') from a)::int as "break",
      (select count(*) filter (where reason is null) from a)::int as skipped,
      (select count(*) filter (where came_by_dm) from a)::int as came_by_dm`)).rows[0];
  check(canon(rep.consent) === canon({ yes: floor(expect.yes), no: floor(expect.no), unasked: floor(expect.unasked) }),
    "consent: the students' choices", { rep: rep.consent, expect });
  check(canon(rep.away_now) === canon({ resting: floor(expect.resting), waiting: floor(expect.waiting), other: floor(expect.other) }),
    "away_now: students away N days or more, resting, waiting or other", { rep: rep.away_now, expect });
  check(rep.away_now.resting === "1-2" && rep.away_now.waiting === "1-2", "C rests and D waits: each shows as 1-2", rep.away_now);
  check(canon(rep.dms) === canon({ queued: floor(expect.queued), sent: floor(expect.sent), unreachable: floor(expect.unreachable), dropped: floor(expect.dropped) }),
    "dms: every 'away' DM by outcome", { rep: rep.dms, expect });
  check(canon(rep.answers.by_reason) === canon(Object.fromEntries(REASONS.map((r) => [r, floor(expect[r])]))) &&
      rep.answers.skipped === floor(expect.skipped) && rep.answers.came_by_dm === floor(expect.came_by_dm),
    "answers: by reason, skipped, came by DM", { rep: rep.answers, expect });
  check(expect.busy >= 3 && rep.answers.by_reason.busy === expect.busy && rep.answers.by_reason.stuck === "1-2" &&
      rep.answers.by_reason.break === 0 && rep.answers.came_by_dm === "1-2",
    "three or more is the number, one or two is \"1-2\", none is 0", rep.answers);
  const shown = new Map<string, Json>(rep.lines.map((l: Json) => [l.id, l]));
  const allLines: Json[] = (await db.query(
    "select id::text, reason, line from public.shift_quest_away_answers where line is not null and created_at >= now() - interval '90 days'")).rows;
  check(rep.lines.length === allLines.length && allLines.every((l) => shown.get(l.id)?.line === l.line && shown.get(l.id)?.reason === l.reason),
    "lines: every line of the last 90 days with its reason, and nothing else", { shown: rep.lines.length, all: allLines.length });
  check(rep.lines.every((l: Json) => keys(l) === "id,line,reason,week" && typeof l.line === "string" && l.line.length > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(l.week) && new Date(`${l.week}T00:00:00Z`).getUTCDay() === 1),
    "each line: {id, week (a Monday), reason, line}", rep.lines);
  check(rep.lines.every((l: Json, i: number) => i === 0 || rep.lines[i - 1].week > l.week ||
      (rep.lines[i - 1].week === l.week && rep.lines[i - 1].id < l.id)),
    "newest week first, in id order within a week (never the order they were written)");
  check(shown.has(lineOnly) && shown.get(lineOnly)?.reason === null, "a line without a reason is shown with reason null");
  check(shown.get(recent)?.week === await scalar<string>(db, "select date_trunc('week', (now() - interval '89 days') at time zone 'Asia/Bangkok')::date::text"),
    "a line's week is the Monday of the week it was written (Bangkok)");
  const text = JSON.stringify(rep);
  const memberIds: string[] = (await db.query("select id::text from public.shift_quest_members")).rows.map((r) => r.id);
  const discordIds: string[] = (await db.query("select discord_user_id from public.shift_quest_members where discord_user_id is not null")).rows.map((r) => r.discord_user_id);
  const names: string[] = (await db.query("select display_name from public.shift_quest_members where display_name is not null")).rows.map((r) => r.display_name);
  const dates = text.match(/\d{4}-\d{2}-\d{2}[^"]*/g) ?? [];
  check(!memberIds.some((x) => text.includes(x)) && !discordIds.some((x) => text.includes(x)) && !names.some((x) => text.includes(x)) &&
      !/plot|project|member|name|created_at|gap_from/i.test(Object.keys(JSON.parse(text)).join() + text.replace(/"line":"[^"]*"/g, "")) &&
      dates.every((d) => rep.lines.some((l: Json) => l.week === d)),
    "no member id, Discord id, name, plot or exact date anywhere: the only dates are weeks", { dates });
  check(await code(report(R1)) === "not_authorized", "a reviewer (a mentor) never sees the answers");
  check(await code(report(A)) === "not_authorized", "nor a student");
  check(await code(report(NOBODY)) === "not_authorized", "nor an unknown caller");

  // --- The audited reveal ----------------------------------------------------------------------------------------------
  const kAnswer = (await answerRow(K, day(10)))!.id;
  const reveals = () => count("select count(*) from public.shift_quest_audit where action = 'away_reveal'");
  check(await code(reveal(kAnswer, R1)) === "not_authorized" && await code(reveal(kAnswer, A)) === "not_authorized" &&
      await code(reveal(kAnswer, NOBODY)) === "not_authorized" && await reveals() === 0,
    "only an admin can reveal a writer: a reviewer, a student and an unknown caller are refused, and nothing is audited");
  const who = await reveal(kAnswer);
  check(keys(who) === "name" && who.name === NAMES[K], "an admin reveals who wrote a line: {name} only", who);
  const rv = (await db.query(
    "select actor_id::text, resource_type, resource_id::text, outcome from public.shift_quest_audit where action = 'away_reveal' order by id desc limit 1")).rows[0];
  check(await reveals() === 1 && rv.actor_id === ids[ADMIN] && rv.resource_type === "away_answer" && rv.resource_id === kAnswer,
    "audited away_reveal, by the admin, with the answer id", rv);
  check((await reveal(recent)).name === FALLBACK_NAME, `a writer with no display name shows as ${FALLBACK_NAME}`);
  const yAnswer = (await answerRow(Y, day(9)))!.id;
  for (const [id, label] of [[yAnswer, "a skip (no line)"], [old, "a line cleared after 90 days"], [randomUUID(), "an unknown id"]] as [string, string][]) {
    check(await code(reveal(id)) === "not_found", `${label}: not_found`);
  }
  check(await reveals() === 2, "a refused reveal is not audited");

  // --- /data, erasure and the admin's own reset ---------------------------------------------------------------------------
  const exportA = await call<Json>(web, "shift_quest_data_export", A);
  check(keys(exportA.away) === "answers,decided_at,dm" && exportA.away.dm === true && typeof exportA.away.decided_at === "string",
    "/data exports \"away\": {dm, decided_at, answers}", exportA.away);
  check(exportA.away.answers.length === 1 && keys(exportA.away.answers[0]) === "created_at,gap_from,line,reason" &&
      exportA.away.answers[0].gap_from === day(10) && exportA.away.answers[0].reason === "team" && exportA.away.answers[0].line === LINE_A,
    "with each of their answers: gap_from, reason, line, created_at", exportA.away.answers);
  check(!JSON.stringify(exportA).includes(LINE_K), "never anyone else's answer");
  const exportB = await call<Json>(web, "shift_quest_data_export", B);
  check(exportB.away?.dm === null && exportB.away.decided_at === null && Array.isArray(exportB.away.answers) && exportB.away.answers.length === 0,
    "never asked, never answered: {dm: null, decided_at: null, answers: []}", exportB.away);

  // E: a yes, an answer and a queued DM, then erased.
  await db.query("insert into public.shift_quest_away_answers (member_id, gap_from, reason, line) values ($1, $2, 'unclear', 'ไม่แน่ใจขั้นต่อไป')", [e, day(15)]);
  const eRow = await dmRow(await keyOf(E, 15), E, "away");
  const otherAnswers = await count("select count(*) from public.shift_quest_away_answers where member_id <> $1", [e]);
  const request: string = await call(web, "shift_quest_data_request", E, "erasure", null);
  await call(web, "shift_quest_admin_erase", ADMIN, request);
  const eMember = (await db.query("select away_dm, away_dm_at, erased_at is not null as erased from public.shift_quest_members where id = $1", [e])).rows[0];
  check(await answersOf(E) === 0 && eMember.away_dm === null && eMember.away_dm_at === null && eMember.erased === true,
    "erasure deletes the member's answers and clears their choice", eMember);
  check((await statusOf(eRow)).status === "dropped", "and drops their queued DM");
  check(await count("select count(*) from public.shift_quest_away_answers where member_id <> $1", [e]) === otherAnswers,
    "and nobody else's answers");

  // The admin's own reset clears their answers and choice too.
  const adminId = ids[ADMIN];
  await db.query("update public.shift_quest_members set away_dm = true, away_dm_at = now() where id = $1", [adminId]);
  await db.query("insert into public.shift_quest_away_answers (member_id, gap_from, reason, line) values ($1, $2, 'island', 'ทดสอบ')", [adminId, day(30)]);
  const adminRow = await dmRow(`away:${adminId}:${day(30)}`, ADMIN, "away");
  const before = await count("select count(*) from public.shift_quest_away_answers where member_id <> $1", [adminId]);
  const reset = await call<Json>(web, "shift_quest_admin_reset_self", ADMIN);
  const adminAfter = (await db.query("select away_dm, away_dm_at from public.shift_quest_members where id = $1", [adminId])).rows[0];
  check(reset.reset === true && await count("select count(*) from public.shift_quest_away_answers where member_id = $1", [adminId]) === 0 &&
      adminAfter.away_dm === null && adminAfter.away_dm_at === null,
    "the admin's reset clears their own answers and choice", { reset, adminAfter });
  check((await statusOf(adminRow)).status === "dropped" &&
      await count("select count(*) from public.shift_quest_away_answers where member_id <> $1", [adminId]) === before,
    "drops their queued DM, and leaves everyone else's answers");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
