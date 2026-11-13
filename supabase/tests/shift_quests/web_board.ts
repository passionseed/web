/**
 * SHIFT High Island on the web: the quest board, side quests and the
 * shift_quest_web role (20261111090900_shift_quests_board). Every student
 * call goes through shift_quest_web, as the website makes it; staff work
 * (publishing, reviews, invites, appeals) goes through shift_quest_bot, as in
 * Discord.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { Client } from "pg";
import { randomUUID } from "node:crypto";

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
const ADMIN = "610000000000000001";
const R1 = "620000000000000001";
const R2 = "620000000000000002";
const A = "630000000000000001"; // software project
const B = "630000000000000002"; // A's teammate
const C = "630000000000000003"; // a creative project of their own
const D = "630000000000000004"; // no project
const NOBODY = "639999999999999999";
const NAMES: Record<string, string> = { [A]: "Board Aye", [B]: "Board Bee", [C]: "Board Cee", [D]: "Board Dee" };

/**
 * Mirrors the allowlist at the end of 20261111091200_shift_quest_ownership_web.sql plus the
 * campfire read of 20261111093000_shift_quest_campfire.sql, the menu links read of
 * 20261111094000_shift_quest_live.sql, the player, shop, consent and news functions of
 * 20261111095000_shift_quest_player.sql and the roots read of 20261113090000_shift_quest_roots.sql
 * plus the own-tree roots read of 20261113173515_shift_quest_own_roots.sql
 * (regprocedure text).
 */
const WEB_ALLOWLIST = [
  "shift_quest_board(text)",
  "shift_quest_campfire(text,boolean)",
  "shift_quest_canvas_get(text)",
  "shift_quest_canvas_link(text,uuid,text,text)",
  "shift_quest_canvas_unlink(text)",
  "shift_quest_character(text)",
  "shift_quest_checkin(text,text)",
  "shift_quest_consent_adult(text,date,text)",
  "shift_quest_consent_get(text)",
  "shift_quest_consent_import(text,text,timestamp with time zone,boolean,boolean)",
  "shift_quest_consent_link(text,text,text,text)",
  "shift_quest_consent_parent_answer(text,boolean,boolean,text,text,text,text,text)",
  "shift_quest_consent_parent_view(text)",
  "shift_quest_consent_parent_withdraw(text)",
  "shift_quest_digest_hide(text,integer,boolean,text)",
  "shift_quest_digest_inputs(date,text)",
  "shift_quest_digest_save(date,text,jsonb)",
  "shift_quest_help_create(text,text,text,text,uuid)",
  "shift_quest_island(text)",
  "shift_quest_island_links(text)",
  "shift_quest_island_map(text)",
  "shift_quest_island_news(text)",
  "shift_quest_island_optin(text,uuid,boolean)",
  "shift_quest_island_roots()",
  "shift_quest_island_my_roots(text)",
  "shift_quest_milestone_start(text,smallint)",
  "shift_quest_milestone_submit(text,smallint,text,text,text)",
  "shift_quest_ownership_get(text)",
  "shift_quest_project_create(text,text,text,text)",
  "shift_quest_project_list(text)",
  "shift_quest_project_respond(text,uuid,boolean)",
  "shift_quest_propose(text,text,text,text,text,text)",
  "shift_quest_redeem(text,uuid,text,integer)",
  "shift_quest_redeem_cancel(text,uuid)",
  "shift_quest_rest(text,boolean)",
  "shift_quest_resume(text,uuid)",
  "shift_quest_schema_version()",
  "shift_quest_session(text,text)",
  "shift_quest_side_choose(text,uuid)",
  "shift_quest_side_submit(text,uuid,text,text,text)",
  "shift_quest_start(text,text,boolean)",
  "shift_quest_submit(text,uuid,integer,text,text,text,text,text,text[])",
  "shift_quest_wallet(text)",
];

/** The draft side quests, in sort order. */
const SIDE_SLUGS = [
  "side-five-voices", "side-open-on-phone", "side-readme", "side-thirty-second-cut", "side-clear-offer",
  "side-outside-circle", "side-fix-one-thing", "side-demo-three-minutes", "side-handoff-page",
  "side-review-a-friend", "side-share-a-lesson",
];

/** The same, in board order (branch_of, then sort_order): share-a-lesson branches off main quest 3. */
const BOARD_ORDER = [
  "side-five-voices", "side-open-on-phone", "side-readme", "side-thirty-second-cut", "side-clear-offer",
  "side-outside-circle", "side-fix-one-thing", "side-demo-three-minutes", "side-share-a-lesson",
  "side-handoff-page", "side-review-a-friend",
];

/** Main quest icons (components/shift/island/sprites.ts MAIN_ICONS): no side quest reuses one. */
const MAIN_ICON_KEYS = ["compass", "hammer", "visitor", "door", "key", "key_flag", "path", "lantern"];

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

