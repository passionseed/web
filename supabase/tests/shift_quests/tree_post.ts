/**
 * SHIFT High Island: the celebrate post when a tree grows
 * (20261118090000_shift_quest_tree_grew_post, schema 16). A mentor's approval
 * of a main quest that grows the project's tree a stage queues exactly one
 * tree_grew post to the celebrate channel, with ids and numbers only. "Needs
 * more", "not passed", side quests, retries and repeat approvals of a
 * milestone the tree already counts queue nothing. The bot's send-time read
 * (shift_quest_tree_post) carries the team's name and members only while the
 * team shows its name, and the post waits while sharing is off.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { Client } from "pg";
import { randomUUID } from "node:crypto";
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
const ADMIN = "891000000000000001";
const R1 = "891000000000000002"; // a reviewer
const A = "901000000000000001"; // project one, with B
const B = "901000000000000002";
const C = "901000000000000003"; // project two, alone
const CELEBRATE = "981000000000000001";
const NAMES: Record<string, string> = {
  [ADMIN]: "Tree Admin", [R1]: "Tree Reviewer", [A]: "Tree Aye", [B]: "Tree Bee", [C]: "Tree Cee",
};
const FEEDBACK = "mentor-words-never-posted";

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

const keys = (o: Json) => Object.keys(o).sort().join(",");

async function main(): Promise<void> {
  const db = await connect(adminUrl!);
  const bot = await connect(botUrl!);
  const web = await connect(webUrl!);
  const posts = async (): Promise<Json[]> =>
    (await db.query(
      "select dedupe_key, target_kind, channel_key, kind, params, status, last_error from public.shift_quest_outbox " +
      "where kind = 'tree_grew' order by created_at, dedupe_key"
    )).rows;
  const decide = (submission: string, outcome: string, feedback: string | null = null) =>
    call<Json>(bot, "shift_quest_review_decide", R1, submission, outcome, feedback, false);
  const submitMain = (who: string, milestone: number) =>
    call<Json>(web, "shift_quest_milestone_submit", who, milestone, "หลักฐานจากงานจริง", "สิ่งที่ได้เรียนรู้", null);

  // --- Schema and privileges -------------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 16,
    "the bot reads the latest schema version (the tree_grew post starts from 16)");
  const read: Json = (await db.query(
    `select has_function_privilege('shift_quest_bot', p.oid, 'EXECUTE') as bot,
            has_function_privilege('shift_quest_web', p.oid, 'EXECUTE') as web,
            has_function_privilege('service_role', p.oid, 'EXECUTE') as service,
            has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
            p.prosecdef as definer, p.provolatile = 's' as stable,
            coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
     from pg_proc p where p.oid = 'public.shift_quest_tree_post(uuid,uuid)'::regprocedure`)).rows[0];
  check(read?.bot === true && read.service === true && read.web === false && read.anon === false &&
      read.authenticated === false && read.definer && read.stable && read.pinned,
    "shift_quest_tree_post: the bot's and service_role's only, a stable security definer with a pinned search_path", read);
  const helper: boolean = await scalar(db,
    `select bool_or(has_function_privilege(r, 'public.shift_quest__tree_grew(shift_quest_instances,smallint,integer)'::regprocedure, 'EXECUTE'))
     from unnest(array['shift_quest_bot', 'shift_quest_web', 'service_role', 'anon', 'authenticated']) r`);
  check(helper === false, "shift_quest__tree_grew: an internal helper nobody can call");
  check((await sqlstate(call(web, "shift_quest_tree_post", randomUUID(), randomUUID()))) === "42501",
    "the website cannot read the post (42501)");

  // --- Fixtures --------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of [A, B, C]) await call(web, "shift_quest_start", id, NAMES[id], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "Tree One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "Tree Two", "creative", null);

  // --- Starts, submissions, "needs more" and "not passed" post nothing -------------------------------
  await call(web, "shift_quest_milestone_start", A, 1);
  const s1 = await submitMain(A, 1);
  check((await posts()).length === 0, "starting and submitting a main quest post nothing");
  await decide(s1.submission_id, "clarification", FEEDBACK);
  check((await posts()).length === 0, "a mentor's \"needs more\" posts nothing");
  const s1b = await submitMain(A, 1);
  check(s1b.instance_id === s1.instance_id, "the resubmission is the same quest");
  await decide(s1b.submission_id, "declined", FEEDBACK);
  check((await posts()).length === 0, "a mentor's \"not passed\" posts nothing");

  // --- An approval that grows the tree posts once ----------------------------------------------------
  const s1c = await submitMain(A, 1);
  const approved = await decide(s1c.submission_id, "approved");
  check(approved.island?.milestone === 1 && approved.island?.stage === 1 && approved.island?.unlocks_earned === 0,
    "the approval still returns the milestone, the stage and the unlocks (the hook's body is unchanged)", approved.island);
  let rows = await posts();
  check(rows.length === 1, "approving a main quest that grows the tree queues exactly one post", rows);
  const first = rows[0];
  check(first?.target_kind === "channel" && first.channel_key === "celebrate" && first.dedupe_key === `tree:${p1}:1`,
    "to the celebrate channel, once per project and milestone", first);
  check(keys(first.params) === "instance_id,milestone,project_id,stage" && first.params.project_id === p1 &&
      first.params.instance_id === s1c.instance_id && first.params.milestone === 1 && first.params.stage === 1,
    "its params are ids and numbers only: project, quest, milestone, new stage", first.params);
  const text = JSON.stringify(first.params);
  check(![NAMES[A], NAMES[B], "Tree One", A, B, FEEDBACK, "หลักฐาน"].some((s) => text.includes(s)),
    "no name, Discord id, feedback or student words in what is queued");

  const again = await decide(s1c.submission_id, "approved");
  check(again.already === true && (await posts()).length === 1, "a retried approval queues nothing new");

  // --- The stage is the new one ---------------------------------------------------------------------------
  const s2 = await submitMain(A, 2);
  await decide(s2.submission_id, "approved");
  rows = await posts();
  check(rows.length === 2 && rows[1].dedupe_key === `tree:${p1}:2` && rows[1].params.milestone === 2 && rows[1].params.stage === 2,
    "the next main quest posts the next stage", rows.map((r) => r.params));

  // --- Repeats and side quests post nothing -----------------------------------------------------------------
  const repeat = await submitMain(A, 1);
  check(repeat.instance_id !== s1c.instance_id, "a repeatable main quest opens again");
  await decide(repeat.submission_id, "approved");
  check((await posts()).length === 2, "approving a milestone the tree already counts posts nothing (the stage did not grow)");
  const side: string = await scalar(db,
    "select id from public.shift_quest_templates where side and status = 'published' " +
    "and requires_milestones = '{}' and requires_slugs = '{}' order by sort_order limit 1");
  const ss = await call<Json>(web, "shift_quest_side_submit", A, side, "หลักฐาน", "สิ่งที่ได้เรียนรู้", null);
  await decide(ss.submission_id, "approved");
  check((await posts()).length === 2, "approving a side quest posts nothing");

  const s3 = await submitMain(C, 1);
  await decide(s3.submission_id, "approved");
  rows = await posts();
  check(rows.length === 3 && rows[2].dedupe_key === `tree:${p2}:1` && rows[2].params.stage === 1,
    "another team's first main quest posts its own stage 1");

  // --- The bot's read at send time ---------------------------------------------------------------------------
  const title1: string = await scalar(db,
    "select t.title from public.shift_quest_templates t join public.shift_quest_instances i on i.template_id = t.id where i.id = $1",
    [s1c.instance_id]);
  const slot1: number = await scalar(db, "select slot from public.shift_quest_plots where project_id = $1", [p1]);
  // Names are shown by default (20261114110000), so with consent off both members start shown.
  let post = await call<Json>(bot, "shift_quest_tree_post", p1, s1c.instance_id);
  check(keys(post) === "name,slot,team_user_ids,title" && post.slot === slot1 && post.title === title1 &&
      post.name === "Tree One" && JSON.stringify(post.team_user_ids) === JSON.stringify([A, B].sort()),
    "a team where every member shows the name: the plot, the quest's title, the name and the members to ping", post);
  await call(web, "shift_quest_island_optin", B, p1, false);
  post = await call<Json>(bot, "shift_quest_tree_post", p1, s1c.instance_id);
  check(post.slot === slot1 && post.title === title1 && post.name === null &&
      Array.isArray(post.team_user_ids) && post.team_user_ids.length === 0,
    "one member hiding it un-names the team: the plot and the title only, nobody to ping", post);
  await call(web, "shift_quest_island_optin", B, p1, true);
  post = await call<Json>(bot, "shift_quest_tree_post", p1, s1c.instance_id);
  check(post.name === "Tree One" && post.team_user_ids.length === 2, "showing it again names the team again");
  await db.query("update public.shift_quest_settings set consent_required = true where id");
  post = await call<Json>(bot, "shift_quest_tree_post", p1, s1c.instance_id);
  check(post.name === null && post.team_user_ids.length === 0,
    "with consent required and none on file the team is not named: read when the post is sent", post);
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  check(await call(bot, "shift_quest_tree_post", randomUUID(), s1c.instance_id) === null, "a project that is gone reads as null");
  check((await call<Json>(bot, "shift_quest_tree_post", p2, s1c.instance_id)).title === null,
    "another project's quest gives no title");
  check((await call<Json>(bot, "shift_quest_tree_post", p1, ss.instance_id)).title === null, "a side quest gives no title");

  // --- Delivery waits for the channel and for sharing ------------------------------------------------------------
  let claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows.filter((r) => r.kind === "tree_grew");
  rows = await posts();
  check(claimed.length === 0 && rows.every((r) => r.status === "blocked" && r.last_error === "channel_not_configured"),
    "without a celebrate channel the posts are parked", rows.map((r) => [r.status, r.last_error]));
  await call(bot, "shift_quest_admin_set", ADMIN, "celebrate_channel", CELEBRATE);
  await call(bot, "shift_quest_outbox_unblock");
  claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows.filter((r) => r.kind === "tree_grew");
  rows = await posts();
  check(claimed.length === 0 && rows.every((r) => r.status === "blocked" && r.last_error === "sharing_paused"),
    "with sharing off they are held", rows.map((r) => [r.status, r.last_error]));
  await call(bot, "shift_quest_admin_set", ADMIN, "sharing", "on");
  await call(bot, "shift_quest_outbox_unblock");
  claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows.filter((r) => r.kind === "tree_grew");
  check(claimed.length === 3 && claimed.every((r) => r.channel_id === CELEBRATE && r.dm_user_id === null &&
      r.member_user_id === null && r.peer_user_id === null),
    "with sharing on all three go to the celebrate channel, about nobody in particular", claimed);

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`\n${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
