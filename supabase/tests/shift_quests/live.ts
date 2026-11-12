/**
 * SHIFT High Island in Discord: the live island post and the suggestions
 * channel (20261111094000_shift_quest_live). The live post's reads and writes
 * go through shift_quest_bot, as the quest bot's live loop makes them; the
 * menu links read goes through shift_quest_web, as the website makes it;
 * settings go through shift_quest_bot, as /admin channel sends them.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { Client } from "pg";

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
const ADMIN = "710000000000000001";
const R1 = "720000000000000001"; // a reviewer
const A = "730000000000000001"; // project one, with B
const B = "730000000000000002";
const C = "730000000000000003"; // project two
const D = "730000000000000004"; // project three
const E = "730000000000000005"; // project four
const PENDING = "730000000000000008"; // known, has not finished /start, holds no role
const NOBODY = "739999999999999999";
const GUILD = "740000000000000001";
const LIVE1 = "750000000000000001"; // the live text channel
const LIVE2 = "750000000000000002"; // the live channel after an admin change
const SUGGEST = "750000000000000009"; // the suggestions forum
const VOICE = "760000000000000001"; // the coworking voice channel
const VOICE2 = "760000000000000002";
const U1 = "770000000000000001"; // people in voice
const U2 = "770000000000000002";
const U3 = "770000000000000003";
const M1 = "780000000000000001"; // live post message ids
const M2 = "780000000000000002";
const M3 = "780000000000000003";
const M4 = "780000000000000004";
const M5 = "780000000000000005";
const M6 = "780000000000000006";
const M7 = "780000000000000007";
const M8 = "780000000000000008";
const NAMES: Record<string, string> = {
  [ADMIN]: "Live Admin", [R1]: "Live Rev", [A]: "Live Aye", [B]: "Live Bee", [C]: "Live Cee", [D]: "Live Dee", [E]: "Live Eee",
};
const VOICE_NAMES = ["Voice Una", "Voice Ubu", "Voice Ucu"];

const LIVE_READER = "shift_quest_live_post()";
const LIVE_WRITER = "shift_quest_live_mark(text,text,text)";
const LINKS = "shift_quest_island_links(text)";
const POST_KEYS = "approved,campfire,channel_id,coworking_channel_id,goal,message_id,plots,season,trees";

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
  const bot = await connect(botUrl!); // shift_quest_bot: the live loop, /admin, students in Discord
  const bot2 = await connect(botUrl!); // a second bot process (an overlapping deploy)
  const web = await connect(webUrl!); // shift_quest_web: the island page's menu

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const post = () => call<Json>(bot, "shift_quest_live_post");
  const postMap = () => call<Json>(bot, "shift_quest_island_post_map");
  const mark = (channel: string | null, message: string | null, previous: string | null, c: Client = bot) =>
    call<string | null>(c, "shift_quest_live_mark", channel, message, previous);
  const state = async (): Promise<Json> => (await db.query("select * from public.shift_quest_live_state")).rows[0];
  const setting = (key: string, value: string | null, actor = ADMIN) => call<Json>(bot, "shift_quest_admin_set", actor, key, value);
  const links = (who: string | null = A) => call<Json>(web, "shift_quest_island_links", who);
  const campfire = () => call<Json>(web, "shift_quest_campfire", A, false);
  /** A Bangkok calendar day relative to today, as YYYY-MM-DD. */
  const day = (offset: number) =>
    scalar<string>(db, "select ((now() at time zone 'Asia/Bangkok')::date + $1::int)::text", [offset]);

  // --- Schema, privileges, row security ------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === 9, "the bot reads schema version 9 (the live post starts from 8)");
  check(Number(await call(web, "shift_quest_schema_version")) === 9, "the website reads schema version 9 (it needs 6 or more)");

  for (const fn of [LIVE_READER, LIVE_WRITER, LINKS]) {
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
              coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
       from pg_proc p where p.oid = $1::regprocedure`,
      [`public.${fn}`],
    )).rows[0];
    const website = fn === LINKS;
    check(grants.bot === !website && grants.web === website && grants.anon === false && grants.authenticated === false &&
        grants.public === false && grants.service_role === true && grants.definer === true && grants.pinned === true,
      `${fn}: security definer with a pinned search_path, ${website ? "the website's only" : "the bot's only"}`, grants);
    check(grants.volatility === (fn === LIVE_WRITER ? "v" : "s"), `${fn} is ${fn === LIVE_WRITER ? "VOLATILE (a write)" : "STABLE (a read)"}`,
      grants.volatility);
  }
  check((await sqlstate(call(web, "shift_quest_live_post"))) === "42501", "the website cannot read the live post (42501)");
  check((await sqlstate(call(web, "shift_quest_live_mark", LIVE1, M1, null))) === "42501", "the website cannot record the live post (42501)");
  check((await sqlstate(call(bot, "shift_quest_island_links", A))) === "42501", "the bot cannot read the website's menu links (42501)");
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_live_post"))) === "42501", `${r} cannot read the live post`);
    check((await sqlstate(call(db, "shift_quest_live_mark", LIVE1, M1, null))) === "42501", `${r} cannot record the live post`);
    check((await sqlstate(call(db, "shift_quest_island_links", A))) === "42501", `${r} cannot read the menu links`);
    check((await sqlstate(db.query("select * from public.shift_quest_live_state"))) === "42501", `${r} cannot read shift_quest_live_state`);
    await db.query("reset role");
  }

  const table: Json = (await db.query(
    "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies, " +
    "obj_description(c.oid, 'pg_class') as comment " +
    "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'shift_quest_live_state'"
  )).rows[0];
  check(table?.rls === true && table.policies === 0, "shift_quest_live_state has row level security on and no policies", table);
  check(/channel and message id only/.test(table?.comment ?? "") && /no history/.test(table?.comment ?? ""),
    "shift_quest_live_state says it keeps the post's channel and message id only", table?.comment);
  for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
    const has = await scalar<boolean>(db,
      "select has_table_privilege($1, 'public.shift_quest_live_state', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')", [role]);
    check(has === false, `${role} holds no privilege on shift_quest_live_state`);
  }
  check(await scalar<boolean>(db, "select has_table_privilege('service_role', 'public.shift_quest_live_state', 'SELECT, INSERT, UPDATE, DELETE')"),
    "service_role keeps its table grant on shift_quest_live_state, as on every quest table");
  check((await sqlstate(bot.query("update public.shift_quest_live_state set message_id = null"))) === "42501",
    "the bot cannot write shift_quest_live_state directly (42501)");
  check((await sqlstate(web.query("select * from public.shift_quest_live_state"))) === "42501",
    "the website cannot read shift_quest_live_state directly (42501)");
  const columns = async (t: string) => (await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position", [t]
  )).rows.map((r) => r.column_name);
  check((await columns("shift_quest_live_state")).join(",") === "id,channel_id,message_id,updated_at",
    "the state is the post's channel, its message id and when it changed, nothing else", await columns("shift_quest_live_state"));
  check(await count("select count(*) from public.shift_quest_live_state") === 1, "the state is one row");
  const settingCols: Json[] = (await db.query(
    "select column_name, is_nullable, column_default from information_schema.columns " +
    "where table_schema = 'public' and table_name = 'shift_quest_settings' and column_name in ('live_channel_id', 'suggest_channel_id') " +
    "order by column_name"
  )).rows;
  check(settingCols.length === 2 && settingCols.every((c) => c.is_nullable === "YES" && c.column_default === null),
    "shift_quest_settings has live_channel_id and suggest_channel_id, nullable with no default", settingCols);
  check((await code(db.query("update public.shift_quest_live_state set message_id = 'not-a-snowflake'"))).includes("check constraint") &&
      (await code(db.query("update public.shift_quest_live_state set channel_id = '12'"))).includes("check constraint"),
    "the state refuses a channel or message id that is not a snowflake");

  // --- Fixtures ------------------------------------------------------------------------------
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of [A, B, C, D, E]) await call(bot, "shift_quest_start", id, NAMES[id], false);
  await db.query("insert into public.shift_quest_members (discord_user_id, display_name) values ($1, 'Live Pending')", [PENDING]);
  /** Submits a milestone for the student and has R1 approve it. */
  const reach = async (who: string, milestone: number) => {
    const s = await call(bot, "shift_quest_milestone_submit", who, milestone, `Proof ${milestone}`, `Learned ${milestone}`, null);
    await call(bot, "shift_quest_review_decide", R1, s.submission_id, "approved", null, false);
  };
  const optin = (who: string, project: string) => call(bot, "shift_quest_island_optin", who, project, true);

  // --- /admin channel live and suggest ----------------------------------------------------------
  let status = await call<Json>(bot, "shift_quest_admin_status", ADMIN);
  check("live_channel_id" in status.settings && "suggest_channel_id" in status.settings &&
      status.settings.live_channel_id === null && status.settings.suggest_channel_id === null,
    "the admin status lists the live and suggestion channels, unset", status.settings);
  check(await code(setting("live_channel", LIVE1, A)) === "not_authorized", "only admins set the live channel");
  check(await code(setting("suggest_channel", SUGGEST, R1)) === "not_authorized", "only admins set the suggestion channel");
  status = await setting("live_channel", LIVE1);
  check(status.settings.live_channel_id === LIVE1, "an admin sets the live channel; the status shows it", status.settings);
  status = await setting("suggest_channel", ` ${SUGGEST} `);
  check(status.settings.suggest_channel_id === SUGGEST && status.settings.live_channel_id === LIVE1,
    "an admin sets the suggestion channel (trimmed); the status shows both", status.settings);
  for (const [key, value] of [
    ["live_channel", "not-a-snowflake"], ["live_channel", "1234"], ["suggest_channel", "<#750000000000000009>"],
    ["suggest_channel", "x".repeat(30)],
  ]) {
    check(await code(setting(key, value)) === "bad_input", `${key} refuses ${JSON.stringify(value.slice(0, 24))} (bad_input)`);
  }
  status = await call<Json>(bot, "shift_quest_admin_status", ADMIN);
  check(status.settings.live_channel_id === LIVE1 && status.settings.suggest_channel_id === SUGGEST, "a refused value changes nothing");
  check(await count("select count(*) from public.shift_quest_audit where action in ('settings_live_channel', 'settings_suggest_channel')") === 2,
    "each accepted change is audited once");
  status = await setting("suggest_channel", "");
  check(status.settings.suggest_channel_id === null && status.settings.live_channel_id === LIVE1, "an empty value clears the suggestion channel");
  status = await setting("live_channel", null);
  check(status.settings.live_channel_id === null, "a null value clears the live channel");
  status = await setting("live_channel", "   ");
  check(status.settings.live_channel_id === null, "a blank value clears it too");
  check(status.settings.sharing_enabled === false && status.settings.help_channel_id === null &&
      status.settings.coworking_channel_id === null,
    "the other settings are untouched", status.settings);

  // --- The live post with no live channel ------------------------------------------------------
  let p = await post();
  check(keys(p) === POST_KEYS, "the live post's shape", keys(p));
  check(p.channel_id === null && p.message_id === null && p.coworking_channel_id === null,
    "no live channel: channel_id and message_id null (the bot posts nothing)", p);
  check(JSON.stringify(p.plots) === "[]" && p.trees === 0 && p.approved === 0 && p.goal === null && p.season === null,
    "an empty island: no plots, 0 trees, approved 0, no goal, no season", p);
  check(keys(p.campfire) === "count,live" && p.campfire.live === false && p.campfire.count === 0,
    "no coworking channel: the campfire is not live, count 0", p.campfire);

  // --- Plots, consent and the approved total ------------------------------------------------------
  // approved counts only the trees every member agreed to show, so it is always the sum of the stages
  // the picture shows: a total over quiet projects would give their stages away as teams opt in.
  const shownStages = (x: Json) => x.plots.reduce((n: number, plot: Json) => n + plot.stage, 0);
  const p1: string = await call(bot, "shift_quest_project_create", A, "Live One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(bot, "shift_quest_project_respond", B, p1, true);
  await reach(A, 1);
  await reach(B, 2);
  const p2: string = await call(bot, "shift_quest_project_create", C, "Live Two", "creative", null);
  await reach(C, 1);
  p = await post();
  check(p.trees === 2 && p.approved === 0, "two quiet trees with approvals: approved is 0 (none shown)", [p.trees, p.approved]);

  const p3: string = await call(bot, "shift_quest_project_create", D, "Live Three", "service", null);
  p = await post();
  let pm = await postMap();
  check(JSON.stringify(p.plots) === JSON.stringify(pm.plots) && JSON.stringify(p.goal) === JSON.stringify(pm.goal) &&
      JSON.stringify(p.season) === JSON.stringify(pm.season),
    "plots, goal and season are exactly the weekly post's map", { live: p.plots, post: pm.plots });
  check(p.plots.map((x: Json) => x.slot).join(",") === "1,2,3", "plots by slot", p.plots);
  check(p.plots.every((x: Json) => x.plain === true && x.stage === 0 && x.name === null && !x.mine && !x.visitor && !x.key),
    "without consent every plot is a plain slot: no stage, no name", p.plots);
  check(p.trees === 3 && p.approved === 0,
    "three trees with 3 approvals between them, none consented: approved is 0, never the quiet total", [p.trees, p.approved]);

  await optin(A, p1);
  await optin(B, p1);
  p = await post();
  const one = p.plots.find((x: Json) => x.slot === 1);
  check(one.name === "Live One" && one.stage === 2 && one.plain === false, "a fully consented plot shows its name and stage", one);
  check(p.plots.filter((x: Json) => x.slot !== 1).every((x: Json) => x.plain && x.stage === 0 && x.name === null),
    "the others stay plain", p.plots);
  check(p.approved === 2 && shownStages(p) === 2,
    "one consented project: approved is its stage only, what the picture shows", [p.approved, shownStages(p)]);

  // The review's sequence: each opt-in may add only the stage that team now shows, so comparing
  // one edit with the next never tells anything about the projects still quiet.
  const p4: string = await call(bot, "shift_quest_project_create", E, "Live Four", "other", null);
  await reach(E, 1);
  await reach(E, 3);
  p = await post();
  check(p.trees === 4 && p.approved === 2 && shownStages(p) === 2,
    "a new quiet tree with 2 approvals: approved unchanged (2), the quiet stages stay out", [p.trees, p.approved]);
  await optin(C, p2);
  p = await post();
  check(p.approved === 3 && shownStages(p) === 3,
    "Live Two opts in: approved grows by its own shown stage (1) only", [p.approved, shownStages(p)]);
  await reach(D, 1);
  p = await post();
  check(p.approved === 3, "an approval on a quiet project does not move the total", p.approved);
  await optin(D, p3);
  p = await post();
  check(p.approved === 4 && shownStages(p) === 4, "Live Three opts in: + its stage (1)", [p.approved, shownStages(p)]);
  check(p.plots.find((x: Json) => x.slot === 4)?.plain === true, "Live Four is still quiet");
  await optin(E, p4);
  p = await post();
  check(p.approved === 6 && shownStages(p) === 6 && p.plots.every((x: Json) => !x.plain && x.name),
    "every project consented: approved is the total the picture already shows", { approved: p.approved, shown: shownStages(p) });

  // A teammate withdraws consent: the tree goes plain and its stage leaves the total.
  await call(bot, "shift_quest_island_optin", B, p1, false);
  p = await post();
  check(p.plots.find((x: Json) => x.slot === 1)?.plain === true && p.approved === 4 && shownStages(p) === 4,
    "one teammate opts out: Live One is plain again and its stage leaves the total", [p.approved, shownStages(p)]);
  await optin(B, p1);

  await db.query("update public.shift_quest_projects set archived_at = now() where id = $1", [p4]);
  p = await post();
  check(p.trees === 3 && p.approved === 4 && shownStages(p) === 4 && !p.plots.some((x: Json) => x.slot === 4),
    "an archived project is not a tree and not counted", [p.trees, p.approved, p.plots.map((x: Json) => x.slot)]);

  // --- Goal and season, as the weekly post ---------------------------------------------------------
  await call(bot, "shift_quest_admin_season", ADMIN, "Season Live", await day(-30), await day(60), await day(14), 2, 3,
    1, 3, await day(14), "Island festival", true);
  p = await post();
  pm = await postMap();
  check(JSON.stringify(p.goal) === JSON.stringify(pm.goal) && JSON.stringify(p.season) === JSON.stringify(pm.season),
    "with a season: goal and season are the weekly post's", { live: [p.goal, p.season], post: [pm.goal, pm.season] });
  check(p.season?.name === "Season Live" && p.season.days_to_demo === 14 && p.goal?.target === 3 && p.goal.milestone === 1 &&
      typeof p.goal.count === "number",
    "the season's demo day countdown and the island goal", [p.season, p.goal]);

  // --- The campfire count -----------------------------------------------------------------------------
  await setting("coworking_channel", VOICE);
  p = await post();
  check(p.coworking_channel_id === VOICE && p.campfire.live === false && p.campfire.count === 0,
    "coworking set, never synced: not live, count 0", p);
  await call(bot, "shift_quest_voice_sync", GUILD, VOICE, [U1, U2], VOICE_NAMES.slice(0, 2));
  p = await post();
  let web1 = await campfire();
  check(p.campfire.live === true && p.campfire.count === 2 && web1.live === true && web1.count === 2,
    "synced: live with the count, the same as the website's campfire", [p.campfire, web1]);
  await call(bot, "shift_quest_voice_set", GUILD, U3, VOICE, VOICE_NAMES[2]);
  check((await post()).campfire.count === 3, "a join adds one");
  await call(bot, "shift_quest_voice_set", GUILD, U1, null, null);
  check((await post()).campfire.count === 2, "a leave takes one");
  p = await post();
  const text = JSON.stringify(p);
  check(keys(p.campfire) === "count,live" && ![U1, U2, U3, ...VOICE_NAMES].some((s) => text.includes(s)),
    "the live post never carries who is at the campfire (no names, no Discord user ids)", p.campfire);
  check(![ADMIN, R1, A, B, C, D, E, ...Object.values(NAMES)].some((s) => text.includes(s)),
    "the live post carries no member Discord id or display name", text);
  check(!text.includes("joined_at") && !/"names"/.test(text), "no joined_at, no names key");
  await db.query("update public.shift_quest_voice_state set beat_at = now() - interval '2 minutes'");
  check((await post()).campfire.live === true, "a beat 2 minutes ago is still live");
  await db.query("update public.shift_quest_voice_state set beat_at = now() - interval '3 minutes 1 second'");
  p = await post();
  web1 = await campfire();
  check(p.campfire.live === false && p.campfire.count === 0 && web1.live === false && web1.count === 0,
    "no beat for 3 minutes: not live, count 0, as on the website", [p.campfire, web1]);
  await call(bot, "shift_quest_voice_beat", GUILD);
  check((await post()).campfire.count === 2, "a fresh beat: live again");
  await setting("coworking_channel", VOICE2);
  p = await post();
  check(p.coworking_channel_id === VOICE2 && p.campfire.live === false && p.campfire.count === 0,
    "the coworking channel moved: not live until the bot syncs it", p);
  await setting("coworking_channel", "");
  p = await post();
  check(p.coworking_channel_id === null && p.campfire.live === false && p.campfire.count === 0, "coworking cleared: no campfire", p);

  // --- Recording the post (compare and set) ------------------------------------------------------------
  check(await mark(LIVE1, M1, null) === null && (await state()).message_id === null,
    "no live channel set: the mark returns null and stores nothing");
  await setting("live_channel", LIVE1);
  p = await post();
  check(p.channel_id === LIVE1 && p.message_id === null, "the live channel is set, nothing posted yet", p);
  check(await mark(LIVE1, M1, null) === M1, "the first post is stored and wins");
  let st = await state();
  check(st.channel_id === LIVE1 && st.message_id === M1 && st.updated_at instanceof Date, "the state holds the channel and the post", st);
  check((await post()).message_id === M1, "the live post returns the stored message id (a restart edits it)");
  check(await mark(LIVE1, M2, null) === M1 && (await state()).message_id === M1,
    "a second process that read no id gets the first one back and stores nothing (it deletes its own post)");
  check(await mark(LIVE1, M1, null) === M1, "adopting the stored post again returns it");
  check(await mark(LIVE1, M2, M3) === M1 && (await state()).message_id === M1, "a stale previous id changes nothing");
  check(await mark(LIVE1, M2, M1) === M2 && (await state()).message_id === M2,
    "the stored post was deleted: the replacement is stored over it");
  check(await mark(LIVE2, M3, M2) === null && (await state()).message_id === M2 && (await state()).channel_id === LIVE1,
    "another channel than the live one: null, nothing written");
  for (const [label, run] of [
    ["a null channel", () => mark(null, M3, M2)],
    ["a channel that is not a snowflake", () => mark("live", M3, M2)],
    ["a message id that is not a snowflake", () => mark(LIVE1, "not-a-message", M2)],
  ] as [string, () => Promise<unknown>][]) {
    check(await code(run()) === "invalid", `refused: ${label} (invalid)`);
  }
  check((await state()).message_id === M2, "a refused mark changes nothing");
  check(await mark(LIVE1, null, M2) === null && (await state()).message_id === null && (await post()).message_id === null,
    "a null message id with the current previous clears the post");
  check(await mark(LIVE1, M4, null) === M4, "and the next post is stored");

  // Two processes at once: the second waits for the first's lock, then sees its post.
  await bot.query("begin");
  check(await mark(LIVE1, M5, M4) === M5, "the first process stores its post in a transaction");
  let waited = false;
  const other = mark(LIVE1, M6, M4, bot2).then((r) => { waited = true; return r; });
  await sleep(300);
  check(!waited, "a second mark waits for the first's lock");
  await bot.query("commit");
  check(await other === M5 && (await state()).message_id === M5,
    "and then gets the first process's post back (it deletes its own)");

  // The admin moves the live channel.
  await setting("live_channel", LIVE2);
  p = await post();
  check(p.channel_id === LIVE2 && p.message_id === null, "the live channel moved: no stored post there, the bot posts once", p);
  check(await mark(LIVE1, M6, M5) === null && (await state()).message_id === M5, "a late mark for the old channel writes nothing");
  check(await mark(LIVE2, M7, null) === M7, "the new channel's post is stored over the old channel's");
  st = await state();
  check(st.channel_id === LIVE2 && st.message_id === M7 && (await post()).message_id === M7, "the state follows the new channel", st);
  await setting("live_channel", "");
  p = await post();
  check(p.channel_id === null && p.message_id === null, "the live channel cleared: no channel, no message id (updates stop)", p);
  check(await mark(LIVE2, M8, M7) === null && (await state()).message_id === M7, "a mark after clearing writes nothing");
  await setting("live_channel", LIVE2);
  check((await post()).message_id === M7, "setting the same channel again finds the old post (no new one)");
  check(await count("select count(*) from public.shift_quest_live_state") === 1, "still one row");

  // --- The website's menu links -------------------------------------------------------------------------
  check(await code(links(NOBODY)) === "not_started", "an unknown actor is not_started");
  check(await code(links(null)) === "not_started", "a null actor is not_started");
  check(await code(links(PENDING)) === "not_started", "a member who has not finished /start and holds no role is not_started");
  let l = await links(A);
  check(keys(l) === "suggest_channel_id" && l.suggest_channel_id === null, "unset: {suggest_channel_id: null}", l);
  await setting("suggest_channel", SUGGEST);
  l = await links(A);
  check(keys(l) === "suggest_channel_id" && l.suggest_channel_id === SUGGEST, "a ready student reads the suggestion channel", l);
  check((await links(ADMIN)).suggest_channel_id === SUGGEST, "staff read it like the island map");
  check(!JSON.stringify(l).includes(LIVE2), "the links never carry the live channel or any other setting", l);
  await setting("suggest_channel", null);
  check((await links(A)).suggest_channel_id === null, "cleared: null again (the menu hides the link)");

  console.log(`\n${passes} passed, ${failures} failed`);
  await Promise.all([db.end(), bot.end(), bot2.end(), web.end()]);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
