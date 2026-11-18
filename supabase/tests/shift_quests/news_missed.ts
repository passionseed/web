/**
 * SHIFT High Island in Discord: the staff note when the nightly island news
 * card did not post (20261118140000_shift_quest_island_news_missed, schema
 * 20). At fixed times: nothing before 22:30 Bangkok; after 22:30 with no card,
 * exactly one outbox row for the staff channel ({day} only); none with a card
 * or one another bot process is sending (a claim under 2 minutes old), without
 * a news or staff channel, after midnight, or when the news channel was set
 * from 22:24; never a second row. A night when every send fails, ticked as the
 * bot does (the stale claim again and again until midnight): exactly one
 * note, by 22:40. The outbox hands
 * it to the bot for the staff channel only. The grants: the bot's entry
 * point, never the website's; the helper nobody's.
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

// Synthetic Discord IDs and channels.
const ADMIN = "941000000000000001";
const STUDENT = "951000000000000001";
const NEWS_CH = "961000000000000001";
const STAFF_CH = "961000000000000002";
const HELP_CH = "961000000000000003";
const M1 = "971000000000000001";

/** Fixed Bangkok days, far from today, one per case so the dedupe keys never meet. */
const D1 = "2026-03-10"; // no card: the note
const D2 = "2026-03-11"; // a card posted
const D3 = "2026-03-12"; // a card being sent, then stalled
const D4 = "2026-03-13"; // no staff channel
const D5 = "2026-03-14"; // the news channel set after 22:30
const D6 = "2026-03-15"; // the news channel set before 22:30
const D7 = "2026-03-16"; // no news channel
const D8 = "2026-03-17"; // every send fails all night, ticks on the dot: a stale claim every 20 minutes
const D9 = "2026-03-18"; // every send fails all night, ticks drifting: a stale claim every 15 minutes
const D10 = "2026-03-19"; // the news channel set at 22:27: maybe no tick left before 22:30
const D11 = "2026-03-20"; // the news channel set at 22:23: a tick surely fell before 22:30

const BOT_FN = "shift_quest_enqueue_news_missed()";
const HELPER = "shift_quest__news_missed(timestamp with time zone)";

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

