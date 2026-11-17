/**
 * SHIFT High Island in Discord: the nightly island news card
 * (20261118130000_shift_quest_island_news_daily, schema 19). When the card is
 * due (20:00 to 22:30 Bangkok, a stale claim until midnight), what its totals
 * count over [20:00 the day before, 20:00) and what they never carry, which AI
 * lines it may show, the claim, the compare-and-set mark, the 7-day re-check,
 * the news channel setting and the grants: the bot's functions, never the
 * website's; the helpers nobody's.
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

// Synthetic Discord IDs, names and channels.
const ADMIN = "940000000000000001";
const R1 = "940000000000000002"; // a reviewer
const A = "950000000000000001"; // project one, with B
const B = "950000000000000002";
const C = "950000000000000003"; // project two, a quiet team
const D = "950000000000000004"; // project three, archived after its approval
const E = "950000000000000005"; // project four, no AI consent at first
const F = "950000000000000006"; // no project
const NAMES: Record<string, string> = {
  [ADMIN]: "News Admin", [R1]: "News Reviewer", [A]: "News Aye", [B]: "News Bee", [C]: "News Cee", [D]: "News Dee",
  [E]: "News Eee", [F]: "News Eff",
};
const NEWS_CH = "960000000000000001";
const ROOM = "960000000000000002";
const M1 = "970000000000000001";
const M2 = "970000000000000002";
const VERSION = "island-2026-11-11";

/** A fixed Tuesday and Sunday, far from today, for the counting windows. */
const T = "2026-03-10";
const SUNDAY = "2026-03-15";

