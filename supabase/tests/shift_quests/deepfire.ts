/**
 * SHIFT High Island: the deep fire (กองไฟโฟกัส), a room of your own for deep
 * work (20261120120000_shift_quest_deep_fire, schema 22).
 *   * the lobby setting: /admin channel kind:deepfire is shift_quest_admin_set
 *     key 'deepfire_channel' (admins only, a snowflake, trimmed, empty or
 *     null clears it, audited), shown in shift_quest_admin_status as
 *     deepfire_channel_id and in the website's admin status as a yes/no only;
 *   * the heartbeat: shift_quest_deepfire_beat(guild, ready) is the bot's
 *     only, records (guild, the setting now, ready, beat_at) in one row and
 *     returns {channel_id} only;
 *   * the read: shift_quest_deepfire(actor) is the website's only, refuses
 *     not_started like the campfire, and is live only while the lobby is set,
 *     the last beat named that lobby, said ready, and is under 3 minutes old;
 *   * nothing per person: one state row with no person in it, no count, no
 *     name, no Discord user id anywhere in the answers;
 *   * the grants: definer functions with a pinned search_path; the new table
 *     has row level security on, no policies, and no grant but service_role's.
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

// Synthetic Discord ids, guild and channels.
const ADMIN = "991200000000000001";
const R1 = "991200000000000002"; // a reviewer, not an admin
const A = "992200000000000001"; // a student who reads the deep fire
const PENDING = "992200000000000002"; // known, has not finished /start, holds no role
const NOBODY = "992299999999999999";
const NAMES: Record<string, string> = { [ADMIN]: "Deep Admin", [R1]: "Deep Reviewer", [A]: "Deep Aye" };
const GUILD = "993200000000000001";
const LOBBY = "994200000000000001"; // the deep fire's lobby voice channel
const LOBBY2 = "994200000000000002"; // the lobby after staff change it
const HELP = "994200000000000009"; // another channel setting, left alone

const BEAT = "shift_quest_deepfire_beat(text,boolean)";
const READER = "shift_quest_deepfire(text)";
const TABLE = "shift_quest_deepfire_state";

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

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures, the clock, inspection
  const bot = await connect(botUrl!); // shift_quest_bot: as Discord runs it
  const web = await connect(webUrl!); // shift_quest_web: the website

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const adminSet = (value: string | null, actor = ADMIN) =>
    call<Json>(bot, "shift_quest_admin_set", actor, "deepfire_channel", value);
  const status = () => call<Json>(bot, "shift_quest_admin_status", ADMIN);
  const beat = (ready: boolean | null, guild: string | null = GUILD) =>
    call<Json>(bot, "shift_quest_deepfire_beat", guild, ready);
  const read = (who: string | null = A) => call<Json>(web, "shift_quest_deepfire", who);
  const state = async (): Promise<Json> => (await db.query(`select * from public.${TABLE}`)).rows[0];
  /** Moves the last beat back in time, as only the clock could. */
  const beatAgo = (interval: string) =>
    db.query(`update public.${TABLE} set beat_at = now() - $1::interval where id`, [interval]);

  // --- Schema, privileges, row security ----------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 22,
    "the bot reads schema 22 or later (the deep fire)");
  check(Number(await call(web, "shift_quest_schema_version")) === LATEST_SCHEMA, "the website reads the same version");

  for (const fn of [BEAT, READER]) {
    const g: Json = (await db.query(
      `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
              has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web,
              has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
              has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
              has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') as service_role,
              p.proacl is null or exists (
                select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'
              ) as public,
              p.prosecdef as definer, p.provolatile as volatility, format_type(p.prorettype, null) as returns,
              coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
       from pg_proc p where p.oid = $1::regprocedure`,
      [`public.${fn}`],
    )).rows[0];
    const reader = fn === READER;
    check(g.bot === !reader && g.web === reader && g.anon === false && g.authenticated === false &&
        g.public === false && g.service_role === true && g.definer === true && g.pinned === true && g.returns === "jsonb",
      `${fn}: security definer, pinned search_path, returns jsonb, ${reader ? "the website's only" : "the bot's only"}`, g);
    if (reader) check(g.volatility === "s", `${fn} is STABLE (a read)`, g.volatility);
  }
  check((await sqlstate(web.query("select public.shift_quest_deepfire_beat($1, true)", [GUILD]))) === "42501",
    "the website cannot beat for the bot (42501)");
  check((await sqlstate(bot.query("select public.shift_quest_deepfire($1)", [A]))) === "42501",
    "the bot cannot call the website's read (42501)");
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(db.query("select public.shift_quest_deepfire_beat($1, true)", [GUILD]))) === "42501", `${r} cannot beat`);
    check((await sqlstate(db.query("select public.shift_quest_deepfire($1)", [A]))) === "42501", `${r} cannot read the deep fire`);
    check((await sqlstate(db.query(`select * from public.${TABLE}`))) === "42501", `${r} cannot read ${TABLE}`);
    await db.query("reset role");
  }

  const table: Json = (await db.query(
    "select c.relrowsecurity as rls, c.relforcerowsecurity as force, " +
    "(select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies, " +
    "obj_description(c.oid, 'pg_class') as comment " +
    "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = $1", [TABLE],
  )).rows[0];
  check(table?.rls === true && table.policies === 0, `${TABLE} has row level security on and no policies`, table);
  check(/no person/i.test(table?.comment ?? "") && /no history/i.test(table?.comment ?? ""),
    `${TABLE} says it keeps no person and no history`, table?.comment);
  for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
    const has = await scalar<boolean>(db,
      `select has_table_privilege($1, 'public.${TABLE}', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')`, [role]);
    check(has === false, `${role} holds no privilege on ${TABLE}`);
  }
  check(await scalar<boolean>(db, `select has_table_privilege('service_role', 'public.${TABLE}', 'SELECT, INSERT, UPDATE, DELETE')`),
    `service_role keeps its table grant on ${TABLE}, as on every quest table`);
  check((await sqlstate(web.query(`select * from public.${TABLE}`))) === "42501", `the website cannot read ${TABLE} directly (42501)`);
  check((await sqlstate(bot.query(`update public.${TABLE} set ready = true`))) === "42501", `the bot cannot write ${TABLE} directly (42501)`);
  const columns = (await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position",
    [TABLE],
  )).rows.map((r) => r.column_name).join(",");
  check(columns === "id,guild_id,channel_id,ready,beat_at",
    "the state is the heartbeat only: no member, no Discord user id, no room, no time anyone sat anywhere", columns);
  check(await count(`select count(*) from public.${TABLE}`) === 1, "the state is one row");
  check(await count(`select count(*) from pg_constraint where contype = 'f' and conrelid = 'public.${TABLE}'::regclass`) === 0,
    "the state links to nothing (no foreign key)");
  const fresh = await state();
  check(fresh.guild_id === null && fresh.channel_id === null && fresh.ready === false && fresh.beat_at === null,
    "before any beat: no guild, no lobby, not ready, never beaten", fresh);
  const col: Json = (await db.query(
    "select data_type, is_nullable, column_default from information_schema.columns " +
    "where table_schema = 'public' and table_name = 'shift_quest_settings' and column_name = 'deepfire_channel_id'")).rows[0];
  check(col?.data_type === "text" && col.is_nullable === "YES" && col.column_default === null,
    "shift_quest_settings.deepfire_channel_id: text, nullable, no default", col);
  check(!/deepfire|deep_fire/.test(String(await scalar(db,
      "select string_agg(table_name, ',') from information_schema.tables where table_schema = 'public' and table_name like 'shift\\_quest\\_%' and table_name <> $1",
      [TABLE]))),
    "no other deep fire table (no rooms, no sessions)");

  // --- Fixtures ----------------------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  await call(web, "shift_quest_start", A, NAMES[A], false);
  await db.query("insert into public.shift_quest_members (discord_user_id, display_name) values ($1, 'Deep Pending')", [PENDING]);
  await call(bot, "shift_quest_admin_set", ADMIN, "help_channel", HELP);

  // --- The lobby setting (/admin channel kind:deepfire) --------------------------------------------------------
  let st = await status();
  check("deepfire_channel_id" in st.settings && st.settings.deepfire_channel_id === null,
    "admin_status shows deepfire_channel_id, null while unset", st.settings);
  const audits = () => count("select count(*) from public.shift_quest_audit where action = 'settings_deepfire_channel'");
  st = await adminSet(` ${LOBBY} `);
  check(st.settings.deepfire_channel_id === LOBBY && await audits() === 1,
    "an admin sets the lobby (trimmed); admin_set answers with the status; it is audited", st.settings);
  check(st.settings.help_channel_id === HELP && st.settings.coworking_channel_id === null && st.settings.news_channel_id === null,
    "the other channels are untouched", st.settings);
  for (const bad of ["#deep-fire", "<#994200000000000001>", "1234", "9".repeat(30), "not-a-snowflake"]) {
    check(await code(adminSet(bad)) === "bad_input", `the lobby refuses ${JSON.stringify(bad)}`);
  }
  check((await status()).settings.deepfire_channel_id === LOBBY && await audits() === 1, "a refused value changes nothing and is not audited");
  check(await code(adminSet(LOBBY2, R1)) === "not_authorized", "a reviewer cannot set the lobby (admins only)");
  check(await code(adminSet(LOBBY2, A)) === "not_authorized", "a student cannot set the lobby");
  check(await code(adminSet(LOBBY2, NOBODY)) === "not_authorized", "an unknown actor cannot set the lobby");
  check((await status()).settings.deepfire_channel_id === LOBBY, "and none of them changed it");
  check((await sqlstate(web.query("select public.shift_quest_admin_set($1, 'deepfire_channel', $2)", [ADMIN, LOBBY2]))) === "42501",
    "the website cannot set it (channels stay with /admin channel in Discord)");
  check(await code(call(web, "shift_quest_admin_setting", ADMIN, "deepfire_channel", LOBBY2)) === "bad_input",
    "nor through the website's admin setting");
  st = await adminSet("");
  check(st.settings.deepfire_channel_id === null && await audits() === 2, "an empty value clears it (audited)", st.settings);
  await adminSet(LOBBY);
  st = await adminSet(null);
  check(st.settings.deepfire_channel_id === null && await audits() === 4, "a null value clears it too", st.settings);
  check(await count("select count(*) from public.shift_quest_outbox where channel_key = 'deepfire'") === 0,
    "no outbox message ever waits for the lobby");

  // The website's admin status: set or not, never the id.
  let ws = await call<Json>(web, "shift_quest_admin_web_status", ADMIN);
  check(ws.settings?.deepfire_channel === false && !("deepfire_channel_id" in ws.settings),
    "the website's admin status shows deepfire_channel: false while unset", ws.settings);
  await adminSet(LOBBY);
  ws = await call<Json>(web, "shift_quest_admin_web_status", ADMIN);
  check(ws.settings?.deepfire_channel === true && !JSON.stringify(ws).includes(LOBBY),
    "once set in Discord, the website sees deepfire_channel: true and never the id", ws.settings);
  await adminSet(null);

  // --- Who may read ----------------------------------------------------------------------------------------------
  check(await code(read(NOBODY)) === "not_started", "an unknown actor is not_started");
  check(await code(read(null)) === "not_started", "a null actor is not_started");
  check(await code(read(PENDING)) === "not_started", "a member who has not finished /start and holds no role is not_started");
  check(await code(read(ADMIN)) === "ok", "staff read it like the campfire");
  check(await code(read(R1)) === "ok", "a reviewer who never ran /start reads it (they hold a role)");
  check(await code(read(A)) === "ok", "a started student reads it");

  // --- No lobby set ------------------------------------------------------------------------------------------------
  let r = await read();
  check(keys(r) === "channel_id,guild_id,live" && r.channel_id === null && r.guild_id === null && r.live === false,
    "unset, never beaten: {channel_id: null, guild_id: null, live: false}", r);
  let b = await beat(true);
  check(keys(b) === "channel_id" && b.channel_id === null, "unset: the heartbeat answers {channel_id: null} only", b);
  let s = await state();
  check(s.guild_id === GUILD && s.channel_id === null && s.ready === true && s.beat_at instanceof Date,
    "the heartbeat records the guild, the (null) setting, ready and the time", s);
  r = await read();
  check(r.channel_id === null && r.guild_id === GUILD && r.live === false, "unset: never live, even with a fresh ready beat", r);

  // --- The lobby is set ----------------------------------------------------------------------------------------------
  await adminSet(LOBBY);
  r = await read();
  check(r.channel_id === LOBBY && r.live === false, "set, but the last beat named no lobby: not live yet", r);
  b = await beat(true);
  check(keys(b) === "channel_id" && b.channel_id === LOBBY, "the heartbeat answers the lobby", b);
  s = await state();
  check(s.channel_id === LOBBY && s.ready === true && s.guild_id === GUILD, "the state holds the lobby the bot was told", s);
  r = await read();
  check(r.channel_id === LOBBY && r.guild_id === GUILD && r.live === true, "set, a ready beat for that lobby just now: live", r);
  const text = JSON.stringify(r);
  check(![A, ADMIN, R1, PENDING, NAMES[A], NAMES[ADMIN]].some((x) => text.includes(x)) && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(text),
    "the read carries no member, Discord user id, name or uuid", text);

  // Ready.
  await beat(false);
  r = await read();
  check(r.live === false && r.channel_id === LOBBY && r.guild_id === GUILD,
    "a beat that says not ready (the bot lacks its permissions): not live, the button greys", r);
  await beat(null);
  check((await state()).ready === false && (await read()).live === false, "a null ready counts as not ready (fail closed)");
  await beat(true);
  check((await read()).live === true, "ready again: live again");

  // The 3 minutes.
  await beatAgo("2 minutes 50 seconds");
  check((await read()).live === true, "a ready beat 2 minutes 50 seconds old: still live");
  await beatAgo("3 minutes 1 second");
  check((await read()).live === false, "a ready beat over 3 minutes old: not live (the bot stopped)");
  await beatAgo("1 hour");
  check((await read()).live === false, "an hour old: not live");
  await beat(true);
  check((await read()).live === true, "a fresh beat: live again");

  // The lobby changes after the beat.
  await adminSet(LOBBY2);
  r = await read();
  check(r.channel_id === LOBBY2 && r.live === false,
    "staff change the lobby: the new lobby, not live until the bot beats for it (its ready was about the old one)", r);
  b = await beat(true);
  check(b.channel_id === LOBBY2 && (await state()).channel_id === LOBBY2, "the next beat answers and records the new lobby", b);
  check((await read()).live === true, "and the new lobby is live");
  await adminSet(LOBBY);
  await beat(true);

  // The guild.
  check(await code(beat(true, "not-a-snowflake")) === "invalid", "a guild id that is not a snowflake is refused ('invalid')");
  check(await code(beat(true, "1234")) === "invalid", "a short guild id too");
  s = await state();
  check(s.guild_id === GUILD && s.channel_id === LOBBY, "a refused beat records nothing", s);
  await beat(true, null);
  r = await read();
  check(r.guild_id === null && r.channel_id === LOBBY && r.live === true,
    "a beat with no guild: guild_id null (the website falls back to its own guild id), still live", r);
  await beat(true);
  check((await read()).guild_id === GUILD, "the guild again once the bot knows it");

  // Clearing the lobby.
  await adminSet("");
  r = await read();
  check(r.channel_id === null && r.live === false, "clearing the lobby: no channel, not live, even with a fresh ready beat", r);
  b = await beat(true);
  check(b.channel_id === null && (await state()).channel_id === null,
    "the next beat tells the bot there is no lobby (it stops building rooms)", b);

  // --- Nothing else moves ------------------------------------------------------------------------------------------------
  const voice = await db.query("select * from public.shift_quest_voice_state");
  check(voice.rows.length === 1 && voice.rows[0].beat_at === null && voice.rows[0].channel_id === null,
    "the deep fire's beats never touch the campfire's heartbeat", voice.rows[0]);
  check(await count("select count(*) from public.shift_quest_voice_presence") === 0,
    "and store no voice presence");
  check(await count(`select count(*) from public.${TABLE}`) === 1, "still one state row after every beat");
  check(await count("select count(*) from public.shift_quest_members") === 4, "no member was created by a read or a beat");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
