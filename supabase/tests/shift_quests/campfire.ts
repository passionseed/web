/**
 * SHIFT High Island on the web: the coworking campfire
 * (20261111093000_shift_quest_campfire). Voice updates, syncs and heartbeats
 * go through shift_quest_bot, as the quest bot sends them from the Discord
 * gateway; every read goes through shift_quest_web, as the website makes it.
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
const ADMIN = "650000000000000001";
const A = "650000000000000002"; // a student who reads the campfire
const PENDING = "650000000000000003"; // known, has not finished /start, holds no role
const NOBODY = "659999999999999999";
const GUILD = "660000000000000001";
const CH1 = "670000000000000001"; // the coworking voice channel
const CH2 = "670000000000000002"; // the coworking channel after an admin change
const OTHER = "670000000000000009"; // any other voice channel
const U1 = "680000000000000001";
const U2 = "680000000000000002";
const U3 = "680000000000000003";
const U4 = "680000000000000004";
const U5 = "680000000000000005";
const PEOPLE = [U1, U2, U3, U4, U5];

const WRITERS = [
  "shift_quest_voice_set(text,text,text,text)",
  "shift_quest_voice_sync(text,text,text[],text[])",
  "shift_quest_voice_beat(text)",
];
const READER = "shift_quest_campfire(text,boolean)";
const TABLES = ["shift_quest_voice_presence", "shift_quest_voice_state"];

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
  const bot = await connect(botUrl!); // shift_quest_bot: the gateway's voice updates
  const bot2 = await connect(botUrl!); // a second bot connection for the lock
  const web = await connect(webUrl!); // shift_quest_web: every read, as the website makes it

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const stored = () => count("select count(*) from public.shift_quest_voice_presence");
  const row = async (id: string): Promise<Json | undefined> =>
    (await db.query("select * from public.shift_quest_voice_presence where discord_user_id = $1", [id])).rows[0];
  const state = async (): Promise<Json> => (await db.query("select * from public.shift_quest_voice_state")).rows[0];
  const set = (user: string, channel: string | null, name: string | null = null, guild: string | null = GUILD) =>
    call<boolean>(bot, "shift_quest_voice_set", guild, user, channel, name);
  const sync = (channel: string | null, ids: (string | null)[], names: (string | null)[], guild: string | null = GUILD) =>
    call<number>(bot, "shift_quest_voice_sync", guild, channel, ids, names);
  const beat = (guild: string | null = GUILD) => call<string | null>(bot, "shift_quest_voice_beat", guild);
  const read = (who: string | null = A, names = false) => call<Json>(web, "shift_quest_campfire", who, names);
  const coworking = (value: string | null) => call(bot, "shift_quest_admin_set", ADMIN, "coworking_channel", value);
  const joinedAt = async (id: string) => (await row(id))?.joined_at?.toISOString();

  // --- Schema, privileges, row security ------------------------------------------------
  check(Number(await call(web, "shift_quest_schema_version")) === 7, "the website reads schema version 7");
  check(Number(await call(bot, "shift_quest_schema_version")) === 7, "the bot reads schema version 7 (the campfire starts from 7)");

  for (const fn of [...WRITERS, READER]) {
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
    const reader = fn === READER;
    check(grants.bot === !reader && grants.web === reader && grants.anon === false && grants.authenticated === false &&
        grants.public === false && grants.service_role === true && grants.definer === true && grants.pinned === true,
      `${fn}: security definer with a pinned search_path, ${reader ? "the website's only" : "the bot's only"}`, grants);
    if (reader) check(grants.volatility === "s", `${fn} is STABLE (a read)`, grants.volatility);
  }

  check((await sqlstate(call(bot, "shift_quest_campfire", A, true))) === "42501", "the bot cannot read the campfire (42501)");
  check((await sqlstate(web.query("select public.shift_quest_voice_set($1, $2, $3, 'x')", [GUILD, U1, CH1]))) === "42501",
    "the website cannot store a voice update (42501)");
  check((await sqlstate(web.query("select public.shift_quest_voice_sync($1, null, '{}'::text[], '{}'::text[])", [GUILD]))) === "42501",
    "the website cannot sync (42501)");
  check((await sqlstate(web.query("select public.shift_quest_voice_beat($1)", [GUILD]))) === "42501",
    "the website cannot beat (42501)");
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_campfire", A, true))) === "42501", `${r} cannot read the campfire`);
    check((await sqlstate(call(db, "shift_quest_voice_set", GUILD, U1, CH1, "x"))) === "42501", `${r} cannot store a voice update`);
    check((await sqlstate(call(db, "shift_quest_voice_sync", GUILD, null, [], []))) === "42501", `${r} cannot sync`);
    check((await sqlstate(call(db, "shift_quest_voice_beat", GUILD))) === "42501", `${r} cannot beat`);
    for (const t of TABLES) {
      check((await sqlstate(db.query(`select * from public.${t}`))) === "42501", `${r} cannot read ${t}`);
    }
    await db.query("reset role");
  }

  for (const t of TABLES) {
    const table: Json = (await db.query(
      "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies, " +
      "obj_description(c.oid, 'pg_class') as comment " +
      "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = $1", [t]
    )).rows[0];
    check(table?.rls === true && table.policies === 0, `${t} has row level security on and no policies`, table);
    check(/live presence in the coworking voice channel only/.test(table?.comment ?? "") &&
        /no history/.test(table?.comment ?? ""),
      `${t} says it keeps live presence only, with no history`, table?.comment);
    for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
      const has = await scalar<boolean>(db,
        `select has_table_privilege($1, 'public.${t}', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')`, [role]);
      check(has === false, `${role} holds no privilege on ${t}`);
    }
    check(await scalar<boolean>(db, `select has_table_privilege('service_role', 'public.${t}', 'SELECT, INSERT, UPDATE, DELETE')`),
      `service_role keeps its table grant on ${t}, as on every quest table`);
    check((await sqlstate(web.query(`select * from public.${t}`))) === "42501", `the website cannot read ${t} directly (42501)`);
    check((await sqlstate(bot.query(`delete from public.${t}`))) === "42501", `the bot cannot write ${t} directly (42501)`);
  }
  const columns = async (t: string) => (await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position", [t]
  )).rows.map((r) => r.column_name).join(",");
  check(await columns("shift_quest_voice_presence") === "discord_user_id,channel_id,display_name,joined_at",
    "presence holds who, which channel, the display name and joined_at only", await columns("shift_quest_voice_presence"));
  check(await columns("shift_quest_voice_state") === "id,guild_id,channel_id,beat_at", "the state is the heartbeat only");
  check(await count("select count(*) from public.shift_quest_voice_state") === 1, "the state is one row");
  const fks = await count(
    "select count(*) from pg_constraint where contype = 'f' and conrelid in " +
    "('public.shift_quest_voice_presence'::regclass, 'public.shift_quest_voice_state'::regclass)");
  check(fks === 0, "presence never links to members, projects or plots (no foreign key)");

  // --- Who may read ----------------------------------------------------------------------------
  await call(db, "shift_quest_bootstrap_admin", ADMIN, "Fire Admin");
  await call(web, "shift_quest_start", A, "Fire Aye", false);
  await db.query("insert into public.shift_quest_members (discord_user_id, display_name) values ($1, 'Fire Pending')", [PENDING]);
  check(await code(read(NOBODY)) === "not_started", "an unknown actor is not_started");
  check(await code(read(null)) === "not_started", "a null actor is not_started");
  check(await code(read(PENDING)) === "not_started", "a member who has not finished /start and holds no role is not_started");
  check(await code(read(ADMIN)) === "ok", "staff read it like the island map");

  // --- No coworking channel ----------------------------------------------------------------------
  const unset = await read(A, true);
  check(keys(unset) === "channel_id,count,guild_id,live,names" && unset.channel_id === null && unset.live === false &&
      unset.count === 0 && JSON.stringify(unset.names) === "[]",
    "unset: no channel, not live, count 0, names []", unset);
  check((await read(A, false)).names === null, "names are null when not asked");
  check(await set(U1, CH1, "Aye") === false && await stored() === 0, "unset: a voice update returns false and stores nothing");
  check(await sync(CH1, [U1, U2], ["Aye", "Bee"]) === 0 && await stored() === 0, "unset: a sync stores nothing (0)");
  check(await beat() === null, "unset: the heartbeat returns null");
  check((await read()).live === false, "unset: never live, even with a fresh beat");

  // --- The coworking channel is set ---------------------------------------------------------------
  await coworking(CH1);
  const before = await read(A, true);
  check(before.channel_id === CH1 && before.live === false && before.count === 0,
    "set but never synced: the channel, not live yet", before);
  check(await set(U1, OTHER, "Aye") === false && await stored() === 0, "another voice channel is never stored");
  check(await set(U1, CH1, "  Aye  ") === true, "joining the coworking channel returns true");
  const r1 = await row(U1);
  check(r1?.channel_id === CH1 && r1.display_name === "Aye", "stored with the channel and the trimmed name", r1);
  check((await read()).count === 0, "a voice update alone does not make it live: the bot must sync the channel");

  // --- Sync -----------------------------------------------------------------------------------------
  await db.query("update public.shift_quest_voice_presence set joined_at = now() - interval '10 minutes' where discord_user_id = $1", [U1]);
  const u1Joined = await joinedAt(U1);
  const n1 = await sync(CH1, [U2, U1, "not-a-snowflake", null, U2], ["Bee", "Aye again", "Bad", "Null", "Bee twice"]);
  check(n1 === 2, "a sync stores the list: invalid ids skipped, a repeated id once", n1);
  check(await joinedAt(U1) === u1Joined, "a sync keeps joined_at for someone already there", [u1Joined, await joinedAt(U1)]);
  check((await row(U1))?.display_name === "Aye again" && (await row(U2))?.display_name === "Bee",
    "a sync refreshes names; a repeated id keeps its first name", [await row(U1), await row(U2)]);
  const st1 = await state();
  check(st1.guild_id === GUILD && st1.channel_id === CH1 && st1.beat_at instanceof Date, "a sync records the heartbeat", st1);
  const live1 = await read(A, true);
  check(live1.live === true && live1.count === 2 && live1.guild_id === GUILD && live1.channel_id === CH1,
    "synced and fresh: live with the count", live1);
  check(JSON.stringify(live1.names) === JSON.stringify(["Aye again", "Bee"]), "names in joined_at order", live1.names);

  // --- Join, rename, leave, move out -----------------------------------------------------------------
  check(await set(U3, CH1, "Cee") === true && (await read()).count === 3, "a join adds one");
  const u3Joined = await joinedAt(U3);
  await sleep(20);
  check(await set(U3, CH1, "Cee renamed") === true && await joinedAt(U3) === u3Joined &&
      (await row(U3))?.display_name === "Cee renamed",
    "a rename in the same channel keeps joined_at");
  check(await set(U3, null) === false && await row(U3) === undefined, "leaving voice deletes the row");
  check(await set(U2, OTHER, "Bee") === false && await row(U2) === undefined, "moving to another channel deletes the row");
  check((await read()).count === 1, "the count follows");
  check(await set(U3, null) === false, "leaving twice is harmless");

  // --- Display names ---------------------------------------------------------------------------------
  await set(U4, CH1, "   ");
  check((await row(U4))?.display_name === null, "a blank name is stored as null");
  await set(U4, CH1, "x".repeat(120));
  check((await row(U4))?.display_name === "x".repeat(80), "a long name is cut to 80");
  await set(U4, CH1, null);
  check((await row(U4))?.display_name === null, "no name is null");

  // --- Bad input --------------------------------------------------------------------------------------
  const snowflakes = (n: number) => Array.from({ length: n }, (_, i) => String(BigInt("690000000000000000") + BigInt(i)));
  for (const [label, run] of [
    ["a user id that is not a snowflake", () => set("not-a-snowflake", CH1, "x")],
    ["a null user id", () => call(bot, "shift_quest_voice_set", GUILD, null, CH1, "x")],
    ["a guild id that is not a snowflake (update)", () => set(U5, CH1, "x", "guild")],
    ["a channel id that is not a snowflake (update)", () => set(U5, "channel", "x")],
    ["arrays of different lengths", () => sync(CH1, [U1, U4], ["Aye"])],
    ["names missing for a list", () => call(bot, "shift_quest_voice_sync", GUILD, CH1, [U1], null)],
    ["more than 200 people", () => sync(CH1, snowflakes(201), snowflakes(201).map(() => "x"))],
    ["a guild id that is not a snowflake (sync)", () => sync(CH1, [], [], "guild")],
    ["a channel id that is not a snowflake (sync)", () => sync("channel", [], [])],
    ["a guild id that is not a snowflake (beat)", () => beat("guild")],
  ] as [string, () => Promise<unknown>][]) {
    check(await code(run()) === "invalid", `refused: ${label} (invalid)`);
  }
  check(await stored() === 2 && await row(U5) === undefined, "a refused call changes nothing");

  // --- Sync replaces atomically ----------------------------------------------------------------------
  await bot.query("begin");
  const n2 = await sync(CH1, [U5, U1], ["Eee", "Aye"]);
  check(n2 === 2, "the sync returns the new count", n2);
  check(await row(U5) === undefined && (await row(U4)) !== undefined, "another connection sees the old list until the sync commits");
  let waited = false;
  const update = call(bot2, "shift_quest_voice_set", GUILD, U3, CH1, "Cee").then((r) => { waited = true; return r; });
  await sleep(300);
  check(!waited, "a voice update waits for the sync's lock");
  await bot.query("commit");
  check(await update === true, "and then applies after it");
  check(await row(U4) === undefined && (await row(U5))?.display_name === "Eee" && await joinedAt(U1) === u1Joined &&
      await stored() === 3,
    "the sync replaced the list (U4 gone, U5 in, U1 kept with its joined_at), the update came after it");

  // --- Names and order -----------------------------------------------------------------------------------
  await db.query("update public.shift_quest_voice_presence set joined_at = now() - interval '1 minute' where discord_user_id = $1", [U3]);
  await db.query("update public.shift_quest_voice_presence set joined_at = now() - interval '5 minutes', display_name = null where discord_user_id = $1", [U5]);
  const named = await read(A, true);
  check(JSON.stringify(named.names) === JSON.stringify(["Aye", null, "Cee"]),
    "names ordered by joined_at, a null name kept as null", named.names);
  const plain = await read(A, false);
  check(plain.names === null && plain.count === 3 && plain.live === true, "names only when asked; the count either way", plain);
  const text = JSON.stringify(named);
  check(!PEOPLE.some((id) => text.includes(id)), "the read never carries a Discord user id", text);
  check(!/\d{4}-\d{2}-\d{2}T\d{2}:/.test(text), "the read never carries joined_at", text);

  // --- Staleness ---------------------------------------------------------------------------------------------
  await db.query("update public.shift_quest_voice_state set beat_at = now() - interval '2 minutes'");
  check((await read()).live === true, "a beat 2 minutes ago is still live");
  await db.query("update public.shift_quest_voice_state set beat_at = now() - interval '3 minutes 1 second'");
  const stale = await read(A, true);
  check(stale.live === false && stale.count === 0 && JSON.stringify(stale.names) === "[]" && stale.channel_id === CH1,
    "no beat for 3 minutes: not live, count 0, names []", stale);
  check(await beat() === CH1, "the heartbeat returns the coworking channel");
  check(await stored() === 3 && (await read()).count === 3, "a beat on the same channel keeps everyone and is live again");

  // --- The admin changes the channel ----------------------------------------------------------------------
  await coworking(CH2);
  check((await read()).live === false && (await read()).channel_id === CH2,
    "after the change: the new channel, not live until the bot syncs it");
  check(await set(U4, CH1, "Dee") === false && await row(U4) === undefined, "the old channel is no longer stored");
  check(await beat() === CH2, "the heartbeat returns the new channel id");
  check(await stored() === 0, "the heartbeat deleted the old channel's rows");
  check((await state()).channel_id === null && (await read()).live === false, "and forgot the old synced channel");
  check(await sync(CH1, [U1], ["Aye"]) === 0 && await stored() === 0, "a sync of the wrong channel clears everything (0)");
  check(await sync(CH2, [U1, U2], ["Aye", "Bee"]) === 2, "a sync of the new channel stores it");
  check((await read()).live === true && (await read()).count === 2, "live again on the new channel");

  // --- Clean stop, and the setting cleared ---------------------------------------------------------------------
  check(await sync(null, [], []) === 0 && await stored() === 0, "a sync with no channel (a clean stop) clears everything");
  check((await state()).channel_id === null && (await read()).live === false, "and the campfire is not live");
  await sync(CH2, [U1], ["Aye"]);
  await coworking(null);
  const cleared = await read(A, true);
  check(cleared.channel_id === null && cleared.live === false && cleared.count === 0, "the setting cleared: no channel", cleared);
  check(await beat() === null && await stored() === 0, "the heartbeat returns null and deletes every row");

  // --- At most 50 names ------------------------------------------------------------------------------------------
  await coworking(CH1);
  const many = snowflakes(60);
  check(await sync(CH1, many, many.map((_, i) => `Person ${i}`)) === 60, "a sync of 60 stores 60");
  const crowd = await read(A, true);
  check(crowd.count === 60 && crowd.names.length === 50, "the count is everyone, the names at most 50", [crowd.count, crowd.names.length]);
  check(await sync(CH1, snowflakes(200), snowflakes(200).map(() => null)) === 200, "200 people is the most a sync takes");

  // --- The purge that needs no bot ---------------------------------------------------------------------------------
  const PURGE = "shift_quest__voice_purge()";
  for (const role of ["shift_quest_bot", "shift_quest_web", "anon", "authenticated"]) {
    check(await scalar<boolean>(db, "select has_function_privilege($1, $2::regprocedure, 'EXECUTE')", [role, `public.${PURGE}`]) === false,
      `${role} cannot run the purge`);
  }
  check((await sqlstate(bot.query(`select public.${PURGE}`))) === "42501", "the bot cannot purge (42501)");
  check((await sqlstate(web.query(`select public.${PURGE}`))) === "42501", "the website cannot purge (42501)");
  await db.query("update public.shift_quest_voice_state set beat_at = now() - interval '9 minutes'");
  check(Number(await call(db, "shift_quest__voice_purge")) === 0 && await stored() === 200,
    "a beat 9 minutes ago: the purge keeps everyone (the bot may still come back)");
  await db.query("update public.shift_quest_voice_state set beat_at = now() - interval '10 minutes 1 second'");
  check(Number(await call(db, "shift_quest__voice_purge")) === 200 && await stored() === 0,
    "no beat for 10 minutes (the bot died without its clean stop): the purge deletes every row");
  await db.query("update public.shift_quest_voice_state set beat_at = null");
  await sync(CH1, [U1], ["Aye"]);
  await db.query("update public.shift_quest_voice_state set beat_at = null");
  check(Number(await call(db, "shift_quest__voice_purge")) === 1 && await stored() === 0, "no beat at all: the purge deletes every row");

  console.log(`\n${passes} passed, ${failures} failed`);
  await Promise.all([db.end(), bot.end(), bot2.end(), web.end()]);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
