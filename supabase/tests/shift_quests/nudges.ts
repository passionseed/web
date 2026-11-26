/**
 * SHIFT High Island: the bot's DMs on by default (20261126100000_shift_quest_nudges_on,
 * schema 24).
 *   * the defaults: notify_dm and away_dm default to true; the come-back DM
 *     starts after 3 days (the old default of 7 replaced, an admin's own
 *     choice kept);
 *   * /start with no choice (null) makes a student with both DMs on; an
 *     explicit false is kept; a second start with null never changes a
 *     choice;
 *   * the update DM's row carries the notice kind and only the whitelisted
 *     fields (title, milestone, stage, from, project_name, item): never the
 *     mentor's words (feedback, note, reason) and never an internal id;
 *     nothing is queued for a student who turned it off;
 *   * the version: 24, read the same by the bot and the website.
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

// Synthetic Discord ids.
const FRESH = "992400000000000001"; // starts with no choice
const SAYS_NO = "992400000000000002"; // starts with an explicit no
const CHANGES = "992400000000000003"; // turns the update DM off, then starts again

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

async function member(db: Client, discordId: string): Promise<Json> {
  const { rows } = await db.query(
    "select id::text, notify_dm, away_dm, away_dm_at from public.shift_quest_members where discord_user_id = $1",
    [discordId],
  );
  return rows[0];
}

async function main(): Promise<void> {
  const db = await connect(adminUrl!);
  const bot = await connect(botUrl!);
  const web = await connect(webUrl!);
  try {
    // The version.
    check(LATEST_SCHEMA >= 24 && Number(await call(bot, "shift_quest_schema_version")) === LATEST_SCHEMA, "the bot reads schema 24 or later");
    check(Number(await call(web, "shift_quest_schema_version")) === LATEST_SCHEMA, "the website reads the same version");

    // The defaults.
    const cols = (
      await db.query(
        `select column_name, column_default from information_schema.columns
         where table_schema = 'public' and table_name = 'shift_quest_members' and column_name in ('notify_dm', 'away_dm')
         order by column_name`,
      )
    ).rows;
    check(
      JSON.stringify(cols) === JSON.stringify([{ column_name: "away_dm", column_default: "true" }, { column_name: "notify_dm", column_default: "true" }]),
      "notify_dm and away_dm default to true",
      cols,
    );
    const days = (await db.query("select away_after_days from public.shift_quest_settings")).rows[0]?.away_after_days;
    check(days === 3, "the come-back DM starts after 3 days", days);

    // /start with no choice: both on.
    await call(bot, "shift_quest_start", FRESH, "Nudge Fresh", null);
    let m = await member(db, FRESH);
    check(m.notify_dm === true && m.away_dm === true && m.away_dm_at === null, "a start with no choice turns both DMs on, unchosen", m);

    // An explicit no is kept.
    await call(web, "shift_quest_start", SAYS_NO, "Nudge No", false);
    m = await member(db, SAYS_NO);
    check(m.notify_dm === false, "a start with an explicit no keeps the update DM off", m);

    // A choice survives a second start with no choice.
    await call(bot, "shift_quest_start", CHANGES, "Nudge Changes", null);
    await call(bot, "shift_quest_update_prefs", CHANGES, null, null, null, false);
    await call(web, "shift_quest_start", CHANGES, "Nudge Changes", null);
    m = await member(db, CHANGES);
    check(m.notify_dm === false, "a second start with no choice never turns a no back on", m);

    // The update DM's row: the notice kind and only the whitelisted fields.
    const fresh = await member(db, FRESH);
    await db.query("select public.shift_quest__notify($1::uuid, $2, $3, $4::jsonb)", [
      fresh.id,
      "nudges:approved",
      "review_approved",
      JSON.stringify({
        title: "เจอคนจริงคนแรก",
        milestone: 1,
        stage: 2,
        feedback: "words a mentor wrote",
        note: "a mentor's note",
        reason: "a reason",
        actor_id: fresh.id,
        submission_id: "00000000-0000-4000-8000-000000000001",
      }),
    ]);
    const row = (
      await db.query("select kind, target_kind, params from public.shift_quest_outbox where dedupe_key = 'nudge:nudges:approved'")
    ).rows[0];
    check(
      row?.kind === "nudge" && row.target_kind === "dm" &&
        JSON.stringify(row.params) === JSON.stringify({ stage: 2, title: "เจอคนจริงคนแรก", notice: "review_approved", milestone: 1 }),
      "the update DM carries the notice kind, title, milestone and stage, nothing else",
      row,
    );
    const words = JSON.stringify(row?.params ?? {});
    check(!words.includes("mentor") && !words.includes("reason") && !words.includes(fresh.id), "never the mentor's words or an internal id", row?.params);

    // The inbox keeps everything (it is the record on the island).
    const inbox = (await db.query("select params from public.shift_quest_inbox where dedupe_key = 'nudges:approved'")).rows[0];
    check(inbox?.params?.feedback === "words a mentor wrote", "the inbox notice itself keeps the full params", inbox);

    // An invite: who and which project; a long title is cut to 80.
    await db.query("select public.shift_quest__notify($1::uuid, $2, $3, $4::jsonb)", [
      fresh.id,
      "nudges:invite",
      "project_invite",
      JSON.stringify({ from: "Nudge Friend", project_name: "ร้านขนม", project_id: "00000000-0000-4000-8000-000000000002" }),
    ]);
    const invite = (await db.query("select params from public.shift_quest_outbox where dedupe_key = 'nudge:nudges:invite'")).rows[0];
    check(
      JSON.stringify(invite?.params) === JSON.stringify({ from: "Nudge Friend", notice: "project_invite", project_name: "ร้านขนม" }),
      "an invite carries who and which project, not the project id",
      invite,
    );
    await db.query("select public.shift_quest__notify($1::uuid, $2, $3, $4::jsonb)", [
      fresh.id,
      "nudges:long",
      "review_declined",
      JSON.stringify({ title: "ก".repeat(120), milestone: "1" }),
    ]);
    const long = (await db.query("select params from public.shift_quest_outbox where dedupe_key = 'nudge:nudges:long'")).rows[0];
    check(
      long?.params?.title?.length === 80 && !("milestone" in (long?.params ?? {})),
      "a title is cut to 80 characters; a milestone that is not a number is left out",
      long,
    );

    // Nothing queued for a student who turned the update DM off.
    const no = await member(db, SAYS_NO);
    await db.query("select public.shift_quest__notify($1::uuid, $2, $3, $4::jsonb)", [no.id, "nudges:off", "review_approved", "{}"]);
    const off = Number((await db.query("select count(*) from public.shift_quest_outbox where dedupe_key = 'nudge:nudges:off'")).rows[0].count);
    const kept = Number((await db.query("select count(*) from public.shift_quest_inbox where dedupe_key = 'nudges:off'")).rows[0].count);
    check(off === 0 && kept === 1, "no DM for a student who turned it off; the notice still lands in their inbox", { off, kept });
  } finally {
    await db.end();
    await bot.end();
    await web.end();
  }
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