const keys = (o: Json | null | undefined) => (o ? Object.keys(o).sort().join(",") : String(o));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: staff work
  const web = await connect(webUrl!); // shift_quest_web: every student call, as the website makes it
  const web2 = await connect(webUrl!); // a second website connection for a race

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));

  // --- The web role ------------------------------------------------------------------
  const role = (await db.query(
    "select rolcanlogin, rolinherit, rolconnlimit, rolconfig from pg_roles where rolname = 'shift_quest_web'"
  )).rows[0];
  check(role && role.rolinherit === false && role.rolconnlimit === 20 && (role.rolconfig ?? []).includes("statement_timeout=8s"),
    "shift_quest_web: NOINHERIT, 20 connections, statement_timeout 8s", role);
  check((await scalar<string>(web, "show statement_timeout")) === "8s", "a web session runs with the 8s statement timeout");
  check(Number(await call(web, "shift_quest_schema_version")) === 12, "the website reads schema version 12 (it needs 6 or more)");
  check(Number(await call(bot, "shift_quest_schema_version")) === 12, "the bot reads schema version 12 (it needs 2 or more)");

  const executable: string[] = (await db.query(`
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'shift\\_quest\\_%'
      and has_function_privilege('shift_quest_web', p.oid, 'EXECUTE')
    order by 1`)).rows.map((r) => r.sig);
  check(JSON.stringify(executable) === JSON.stringify([...WEB_ALLOWLIST].sort()),
    "the website executes exactly the allowlist", {
      extra: executable.filter((s) => !WEB_ALLOWLIST.includes(s)),
      missing: WEB_ALLOWLIST.filter((s) => !executable.includes(s)),
    });
  const webTables: string[] = (await db.query(`
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
      and case when c.relkind = 'S' then has_sequence_privilege('shift_quest_web', c.oid, 'USAGE, SELECT, UPDATE')
          else has_table_privilege('shift_quest_web', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') end`
  )).rows.map((r) => r.relname);
  check(webTables.length === 0, "the website holds no table or sequence privilege", webTables);

  // Every allowlisted function runs for the web role (an unknown caller is refused by the function, not by Postgres).
  const allowCalls: [string, string, unknown[], string][] = [
    ["schema_version", "select public.shift_quest_schema_version()", [], "ok"],
    ["session", "select public.shift_quest_session($1::text, $2::text)", [NOBODY, null], "ok"],
    ["start", "select public.shift_quest_start($1::text, $2::text, $3::boolean)", ["not-a-snowflake", null, false], "not_started"],
    ["island", "select public.shift_quest_island($1::text)", [NOBODY], "not_started"],
    ["island_map", "select public.shift_quest_island_map($1::text)", [NOBODY], "not_started"],
    ["board", "select public.shift_quest_board($1::text)", [NOBODY], "not_started"],
    ["checkin", "select public.shift_quest_checkin($1::text, $2::text)", [NOBODY, null], "not_started"],
    ["rest", "select public.shift_quest_rest($1::text, $2::boolean)", [NOBODY, true], "not_started"],
    ["island_optin", "select public.shift_quest_island_optin($1::text, $2::uuid, $3::boolean)", [NOBODY, null, true], "not_started"],
    ["resume", "select public.shift_quest_resume($1::text, $2::uuid)", [NOBODY, randomUUID()], "not_started"],
    ["milestone_start", "select public.shift_quest_milestone_start($1::text, $2::smallint)", [NOBODY, 1], "not_started"],
    ["milestone_submit", "select public.shift_quest_milestone_submit($1::text, $2::smallint, $3::text, $4::text, $5::text)",
      [NOBODY, 1, "p", "r", null], "not_started"],
    ["side_choose", "select public.shift_quest_side_choose($1::text, $2::uuid)", [NOBODY, randomUUID()], "not_started"],
    ["side_submit", "select public.shift_quest_side_submit($1::text, $2::uuid, $3::text, $4::text, $5::text)",
      [NOBODY, randomUUID(), "p", "r", null], "not_started"],
    ["propose", "select public.shift_quest_propose($1::text, $2::text, $3::text, $4::text, $5::text, $6::text)",
      [NOBODY, "t", null, "g", "c", "n"], "not_started"],
    ["submit", "select public.shift_quest_submit($1::text, $2::uuid, $3::integer, $4::text, $5::text, $6::text, $7::text, $8::text, $9::text[])",
      [NOBODY, randomUUID(), null, "e", "r", null, "reviewers", null, []], "not_started"],
    ["help_create", "select public.shift_quest_help_create($1::text, $2::text, $3::text, $4::text, $5::uuid)",
      [NOBODY, "s", "community", "student", null], "not_started"],
    ["project_create", "select public.shift_quest_project_create($1::text, $2::text, $3::text, $4::text)",
      [NOBODY, "n", "software", null], "not_started"],
    ["project_list", "select public.shift_quest_project_list($1::text)", [NOBODY], "not_started"],
    ["project_respond", "select public.shift_quest_project_respond($1::text, $2::uuid, $3::boolean)",
      [NOBODY, randomUUID(), true], "not_started"],
    ["canvas_get", "select public.shift_quest_canvas_get($1::text)", [NOBODY], "not_started"],
    ["canvas_link", "select public.shift_quest_canvas_link($1::text, $2::uuid, $3::text, $4::text)",
      [NOBODY, randomUUID(), "frame", "project"], "not_started"],
    ["canvas_unlink", "select public.shift_quest_canvas_unlink($1::text)", [NOBODY], "not_started"],
    ["ownership_get", "select public.shift_quest_ownership_get($1::text)", [NOBODY], "not_started"],
    ["campfire", "select public.shift_quest_campfire($1::text, $2::boolean)", [NOBODY, true], "not_started"],
    ["island_links", "select public.shift_quest_island_links($1::text)", [NOBODY], "not_started"],
    // 20261113090000_shift_quest_roots: no caller, the outsider view; an empty island has no roots.
    ["island_roots", "select public.shift_quest_island_roots()", [], "ok"],
    ["island_my_roots", "select public.shift_quest_island_my_roots($1::text)", [NOBODY], "not_started"],
    // 20261111095000_shift_quest_player: an unknown caller or an unknown link stores nothing.
    ["character", "select public.shift_quest_character($1::text)", [NOBODY], "not_started"],
    ["wallet", "select public.shift_quest_wallet($1::text)", [NOBODY], "not_started"],
    ["redeem", "select public.shift_quest_redeem($1::text, $2::uuid, $3::text, $4::integer)",
      [NOBODY, randomUUID(), randomUUID(), 1], "not_started"],
    ["redeem_cancel", "select public.shift_quest_redeem_cancel($1::text, $2::uuid)", [NOBODY, randomUUID()], "not_started"],
    ["consent_get", "select public.shift_quest_consent_get($1::text)", [NOBODY], "not_started"],
    ["consent_adult", "select public.shift_quest_consent_adult($1::text, $2::date, $3::text)",
      [NOBODY, "1990-01-01", "v"], "not_started"],
    ["consent_link", "select public.shift_quest_consent_link($1::text, $2::text, $3::text, $4::text)",
      [NOBODY, "a".repeat(64), "n", "v"], "not_started"],
    ["consent_import", "select public.shift_quest_consent_import($1::text, $2::text, $3::timestamptz, $4::boolean, $5::boolean)",
      [NOBODY, "shift_parent", null, false, false], "not_started"],
    ["consent_parent_view", "select public.shift_quest_consent_parent_view($1::text)", ["a".repeat(64)], "ok"],
    ["consent_parent_answer",
      "select public.shift_quest_consent_parent_answer($1::text, $2::boolean, $3::boolean, $4::text, $5::text, $6::text, $7::text, $8::text)",
      ["a".repeat(64), true, false, "Parent Name", "แม่", null, null, "v"], "consent_link_dead"],
    ["consent_parent_withdraw", "select public.shift_quest_consent_parent_withdraw($1::text)", ["a".repeat(64)], "consent_link_dead"],
    ["island_news", "select public.shift_quest_island_news($1::text)", [NOBODY], "not_started"],
    ["digest_inputs", "select public.shift_quest_digest_inputs($1::date, $2::text)", ["2026-11-11", "day"], "ok"],
    ["digest_save", "select public.shift_quest_digest_save($1::date, $2::text, $3::jsonb)", ["2026-11-11", "day", "[]"], "ok"],
    ["digest_hide", "select public.shift_quest_digest_hide($1::text, $2::integer, $3::boolean, $4::text)",
      [NOBODY, 1, true, null], "not_authorized"],
  ];
  check(allowCalls.length === WEB_ALLOWLIST.length, "every allowlisted function is called below");
  for (const [name, sql, args, expected] of allowCalls) {
    const got = await code(web.query(sql, args));
    check(got === expected, `the website can call ${name} (${expected})`, got);
  }
  check((await count("select count(*) from public.shift_quest_members")) === 0, "and those calls stored nothing");

  // Everything else is refused by Postgres itself (42501).
  const denied: [string, string, unknown[]][] = [
    ["the review queue", "select public.shift_quest_review_queue($1)", [R1]],
    ["review decisions", "select public.shift_quest_review_decide($1, $2, 'approved', null, false)", [R1, randomUUID()]],
    ["admin status", "select public.shift_quest_admin_status($1)", [ADMIN]],
    ["template publishing", "select public.shift_quest_admin_template_state($1, 'side-readme', true)", [ADMIN]],
    ["the help queue", "select public.shift_quest_help_queue($1)", [R1]],
    ["the outbox", "select public.shift_quest_outbox_claim(5)", []],
    ["bootstrap_admin", "select public.shift_quest_bootstrap_admin($1, 'x')", [A]],
    ["data export", "select public.shift_quest_data_export($1)", [A]],
    ["the bot's quest browse", "select public.shift_quest_templates($1)", [A]],
    ["choosing a template directly", "select public.shift_quest_choose($1, $2, 'g', 'n', null, null)", [A, randomUUID()]],
    ["project invites", "select public.shift_quest_project_invite($1, $2, $3)", [A, randomUUID(), B]],
    ["the campfire's voice update", "select public.shift_quest_voice_set($1, $2, $3, 'x')", [null, A, null]],
    ["the campfire's voice sync", "select public.shift_quest_voice_sync($1, $2, $3::text[], $4::text[])", [null, null, [], []]],
    ["the campfire's heartbeat", "select public.shift_quest_voice_beat($1)", [null]],
    ["the live post's reader", "select public.shift_quest_live_post()", []],
    ["the live post's writer", "select public.shift_quest_live_mark($1, $2, $3)", ["700000000000000001", null, null]],
    ["the digest post's reader", "select public.shift_quest_digest_post_next()", []],
    ["the digest post's writer", "select public.shift_quest_digest_mark($1::date, $2, $3)", ["2026-11-11", "700000000000000001", "700000000000000002"]],
    ["the digest post's claim", "select public.shift_quest_digest_claim($1::date, $2, 'day')", ["2026-11-11", "700000000000000001"]],
    ["the digest post's re-render", "select public.shift_quest_digest_post_current()", []],
    ["consent resets", "select public.shift_quest_admin_consent_reset($1, $2)", [ADMIN, A]],
    ["staff awards", "select public.shift_quest_admin_staff_award($1, $2, 'helped-most', 'x', 'request-key-1')", [ADMIN, A]],
    ["the island admin switches", "select public.shift_quest_admin_island_set($1, 'digest_enabled', 'on')", [ADMIN]],
    ["shop gates", "select public.shift_quest_admin_catalog_gate($1, $2, 1::smallint, true)", [ADMIN, randomUUID()]],
    ["coin history", "select public.shift_quest_coins($1)", [A]],
    ["reading shift_quest_consents", "select * from public.shift_quest_consents", []],
    ["reading shift_quest_digests", "select * from public.shift_quest_digests", []],
    ["helper shift_quest__consent_ok", "select public.shift_quest__consent_ok($1)", [randomUUID()]],
    ["helper shift_quest__digest_eligible", "select public.shift_quest__digest_eligible($1)", [randomUUID()]],
    ["reading shift_quest_live_state", "select * from public.shift_quest_live_state", []],
    ["reading shift_quest_voice_presence", "select * from public.shift_quest_voice_presence", []],
    ["reading shift_quest_voice_state", "select * from public.shift_quest_voice_state", []],
    ["helper shift_quest__fail", "select public.shift_quest__fail('x')", []],
    ["helper shift_quest__side_open", "select public.shift_quest__side_open($1, $2, true)", [A, randomUUID()]],
    ["helper shift_quest__side_missing", "select public.shift_quest__side_missing(null, null::public.shift_quest_templates)", []],
    ["helper shift_quest__milestone_open", "select public.shift_quest__milestone_open($1, 1::smallint)", [A]],
    ["helper shift_quest__cap", "select public.shift_quest__cap($1, 'help')", [randomUUID()]],
    ["reading shift_quest_members", "select * from public.shift_quest_members", []],
    ["reading shift_quest_templates", "select * from public.shift_quest_templates", []],
    ["writing shift_quest_instances", "delete from public.shift_quest_instances", []],
  ];
  for (const [label, sql, args] of denied) {
    check((await sqlstate(web.query(sql, args))) === "42501", `the website is refused ${label} (42501)`);
  }
  for (const helper of [
    "shift_quest__side_open($1, $2, true)",
    "shift_quest__side_missing(null, null::public.shift_quest_templates)",
    "shift_quest__milestone_open($1, 1::smallint)",
  ]) {
    const args = helper.includes("$2") ? [A, randomUUID()] : helper.includes("$1") ? [A] : [];
    check((await sqlstate(bot.query(`select public.${helper}`, args))) === "42501", `the bot cannot call ${helper.split("(")[0]}`);
  }
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_board", A))) === "42501", `${r} cannot read the board`);
    await db.query("reset role");
  }

  // --- Draft side quests ------------------------------------------------------------------
  const seeds: Json[] = (await db.query(
    "select * from public.shift_quest_templates where side order by sort_order"
  )).rows;
  check(seeds.length === 11 && seeds.map((s) => s.slug).join(",") === SIDE_SLUGS.join(","),
    "eleven side quests are seeded, in board order", seeds.map((s) => s.slug));
  check(seeds.every((s) => s.status === "draft" && s.side === true && s.milestone === null && s.version === 1 &&
      s.reward_rule_key === null),
    "all draft, side, no milestone, version 1, no reward rule");
  check(seeds.map((s) => s.sort_order).join(",") === "110,120,130,140,150,160,170,180,190,200,210", "sort_order 110 to 210");
  const bySeed = (slug: string) => seeds.find((s) => s.slug === slug)!;
  check(JSON.stringify(bySeed("side-fix-one-thing").requires_slugs) === '["side-outside-circle"]' &&
      bySeed("side-fix-one-thing").repeatable === true &&
      JSON.stringify(bySeed("side-demo-three-minutes").requires_milestones) === "[2,3]" &&
      JSON.stringify(bySeed("side-review-a-friend").requires_milestones) === "[]" &&
      JSON.stringify(bySeed("side-open-on-phone").route_keys) === '["software"]' && bySeed("side-five-voices").route_keys === null,
    "prerequisites and routes as planned");
  const textCols = ["title", "purpose", "routes", "examples", "evidence_criteria", "reflection_prompt", "support_options"];
  const sideIcons = seeds.map((s) => s.icon);
  check(!sideIcons.some((icon) => MAIN_ICON_KEYS.includes(icon)), "no side quest wears a main quest's icon", sideIcons);
  check(seeds.every((s) => s.branch_of === null || s.requires_milestones.length === 0 ||
      s.requires_milestones.includes(s.branch_of)),
    "a side quest with a required main quest branches off one of them",
    seeds.map((s) => [s.slug, s.branch_of, s.requires_milestones]));
  const badCopy = seeds.flatMap((s) => textCols.filter((k) => /—|น้อง/.test(s[k])).map((k) => `${s.slug}.${k}`));
  check(badCopy.length === 0, "the Thai drafts have no em dash and never say น้อง", badCopy);
  for (const [label, sql] of [
    ["a side quest is never a milestone", "update public.shift_quest_templates set milestone = 1 where slug = 'side-readme'"],
    ["routes are the four project routes", "update public.shift_quest_templates set route_keys = '{mobile}' where slug = 'side-readme'"],
    ["required milestones are 1 to 7", "update public.shift_quest_templates set requires_milestones = '{8}' where slug = 'side-readme'"],
    ["branch_of is a main quest", "update public.shift_quest_templates set branch_of = 0 where slug = 'side-readme'"],
    ["icon keys are lower-case words", "update public.shift_quest_templates set icon = 'Bad-Icon' where slug = 'side-readme'"],
  ]) {
    check((await sqlstate(db.query(sql))) === "23514", `check constraint: ${label}`);
  }

  // --- Fixtures -----------------------------------------------------------------------------
  await call(db, "shift_quest_bootstrap_admin", ADMIN, "Board Admin");
  await call(bot, "shift_quest_admin_role", ADMIN, R1, "Board Rev One", "reviewer", true);
  await call(bot, "shift_quest_admin_role", ADMIN, R2, "Board Rev Two", "reviewer", true);
  for (const id of [A, B, C, D]) {
    const s = await call(web, "shift_quest_start", id, NAMES[id], false);
    check(s.onboarded === true, `the website starts ${NAMES[id]}`);
  }
  const board = (who: string) => call<Json>(web, "shift_quest_board", who);
  const sideOf = (b: Json, slug: string) => b.side.find((s: Json) => s.slug === slug);
  const mainOf = (b: Json, m: number) => b.main.find((x: Json) => x.milestone === m);
  const approve = (submission: string, reviewer = R1) =>
    call(bot, "shift_quest_review_decide", reviewer, submission, "approved", null, false);
  const sideSubmit = (
    who: string, template: string, proof = "Proof", reflection = "Reflection", url: string | null = null, via = web
  ) => call<Json>(via, "shift_quest_side_submit", who, template, proof, reflection, url);

  check(await code(board(NOBODY)) === "not_started", "the board needs /start");
  let bD = await board(D);
  check(keys(bD) === "help_open,main,project,proposed,side", "the board has project, main, side, proposed, help_open", keys(bD));
  check(bD.project === null && bD.main.map((m: Json) => m.milestone).join(",") === "1,2,3,4,5,6,7",
    "without a project: no project, the seven main quests in order", bD.project);
  check(bD.side.length === 0, "draft side quests are not on the board");
  const m1 = mainOf(bD, 1);
  check(keys(m1) === "done,evidence_criteria,in_flight,milestone,mine,purpose,reflection_prompt,slug,template_id,title" &&
      m1.slug === "find-something-worth-fixing" && m1.done === false && m1.in_flight === null && m1.mine === null,
    "a main quest's shape", m1);

  // Publish every side quest, as an admin would after the Thai review.
  for (const slug of SIDE_SLUGS) await call(bot, "shift_quest_admin_template_state", ADMIN, slug, true);
  const browse: Json[] = await call(bot, "shift_quest_templates", A);
  check(browse.length === 7 && !browse.some((t) => String(t.slug).startsWith("side-")),
    "the bot's quest browse never lists side quests, even published", browse.map((t) => t.slug));
  const tpl = Object.fromEntries((await db.query("select slug, id from public.shift_quest_templates where side")).rows
    .map((r) => [r.slug, r.id as string]));

  bD = await board(D);
  check(bD.side.map((s: Json) => s.slug).join(",") === BOARD_ORDER.join(","),
    "published side quests are listed by branch, then sort order", bD.side.map((s: Json) => s.slug));
  check(bD.side.every((s: Json) => s.locked === true && s.route_match === false && s.approved === false && s.mine === null &&
      JSON.stringify(s.missing_milestones) === JSON.stringify(s.requires_milestones) &&
      JSON.stringify(s.missing_slugs) === JSON.stringify(s.requires_slugs)),
    "without a project every side quest is locked and misses everything it requires");
  check(keys(bD.side[0]) === "approved,branch_of,evidence_criteria,examples,icon,locked,mine,missing_milestones," +
      "missing_slugs,purpose,reflection_prompt,repeatable,requires_milestones,requires_slugs,route_keys,route_match," +
      "slug,sort_order,template_id,title",
    "a side quest's shape", keys(bD.side[0]));
  check(await code(call(web, "shift_quest_side_choose", D, tpl["side-review-a-friend"])) === "no_project" &&
      await code(sideSubmit(D, tpl["side-review-a-friend"])) === "no_project",
    "side quests need a project");
  check(await code(call(bot, "shift_quest_choose", D, tpl["side-review-a-friend"], "g", "n", null, null)) === "no_project",
    "the bot's choose cannot file a side quest without a project either (trigger)");

  // --- Projects ---------------------------------------------------------------------------------
  const p1: string = await call(web, "shift_quest_project_create", A, "Board One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  const invites: Json[] = await call(web, "shift_quest_project_list", B);
  check(invites.length === 1 && invites[0].id === p1 && invites[0].status === "invited" && invites[0].inviter === NAMES[A],
    "the website lists a pending invite", invites);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "Board Two", "creative", null);

  let bA = await board(A);
  check(JSON.stringify(bA.project) === JSON.stringify({ id: p1, route: "software", stage: 0, milestones_done: [] }),
    "the board's project", bA.project);
  const matching = bA.side.filter((s: Json) => s.route_match).map((s: Json) => s.slug);
  check(!matching.includes("side-thirty-second-cut") && !matching.includes("side-clear-offer") &&
      matching.includes("side-open-on-phone") && matching.includes("side-readme") && matching.length === 9,
    "a software project matches software and all-route side quests only", matching);
  const bC = await board(C);
  check(sideOf(bC, "side-thirty-second-cut").route_match === true && sideOf(bC, "side-open-on-phone").route_match === false,
    "a creative project matches the creative one");
  const friend = sideOf(bA, "side-review-a-friend");
  check(friend.locked === false && friend.missing_milestones.length === 0 && friend.missing_slugs.length === 0,
    "a side quest with no prerequisite opens with the project", friend);
  check(bA.side.filter((s: Json) => !s.locked).length === 1, "everything else is still locked");
  const phone = sideOf(bA, "side-open-on-phone");
  check(typeof phone.requires_milestones[0] === "number" && typeof phone.branch_of === "number" &&
      typeof phone.sort_order === "number" && phone.icon === "gear" && JSON.stringify(phone.route_keys) === '["software"]',
    "numbers are JSON numbers", phone);

  // --- Locked means locked, on every path -------------------------------------------------------------
  check(await code(call(web, "shift_quest_side_choose", A, tpl["side-open-on-phone"])) === "quest_locked",
    "side_choose refuses a locked side quest");
  check(await code(sideSubmit(A, tpl["side-open-on-phone"])) === "quest_locked", "side_submit refuses it");
  check(await code(call(bot, "shift_quest_choose", A, tpl["side-open-on-phone"], "g", "n", null, null)) === "quest_locked",
    "so does the bot's shift_quest_choose (trigger)");
  const aId = await scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [A]);
  check(await code(db.query(
    `insert into public.shift_quest_instances (member_id, project_id, template_id, title, goal, next_step, criteria)
     values ($1, $2, $3, 'x', 'x', 'x', 'x')`, [aId, p1, tpl["side-open-on-phone"]])) === "quest_locked",
    "and a direct insert (trigger)");
  check((await count("select count(*) from public.shift_quest_instances")) === 0, "no quest was left behind");

  // --- A main quest on the board -------------------------------------------------------------------
  const ms2 = await call(web, "shift_quest_milestone_submit", A, 2, "Proof two", "Learned two", null);
  bA = await board(A);
  let m2 = mainOf(bA, 2);
  check(m2.done === false && m2.in_flight?.mine === true && m2.in_flight.state === "submitted" &&
      keys(m2.in_flight) === "instance_id,mine,owner,state,version",
    "a submitted main quest is in flight", m2.in_flight);
  check(keys(m2.mine) === "instance_id,latest_review,latest_submission,state,updated_at,version" &&
      m2.mine.instance_id === ms2.instance_id && m2.mine.state === "submitted" && typeof m2.mine.updated_at === "string" &&
      keys(m2.mine.latest_submission) === "created_at,revision,status" && m2.mine.latest_submission.revision === 1 &&
      m2.mine.latest_submission.status === "pending" && m2.mine.latest_review === null,
    "mine: the caller's quest, latest submission, no review yet", m2.mine);
  const bB = await board(B);
  check(mainOf(bB, 2).in_flight?.mine === false && mainOf(bB, 2).in_flight.owner === NAMES[A] && mainOf(bB, 2).mine === null,
    "a teammate sees who holds it, and mine is never someone else's", mainOf(bB, 2));
  await approve(ms2.submission_id);
  bA = await board(A);
  m2 = mainOf(bA, 2);
  check(m2.done === true && m2.in_flight === null && m2.mine.state === "approved" &&
      keys(m2.mine.latest_review) === "created_at,feedback,outcome" && m2.mine.latest_review.outcome === "approved",
    "approved: done, nothing in flight, the review on mine", m2);
  check(bA.project.stage === 1 && JSON.stringify(bA.project.milestones_done) === "[2]", "the tree grew one stage");
  check(["side-open-on-phone", "side-readme", "side-thirty-second-cut", "side-clear-offer"]
      .every((s) => sideOf(bA, s).locked === false),
    "main quest 2 unlocks its side quests, for every route");
  const demo0 = sideOf(bA, "side-demo-three-minutes");
  check(demo0.locked === true && JSON.stringify(demo0.missing_milestones) === "[3]",
    "a side quest needing 2 and 3 still misses 3", demo0);

  // --- Side submit, resubmit, approve -----------------------------------------------------------------
  const s1 = await sideSubmit(A, tpl["side-open-on-phone"], "Opens on two phones", "The env vars broke", "https://example.org/app");
  check(s1.created === true && s1.revision === 1 && typeof s1.submission_id === "string" && typeof s1.version === "number",
    "side_submit creates the quest and its first revision", s1);
  const q1 = (await db.query("select * from public.shift_quest_instances where id = $1", [s1.instance_id])).rows[0];
  check(q1.project_id === p1 && q1.template_id === tpl["side-open-on-phone"] && q1.milestone === null &&
      q1.state === "submitted" && q1.goal === bySeed("side-open-on-phone").purpose && q1.next_step === "-",
    "filed under the project like a chosen template, with no milestone", q1);
  const sub1 = (await db.query("select * from public.shift_quest_submissions where id = $1", [s1.submission_id])).rows[0];
  check(sub1.visibility === "reviewers" && sub1.evidence === "Opens on two phones" && sub1.reflection === "The env vars broke" &&
      sub1.artifact_url === "https://example.org/app",
    "proof, reflection and link go to reviewers only", sub1);
  bA = await board(A);
  check(sideOf(bA, "side-open-on-phone").mine?.instance_id === s1.instance_id &&
      sideOf(bA, "side-open-on-phone").mine.state === "submitted" && sideOf(bA, "side-open-on-phone").approved === false,
    "the board shows it as mine, submitted");
  const s2 = await sideSubmit(A, tpl["side-open-on-phone"], "Opens on three phones", "Fixed the env vars");
  check(s2.created === false && s2.instance_id === s1.instance_id && s2.revision === 2, "a resubmit reuses the quest", s2);
  const chosen = await call(web, "shift_quest_side_choose", A, tpl["side-open-on-phone"]);
  check(chosen.instance_id === s1.instance_id && chosen.created === false && chosen.version === s2.version,
    "side_choose returns the quest already open", chosen);
  await approve(s2.submission_id);
  bA = await board(A);
  check(sideOf(bA, "side-open-on-phone").approved === true && sideOf(bA, "side-open-on-phone").mine.state === "approved",
    "approved on the board");
  check(bA.project.stage === 1 && JSON.stringify(bA.project.milestones_done) === "[2]" &&
      (await call(web, "shift_quest_island", A)).project.stage === 1,
    "side quests never grow the tree");
  check(await code(sideSubmit(A, tpl["side-open-on-phone"])) === "quest_done" &&
      await code(call(web, "shift_quest_side_choose", A, tpl["side-open-on-phone"])) === "quest_done",
    "a non-repeatable side quest is done once approved");
  check(await code(sideSubmit(B, tpl["side-open-on-phone"])) === "quest_done", "for the whole team");
  const phoneB = sideOf(await board(B), "side-open-on-phone");
  check(phoneB.approved === true && phoneB.mine === null, "a teammate sees it approved, and not as theirs", phoneB);
  const bothBoards = [await call(bot, "shift_quest_board", A), await board(A)].map((b) => JSON.stringify(b));
  check(bothBoards[0] === bothBoards[1], "the bot can read the same board");

  // --- Unlocking by slug, and a teammate's work counts ------------------------------------------------
  const ms3 = await call(web, "shift_quest_milestone_submit", B, 3, "Proof three", "Learned three", null);
  await approve(ms3.submission_id);
  bA = await board(A);
  const fix0 = sideOf(bA, "side-fix-one-thing");
  check(sideOf(bA, "side-outside-circle").locked === false && fix0.locked === true &&
      fix0.missing_milestones.length === 0 && JSON.stringify(fix0.missing_slugs) === '["side-outside-circle"]',
    "a teammate's main quest 3 unlocks side quests; one still needs a side quest first", fix0);
  check(sideOf(bA, "side-demo-three-minutes").locked === false, "and 2 plus 3 opens the demo");
  check(await code(call(web, "shift_quest_side_choose", A, tpl["side-fix-one-thing"])) === "quest_locked",
    "side_choose refuses it until then");
  const outside = await sideSubmit(B, tpl["side-outside-circle"], "Two classmates tried it", "They found the menu");
  await approve(outside.submission_id, R2);
  bA = await board(A);
  check(sideOf(bA, "side-fix-one-thing").locked === false && sideOf(bA, "side-fix-one-thing").missing_slugs.length === 0,
    "a teammate's approved side quest unlocks the next one for the project");
  check(sideOf(bA, "side-outside-circle").approved === true && sideOf(bA, "side-outside-circle").mine === null,
    "and stays theirs");

  // --- Repeatable ----------------------------------------------------------------------------------------
  const f1 = await sideSubmit(A, tpl["side-fix-one-thing"], "Moved the button", "It was hidden");
  await approve(f1.submission_id);
  const f2 = await sideSubmit(A, tpl["side-fix-one-thing"], "Renamed the menu", "Nobody read it");
  check(f2.created === true && f2.instance_id !== f1.instance_id, "a repeatable side quest can be done again", f2);
  bA = await board(A);
  check(sideOf(bA, "side-fix-one-thing").mine.instance_id === f2.instance_id &&
      sideOf(bA, "side-fix-one-thing").mine.state === "submitted" && sideOf(bA, "side-fix-one-thing").approved === true,
    "mine is the newest quest; approved stays true");

  // --- Declined, then try again ----------------------------------------------------------------------
  const r1 = await sideSubmit(A, tpl["side-readme"], "README link", "A friend ran it");
  await call(bot, "shift_quest_review_decide", R1, r1.submission_id, "declined", "Add the install step", false);
  bA = await board(A);
  const readme = sideOf(bA, "side-readme");
  check(readme.mine.state === "declined" && readme.mine.latest_review.outcome === "declined" &&
      readme.mine.latest_review.feedback === "Add the install step" && readme.approved === false && readme.locked === false,
    "a declined side quest shows the feedback", readme.mine);
  const r2 = await sideSubmit(A, tpl["side-readme"], "README with install steps", "The friend got further");
  check(r2.created === true && r2.instance_id !== r1.instance_id && r2.revision === 1,
    "a declined non-repeatable side quest can be tried again", r2);
  check((await scalar(db, "select state from public.shift_quest_instances where id = $1", [r1.instance_id])) === "archived",
    "the declined quest is archived, so the bot's not_repeatable rule lets the new one in");
  check(sideOf(await board(A), "side-readme").mine.instance_id === r2.instance_id, "mine is the new one");

  // --- Appealed ----------------------------------------------------------------------------------------
  const d1 = await sideSubmit(A, tpl["side-demo-three-minutes"], "Slides link", "They liked the problem part");
  await call(bot, "shift_quest_review_decide", R1, d1.submission_id, "declined", "Record the rehearsal", false);
  await call(bot, "shift_quest_appeal", A, d1.instance_id, "I rehearsed it for two people");
  check(sideOf(await board(A), "side-demo-three-minutes").mine.state === "appealed", "an appeal shows on the board");
  check(await code(sideSubmit(A, tpl["side-demo-three-minutes"])) === "quest_appealed",
    "a side quest under appeal is not submitted again");
  const dChosen = await call(web, "shift_quest_side_choose", A, tpl["side-demo-three-minutes"]);
  check(dChosen.instance_id === d1.instance_id && dChosen.created === false, "side_choose returns the appealed quest", dChosen);

  // --- Paused, then submitted ---------------------------------------------------------------------------
  const c1 = await call(web, "shift_quest_side_choose", A, tpl["side-clear-offer"]);
  check(c1.created === true && c1.version === 1 &&
      (await scalar(db, "select state from public.shift_quest_instances where id = $1", [c1.instance_id])) === "active",
    "side_choose starts a quest without submitting", c1);
  const rest = await call(web, "shift_quest_rest", A, true);
  check(rest.paused >= 1 && sideOf(await board(A), "side-clear-offer").mine.state === "paused", "rest pauses it", rest);
  const c2 = await sideSubmit(A, tpl["side-clear-offer"], "One page", "Rewrote the first line");
  check(c2.created === false && c2.instance_id === c1.instance_id && c2.revision === 1 &&
      (await scalar(db, "select state from public.shift_quest_instances where id = $1", [c1.instance_id])) === "submitted",
    "side_submit resumes a paused quest and submits it", c2);

  // --- Two presses at once make one quest -------------------------------------------------------------
  // The first press stays uncommitted while the second starts on another
  // connection; without the side-quest lock the second would file a second quest.
  await web.query("begin");
  const firstPress = await sideSubmit(A, tpl["side-review-a-friend"], "Feedback link", "My own menu is confusing too");
  const secondPress = sideSubmit(A, tpl["side-review-a-friend"], "Feedback link again", "Same", null, web2)
    .catch((e) => ({ error: (e as Error).message }));
  await sleep(300);
  await web.query("commit");
  const second: Json = await secondPress;
  check(firstPress.created === true && second.created === false && second.instance_id === firstPress.instance_id &&
      second.revision === 2,
    "two presses at once file one quest (the second becomes revision 2)", [firstPress, second]);

  // --- Proposed quests and help -----------------------------------------------------------------------
  const own1: string = await call(web, "shift_quest_propose", A, "Own quest one", null, "Goal one", "Criteria one", "Step one");
  const own2: string = await call(web, "shift_quest_propose", A, "Own quest two", "It matters", "Goal two", "Criteria two", "Step two");
  bA = await board(A);
  check(bA.proposed.map((p: Json) => p.instance_id).join(",") === `${own2},${own1}`, "proposed quests, newest first", bA.proposed);
  const p0 = bA.proposed[1];
  check(keys(p0) === "criteria,goal,instance_id,latest_review,latest_submission,state,title,updated_at,version" &&
      p0.title === "Own quest one" && p0.goal === "Goal one" && p0.criteria === "Criteria one" && p0.state === "active" &&
      p0.version === 1 && p0.latest_submission === null,
    "a proposed quest's shape", p0);
  await call(web, "shift_quest_submit", A, own1, 1, "Evidence", "Reflection", null, "reviewers", null, []);
  bA = await board(A);
  check(bA.proposed.find((p: Json) => p.instance_id === own1).state === "submitted" &&
      bA.proposed.find((p: Json) => p.instance_id === own1).latest_submission.revision === 1,
    "the website submits a proposed quest");
  check(!JSON.stringify([bA.main, bA.side]).includes(own1), "proposed quests stay out of the main and side lanes");

  const help1: string = await call(web, "shift_quest_help_create", A, "Stuck on deploy", "community", "student", r2.instance_id);
  const help2: string = await call(web, "shift_quest_help_create", A, "Not sure what to fix", "mentors", "student", null);
  bA = await board(A);
  const h1 = bA.help_open.find((h: Json) => h.id === help1);
  check(h1 && keys(h1) === "created_at,id,instance_id,status,visibility" && h1.instance_id === r2.instance_id &&
      h1.status === "open" && h1.visibility === "community" &&
      bA.help_open.find((h: Json) => h.id === help2)?.visibility === "mentors",
    "open help requests are on the board", bA.help_open);
  await call(bot, "shift_quest_help_update", R1, help1, "resolve", "Fixed together");
  bA = await board(A);
  check(!bA.help_open.some((h: Json) => h.id === help1) && bA.help_open.some((h: Json) => h.id === help2),
    "a resolved request leaves the board");

  // --- Privacy: a board never carries another student's work ------------------------------------------
  const cm2 = await call(web, "shift_quest_milestone_submit", C, 2, "C proof", "C learned", null);
  await approve(cm2.submission_id);
  const cSide = await sideSubmit(C, tpl["side-thirty-second-cut"], "C clip", "C cut the intro");
  const cOwn: string = await call(web, "shift_quest_propose", C, "C own quest", null, "C goal", "C criteria", "C step");
  const cHelp: string = await call(web, "shift_quest_help_create", C, "C is stuck", "community", "student", null);
  const aText = JSON.stringify(await board(A));
  const cIds = [cm2.instance_id, cSide.instance_id, cOwn, cHelp, p2, C, NAMES[C]];
  check(!cIds.some((s) => aText.includes(s)), "A's board has none of C's quests, help, project, ID or name");
  const cText = JSON.stringify(await board(C));
  const aIds = [s1.instance_id, f1.instance_id, f2.instance_id, r2.instance_id, own1, own2, help2, p1, A, NAMES[A]];
  check(!aIds.some((s) => cText.includes(s)), "C's board has none of A's");
  check(![ADMIN, R1, R2, A, B, C, D].some((s) => aText.includes(s)), "no Discord ID is on a board");

  // --- Refusals -----------------------------------------------------------------------------------------
  const lessons = () => count(
    "select count(*) from public.shift_quest_instances where template_id = $1", [tpl["side-share-a-lesson"]]);
  check(await code(sideSubmit(A, tpl["side-share-a-lesson"], "x".repeat(2001))) === "text_too_long", "proof is at most 2000 characters");
  check(await code(sideSubmit(A, tpl["side-share-a-lesson"], "p", "x".repeat(2001))) === "text_too_long",
    "the reflection is at most 2000 characters");
  check(await code(sideSubmit(A, tpl["side-share-a-lesson"], "p", "  ")) === "missing_text", "the reflection is required");
  check(await code(sideSubmit(A, tpl["side-share-a-lesson"], "p", "r", "http://example.org")) === "bad_url", "links are https");
  check((await lessons()) === 0, "a refused submit leaves no quest behind");

  const draftId = await scalar<string>(db, `
    insert into public.shift_quest_templates (slug, title, purpose, routes, examples, evidence_criteria,
      reflection_prompt, support_options, status, sort_order, side)
    values ('side-test-draft', 'Draft', 'Draft', 'all', 'x', 'x', 'x', 'x', 'draft', 999, true) returning id`);
  check(await code(sideSubmit(A, draftId)) === "template_unavailable" &&
      await code(call(web, "shift_quest_side_choose", A, draftId)) === "template_unavailable",
    "a draft side quest is unavailable");
  check(await code(call(web, "shift_quest_side_choose", A, mainOf(bA, 1).template_id)) === "template_unavailable",
    "a main quest is not a side quest");
  check(await code(sideSubmit(A, randomUUID())) === "template_unavailable", "an unknown template is unavailable");
  await call(bot, "shift_quest_admin_template_state", ADMIN, "side-share-a-lesson", false);
  check(!(await board(A)).side.some((s: Json) => s.slug === "side-share-a-lesson") &&
      await code(sideSubmit(A, tpl["side-share-a-lesson"])) === "template_unavailable",
    "a retired side quest leaves the board and cannot be started");
  await call(bot, "shift_quest_admin_template_state", ADMIN, "side-share-a-lesson", true);
  const lesson = await sideSubmit(A, tpl["side-share-a-lesson"], "Post link", "Start smaller");
  check(lesson.created === true, "published again, it works");

  // --- Starting a main quest from the board ------------------------------------------------------------
  const st4 = await call<Json>(web, "shift_quest_milestone_start", A, 4);
  check(st4.created === true && typeof st4.instance_id === "string" && typeof st4.version === "number" &&
      (await scalar(db, "select state from public.shift_quest_instances where id = $1", [st4.instance_id])) === "active",
    "milestone_start opens the main quest without submitting", st4);
  bA = await board(A);
  check(mainOf(bA, 4).in_flight?.mine === true && mainOf(bA, 4).in_flight.state === "active" &&
      mainOf(bA, 4).mine?.instance_id === st4.instance_id,
    "it is the caller's active quest on the board", mainOf(bA, 4));
  check(mainOf(await board(B), 4).in_flight?.mine === false, "a teammate sees it held");
  check(await code(call(web, "shift_quest_milestone_start", B, 4)) === "milestone_open",
    "a teammate cannot start it again");
  const st4again = await call<Json>(web, "shift_quest_milestone_start", A, 4);
  check(st4again.created === false && st4again.instance_id === st4.instance_id, "starting twice returns the same quest");
  check(await code(call(web, "shift_quest_milestone_start", D, 4)) === "no_project", "starting needs a project");

  // --- Resume one paused quest -------------------------------------------------------------------------
  await call(web, "shift_quest_rest", A, true);
  const own2State = () => scalar<string>(db, "select state from public.shift_quest_instances where id = $1", [own2]);
  check((await own2State()) === "paused", "rest pauses a proposed quest too");
  check(await code(call(web, "shift_quest_submit", A, own2, null, "e", "r", null, "reviewers", null, [])) === "bad_state",
    "a paused proposed quest cannot be submitted as it is");
  check(await code(call(web, "shift_quest_resume", B, own2)) === "not_found", "nobody else can resume it");
  const resumed = await call<number>(web, "shift_quest_resume", A, own2);
  check(typeof resumed === "number" && (await own2State()) === "active", "resume wakes that one quest", resumed);
  check(await code(call(web, "shift_quest_resume", A, own2)) === "bad_state", "resuming an active quest is refused");
  check((await scalar(db, "select state from public.shift_quest_instances where id = $1", [st4.instance_id])) === "paused",
    "and leaves the other paused quests alone");
  const st4resumed = await call<Json>(web, "shift_quest_milestone_start", A, 4);
  check(st4resumed.created === false && st4resumed.instance_id === st4.instance_id &&
      (await scalar(db, "select state from public.shift_quest_instances where id = $1", [st4.instance_id])) === "active",
    "starting a paused main quest resumes it");
  await call(web, "shift_quest_submit", A, own2, resumed, "Evidence two", "Reflection two", null, "reviewers", null, []);
  check((await own2State()) === "submitted", "a resumed proposed quest can be submitted");
  const ms4 = await call<Json>(web, "shift_quest_milestone_submit", A, 4, "Proof four", "Learned four", null);
  check(ms4.created === false && ms4.instance_id === st4.instance_id && ms4.revision === 1,
    "submitting a started main quest reuses it", ms4);

  // --- A teammate's approval never strands the caller's own open side quest ---------------------------
  const aCut = await call<Json>(web, "shift_quest_side_choose", A, tpl["side-thirty-second-cut"]);
  const bCut = await sideSubmit(B, tpl["side-thirty-second-cut"], "B clip", "B cut the intro");
  await approve(bCut.submission_id);
  const aCutSent = await sideSubmit(A, tpl["side-thirty-second-cut"], "A clip", "A cut the ending");
  check(aCutSent.created === false && aCutSent.instance_id === aCut.instance_id,
    "after a teammate's approval the caller can still submit their own open quest", aCutSent);
  const cutA = sideOf(await board(A), "side-thirty-second-cut");
  check(cutA.approved === true && cutA.mine?.state === "submitted", "the board shows it approved and the caller's as sent", cutA);
  check(await code(call(web, "shift_quest_side_choose", B, tpl["side-thirty-second-cut"])) === "quest_done",
    "a new quest of it is still refused once approved");

  // --- Caps on posts into shared channels -----------------------------------------------------------
  const aHelp = () => count(
    "select count(*) from public.shift_quest_help_requests h join public.shift_quest_members m on m.id = h.member_id " +
    "where m.discord_user_id = $1", [A]);
  const h3: string = await call(web, "shift_quest_help_create", A, "Third", "community", "student", null);
  const h4: string = await call(web, "shift_quest_help_create", A, "Fourth", "community", "student", null);
  check(await code(call(web, "shift_quest_help_create", A, "Fifth", "community", "student", null)) === "too_many_open",
    "three open help requests are the most at once");
  check(await code(call(bot, "shift_quest_help_create", A, "Fifth", "mentors", "student", null)) === "too_many_open",
    "the bot shares the cap");
  for (const h of [h3, h4]) await call(bot, "shift_quest_help_update", R1, h, "resolve", "Answered");
  await call(web, "shift_quest_help_create", A, "Fifth", "community", "student", null);
  check(await code(call(web, "shift_quest_help_create", A, "Sixth", "community", "student", null)) === "too_many_open",
    "and five in an hour");
  check((await aHelp()) === 5, "a refused request stores nothing", await aHelp());
  check(typeof (await call(web, "shift_quest_help_create", C, "C again", "community", "student", null)) === "string",
    "the cap is per student");

  const aOwn = () => count(
    "select count(*) from public.shift_quest_instances i join public.shift_quest_members m on m.id = i.member_id " +
    "where m.discord_user_id = $1 and i.template_id is null", [A]);
  for (const n of [3, 4, 5]) await call(web, "shift_quest_propose", A, `Own quest ${n}`, null, "G", "C", "N");
  check(await code(call(web, "shift_quest_propose", A, "Own quest 6", null, "G", "C", "N")) === "too_many_open",
    "five open proposed quests a mentor has not agreed yet are the most at once");
  check((await aOwn()) === 5, "a refused proposal stores nothing", await aOwn());

  // --- A side quest belongs to the project --------------------------------------------------------------
  await approve(r2.submission_id);
  const p3: string = await call(web, "shift_quest_project_create", A, "Board Three", "software", null);
  const a2 = await call<Json>(web, "shift_quest_milestone_submit", A, 2, "Proof two again", "Learned again", null);
  await approve(a2.submission_id);
  bA = await board(A);
  const readmeP3 = sideOf(bA, "side-readme");
  check(bA.project.id === p3 && readmeP3.locked === false && readmeP3.approved === false && readmeP3.mine === null,
    "in a new project a side quest done in the last one is open again", readmeP3);
  const readme3 = await call<Json>(web, "shift_quest_side_choose", A, tpl["side-readme"]);
  check(readme3.created === true, "and it can be started there (not_repeatable counts this project only)", readme3);
  const readme3Sent = await sideSubmit(A, tpl["side-readme"], "README for project three", "Wrote it faster");
  check(readme3Sent.created === false && readme3Sent.instance_id === readme3.instance_id, "and submitted", readme3Sent);

  console.log(`\n${passes} passed, ${failures} failed`);
  await Promise.all([db.end(), bot.end(), web.end(), web2.end()]);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