async function scalar<T = any>(c: Client, sql: string, args: unknown[] = []): Promise<T> {
  const { rows } = await c.query(sql, args);
  return Object.values(rows[0])[0] as T;
}

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures, the helper at fixed times, inspection
  const bot = await connect(botUrl!); // shift_quest_bot: as Discord runs it
  const web = await connect(webUrl!); // shift_quest_web: the website
  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  /** The check at a fixed time, as the bot's entry point runs it at now(). */
  const missedAt = async (at: string) => Number(await scalar(db, "select public.shift_quest__news_missed($1::timestamptz)", [at]));
  const notes = (day?: string) =>
    day
      ? count("select count(*) from public.shift_quest_outbox where dedupe_key = $1", [`news_missed:${day}`])
      : count("select count(*) from public.shift_quest_outbox where kind = 'news_missed'");
  const adminSet = (key: string, value: string | null) => call<Json>(bot, "shift_quest_admin_set", ADMIN, key, value);
  const card = (day: string, at: string, message: string | null) => db.query(
    "insert into public.shift_quest_news_posts (day, channel_id, message_id, claimed_at, posted_at) " +
    "values ($1::date, $2, $3, $4::timestamptz, case when $3::text is null then null else $4::timestamptz end)",
    [day, NEWS_CH, message, at]);

  // --- Schema, privileges --------------------------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 20,
    "the bot reads schema 20 or later (the missed-night note)");
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
  let g = await fnInfo(BOT_FN);
  check(g.bot === true && g.web === false && !g.anon && !g.authenticated && !g.public && g.service_role && g.definer && g.pinned,
    `${BOT_FN}: security definer, pinned search_path, the bot's only`, g);
  check(g.volatility === "v", `${BOT_FN} is VOLATILE (it queues)`, g.volatility);
  g = await fnInfo(HELPER);
  check(g.bot === false && g.web === false && !g.anon && !g.authenticated && !g.public && !g.service_role && g.definer && g.pinned,
    `${HELPER}: a helper no login can run, service_role included`, g);
  check((await sqlstate(web.query("select public.shift_quest_enqueue_news_missed()"))) === "42501",
    "the website is refused the missed-night check (42501)");
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(db.query("select public.shift_quest_enqueue_news_missed()"))) === "42501", `${r} is refused it`);
    await db.query("reset role");
  }
  check((await sqlstate(bot.query("select public.shift_quest__news_missed(now())"))) === "42501",
    "the bot cannot run the helper with a time of its choosing (42501)");
  check((await sqlstate(web.query("select public.shift_quest__news_missed(now())"))) === "42501",
    "nor can the website");

  // --- Setup: an admin, the staff channel; no news channel yet ----------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, "Missed Admin");
  await call(web, "shift_quest_start", STUDENT, "Missed Student", false);
  await adminSet("staff_channel", STAFF_CH);
  await adminSet("help_channel", HELP_CH);

  // --- No news channel: never ---------------------------------------------------------------------------------
  check(await missedAt(`${D7} 22:45:00+07`) === 0 && await notes() === 0, "no news channel: no note, even at 22:45 with no card");
  await adminSet("news_channel", NEWS_CH);

  // --- Before 22:30: nothing ---------------------------------------------------------------------------------
  for (const at of [`${D1} 00:00:00+07`, `${D1} 19:59:59+07`, `${D1} 20:05:00+07`, `${D1} 22:29:59+07`]) {
    check(await missedAt(at) === 0, `no card at ${at.slice(11, 19)} Bangkok: still time, no note`);
  }
  check(await notes() === 0, "and nothing was queued");

  // --- 22:30 with no card: exactly one note ------------------------------------------------------------------
  check(await missedAt(`${D1} 22:30:00+07`) === 1, "22:30 sharp with no card: the note is queued (1)");
  const rows = (await db.query("select * from public.shift_quest_outbox where kind = 'news_missed'")).rows;
  check(rows.length === 1, "exactly one outbox row", rows.length);
  const row = rows[0];
  check(row?.dedupe_key === `news_missed:${D1}` && row.target_kind === "channel" && row.channel_key === "staff" &&
      row.member_id === null && row.status === "pending",
    "keyed news_missed:<day>, for the staff channel slot, about no member, pending", row);
  check(JSON.stringify(row?.params) === JSON.stringify({ day: D1 }), "its params are the day and nothing else", row?.params);
  for (const at of [`${D1} 22:35:00+07`, `${D1} 23:59:59+07`]) {
    check(await missedAt(at) === 0, `a later check (${at.slice(11, 19)}) queues no second note`);
  }
  check(await notes(D1) === 1 && await notes() === 1, "still one row for the night");
  check(await missedAt(`${D2} 00:00:00+07`) === 0, "midnight: the next day, before its 22:30 (never a note about yesterday)");

  // --- The outbox delivers it to the staff channel only --------------------------------------------------------
  const claimed = (await bot.query("select * from public.shift_quest_outbox_claim(10)")).rows;
  const mine = claimed.filter((c) => c.kind === "news_missed");
  check(mine.length === 1 && mine[0].channel_id === STAFF_CH && mine[0].dm_user_id === null &&
      mine[0].member_user_id === null && mine[0].peer_user_id === null,
    "the bot claims it for the staff channel (never the news or help channel): no DM, nobody named", mine);
  await call(bot, "shift_quest_outbox_done", mine[0].id, true, null, M1, false);
  check(await scalar(db, "select status from public.shift_quest_outbox where dedupe_key = $1", [`news_missed:${D1}`]) === "sent",
    "sent once, recorded as sent");
  check(await missedAt(`${D1} 23:00:00+07`) === 0, "after it was sent: still no second note (the key stays)");

  // --- A card posted: none -------------------------------------------------------------------------------------
  await card(D2, `${D2} 20:01:00+07`, M1);
  check(await missedAt(`${D2} 22:40:00+07`) === 0 && await notes(D2) === 0, "tonight's card was posted: no note");

  // --- A card being sent by another bot process: none; the same claim minutes later, no card: the note ---------
  await card(D3, `${D3} 22:29:30+07`, null);
  check(await missedAt(`${D3} 22:31:00+07`) === 0,
    "a claim 90 seconds old (another bot process is sending it right now): no note yet");
  check(await missedAt(`${D3} 22:32:00+07`) === 1 && await notes(D3) === 1,
    "the claim is 2 minutes 30 old and no card recorded (a send takes seconds, so it failed): the note");

  // --- The bot itself on a night when every send fails (the bot lost Send Messages in the news channel) -----------
  // Each 5-minute tick does what news.ts does: shift_quest_news_post_next (shift_quest__news_due), then the claim
  // (claimed_at = now(), the stale claim again from 15 minutes on, until midnight), the send fails and the claim
  // stays, then the check. The tick's own claim is seconds old when it checks, so a "being sent" claim must not
  // hide the miss for long. On the dot the claim comes back every 20 minutes; with setInterval's drift it can come
  // back every 15, so the check must not depend on which tick reclaims.
  const failingNight = async (day: string, tickSeconds: number) => {
    const fired: string[] = [];
    let claims = 0;
    const start = Date.parse(`${day}T20:00:00+07:00`);
    for (let at = start; at < start + 4 * 3600_000; at += tickSeconds * 1000) {
      const iso = (ms: number) => new Date(ms).toISOString();
      if (await scalar<boolean>(db, "select public.shift_quest__news_due($1::date, $2::timestamptz)", [day, iso(at + 200)])) {
        claims += 1;
        await db.query(
          "insert into public.shift_quest_news_posts (day, channel_id, claimed_at) values ($1::date, $2, $3::timestamptz) " +
          "on conflict (day) do update set claimed_at = excluded.claimed_at",
          [day, NEWS_CH, iso(at + 500)]);
      }
      if (await missedAt(iso(at + 800)) === 1) fired.push(new Date(at + 7 * 3600_000).toISOString().slice(11, 19));
    }
    return { fired, claims };
  };
  for (const [day, tick, label] of [[D8, 300, "ticks on the dot"], [D9, 301, "ticks drifting 1 s"]] as const) {
    const night = await failingNight(day, tick);
    check(night.claims >= 8, `${label}: the bot claimed and failed again and again until midnight`, night.claims);
    check(night.fired.length === 1 && night.fired[0] >= "22:30:00" && night.fired[0] < "22:40:00" && await notes(day) === 1,
      `${label}: exactly one note, at the first or second check from 22:30`, night.fired);
  }

  // --- No staff channel: none (a note parked for days would turn up stale) ------------------------------------------
  await adminSet("staff_channel", "");
  check(await missedAt(`${D4} 22:45:00+07`) === 0 && await notes(D4) === 0, "no staff channel: nothing queued");
  await adminSet("staff_channel", STAFF_CH);

  // --- The news channel set or changed after 22:30: no card was due, no alarm ----------------------------------------
  const audit = (at: string) => db.query(
    "insert into public.shift_quest_audit (actor_id, action, resource_type, resource_id, created_at) " +
    "values ((select id from public.shift_quest_members where discord_user_id = $1), 'settings_news_channel', 'settings', null, $2::timestamptz)",
    [ADMIN, at]);
  await audit(`${D5} 22:35:00+07`);
  check(await missedAt(`${D5} 22:45:00+07`) === 0 && await notes(D5) === 0, "the news channel set at 22:35: no note that night");
  await audit(`${D6} 21:00:00+07`);
  check(await missedAt(`${D6} 22:45:00+07`) === 1 && await notes(D6) === 1,
    "set at 21:00 (the card still had its window) and no card: the note");
  // The bot only tries a new card on its 5-minute ticks: a channel set at 22:27 may see no tick before 22:30.
  await audit(`${D10} 22:27:00+07`);
  check(await missedAt(`${D10} 22:33:00+07`) === 0 && await missedAt(`${D10} 23:30:00+07`) === 0 && await notes(D10) === 0,
    "the news channel set at 22:27 (the next tick may fall after 22:30): no note that night");
  await audit(`${D11} 22:23:00+07`);
  check(await missedAt(`${D11} 22:33:00+07`) === 1 && await notes(D11) === 1,
    "set at 22:23 (a tick fell before 22:30, so the card had its chance) and no card: the note");

  // --- The bot's entry point, on the real clock -----------------------------------------------------------------
  const today: string = await scalar(db, "select public.shift_quest__bkk_today()::text");
  const first = Number(await call(bot, "shift_quest_enqueue_news_missed"));
  const second = Number(await call(bot, "shift_quest_enqueue_news_missed"));
  check([0, 1].includes(first) && second === 0, "the bot can run it; a second call right after never queues again", { first, second });
  check(await notes(today) <= 1, "at most one note for today");
  await adminSet("news_channel", "");
  check(Number(await call(bot, "shift_quest_enqueue_news_missed")) === 0, "the news channel cleared: nothing, ever");

  // --- No student data anywhere in the notes --------------------------------------------------------------------
  const text = JSON.stringify((await db.query(
    "select dedupe_key, params, member_id from public.shift_quest_outbox where kind = 'news_missed'")).rows);
  check(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(text) && !["Missed Student", STUDENT, NEWS_CH].some((s) => text.includes(s)),
    "the notes carry no uuid, name, Discord id or channel", text);
  check(await count("select count(*) from public.shift_quest_outbox where kind = 'news_missed' and channel_key <> 'staff'") === 0,
    "every note is for the staff channel slot");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