const BOT_FNS = [
  "shift_quest_news_post_next()",
  "shift_quest_news_claim(date,text)",
  "shift_quest_news_mark(date,text,text)",
  "shift_quest_news_post_current()",
];
const READS = new Set(["shift_quest_news_post_next()", "shift_quest_news_post_current()"]);
const HELPERS = [
  "shift_quest__news_at(date)",
  "shift_quest__news_due(date,timestamp with time zone)",
  "shift_quest__news_totals(date)",
  "shift_quest__news_ai(date)",
  "shift_quest__news_next(timestamp with time zone)",
];

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
const canon = (x: unknown): string =>
  JSON.stringify(x, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures, helpers and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: the card and /admin, as Discord runs them
  const web = await connect(webUrl!); // shift_quest_web: students' own flows, as the website makes them
  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const memberId = (who: string) => scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [who]);
  const due = (day: string, at: string) => scalar<boolean>(db, "select public.shift_quest__news_due($1::date, $2::timestamptz)", [day, at]);
  const totalsOf = (day: string) => scalar<Json>(db, "select public.shift_quest__news_totals($1::date)", [day]);
  const aiOf = (day: string) => scalar<Json>(db, "select public.shift_quest__news_ai($1::date)", [day]);
  const nextAt = (at: string) => scalar<Json | null>(db, "select public.shift_quest__news_next($1::timestamptz)", [at]);
  const adminSet = (key: string, value: string | null, actor = ADMIN) => call<Json>(bot, "shift_quest_admin_set", actor, key, value);
  const islandStatus = () => call<Json>(bot, "shift_quest_admin_island_status", ADMIN);
  const today: string = await scalar(db, "select public.shift_quest__bkk_today()::text");

  // --- Schema, privileges --------------------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 19,
    "the bot reads schema 19 or later (the nightly island news)");
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
            p.prosecdef as definer, p.provolatile as volatility,
            coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
     from pg_proc p where p.oid = $1::regprocedure`,
    [`public.${sig}`],
  )).rows[0];
  for (const sig of BOT_FNS) {
    const g = await fnInfo(sig);
    check(g.bot === true && g.web === false && !g.anon && !g.authenticated && !g.public && g.service_role && g.definer && g.pinned,
      `${sig}: security definer, pinned search_path, the bot's only`, g);
    check(g.volatility === (READS.has(sig) ? "s" : "v"), `${sig} is ${READS.has(sig) ? "STABLE" : "VOLATILE"}`, g.volatility);
  }
  for (const sig of HELPERS) {
    const g = await fnInfo(sig);
    check(g.bot === false && g.web === false && !g.anon && !g.authenticated && !g.public && !g.service_role && g.definer && g.pinned,
      `${sig}: a helper no login can run, service_role included`, g);
  }
  for (const [label, sql, args] of [
    ["the card's reader", "select public.shift_quest_news_post_next()", []],
    ["the claim", "select public.shift_quest_news_claim($1::date, $2)", [today, NEWS_CH]],
    ["the mark", "select public.shift_quest_news_mark($1::date, $2, $3)", [today, NEWS_CH, M1]],
    ["the re-check", "select public.shift_quest_news_post_current()", []],
  ] as [string, string, unknown[]][]) {
    check((await sqlstate(web.query(sql, args))) === "42501", `the website is refused ${label} (42501)`);
    for (const r of ["anon", "authenticated"]) {
      await db.query(`set role ${r}`);
      check((await sqlstate(db.query(sql, args))) === "42501", `${r} is refused ${label}`);
      await db.query("reset role");
    }
  }
  check((await sqlstate(bot.query("select public.shift_quest__news_totals($1::date)", [today]))) === "42501",
    "the bot cannot run a helper (42501)");
  const table: Json = (await db.query(
    "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies " +
    "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'shift_quest_news_posts'",
  )).rows[0];
  check(table?.rls === true && table.policies === 0, "shift_quest_news_posts has row level security on and no policies", table);
  for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
    const has = await scalar<boolean>(db,
      "select has_table_privilege($1, 'public.shift_quest_news_posts', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')", [role]);
    check(has === false, `${role} holds no privilege on shift_quest_news_posts`);
  }
  const col: Json = (await db.query(
    "select is_nullable, column_default from information_schema.columns " +
    "where table_schema = 'public' and table_name = 'shift_quest_settings' and column_name = 'news_channel_id'")).rows[0];
  check(col?.is_nullable === "YES" && col.column_default === null, "shift_quest_settings.news_channel_id: nullable, no default", col);
  const indexes: string[] = (await db.query(
    "select indexname from pg_indexes where schemaname = 'public' and indexname = any($1) order by 1",
    [["shift_quest_progress_tap_day", "shift_quest_submissions_approved_decided", "shift_quest_work_sessions_started"]],
  )).rows.map((r) => r.indexname);
  check(indexes.length === 3, "the totals read through their three indexes", indexes);

  // --- The news channel setting ---------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  let status = await call<Json>(bot, "shift_quest_admin_status", ADMIN);
  check("news_channel_id" in status.settings && status.settings.news_channel_id === null &&
      "live_channel_id" in status.settings && "suggest_channel_id" in status.settings,
    "admin_status shows news_channel_id (unset), and still the live and suggest channels", status.settings);
  const audits = () => count("select count(*) from public.shift_quest_audit where action = 'settings_news_channel'");
  status = await adminSet("news_channel", NEWS_CH);
  check(status.settings.news_channel_id === NEWS_CH && await audits() === 1, "an admin sets the news channel; it is audited", status.settings);
  for (const bad of ["#island-news", "123", "9".repeat(30)]) {
    check(await code(adminSet("news_channel", bad)) === "bad_input", `the news channel refuses ${JSON.stringify(bad)}`);
  }
  check((await call<Json>(bot, "shift_quest_admin_status", ADMIN)).settings.news_channel_id === NEWS_CH, "a refused value changes nothing");
  check(await code(adminSet("news_channel", NEWS_CH, R1)) === "not_authorized", "only admins set channels");
  status = await adminSet("news_channel", "");
  check(status.settings.news_channel_id === null && await audits() === 2, "an empty value clears it", status.settings);
  check(await count("select count(*) from public.shift_quest_outbox where channel_key = 'news'") === 0, "no outbox message ever waits for it");

  // --- When the card is due (fixed times) ------------------------------------------------------------------
  check(await scalar<boolean>(db, "select public.shift_quest__news_at($1::date) = '2026-03-10 20:00:00+07'::timestamptz", [T]),
    "the card is due at 20:00 Bangkok");
  for (const [at, want, why] of [
    [`${T} 19:59:59+07`, false, "19:59:59: not yet"],
    [`${T} 20:00:00+07`, true, "20:00: due"],
    [`${T} 22:29:59+07`, true, "22:29: still due"],
    [`${T} 22:30:00+07`, false, "22:30: too late for a new card"],
    [`${T} 23:59:00+07`, false, "23:59 with no claim: nothing"],
    ["2026-03-11 00:00:00+07", false, "midnight: never a catch-up"],
  ] as const) {
    check(await due(T, at) === want, `no row: ${why}`);
  }
  await db.query("insert into public.shift_quest_news_posts (day, channel_id, claimed_at) values ($1::date, $2, $3::timestamptz)",
    [T, NEWS_CH, `${T} 20:01:00+07`]);
  check(await due(T, `${T} 20:10:00+07`) === false, "a claim under 15 minutes old: not due (it is being sent)");
  check(await due(T, `${T} 20:17:00+07`) === true, "a claim over 15 minutes old with no message: due again (stale)");
  check(await due(T, `${T} 23:50:00+07`) === true, "a stale claim is recovered until midnight");
  check(await due(T, "2026-03-11 00:00:00+07") === false, "and never after midnight");
  await db.query("update public.shift_quest_news_posts set message_id = $2 where day = $1::date", [T, M1]);
  check(await due(T, `${T} 20:30:00+07`) === false && await due(T, `${T} 23:50:00+07`) === false, "a recorded message: never due again");
  await db.query("delete from public.shift_quest_news_posts where day = $1::date", [T]);

  // --- Fixtures for the totals -------------------------------------------------------------------------------
  for (const id of [A, B, C, D, E, F]) await call(web, "shift_quest_start", id, NAMES[id], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "News One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "News Two", "creative", null);
  const p3: string = await call(web, "shift_quest_project_create", D, "News Three", "service", null);
  const p4: string = await call(web, "shift_quest_project_create", E, "News Four", "other", null);
  await call(web, "shift_quest_island_optin", C, p2, false); // a quiet team
  const slotOf = async (project: string) => Number(await scalar(db, "select slot from public.shift_quest_plots where project_id = $1", [project]));
  const decide = (submission: string) => call<Json>(bot, "shift_quest_review_decide", R1, submission, "approved", null, false);
  /** A main quest submitted (as the website) and approved, its decision moved to `at` (as only the clock could). */
  const approveAt = async (who: string, milestone: number, at: string): Promise<string> => {
    const s = await call<Json>(web, "shift_quest_milestone_submit", who, milestone, "หลักฐานจากงานจริง", "สิ่งที่ได้เรียนรู้", null);
    await decide(s.submission_id);
    await db.query("update public.shift_quest_submissions set decided_at = $2::timestamptz where id = $1", [s.submission_id, at]);
    return s.instance_id;
  };
  // Project one: milestone 2 the day before the window, milestone 1 and a repeat of it inside, a side quest inside.
  await approveAt(A, 1, `${T} 10:00:00+07`);
  await approveAt(A, 2, "2026-03-09 19:00:00+07");
  const repeat = await approveAt(A, 1, `${T} 11:00:00+07`);
  const side: string = await scalar(db,
    "select id from public.shift_quest_templates where side and status = 'published' " +
    "and requires_milestones = '{}' and requires_slugs = '{}' order by sort_order limit 1");
  const ss = await call<Json>(web, "shift_quest_side_submit", A, side, "หลักฐาน", "สิ่งที่ได้เรียนรู้", null);
  await decide(ss.submission_id);
  await db.query("update public.shift_quest_submissions set decided_at = $2::timestamptz where id = $1", [ss.submission_id, `${T} 12:00:00+07`]);
  // Milestone 3 decided at exactly 20:00: the next window's.
  await approveAt(A, 3, `${T} 20:00:00+07`);
  // The quiet team and the team archived after its approval.
  await approveAt(C, 1, `${T} 13:00:00+07`);
  await approveAt(D, 1, `${T} 14:00:00+07`);
  await db.query("update public.shift_quest_projects set archived_at = now() where id = $1", [p3]);
  check(repeat.length === 36, "a repeat of milestone 1 is its own quest");

  // Check-ins at the window's edges (written directly, as only the clock could).
  const tap = async (who: string, at: string, kind = "tap") => db.query(
    "insert into public.shift_quest_progress (member_id, kind, changed, visibility, created_at) values ($1, $2, $3, 'private', $4::timestamptz)",
    [await memberId(who), kind, kind === "note" ? "a note" : null, at]);
  await tap(A, "2026-03-09 21:00:00+07"); // in (Bangkok 9 March)
  await tap(A, `${T} 19:59:59+07`); // in again (Bangkok 10 March): A counts once
  await tap(B, "2026-03-09 20:00:00+07"); // in: the window starts at 20:00
  await tap(C, "2026-03-09 19:59:59+07"); // out: the window before
  await tap(D, `${T} 20:00:00+07`); // out: the next window
  await tap(E, `${T} 12:00:00+07`, "note"); // a note is not a check-in
  await tap(F, `${T} 09:00:00+07`); // in, then erased

  // Campfire rounds started with an intention (closed sessions, so several per member fit).
  const round = async (who: string, at: string) => db.query(
    "insert into public.shift_quest_work_sessions (member_id, intention, started_at, ended_at) values ($1, 'ตั้งเป้า', $2::timestamptz, $2::timestamptz + interval '25 minutes')",
    [await memberId(who), at]);
  await round(A, `${T} 09:00:00+07`);
  await round(A, `${T} 09:30:00+07`);
  await round(B, "2026-03-09 20:00:00+07");
  await round(C, `${T} 20:00:00+07`); // the next window's
  await round(F, `${T} 10:00:00+07`); // erased below

  // --- The totals ----------------------------------------------------------------------------------------------
  let t = await totalsOf(T);
  check(keys(t) === "approved,checked_in,demo,grew,rounders,rounds",
    "the totals' keys are exactly checked_in, approved, grew, rounds, rounders and demo", t);
  check(t.checked_in === 3, "checked_in: A once (two taps), B at 20:00 sharp, F; not C before the window, not D at 20:00 after it, not a note", t);
  check(t.approved === 3, "approved (sharing off): project one's milestone 1, its repeat and its side quest; not the quiet team, not the archived one, not 20:00 sharp", t);
  check(t.grew === 1, "grew: one stage (milestone 1); its repeat, the side quest and milestone 2 decided before the window add nothing", t);
  check(t.rounds === 4, "rounds: the four started in the window, the one at 20:00 sharp is the next window's", t);
  check(t.rounders === 3, "rounders: the people behind those rounds (A's two count once), so the card floors by people", t);
  check(t.demo === null, "no active season: no Demo Day");
  const erase = (id: string) => db.query(
    "update public.shift_quest_members set erased_at = now(), discord_user_id = null, display_name = null where id = $1", [id]);
  await erase(await memberId(F));
  t = await totalsOf(T);
  check(t.checked_in === 2 && t.rounds === 3 && t.rounders === 2, "an erased member is never counted, in check-ins, rounds or rounders", t);
  await db.query("update public.shift_quest_settings set sharing_enabled = true where id");
  t = await totalsOf(T);
  check(t.approved === 4 && t.grew === 2, "sharing on: the quiet team counts too (as its tree_grew post already shows); the archived one never", t);
  await db.query("update public.shift_quest_settings set sharing_enabled = false where id");
  const next = await totalsOf("2026-03-11");
  check(next.checked_in === 1 && next.approved === 1 && next.grew === 1 && next.rounds === 1 && next.rounders === 1,
    "20:00 sharp belongs to the next day's window: D's tap, milestone 3 and C's round", next);
  const text = JSON.stringify(await totalsOf(T));
  check(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(text) && ![...Object.values(NAMES), A, B, C, "News One", "News Two", NEWS_CH].some((s) => text.includes(s)) &&
      !/slot|name|minute|time|_at/.test(text),
    "the totals carry no id, name, slot, Discord id or time", text);
  await db.query(
    "insert into public.shift_quest_seasons (name, starts_on, ends_on, demo_day, status) values ('News Season', $1::date - 10, $1::date + 10, $1::date + 5, 'active')",
    [T]);
  t = await totalsOf(T);
  check(canon(t.demo) === canon({ day: "2026-03-15", days: 5 }), "an active season: Demo Day and the days to it, counted from the card's day", t.demo);
  check(canon((await totalsOf("2026-03-15")).demo) === canon({ day: "2026-03-15", days: 0 }), "on Demo Day itself: 0 days");
  check((await totalsOf("2026-03-16")).demo === null, "after Demo Day: none");
  await db.query("delete from public.shift_quest_seasons where name = 'News Season'");

  // --- The AI section ------------------------------------------------------------------------------------------
  const [s1, s2, s4] = [await slotOf(p1), await slotOf(p2), await slotOf(p4)];
  const adult: string = await scalar(db, "select (current_date - interval '25 years')::date::text");
  for (const who of [A, B, C]) await call(web, "shift_quest_consent_adult", who, adult, VERSION);
  const summary = (day: string, kind: string, project: string, text: string | null) => db.query(
    "insert into public.shift_quest_digests (day, kind, project_id, summary, no_update, model) values ($1::date, $2, $3, $4, $5, 'm') " +
    "on conflict (day, kind, project_id) do update set summary = excluded.summary, no_update = excluded.no_update",
    [day, kind, project, text, text === null]);
  await summary(T, "day", p1, "ทีมทดสอบต้นแบบกับผู้ใช้");
  await summary(T, "day", p2, "ทีมเงียบ");
  await summary(T, "day", p4, "ทีมสี่");
  await summary(SUNDAY, "day", p1, "สรุปวันอาทิตย์");
  await summary(SUNDAY, "week", p1, "สรุปสัปดาห์");
  check(Number(await scalar(db, "select extract(isodow from $1::date)", [SUNDAY])) === 7 &&
      Number(await scalar(db, "select extract(isodow from $1::date)", [T])) === 2, "the fixture days are a Sunday and a Tuesday");
  check(canon(await aiOf(T)) === canon({ kind: "day", entries: [] }), "the AI off: no lines");
  await call(bot, "shift_quest_admin_island_set", ADMIN, "digest_enabled", "on");
  let ai = await aiOf(T);
  check(canon(ai) === canon({ kind: "day", entries: [{ slot: s1, name: "News One", summary: "ทีมทดสอบต้นแบบกับผู้ใช้" }] }),
    "only teams that pass the gate: not the quiet team, not a team without AI consent", ai);
  check(canon(await aiOf(SUNDAY)) === canon({ kind: "week", entries: [{ slot: s1, name: "News One", summary: "สรุปสัปดาห์" }] }),
    "on a Bangkok Sunday the week recap comes first");
  await db.query("update public.shift_quest_digests set summary = null, no_update = true where day = $1::date and kind = 'week'", [SUNDAY]);
  check((await aiOf(SUNDAY)).kind === "day", "a Sunday with no week recap falls back to the day");
  await call(web, "shift_quest_consent_adult", E, adult, VERSION);
  ai = await aiOf(T);
  check(JSON.stringify(ai.entries.map((x: Json) => x.slot)) === JSON.stringify([s1, s4].sort((a, b) => a - b)),
    "a team that consents joins, in plot order", ai.entries);
  check(!ai.entries.some((x: Json) => x.slot === s2), "the quiet team never");
  await call(bot, "shift_quest_digest_hide", ADMIN, s4, true, null);
  check((await aiOf(T)).entries.every((x: Json) => x.slot !== s4), "a team staff hid disappears");
  await call(bot, "shift_quest_digest_hide", ADMIN, s4, false, null);
  await db.query("update public.shift_quest_consents set state = 'withdrawn' where member_id = $1", [await memberId(B)]);
  check((await aiOf(T)).entries.every((x: Json) => x.slot !== s1), "a teammate's withdrawn consent takes the team out");
  await db.query("update public.shift_quest_consents set state = 'granted' where member_id = $1", [await memberId(B)]);
  await call(web, "shift_quest_island_optin", B, p1, false);
  check((await aiOf(T)).entries.every((x: Json) => x.slot !== s1), "a teammate who stops showing the name takes the team out");
  await call(web, "shift_quest_island_optin", B, p1, true);
  check((await aiOf(T)).entries.some((x: Json) => x.slot === s1), "and it is back once shown again");
  const aiText = JSON.stringify(await aiOf(T));
  check(![...Object.values(NAMES), A, B, p1, p4].some((s) => aiText.includes(s)), "the AI lines carry no person's name, Discord id or uuid", aiText);

  // --- What the bot reads, at fixed times ----------------------------------------------------------------------
  check(await nextAt(`${T} 20:05:00+07`) === null, "no news channel: nothing to send, even when due");
  await adminSet("news_channel", NEWS_CH);
  await adminSet("coworking_channel", ROOM);
  check(await nextAt(`${T} 19:59:00+07`) === null, "before 20:00: nothing to send");
  const n = await nextAt(`${T} 20:05:00+07`);
  check(keys(n) === "ai,channel_id,coworking_channel_id,day,totals" && n!.day === T && n!.channel_id === NEWS_CH &&
      n!.coworking_channel_id === ROOM && canon(n!.totals) === canon(await totalsOf(T)) && canon(n!.ai) === canon(await aiOf(T)),
    "due: {day, channel_id, coworking_channel_id, totals, ai}, exactly", n);
  check(await nextAt(`${T} 22:45:00+07`) === null, "22:45 with no claim: nothing (no late card)");

  // The real clock: the same rule on today's Bangkok hour.
  const minute = Number(await scalar(db,
    "select extract(hour from now() at time zone 'Asia/Bangkok') * 60 + extract(minute from now() at time zone 'Asia/Bangkok')"));
  const live = await call<Json | null>(bot, "shift_quest_news_post_next");
  if ([20 * 60, 22 * 60 + 30].some((edge) => Math.abs(minute - edge) <= 1)) {
    check(true, "the real clock is within a minute of 20:00 or 22:30: news_post_next not compared");
  } else if (minute < 20 * 60 || minute >= 22 * 60 + 30) {
    check(live === null, `news_post_next at ${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")} Bangkok: nothing to send`, live);
  } else {
    check(keys(live) === "ai,channel_id,coworking_channel_id,day,totals" && live!.day === today,
      `news_post_next at ${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")} Bangkok: today's card`, live);
  }

  // --- Claim, mark and the 7-day re-check (today) --------------------------------------------------------------
  const claim = (day: string | null = today, channel: string | null = NEWS_CH) => call<string | null>(bot, "shift_quest_news_claim", day, channel);
  const mark = (message: string, day = today) => call<string | null>(bot, "shift_quest_news_mark", day, NEWS_CH, message);
  check(await code(claim(today, "#island-news")) === "bad_input" && await code(claim(null)) === "bad_input",
    "a claim needs a day and a snowflake channel");
  check(await claim(await scalar<string>(db, "select (public.shift_quest__bkk_today() - 1)::text")) === null &&
      await claim(await scalar<string>(db, "select (public.shift_quest__bkk_today() + 1)::text")) === null,
    "only today's card is ever claimed: never yesterday's, never tomorrow's");
  check(await count("select count(*) from public.shift_quest_news_posts") === 0, "and those refusals wrote nothing");
  check(await claim() === "new", "the bot claims tonight's card before it sends");
  const row = async () => (await db.query("select * from public.shift_quest_news_posts where day = $1::date", [today])).rows[0];
  let r = await row();
  check(r?.channel_id === NEWS_CH && r.message_id === null && r.claimed_at instanceof Date &&
      keys(r.totals) === "approved,checked_in,demo,grew,rounders,rounds" && canon(r.totals) === canon(await totalsOf(today)),
    "the claim freezes tonight's totals", r);
  check(await claim() === null, "a fresh claim: nobody else sends");
  await db.query("update public.shift_quest_news_posts set claimed_at = now() - interval '20 minutes', totals = null where day = $1::date", [today]);
  check(await claim() === "stale", "a claim over 15 minutes old without a message: stale (the bot looks for its own card first)");
  r = await row();
  check(r.totals !== null && (Date.now() - new Date(r.claimed_at).getTime()) < 60_000, "a stale claim is taken again and the totals frozen again", r);
  check(await code(mark("not-a-snowflake")) === "bad_input", "mark needs snowflakes");
  check(await mark(M1) === M1, "the first mark records its message");
  check(await mark(M2) === M1, "a second process gets the first message back (compare and set)");
  check(await claim() === null, "a recorded card is never claimed again");
  check(await count("select count(*) from public.shift_quest_news_posts") === 1, "one row for the night");

  const current = () => call<Json[]>(bot, "shift_quest_news_post_current");
  await summary(today, "day", p1, "ข่าวคืนนี้ของทีม");
  await summary(today, "week", p1, "สรุปสัปดาห์ของทีม");
  await summary(today, "day", p4, "ทีมสี่วันนี้");
  await db.query("update public.shift_quest_news_posts set totals = jsonb_set(totals, '{checked_in}', '42') where day = $1::date", [today]);
  let cur = await current();
  check(cur.length === 1 && keys(cur[0]) === "ai,channel_id,coworking_channel_id,day,message_id,totals" && cur[0].message_id === M1 &&
      cur[0].day === today && cur[0].coworking_channel_id === ROOM,
    "the recorded card, as it should read now", cur);
  check(cur[0].totals.checked_in === 42, "it returns the frozen totals, not a recount", cur[0].totals);
  check(cur[0].ai.entries.length >= 1, "with tonight's AI lines", cur[0].ai);
  await call(bot, "shift_quest_admin_island_set", ADMIN, "digest_enabled", "off");
  cur = await current();
  check(cur.length === 1 && cur[0].ai.entries.length === 0 && cur[0].totals.checked_in === 42,
    "the AI switched off: the lines go, the card and its totals stay", cur);
  await call(bot, "shift_quest_admin_island_set", ADMIN, "digest_enabled", "on");
  for (const [back, message] of [[6, "970000000000000006"], [7, "970000000000000007"]] as const) {
    await db.query(
      "insert into public.shift_quest_news_posts (day, channel_id, message_id, claimed_at, posted_at, totals) " +
      "values (public.shift_quest__bkk_today() - $1::int, $2, $3, now(), now(), '{\"checked_in\": 1}')",
      [back, NEWS_CH, message]);
  }
  await db.query(
    "insert into public.shift_quest_news_posts (day, channel_id, claimed_at) values (public.shift_quest__bkk_today() - 2, $1, now())", [NEWS_CH]);
  cur = await current();
  check(JSON.stringify(cur.map((x) => x.message_id)) === JSON.stringify([M1, "970000000000000006"]),
    "the last 7 days only, newest first, and only cards with a message", cur.map((x) => x.day));

  // --- /admin island ------------------------------------------------------------------------------------------
  const island = await islandStatus();
  check(keys(island.digest) === "channel,enabled,hidden,last_day,today_summaries" && island.digest.channel === "news" &&
      island.digest.last_day === today && island.digest.today_summaries === 2,
    "/admin island: the AI goes to the news card, the last day counts the card, today's summaries count teams once", island.digest);
  await adminSet("news_channel", "");
  check((await islandStatus()).digest.channel === null,
    "the news channel cleared: the AI news goes back to the live or celebrate channel (neither is set here)");
  check(await call(bot, "shift_quest_news_post_next") === null, "and the card is never offered without a news channel");
  check(await code(call(bot, "shift_quest_admin_island_status", R1)) === "not_authorized", "/admin island is for admins only");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
