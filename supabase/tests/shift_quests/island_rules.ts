/**
 * SHIFT High Island database tests: tree stages, tap check-ins, the island
 * map's privacy, one open quest per milestone, rest, approval locking, and
 * Season 1 (qualification by submission time, the island goal, unlocks equal
 * for all, recognitions, squads, the weekly island post). Run against the
 * real functions, as shift_quest_bot, with real concurrent connections where
 * a race matters.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * SHIFT_QUESTS_WAVE=1 runs it against a database with only wave 1 applied
 * (migrations up to 20261111090700): the island core must work without any
 * season object, and the run ends by upgrading that populated database to
 * wave 2 (20261111090800, applied twice) and checking it.
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const adminUrl = process.env.SHIFT_QUESTS_TEST_DATABASE_URL;
const botUrl = process.env.SHIFT_QUESTS_BOT_DATABASE_URL;
if (!adminUrl || !botUrl || process.env.SHIFT_QUESTS_TEST_DISPOSABLE !== "1") {
  console.error("Run through supabase/tests/shift_quests/run-local.sh (needs a disposable database).");
  process.exit(2);
}
for (const url of [adminUrl, botUrl]) {
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)) {
    console.error("Refusing a non-local database");
    process.exit(2);
  }
}
/** Wave 1 alone: no seasons, recognitions, squads or weekly post until the upgrade at the end. */
const WAVE1 = process.env.SHIFT_QUESTS_WAVE === "1";
const SEASONS_MIGRATION = resolve(__dirname, "../../migrations/20261111090800_shift_quests_seasons.sql");

// Synthetic Discord IDs and names.
const ADMIN = "510000000000000001";
const R1 = "520000000000000001";
const R2 = "520000000000000002";
const A = "530000000000000001";
const B = "530000000000000002";
const C = "530000000000000003";
const D = "530000000000000004";
const E = "530000000000000005";
const F = "530000000000000006";
const G = "530000000000000007";
const H = "530000000000000008";
const I = "530000000000000009";
const J = "530000000000000010";
const K = "530000000000000011";
const L = "530000000000000012";
const M = "530000000000000013";
const N = "530000000000000014";
const O = "530000000000000015";
const Q = "530000000000000016";
const S1 = "530000000000000017";
const S2 = "530000000000000018";
const S3 = "530000000000000019";
const NOBODY = "539999999999999999";
const NAMES: Record<string, string> = {
  [A]: "Isla Aye", [B]: "Isla Bee", [C]: "Isla Cee", [D]: "Isla Dee", [E]: "Isla Eee", [F]: "Isla Eff",
  [G]: "Isla Gee", [H]: "Isla Aitch", [I]: "Isla Eye", [J]: "Isla Jay", [K]: "Isla Kay", [L]: "Isla Ell",
  [M]: "Isla Emm", [N]: "Isla Enn", [O]: "Isla Oh", [Q]: "Isla Cue", [S1]: "Isla Ess One", [S2]: "Isla Ess Two",
  [S3]: "Isla Ess Three",
};

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

async function scalar<T = any>(c: Client, sql: string, args: unknown[] = []): Promise<T> {
  const { rows } = await c.query(sql, args);
  return Object.values(rows[0])[0] as T;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A race that always overlaps: `first` runs inside an open transaction on
 * one connection, `second` starts on another while it is uncommitted, then
 * the first commits. Without the lock under test, `second` decides on a
 * snapshot that misses `first`.
 */
async function overlap<T, U>(
  c1: Client, first: () => Promise<T>, second: () => Promise<U>
): Promise<[T | { error: string }, U | { error: string }]> {
  await c1.query("begin");
  let a: T | { error: string };
  try {
    a = await first();
  } catch (error) {
    a = { error: (error as Error).message };
  }
  const pending = second().catch((error) => ({ error: (error as Error).message }));
  await sleep(300);
  await c1.query("error" in (a as object) ? "rollback" : "commit");
  return [a, await pending];
}

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures, time travel and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: every app call
  const bot2 = await connect(botUrl!); // a second bot connection for races

  /** A Bangkok calendar day relative to today, as YYYY-MM-DD. */
  const day = (offset: number) =>
    scalar<string>(db, "select ((now() at time zone 'Asia/Bangkok')::date + $1::int)::text", [offset]);
  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const memberId = (discord: string) =>
    scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [discord]);
  const ledgerCount = () => count("select count(*) from public.shift_quest_ledger");
  /** Moves every revision of a quest into the past: when it was submitted (and decided). */
  const backdateQuest = (instance: string, days: number) =>
    db.query(
      `update public.shift_quest_submissions
       set created_at = created_at - make_interval(days => $2), decided_at = decided_at - make_interval(days => $2)
       where instance_id = $1`,
      [instance, days]
    );
  /** Waits until a backend is blocked on a lock (pg_stat_activity), up to about 3 seconds. */
  const waitsOnLock = async (pid: number) => {
    for (let n = 0; n < 60; n += 1) {
      if ((await scalar<string | null>(db, "select wait_event_type from pg_stat_activity where pid = $1", [pid])) === "Lock") {
        return true;
      }
      await sleep(50);
    }
    return false;
  };

  // --- Privileges -------------------------------------------------------------
  await db.query("set role anon");
  check((await code(call(db, "shift_quest_island_map", A))).includes("permission denied"), "anon cannot read the island map");
  check((await code(call(db, "shift_quest_island_post_map"))).includes("permission denied"), "anon cannot read the post map");
  await db.query("reset role");
  check((await code(bot.query("select * from public.shift_quest_plots"))).includes("permission denied"),
    "bot cannot read island tables directly");
  check((await code(bot.query("select public.shift_quest__after_approval($1, null)", [randomUUID()]))).includes("permission denied"),
    "bot cannot call island helpers");
  check((await code(bot.query("select public.shift_quest__plot_json($1, null)", [randomUUID()]))).includes("permission denied"),
    "bot cannot call the privacy helper");
  check(Number(await call(bot, "shift_quest_schema_version")) === (WAVE1 ? 1 : 10),
    `the bot reads the island schema version (${WAVE1 ? 1 : 10})`);

  // --- Fixtures --------------------------------------------------------------------
  await call(db, "shift_quest_bootstrap_admin", ADMIN, "Isla Admin");
  await call(bot, "shift_quest_admin_role", ADMIN, R1, "Isla Rev One", "reviewer", true);
  await call(bot, "shift_quest_admin_role", ADMIN, R2, "Isla Rev Two", "reviewer", true);
  for (const id of [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, Q, S1, S2, S3]) await call(bot, "shift_quest_start", id, NAMES[id], false);

  const templates: Json[] = await call(bot, "shift_quest_templates", A);
  const bySlug = (slug: string) => templates.find((t) => t.slug === slug)!;
  check(
    bySlug("find-something-worth-fixing").milestone === 1 && bySlug("make-it-exist").milestone === 2 &&
      bySlug("let-reality-surprise-you").milestone === 3 && bySlug("give-them-a-reason-to-return").milestone === 4 &&
      bySlug("take-the-keys").milestone === 5 && bySlug("help-another-builder-move").milestone === 6 &&
      bySlug("improve-our-community").milestone === 7,
    "the seven starter quests are milestones 1 to 7"
  );
  check((await code(db.query("update public.shift_quest_templates set milestone = 1 where slug = 'make-it-exist'"))).includes("duplicate key"),
    "a milestone belongs to one published template");

  /** Submits a milestone for the student and approves it (reviewer R1 unless given). */
  const reach = async (who: string, milestone: number, reviewer = R1, distinct = false) => {
    const s = await call(bot, "shift_quest_milestone_submit", who, milestone, `Proof ${milestone}`, `Learned ${milestone}`, null);
    const r = await call(bot, "shift_quest_review_decide", reviewer, s.submission_id, "approved", null, distinct);
    return { ...s, review: r };
  };
  const island = (who: string) => call<Json>(bot, "shift_quest_island", who);
  const map = (who: string | null) => call<Json>(bot, "shift_quest_island_map", who);
  const postMap = () => call<Json>(bot, "shift_quest_island_post_map");
  const plotAt = (m: Json, slot: number) => m.plots.find((p: Json) => p.slot === slot);
  const isPlain = (p: Json) =>
    p && p.plain === true && p.stage === 0 && !p.visitor && !p.key && !p.helper && !p.lantern && p.name === null;

  // --- Plots -------------------------------------------------------------------------
  const p1: string = await call(bot, "shift_quest_project_create", A, "Plot One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(bot, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(bot, "shift_quest_project_create", C, "Plot Two", "creative", null);
  const p3: string = await call(bot, "shift_quest_project_create", D, "Plot Three", "service", null);
  const slotOf = (p: string) => scalar<number>(db, "select slot from public.shift_quest_plots where project_id = $1", [p]);
  check((await slotOf(p1)) === 1 && (await slotOf(p2)) === 2 && (await slotOf(p3)) === 3, "new projects take plots 1, 2, 3");
  const tmp: string = await call(bot, "shift_quest_project_create", K, "Temporary", "other", null);
  check((await slotOf(tmp)) === 4, "the next project takes plot 4");
  await db.query("delete from public.shift_quest_projects where id = $1", [tmp]);
  const p4: string = await call(bot, "shift_quest_project_create", E, "Plot Four", "software", null);
  check((await slotOf(p4)) === 4, "a freed plot is the lowest free slot again");
  await call(bot, "shift_quest_project_invite", E, p4, F);
  await call(bot, "shift_quest_project_respond", F, p4, true);

  // --- /island basics ----------------------------------------------------------------
  let isl = await island(A);
  check(isl.project?.id === p1 && isl.project.slot === 1 && isl.project.stage === 0 && isl.project.next_milestone === 1,
    "a new plot starts at stage 0 with milestone 1 suggested", isl.project);
  check(isl.milestones.length === 7 && isl.milestones.every((m: Json) => !m.done && m.in_flight === null && m.reflection_prompt),
    "all seven milestones are listed, none done", isl.milestones);
  check(isl.taps_today === 0 && isl.resting === false && isl.season === null, "no taps, not resting, no season yet", isl);
  check((await island(K)).project === null, "a student without a project has no plot");
  check(await code(island(NOBODY)) === "not_started", "the island needs /start");

  // --- Tap check-ins ----------------------------------------------------------------
  const ledger0 = await ledgerCount();
  const tap1 = await call(bot, "shift_quest_checkin", A, null);
  const tap2 = await call(bot, "shift_quest_checkin", A, "   ");
  check(tap1.kind === "tap" && tap1.taps_today === 1, "a tap with no words", tap1);
  check(tap2.kind === "tap" && tap2.progress_id === tap1.progress_id && tap2.taps_today === 1,
    "a second tap the same day returns the first", tap2);
  const note = await call(bot, "shift_quest_checkin", A, "Fixed the login screen");
  check(note.kind === "note" && note.progress_id !== tap1.progress_id && note.taps_today === 1, "one line makes a note", note);
  check(await code(call(bot, "shift_quest_checkin", A, "x".repeat(301))) === "text_too_long", "a note is one line (300 characters)");
  check(await code(call(bot, "shift_quest_checkin", K, null)) === "no_project", "a tap needs a current project");
  check((await count("select count(*) from public.shift_quest_progress where kind = 'tap' and member_id = $1", [await memberId(A)])) === 1,
    "one tap row for the day");
  const race: Json[] = await overlap(bot, () => call(bot, "shift_quest_checkin", B, null), () => call(bot2, "shift_quest_checkin", B, null));
  check(race[0].progress_id === race[1].progress_id &&
    (await count("select count(*) from public.shift_quest_progress where kind = 'tap' and member_id = $1", [await memberId(B)])) === 1,
    "two taps at once make one", race);
  await db.query("update public.shift_quest_progress set created_at = now() - interval '1 day' where id = $1", [tap1.progress_id]);
  const tap3 = await call(bot, "shift_quest_checkin", A, null);
  check(tap3.progress_id !== tap1.progress_id && tap3.taps_today === 1, "yesterday's tap leaves room for today's");
  const journal: Json[] = await call(bot, "shift_quest_progress_list", A, null, 25);
  check(journal.length === 1 && journal[0].changed === "Fixed the login screen", "the journal lists notes, not taps", journal);
  check(await code(call(bot, "shift_quest_progress_edit", A, tap3.progress_id, 1, "x", null, null, null, null, "private")) === "not_found",
    "a tap cannot be edited into a journal entry");
  isl = await island(A);
  check(isl.project.stage === 0 && isl.taps_today === 1 && (await ledgerCount()) === ledger0, "taps grow nothing and mint nothing", isl.project);
  check((await count("select count(*) from public.shift_quest_outbox")) === 0, "taps post nothing");

  // --- Opt-in names and the shared map -----------------------------------------------
  let m = await map(A);
  check(m.plots.map((p: Json) => p.slot).join(",") === "1,2,3,4", "the map lists plots by slot", m.plots);
  check(m.plots.every((p: Json) => p.name === null), "no project names without consent");
  check(m.plots.filter((p: Json) => p.mine).map((p: Json) => p.slot).join(",") === "1", "only the caller's plot is mine");
  check(m.goal === null && m.season === null, "no goal and no season on the map yet", m);
  let opt = await call(bot, "shift_quest_island_optin", A, p1, true);
  check(opt.show_name === true && opt.project_name_visible === false, "one teammate's consent is not enough", opt);
  opt = await call(bot, "shift_quest_island_optin", B, null, true);
  check(opt.project_id === p1 && opt.project_name_visible === true, "every active member agreed: the name may show", opt);
  m = await postMap();
  check(plotAt(m, 1).name === "Plot One" && m.plots.every((p: Json) => !p.mine),
    "the post map shows the agreed name and marks no plot", m.plots);
  await call(bot, "shift_quest_project_invite", A, p1, J);
  check(plotAt(await postMap(), 1).name === "Plot One", "a pending invite does not hide the name");
  await call(bot, "shift_quest_project_respond", J, p1, true);
  check(plotAt(await postMap(), 1).name === null, "a new teammate who has not agreed hides it");
  await call(bot, "shift_quest_island_optin", J, p1, true);
  check(plotAt(await postMap(), 1).name === "Plot One", "until they agree too");
  await call(bot, "shift_quest_project_leave", J, p1);
  check(plotAt(await postMap(), 1).name === "Plot One", "once they leave, the others' consent stands");
  await call(bot, "shift_quest_project_invite", A, p1, J);
  await call(bot, "shift_quest_project_respond", J, p1, true);
  check(plotAt(await postMap(), 1).name === null, "rejoining asks for consent again");
  await call(bot, "shift_quest_project_leave", J, p1);
  check(await code(call(bot, "shift_quest_island_optin", C, p1, true)) === "not_project_member", "only members opt in for a project");
  check(await code(map(NOBODY)) === "not_started", "the map needs /start");
  check(await code(map(null)) === "not_started", "the private map refuses a missing caller (the post has its own map)");
  check(Array.isArray((await map(R1)).plots), "staff who never ran /start can see the map");
  const memberIds = (await db.query("select id::text from public.shift_quest_members")).rows.map((r) => r.id);
  const mapText = JSON.stringify([await map(A), await postMap()]);
  check(![...Object.keys(NAMES), ...Object.values(NAMES), ADMIN, R1, ...memberIds].some((s) => mapText.includes(s)),
    "neither map carries a Discord ID, member ID or display name");

  // --- One-step milestones and stage math -------------------------------------------
  check(await code(call(bot, "shift_quest_milestone_submit", K, 1, "p", "r", null)) === "no_project", "a milestone needs a project");
  check(await code(call(bot, "shift_quest_milestone_submit", A, 9, "p", "r", null)) === "template_unavailable", "milestones are 1 to 7");
  check(await code(call(bot, "shift_quest_milestone_submit", A, 3, "p", "  ", null)) === "missing_text", "the reflection is required");
  check((await count("select count(*) from public.shift_quest_instances")) === 0, "a refused submit leaves no quest behind");

  const ms1 = await call(bot, "shift_quest_milestone_submit", A, 3, "Three classmates tried it", "They skipped onboarding", "https://example.org/a");
  check(ms1.created === true && ms1.revision === 1 && typeof ms1.submission_id === "string", "the first submit creates the quest", ms1);
  const q3 = (await db.query("select * from public.shift_quest_instances where id = $1", [ms1.instance_id])).rows[0];
  const t3 = bySlug("let-reality-surprise-you");
  check(q3.project_id === p1 && q3.state === "submitted" && q3.goal === t3.purpose && q3.next_step === "-" &&
    q3.criteria === t3.evidence_criteria && q3.milestone === 3,
    "created exactly like choosing the template, with its milestone", q3);
  const sub3 = (await db.query("select * from public.shift_quest_submissions where id = $1", [ms1.submission_id])).rows[0];
  check(sub3.visibility === "reviewers" && sub3.evidence === "Three classmates tried it" && sub3.reflection === "They skipped onboarding",
    "proof and reflection are submitted to reviewers only", sub3);
  const ms1b = await call(bot, "shift_quest_milestone_submit", A, 3, "Four classmates now", "Cut a step", null);
  check(ms1b.created === false && ms1b.instance_id === ms1.instance_id && ms1b.revision === 2, "a second submit reuses the quest in flight", ms1b);
  isl = await island(A);
  const m3 = isl.milestones.find((x: Json) => x.milestone === 3);
  check(m3.in_flight?.instance_id === ms1.instance_id && m3.in_flight.state === "submitted" && m3.in_flight.mine === true &&
    !m3.done && isl.project.stage === 0,
    "in flight, not done, no growth before review", m3);
  const bView = (await island(B)).milestones.find((x: Json) => x.milestone === 3);
  check(bView.in_flight?.instance_id === ms1.instance_id && bView.in_flight.mine === false && bView.in_flight.owner === NAMES[A],
    "a teammate sees who holds the milestone in flight", bView.in_flight);
  check(await code(call(bot, "shift_quest_milestone_submit", B, 3, "p", "r", null)) === "milestone_open",
    "a teammate cannot open a second quest for the same milestone");
  check(await code(call(bot, "shift_quest_review_decide", R1, ms1.submission_id, "approved", null, false)) === "stale_revision",
    "the superseded revision cannot be approved");
  let res = await call(bot, "shift_quest_review_decide", R1, ms1b.submission_id, "approved", null, false);
  check(res.island?.stage === 1 && res.island.milestone === 3 && res.island.unlocks_earned === 0,
    "approval grows the tree (any order)", res);
  isl = await island(A);
  check(isl.project.stage === 1 && isl.project.milestones_done.join(",") === "3" && isl.project.next_milestone === 1,
    "stage 1 with milestone 3 done; milestone 1 suggested next", isl.project);
  check((await call(bot, "shift_quest_inbox_list", A, false)).items.some((n: Json) => n.kind === "review_approved" && n.params.stage === 1),
    "the approval notice carries the new stage");

  const b1 = await reach(B, 1);
  check(b1.review.island.stage === 2, "a teammate's milestone counts for the shared plot", b1.review);
  const b2 = await call(bot, "shift_quest_milestone_submit", B, 2, "Prototype", "Learned", null);
  await call(bot, "shift_quest_review_decide", R1, b2.submission_id, "declined", "Needs a working link", false);
  const b4 = await call(bot, "shift_quest_milestone_submit", B, 4, "Retention try", "Learned", null);
  await call(bot, "shift_quest_review_decide", R1, b4.submission_id, "clarification", "Who came back?", false);
  check((await island(A)).project.stage === 2, "declined and clarification grow nothing");
  check(await code(call(bot, "shift_quest_milestone_submit", A, 4, "p", "r", null)) === "milestone_open",
    "a milestone waiting on a teammate's clarification is theirs to answer");
  const again3 = await reach(A, 3, R2, true);
  check(again3.created === true && again3.review.island.stage === 2, "a repeat of a done milestone counts once", again3);
  const proposed: string = await call(bot, "shift_quest_propose", A, "Side quest", "Why", "Goal", "Criteria", "Next");
  const ps = await call(bot, "shift_quest_submit", A, proposed, 1, "Did it", "Learned", null, "reviewers", null, []);
  await call(bot, "shift_quest_review_decide", R1, ps.submission_id, "approved", null, false);
  check((await island(A)).project.stage === 2, "a proposed quest is not a milestone");
  check(await code(call(bot, "shift_quest_set_state", A, ms1.instance_id, null, "archive")) === "bad_state",
    "an approved milestone cannot be archived away");
  await call(bot, "shift_quest_project_leave", B, p1);
  check((await island(A)).project.stage === 2, "a teammate leaving takes no stage away");
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(bot, "shift_quest_project_respond", B, p1, true);
  await call(bot, "shift_quest_island_optin", B, p1, true);

  // A paused quest in flight is resumed, not duplicated.
  const a2 = await call(bot, "shift_quest_milestone_submit", A, 2, "Demo", "Learned", null);
  let v: number = await call(bot, "shift_quest_withdraw", A, a2.instance_id, a2.version);
  v = await call(bot, "shift_quest_set_state", A, a2.instance_id, v, "pause");
  const a2b = await call(bot, "shift_quest_milestone_submit", A, 2, "Demo again", "Learned more", null);
  check(a2b.created === false && a2b.instance_id === a2.instance_id && a2b.revision === 2, "a paused milestone quest is resumed and resubmitted", a2b);

  // One open quest per project and milestone, on every path.
  check(await code(call(bot, "shift_quest_choose", B, bySlug("make-it-exist").id, "Goal", "Next", null, null)) === "milestone_open",
    "choosing the template is refused while a teammate's quest for it is open");
  check(await code(call(bot, "shift_quest_appeal", B, b2.instance_id, "It works now")) === "milestone_open",
    "an appeal cannot reopen a milestone a teammate already reopened");
  const c5 = await call(bot, "shift_quest_milestone_submit", C, 5, "Owner keys", "Learned", null);
  await call(bot, "shift_quest_review_decide", R1, c5.submission_id, "declined", "Show the account is yours", false);
  await call(bot, "shift_quest_appeal", C, c5.instance_id, "The account is in my name");
  check(await code(call(bot, "shift_quest_milestone_submit", C, 5, "p", "r", null)) === "milestone_appealed",
    "a milestone under appeal is not submitted again");
  await call(bot, "shift_quest_review_decide", R2, c5.submission_id, "declined", "Still not shown", false);
  check((await island(C)).milestones.find((x: Json) => x.milestone === 5).in_flight === null, "a decided appeal frees the milestone");
  const twin: Json[] = await overlap(bot,
    () => call(bot, "shift_quest_milestone_submit", A, 6, "Helped Cee", "Learned", null),
    () => call(bot2, "shift_quest_milestone_submit", B, 6, "Helped Cee too", "Learned", null));
  check(!("error" in twin[0]) && twin[1].error?.startsWith("sq:milestone_open") &&
    (await count("select count(*) from public.shift_quest_instances where project_id = $1 and milestone = 6", [p1])) === 1,
    "two teammates pressing the same milestone at once make one quest and one refusal", twin);
  v = await call(bot, "shift_quest_withdraw", A, twin[0].instance_id, twin[0].version);
  await call(bot, "shift_quest_set_state", A, twin[0].instance_id, v, "archive");
  check((await code(db.query(
    "insert into public.shift_quest_instances (member_id, project_id, template_id, milestone, title, goal, next_step, criteria) " +
    "select member_id, project_id, template_id, milestone, title, goal, next_step, criteria from public.shift_quest_instances where id = $1",
    [a2.instance_id]))).includes("duplicate key"),
    "the database itself holds one open quest per project and milestone");
  const NOPLOT = "520000000000000099";
  await call(bot, "shift_quest_start", NOPLOT, "No Plot", false);
  check(await code(call(bot, "shift_quest_choose", NOPLOT, bySlug("make-it-exist").id, "g", "n", null, null)) === "no_project",
    "a milestone quest needs a current project, even through the old choose path");

  // A non-repeatable milestone done on the project is refused for every teammate.
  await db.query("update public.shift_quest_templates set repeatable = false where slug = 'give-them-a-reason-to-return'");
  const e4 = await reach(E, 4);
  check(e4.review.island.stage === 1, "milestone 4 approved on plot four");
  check(await code(call(bot, "shift_quest_milestone_submit", F, 4, "p", "r", null)) === "milestone_done",
    "a non-repeatable milestone already done is refused");
  await db.query("update public.shift_quest_templates set repeatable = true where slug = 'give-them-a-reason-to-return'");

  // --- Privacy of the map ---------------------------------------------------------------
  // Plot one: both members consented. Plot four (E, F): grown, nobody consented.
  m = await map(A);
  check(plotAt(m, 1).stage === 2 && plotAt(m, 1).visitor && plotAt(m, 1).name === "Plot One" && plotAt(m, 1).mine,
    "a member sees their consented plot in full", plotAt(m, 1));
  check(isPlain(plotAt(m, 4)) && plotAt(m, 4).mine === false,
    "another student sees a plot without full consent as its slot only (stage 0, no decorations, no name)", plotAt(m, 4));
  const own = plotAt(await map(E), 4);
  check(own.stage === 1 && own.mine === true && own.plain === false && own.name === null,
    "its own members see its real stage", own);
  m = await postMap();
  check(isPlain(plotAt(m, 4)) && plotAt(m, 1).stage === 2 && plotAt(m, 1).visitor === true,
    "the post map shows a consented plot's stage and only the slot of the others", m.plots);
  await call(bot, "shift_quest_island_optin", B, p1, false);
  check(isPlain(plotAt(await postMap(), 1)) && isPlain(plotAt(await map(C), 1)),
    "one member withdrawing consent hides the stage again, not just the name");
  await call(bot, "shift_quest_island_optin", B, p1, true);

  // --- Rest -----------------------------------------------------------------------------
  const ledgerBeforeRest = await ledgerCount();
  const r1q: string = await call(bot, "shift_quest_choose", D, bySlug("make-it-exist").id, "Build", "Start", null, null);
  const r2q: string = await call(bot, "shift_quest_choose", D, bySlug("take-the-keys").id, "Own it", "Check", null, null);
  const r3 = await call(bot, "shift_quest_milestone_submit", D, 1, "Interviews", "Learned", null);
  const versions = async () => (await db.query("select id, state, version from public.shift_quest_instances where member_id = $1 order by id", [await memberId(D)])).rows;
  const before = await versions();
  const rest = await call(bot, "shift_quest_rest", D, true);
  const after = await versions();
  check(rest.paused === 2 && rest.resumed === 0, "rest pauses active quests only", rest);
  check(after.filter((q) => q.state === "paused").length === 2 && after.find((q) => q.id === r3.instance_id).state === "submitted",
    "work already submitted stays with the reviewers", after);
  check(after.every((q) => q.version === before.find((b) => b.id === q.id).version + (q.state === "paused" ? 1 : 0)),
    "each paused quest's version is bumped once");
  check((await island(D)).resting === true, "the island shows the student resting");
  const wake = await call(bot, "shift_quest_rest", D, false);
  check(wake.resumed === 2 && (await island(D)).resting === false, "waking resumes them", wake);
  check((await ledgerCount()) === ledgerBeforeRest && Boolean(r1q && r2q), "resting costs nothing");
  check(await code(call(bot, "shift_quest_rest", D, null)) === "bad_input", "rest needs on or off");

  // --- Approvals lock their members in one sorted pass -------------------------------------
  // L and M build together on two projects; each submits on a different one.
  const px: string = await call(bot, "shift_quest_project_create", L, "Plot Ex", "software", null);
  await call(bot, "shift_quest_project_invite", L, px, M);
  await call(bot, "shift_quest_project_respond", M, px, true);
  const py: string = await call(bot, "shift_quest_project_create", M, "Plot Why", "software", null);
  await call(bot, "shift_quest_project_invite", M, py, L);
  await call(bot, "shift_quest_project_respond", L, py, true);
  await call(bot, "shift_quest_project_select", M, px);
  const qM = await call(bot, "shift_quest_milestone_submit", M, 1, "Problem notes", "Learned", null);
  await call(bot, "shift_quest_project_select", L, py);
  const qL = await call(bot, "shift_quest_milestone_submit", L, 1, "Problem notes", "Learned", null);
  const lockedNow = (sql: string, id: string) => code(db.query(`${sql} for no key update nowait`, [id]));
  const pid2 = Number(await scalar(bot2, "select pg_backend_pid()"));
  await bot.query("begin");
  await call(bot, "shift_quest_review_decide", R1, qM.submission_id, "approved", null, false);
  check((await lockedNow("select 1 from public.shift_quest_members where id = $1", await memberId(L))).includes("could not obtain lock"),
    "an approval locks every member it may touch up front, not only the submitter");
  const second = call(bot2, "shift_quest_review_decide", R2, qL.submission_id, "approved", null, false)
    .catch((error) => ({ error: (error as Error).message }));
  check(await waitsOnLock(pid2), "a second approval sharing those members waits its turn");
  await bot.query("commit");
  const secondDone: Json = await second;
  check(!("error" in secondDone) && secondDone.island?.stage === 1, "and goes through after the first: no deadlock", secondDone);
  await bot.query("begin");
  await call(bot, "shift_quest_issue_award", R1, qM.instance_id);
  check((await lockedNow("select 1 from public.shift_quest_plots where project_id = $1", px)).includes("could not obtain lock"),
    "an award retry takes the project's plot lock first, as an approval does");
  await bot.query("commit");
  // A proposed quest on plot Why: its approval holds the plot but grows nothing.
  await bot.query("begin");
  const side: string = await call(bot, "shift_quest_propose", L, "Side work", "Why", "Goal", "Criteria", "Next");
  const sideSub = await call(bot, "shift_quest_submit", L, side, 1, "Done", "Learned", null, "reviewers", null, []);
  await call(bot, "shift_quest_review_decide", R1, sideSub.submission_id, "approved", null, false);
  const leaving = call(bot2, "shift_quest_project_leave", M, py).catch((error) => ({ error: (error as Error).message }));
  check(await waitsOnLock(pid2), "leaving a project waits for an approval in progress on it");
  await bot.query("commit");
  check(!((await leaving) as Json)?.error, "and then goes through");


  // --- Leaving (or being erased) frees the milestones still being worked on -----------------
  // S2 holds milestone 2 (active), 5 (paused), 4 (asked to clarify) and 1 (with the reviewers).
  const pl: string = await call(bot, "shift_quest_project_create", S1, "Plot Leave", "software", null);
  for (const who of [S2, S3]) {
    await call(bot, "shift_quest_project_invite", S1, pl, who);
    await call(bot, "shift_quest_project_respond", who, pl, true);
  }
  const lActive: string = await call(bot, "shift_quest_choose", S2, bySlug("make-it-exist").id, "Build", "Start", null, null);
  const lPaused: string = await call(bot, "shift_quest_choose", S2, bySlug("take-the-keys").id, "Own it", "Check", null, null);
  await call(bot, "shift_quest_set_state", S2, lPaused, null, "pause");
  const lClar = await call(bot, "shift_quest_milestone_submit", S2, 4, "Two came back", "Learned", null);
  await call(bot, "shift_quest_review_decide", R1, lClar.submission_id, "clarification", "Who came back?", false);
  const lSub = await call(bot, "shift_quest_milestone_submit", S2, 1, "Interviews", "Learned", null);
  const lClarLater = await call(bot, "shift_quest_milestone_submit", S2, 3, "Three tried it", "Learned", null);
  const lWithdrawLater = await call(bot, "shift_quest_milestone_submit", S2, 6, "Helped a friend", "Learned", null);
  const questRow = async (id: string) =>
    (await db.query("select state, version from public.shift_quest_instances where id = $1", [id])).rows[0];
  const held = [lActive, lPaused, lClar.instance_id];
  const beforeLeave = await Promise.all(held.map(questRow));
  const subBefore = await questRow(lSub.instance_id);
  check(await code(call(bot, "shift_quest_choose", S1, bySlug("make-it-exist").id, "g", "n", null, null)) === "milestone_open",
    "while a teammate works on a milestone, it is theirs");
  await call(bot, "shift_quest_project_leave", S2, pl);
  const afterLeave = await Promise.all(held.map(questRow));
  check(afterLeave.every((q, n) => q.state === "archived" && q.version === beforeLeave[n].version + 1),
    "leaving archives the leaver's active, paused and clarification milestone quests (version + 1)", { beforeLeave, afterLeave });
  const subAfter = await questRow(lSub.instance_id);
  check(subAfter.state === "submitted" && subAfter.version === subBefore.version &&
    (await scalar(db, "select status from public.shift_quest_submissions where id = $1", [lSub.submission_id])) === "pending",
    "work already with the reviewers stays there", subAfter);
  const freed = await Promise.all(["make-it-exist", "take-the-keys", "give-them-a-reason-to-return"].map((slug) =>
    code(call(bot, "shift_quest_choose", S1, bySlug(slug).id, "Take it on", "Next", null, null))));
  check(freed.every((c) => c === "ok"), "the rest of the team can take those milestones at once", freed);
  check(await code(call(bot, "shift_quest_choose", S1, bySlug("find-something-worth-fixing").id, "g", "n", null, null)) === "milestone_open",
    "a milestone with the reviewers is still held");
  await call(bot, "shift_quest_review_decide", R1, lSub.submission_id, "declined", "Talk to two more people", false);
  check(await code(call(bot, "shift_quest_choose", S1, bySlug("find-something-worth-fixing").id, "Talk to people", "Ask", null, null)) === "ok",
    "deciding it frees the milestone");
  await call(bot, "shift_quest_review_decide", R1, lClarLater.submission_id, "clarification", "Who tried it?", false);
  check((await questRow(lClarLater.instance_id)).state === "archived" &&
    await code(call(bot, "shift_quest_choose", S1, bySlug("let-reality-surprise-you").id, "Test it", "Book", null, null)) === "ok",
    "asking a departed member for more archives their milestone quest, so the team can take it");
  await call(bot, "shift_quest_withdraw", S2, lWithdrawLater.instance_id, lWithdrawLater.version);
  check((await questRow(lWithdrawLater.instance_id)).state === "archived" &&
    await code(call(bot, "shift_quest_choose", S1, bySlug("help-another-builder-move").id, "Help", "Ask", null, null)) === "ok",
    "a departed member withdrawing a milestone frees it for the team");
  // Erasure frees what the erased member held too.
  const l7: string = await call(bot, "shift_quest_choose", S3, bySlug("improve-our-community").id, "Host a demo night", "Book a room", null, null);
  const l7Before = await questRow(l7);
  await call(bot, "shift_quest_admin_erase", ADMIN, await call(bot, "shift_quest_data_request", S3, "erasure", null));
  const l7After = await questRow(l7);
  check(l7After.state === "archived" && l7After.version === l7Before.version + 1, "erasure archives the erased member's open quests (version + 1)", l7After);
  check(await code(call(bot, "shift_quest_choose", S1, bySlug("improve-our-community").id, "Demo night", "Book", null, null)) === "ok",
    "and their teammates can take the milestone");

  if (!WAVE1) await seasonTests();
  else await waveOneTests();

  await Promise.all([db.end(), bot.end(), bot2.end()]);
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);

  // =====================================================================================
  // Wave 1 alone, then the upgrade of this populated database to wave 2
  // =====================================================================================
  async function waveOneTests(): Promise<void> {
    check((await scalar(db, "select to_regclass('public.shift_quest_seasons')")) === null &&
      (await count("select count(*) from pg_proc where proname in ('shift_quest_admin_season', 'shift_quest_squad_create', 'shift_quest_enqueue_island_post')")) === 0,
      "wave 1 has no season tables or functions");
    check((await island(A)).season === null && (await map(A)).goal === null && (await postMap()).season === null,
      "the island, the map and the post map answer without seasons");
    const exported = await call(bot, "shift_quest_data_export", A);
    check(!("recognitions" in exported) && !("squads" in exported) && exported.progress.some((p: Json) => p.kind === "tap") &&
      exported.projects.some((p: Json) => p.show_name_on_island === true), "/data exports the island core only", Object.keys(exported));
    const report = await call(bot, "shift_quest_admin_report", ADMIN, 14);
    check(report.island && typeof report.island.projects_by_stage === "object" && !("season" in report.island),
      "the report has the island core block only", report.island);
    const req: string = await call(bot, "shift_quest_data_request", F, "erasure", null);
    check((await call(bot, "shift_quest_admin_erase", ADMIN, req)).erased === true, "erasure works without seasons");
    await call(bot, "shift_quest_admin_role", ADMIN, G, "Isla Gee", "fulfillment", true);
    check((await call(bot, "shift_quest_session", G, null)).roles.includes("fulfillment"), "granting a role works without seasons");
    check((await call(bot, "shift_quest_session", A, null)).settings.squads === false &&
      (await call(bot, "shift_quest_admin_status", ADMIN)).settings.squads_enabled === false &&
      await code(call(bot, "shift_quest_admin_set", ADMIN, "squads", "on")) === "bad_input",
      "without seasons there is no squads switch: squads read as off");

    // Upgrade: the seasons migration, twice, on top of this data.
    const sql = readFileSync(SEASONS_MIGRATION, "utf8");
    await db.query(sql);
    await db.query(sql);
    check(Number(await call(bot, "shift_quest_schema_version")) === 2, "after the upgrade the schema version is 2");
    check((await island(A)).season === null && (await island(A)).project.stage === 2, "no season yet, the tree unchanged");
    const s = await call(bot, "shift_quest_admin_season", ADMIN, "Season 1", await day(-1), await day(30), await day(20),
      2, 3, 3, 1, await day(20), "Festival", true);
    const sa = (await island(A)).season;
    // Plot one: milestones 1 and 3 plus a confirmed repeat of 3, all submitted today; milestone 2 still pending.
    check(s.status === "active" && sa.stage_at_cutoff === 3 && sa.qualifies === "stage" && s.goal.count === 1 && s.goal.reached,
      "approvals made before the upgrade count in the new season by their submission time", { s, sa });
    const exported2 = await call(bot, "shift_quest_data_export", A);
    check(Array.isArray(exported2.recognitions) && Array.isArray(exported2.squads), "/data adds the season records");
    check(await code(call(bot, "shift_quest_squad_create", A, "After the upgrade", "Ship it")) === "squads_off",
      "squads start switched off after the upgrade");
    await call(bot, "shift_quest_admin_set", ADMIN, "squads", "on");
    check(typeof (await call(bot, "shift_quest_squad_create", A, "After the upgrade", "Ship it")) === "string",
      "and work once an admin switches them on");
    // A student who joins a project that already meets an unlock earns it at once.
    const uUp: string = await call(bot, "shift_quest_admin_unlock", ADMIN, s.id, "Upgrade badge", 1, await day(10), null);
    await call(bot, "shift_quest_project_invite", A, p1, H);
    await call(bot, "shift_quest_project_respond", H, p1, true);
    check((await count("select count(*) from public.shift_quest_season_unlock_earned where unlock_id = $1 and member_id = $2",
      [uUp, await memberId(H)])) === 1, "a joiner earns at once after the upgrade");
  }

  // =====================================================================================
  // Season 1 (wave 2)
  // =====================================================================================
  async function seasonTests(): Promise<void> {
    const today = await day(0);
    const season1 = (overrides: Partial<Record<string, unknown>> = {}) => {
      const o: Record<string, unknown> = {
        starts: null, ends: null, demo: null, table: null, stage: null, gm: null, gt: null, gd: null, gu: null,
        activate: false, clear: false, surprise: null, ...overrides,
      };
      return call<Json>(bot, "shift_quest_admin_season", ADMIN, "Season 1", o.starts, o.ends, o.demo, o.table, o.stage,
        o.gm, o.gt, o.gd, o.gu, o.activate, o.clear, o.surprise);
    };

    // --- Season 1: dates, qualification by submission time, goal ----------------------------
    check(await code(call(bot, "shift_quest_admin_season", A, "Season 1", await day(-30), await day(60), today, 2, 3, null, null, null, null, true)) === "not_authorized",
      "only admins run seasons");
    check(await code(call(bot, "shift_quest_admin_season", ADMIN, "Season 1", await day(10), await day(5), today, 2, 3, null, null, null, null, true)) === "bad_dates",
      "a season ends after it starts and holds its demo day");
    check(await code(call(bot, "shift_quest_admin_season", ADMIN, "Season 1", null, await day(60), today, 2, 3, null, null, null, null, true)) === "bad_dates",
      "a new season needs its dates");
    check(await code(call(bot, "shift_quest_admin_season", ADMIN, "Season 1", await day(-30), await day(60), today, 2, 3, 3, null, null, null, true)) === "bad_input",
      "a goal needs a milestone, a target and a deadline");
    check(await code(call(bot, "shift_quest_admin_season", ADMIN, "Season 1", await day(-30), await day(60), today, 4, 3, null, null, null, null, true)) === "bad_input",
      "the table bar is at most the stage bar");

    // Plot two: milestone 1 submitted days ago, milestone 2 today; demo day was yesterday.
    const c1 = await reach(C, 1);
    await backdateQuest(c1.instance_id, 5);
    await reach(C, 2);
    let season = await call(bot, "shift_quest_admin_season", ADMIN, "Season 1", await day(-30), await day(60), await day(-1), 2, 3,
      3, 2, today, "Island festival", true);
    const seasonId: string = season.id;
    check(season.status === "active" && season.goal.target === 2 && season.goal.reached === false, "Season 1 is active", season);
    let sc = (await island(C)).season;
    check(sc.name === "Season 1" && sc.days_to_demo === -1 && sc.stage_at_cutoff === 1 && sc.qualifies === null &&
      JSON.stringify(sc.season_milestones) === "[1]",
      "a milestone submitted after demo day does not count toward qualifying", sc);
    const c4 = await call(bot, "shift_quest_milestone_submit", C, 4, "Two came back", "Learned", null);
    await backdateQuest(c4.instance_id, 2);
    await call(bot, "shift_quest_review_decide", R1, c4.submission_id, "approved", null, false);
    sc = (await island(C)).season;
    check(sc.stage_at_cutoff === 2 && JSON.stringify(sc.season_milestones) === "[1,4]",
      "submitted before demo day and approved after it: it counts (review time never costs a slot)", sc);
    check(sc.qualifies === null, "two milestones without milestone 2 are not a gallery table", sc);
    season = await season1({ demo: today });
    check(season.id === seasonId && season.table_bar === 2 && season.stage_bar === 3 && season.goal?.target === 2 &&
      season.goal.unlock === "Island festival" && season.starts_on === (await day(-30)),
      "re-running /admin season with only demo day keeps every other value", season);
    sc = (await island(C)).season;
    check(sc.stage_at_cutoff === 3 && sc.qualifies === "table" && sc.days_to_demo === 0,
      "with milestone 2 by demo day: a gallery table, not yet the stage (no milestone 3)", sc);
    await reach(C, 3);
    sc = (await island(C)).season;
    check(sc.stage_at_cutoff === 4 && sc.qualifies === "stage", "with milestone 3 too: a stage slot", sc);
    check((await island(K)).season.qualifies === null && (await island(K)).season.stage_at_cutoff === 0, "no plot, no slot");
    check(await code(season1({ table: 5 })) === "bad_input", "an edit is validated against the stored values (table above stage)");

    // Goal: projects with milestone 3 submitted by the goal deadline, approved.
    check(sc.goal.count === 2 && sc.goal.reached === true && sc.goal.unlock === "Island festival" && sc.goal.reached_at,
      "plots one and two reached the goal, and it is marked", sc.goal);
    const d3 = await reach(D, 3);
    check((await postMap()).goal.count === 3, "plot three makes three");
    await db.query("update public.shift_quest_projects set archived_at = now() where id = $1", [p3]);
    m = await postMap();
    check(m.goal.count === 2 && !m.plots.some((p: Json) => p.slot === 3), "an archived project leaves the goal count and the map", m);
    await season1({ gd: await day(-1) });
    m = await postMap();
    check(m.goal.count === 0 && m.goal.reached === false && m.goal.reached_at === null,
      "moving the goal deadline re-checks it: work submitted after the deadline does not count", m.goal);
    await season1({ gd: await day(20) });
    m = await postMap();
    check(m.goal.count === 2 && m.goal.reached === true && m.season.name === "Season 1", "back to two before the deadline", m.goal);
    check(d3.review.island.stage >= 1, "plot three grew before it was archived");
    await db.query("update public.shift_quest_projects set archived_at = now() where id = $1", [p2]);
    m = await postMap();
    check(m.goal.count === 1 && m.goal.reached === true, "a reached goal stays reached when a project is archived later", m.goal);
    await db.query("update public.shift_quest_projects set archived_at = null where id = $1", [p2]);
    check(await code(season1({ clear: true, gt: 5 })) === "bad_input", "clearing the goal takes no goal values");
    check((await season1({ clear: true })).goal === null, "the goal is removed only when asked");
    season = await season1({ gm: 3, gt: 2, gd: await day(20), gu: "Island festival" });
    check(season.goal?.reached === true && season.goal.count === 2, "a goal set again is checked at once", season.goal);

    // --- Dated unlocks: the same item for everyone ------------------------------------------
    await call(bot, "shift_quest_admin_set", ADMIN, "reward_terms", "Island pilot terms.");
    await call(bot, "shift_quest_admin_rule", ADMIN, "island-sticker", 5, null, null, "Reach the count", "Human review", "Explained privately");
    await call(bot, "shift_quest_admin_rule", ADMIN, "island-capped", 7, 1, null, "Reach the count", "Human review", "Explained privately");
    await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");
    check(await code(call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Bad", 2, today, "no-such-rule")) === "rule_not_found",
      "an unlock's rule must be published");
    check(await code(call(bot, "shift_quest_admin_unlock", ADMIN, randomUUID(), "Bad", 2, today, null)) === "not_found", "an unlock needs a season");
    check(await code(call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Bad", 8, today, null)) === "bad_input", "counts are 1 to 7");

    const hasEarned = async (unlock: string, who: string) =>
      (await count("select count(*) from public.shift_quest_season_unlock_earned where unlock_id = $1 and member_id = $2",
        [unlock, await memberId(who)])) === 1;
    const credits = (unlock: string) => count("select count(*) from public.shift_quest_ledger where source_key like $1", [`unlock:${unlock}:%`]);
    const earned = (unlock: string) => count("select count(*) from public.shift_quest_season_unlock_earned where unlock_id = $1", [unlock]);

    // Plot one (A, B) counts 3 (1, 3 and a confirmed repeat of 3); plot two (C) 4; plot four (E, F) 1.
    const u2: string = await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Sticker pack", 2, await day(10), "island-sticker");
    check((await hasEarned(u2, A)) && (await hasEarned(u2, B)) && (await hasEarned(u2, C)) && (await earned(u2)) === 3 && (await credits(u2)) === 3,
      "everyone already at the count earns a new unlock at once, credited once each");
    check(!(await hasEarned(u2, E)) && !(await hasEarned(u2, F)), "a project below the count does not");
    const u3: string = await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Festival pin", 3, await day(10), "island-sticker");
    check((await hasEarned(u3, A)) && (await hasEarned(u3, C)) && !(await hasEarned(u3, E)),
      "a repeat of milestone 3 the reviewer confirmed as distinct counts toward the count");
    const uLate: string = await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Missed meetup", 1, await day(-1), "island-sticker");
    check((await hasEarned(uLate, C)) && !(await hasEarned(uLate, A)) && !(await hasEarned(uLate, E)),
      "a past deadline counts only work submitted by then (C's milestone 1 from five days ago)");
    const uCapA: string = await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Capped A", 1, await day(10), "island-capped");
    const uCapB: string = await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Capped B", 1, await day(10), "island-capped");
    check((await hasEarned(uCapA, E)) && (await hasEarned(uCapB, E)) && (await hasEarned(uCapA, L)) && (await hasEarned(uCapA, M)),
      "both capped unlocks are earned by everyone at the count");
    check((await count("select count(*) from public.shift_quest_ledger where reward_rule_id in (select id from public.shift_quest_reward_rules where key = 'island-capped') and member_id = $1", [await memberId(E)])) === 1,
      "but the rule's cap credits only one of them");
    const ledgerBeforeRerun = await ledgerCount();
    check(await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Sticker pack", 2, await day(10), "island-sticker") === u2 &&
      (await earned(u2)) === 3 && (await ledgerCount()) === ledgerBeforeRerun,
      "the same label updates the unlock; a re-run grants and credits nothing twice");

    const f2 = await reach(F, 2);
    check(f2.review.island.unlocks_earned === 2, "the approval that reaches the count earns the unlock for both members", f2.review.island);
    check((await hasEarned(u2, E)) && (await hasEarned(u2, F)) && (await credits(u2)) === 5, "every active member earns it, credited once each");
    check(!(await hasEarned(u3, F)), "a higher count is not earned yet");
    const eInbox: Json[] = (await call(bot, "shift_quest_inbox_list", E, false)).items;
    const notes = eInbox.filter((n) => n.kind === "unlock_earned");
    check(notes.some((n) => n.params.label === "Sticker pack" && n.params.amount === 5) &&
      notes.some((n) => n.params.label.startsWith("Capped") && n.params.amount === null),
      "each earner is told privately, with the amount credited", notes.map((n) => n.params));
    const retry = await call(bot, "shift_quest_review_decide", R1, f2.submission_id, "approved", null, false);
    check(retry.already === true && (await credits(u2)) === 5, "a retried approval earns nothing new");
    const f5 = await reach(F, 5);
    check((await credits(u2)) === 5 && (await hasEarned(u3, E)) && (await hasEarned(u3, F)),
      "growing further earns the next unlock, never the same one twice", f5.review.island);
    const eSeason = (await island(E)).season;
    check(eSeason.unlocks.find((u: Json) => u.id === u2).earned === true &&
      eSeason.unlocks.find((u: Json) => u.id === uLate).earned === false && eSeason.unlocks.find((u: Json) => u.id === uLate).expired === true,
      "the island shows what the student earned and which unlock has passed", eSeason.unlocks);
    // Joiners: a student who joins a project that already meets an unlock earns it at once.
    const u2Credits = await credits(u2);
    await call(bot, "shift_quest_project_invite", E, p4, I);
    await call(bot, "shift_quest_project_respond", I, p4, true);
    check((await hasEarned(u2, I)) && (await hasEarned(u3, I)) && (await credits(u2)) === u2Credits + 1,
      "a student who joins a project that already meets an unlock earns it at once, credited once");
    check((await call(bot, "shift_quest_inbox_list", I, false)).items.some((n: Json) => n.kind === "unlock_earned" && n.params.label === "Sticker pack"),
      "and is told privately");
    check(!(await hasEarned(uLate, I)), "but not an unlock the project missed");
    check((await scalar(db, "select actor_id from public.shift_quest_ledger where source_key = $1",
      [`unlock:${u2}:${await memberId(I)}`])) === null, "a join grant is a system grant (no actor)");
    await reach(E, 6);
    check((await credits(u2)) === u2Credits + 1, "the next approval grants nothing twice");
    await call(bot, "shift_quest_project_invite", E, p4, N);
    await call(bot, "shift_quest_project_respond", N, p4, true);
    check((await hasEarned(u2, N)) && !(await hasEarned(uLate, N)), "a second joiner too");
    await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Missed meetup", 1, await day(10), "island-sticker");
    check((await hasEarned(uLate, N)) && (await hasEarned(uLate, A)) && (await hasEarned(uLate, E)),
      "extending a deadline grants it to everyone who now meets it");
    check(await code(call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Missed meetup", 2, await day(10), "island-sticker")) === "unlock_has_grants" &&
      await code(call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Missed meetup", 1, await day(5), "island-sticker")) === "unlock_has_grants" &&
      await code(call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Missed meetup", 1, await day(10), null)) === "unlock_has_grants",
      "once earned, an unlock cannot get harder or change its rule");
    // Submitted before the deadline, approved after it: earned.
    const pEarly: string = await call(bot, "shift_quest_project_create", O, "Plot Early", "service", null);
    const o1 = await call(bot, "shift_quest_milestone_submit", O, 1, "Talked to five", "Learned", null);
    await backdateQuest(o1.instance_id, 2);
    const uEarly: string = await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Early bird", 1, await day(-1), null);
    check(!(await hasEarned(uEarly, O)), "pending work earns nothing yet");

    // Pending at the demo-day cutoff: milestones 1 and 2 sent two days ago, demo day yesterday, no mentor yet.
    const o2 = await call(bot, "shift_quest_milestone_submit", O, 2, "It runs", "Learned", null);
    await backdateQuest(o2.instance_id, 2);
    await season1({ demo: await day(-1) });
    const seasonReport = async () => (await call(bot, "shift_quest_admin_report", ADMIN, 14)).island.season;
    let so = (await island(O)).season;
    check(so.stage_at_cutoff === 0 && so.qualifies === null && so.stage_with_pending === 2 && so.qualifies_with_pending === "table",
      "work pending at the cutoff keeps the slot provisionally; the confirmed number counts approvals only", so);
    let rs = await seasonReport();
    check(rs.projects_at_table_bar_with_pending > rs.projects_at_table_bar && rs.milestones_pending_review >= 2,
      "staff see the bars with pending work and how much is left to review", rs);
    const pendingBefore = rs.milestones_pending_review;
    const o5 = await call(bot, "shift_quest_milestone_submit", O, 5, "Keys", "Learned", null);
    so = (await island(O)).season;
    check(so.stage_with_pending === 2 && (await seasonReport()).milestones_pending_review === pendingBefore,
      "work sent after the cutoff does not count, even provisionally", so);
    await call(bot, "shift_quest_withdraw", O, o5.instance_id, o5.version);
    await call(bot, "shift_quest_review_decide", R1, o2.submission_id, "declined", "Show it running", false);
    so = (await island(O)).season;
    rs = await seasonReport();
    check(so.stage_with_pending === 1 && so.qualifies_with_pending === null && rs.milestones_pending_review === pendingBefore - 1,
      "a decline takes it back out", { so, rs });
    await season1({ demo: today });
    await call(bot, "shift_quest_review_decide", R1, o1.submission_id, "approved", null, false);
    check((await hasEarned(uEarly, O)) && typeof pEarly === "string",
      "a submission pending at the deadline earns the unlock once approved");

    // Two approvals on one project at once: the second sees the first.
    const p5: string = await call(bot, "shift_quest_project_create", G, "Plot Five", "creative", null);
    await call(bot, "shift_quest_project_invite", G, p5, H);
    await call(bot, "shift_quest_project_respond", H, p5, true);
    await reach(G, 1);
    const g2 = await call(bot, "shift_quest_milestone_submit", G, 2, "Prototype", "Learned", null);
    const h3 = await call(bot, "shift_quest_milestone_submit", H, 3, "Testers", "Learned", null);
    const both = await overlap(bot,
      () => call(bot, "shift_quest_review_decide", R1, g2.submission_id, "approved", null, false),
      () => call(bot2, "shift_quest_review_decide", R2, h3.submission_id, "approved", null, false));
    check(both.every((r: Json) => !("error" in r)), "concurrent approvals on one project both succeed", both);
    const p5Members = [await memberId(G), await memberId(H)];
    const p5Earned = async (unlock: string) =>
      count("select count(*) from public.shift_quest_season_unlock_earned where unlock_id = $1 and member_id = any($2::uuid[])", [unlock, p5Members]);
    check((await p5Earned(u2)) === 2 && (await p5Earned(u3)) === 2, "the count-3 unlock is not missed when two approvals race", {
      u2: await p5Earned(u2), u3: await p5Earned(u3),
    });

  // Joining a project takes its members in the same sorted pass as an approval,
  // before touching the joiner's own row. Set-up that deadlocked the old order:
  // LO (lower id) is on plots A and B; HI is on B with no current project and
  // is invited to A. An approval on B queues for LO first; then HI joins A.
  // The old join locked HI's row, then waited for LO: a cycle once LO freed.
  if (!WAVE1) {
    const U1 = "530000000000000031";
    const U2 = "530000000000000032";
    for (const [id, name] of [[U1, "Joiner One"], [U2, "Joiner Two"]]) await call(bot, "shift_quest_start", id, name, false);
    const [LO, HI] = (await memberId(U1)) < (await memberId(U2)) ? [U1, U2] : [U2, U1];
    const pa: string = await call(bot, "shift_quest_project_create", LO, "Join A", "software", null);
    const pb: string = await call(bot, "shift_quest_project_create", LO, "Join B", "software", null);
    const pc: string = await call(bot, "shift_quest_project_create", HI, "Join C", "software", null);
    await call(bot, "shift_quest_project_invite", LO, pb, HI);
    await call(bot, "shift_quest_project_respond", HI, pb, true);
    await call(bot, "shift_quest_project_leave", HI, pc);
    check((await scalar(db, "select current_project_id from public.shift_quest_members where discord_user_id = $1", [HI])) === null,
      "race set-up: the joiner has no current project");
    await call(bot, "shift_quest_project_invite", LO, pa, HI);
    await call(bot, "shift_quest_project_select", LO, pb);
    const qB = await call(bot, "shift_quest_milestone_submit", LO, 1, "Problem notes", "Learned", null);
    const pid1 = Number(await scalar(bot, "select pg_backend_pid()"));
    const pidJoin = Number(await scalar(bot2, "select pg_backend_pid()"));
    await db.query("begin");
    await db.query("select 1 from public.shift_quest_members where id = $1 for no key update", [await memberId(LO)]);
    const approving = call(bot, "shift_quest_review_decide", R1, qB.submission_id, "approved", null, false)
      .catch((error) => ({ error: (error as Error).message }));
    check(await waitsOnLock(pid1), "race: the approval queues for the lower-id member first");
    const joining = call(bot2, "shift_quest_project_respond", HI, pa, true)
      .catch((error) => ({ error: (error as Error).message }));
    check(await waitsOnLock(pidJoin), "race: the join queues behind it");
    await db.query("commit");
    const [approved, joined] = [(await approving) as Json, (await joining) as Json];
    check(!approved?.error && !joined?.error, "a join racing an approval on a shared member never deadlocks", { approved, joined });
    check((await scalar(db,
      "select status from public.shift_quest_project_members where project_id = $1 and member_id = $2", [pa, await memberId(HI)])) === "active",
      "and the joiner is on the project");
  }
    check((await count("select count(*) from public.shift_quest_ledger where source_key = any($1::text[])",
      [p5Members.flatMap((mm) => [`unlock:${u2}:${mm}`, `unlock:${u3}:${mm}`])])) === 4, "and each is credited exactly once");

    // Awards paused: earned and told, no coins, and never paid later.
    await call(bot, "shift_quest_admin_set", ADMIN, "awards", "off");
    const p6: string = await call(bot, "shift_quest_project_create", K, "Plot Six", "other", null);
    const ledgerPaused = await ledgerCount();
    await reach(K, 1);
    await reach(K, 2);
    check((await hasEarned(u2, K)) && (await ledgerCount()) === ledgerPaused, "with awards paused the unlock is earned but nothing is credited");
    await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");
    await call(bot, "shift_quest_admin_unlock", ADMIN, seasonId, "Sticker pack", 2, await day(10), "island-sticker");
    check((await count("select count(*) from public.shift_quest_ledger where member_id = $1", [await memberId(K)])) === 0 && typeof p6 === "string",
      "a grant made while awards were off is not paid when they come back on");
    // A join racing the approval that reaches the next count: the join waits on the plot, then earns it too.
    const k3q = await call(bot, "shift_quest_milestone_submit", K, 3, "Two testers", "Learned", null);
    await call(bot, "shift_quest_project_invite", K, p6, S1);
    const joinRace = await overlap(bot,
      () => call(bot, "shift_quest_review_decide", R1, k3q.submission_id, "approved", null, false),
      () => call(bot2, "shift_quest_project_respond", S1, p6, true));
    check(joinRace.every((r) => !(r && typeof r === "object" && "error" in r)) && (await hasEarned(u3, K)) && (await hasEarned(u3, S1)) &&
      (await count("select count(*) from public.shift_quest_ledger where source_key = $1", [`unlock:${u3}:${await memberId(S1)}`])) === 1,
      "a student joining while an approval reaches the next count earns it, credited once", joinRace);

    // --- Recognition ----------------------------------------------------------------------------
    const key = randomUUID();
    const balA = (await call(bot, "shift_quest_coins", A)).balance as number;
    const rec = await call(bot, "shift_quest_admin_recognize", ADMIN, A, 10, "Best lesson from a failed test", "Best lesson", key);
    check(rec.duplicate === false && typeof rec.entry_id === "string", "a recognition with coins", rec);
    check((await call(bot, "shift_quest_coins", A)).balance === balA + 10, "credited to the student");
    const recAgain = await call(bot, "shift_quest_admin_recognize", ADMIN, A, 10, "Best lesson from a failed test", "Best lesson", key);
    check(recAgain.duplicate === true && recAgain.entry_id === rec.entry_id && (await call(bot, "shift_quest_coins", A)).balance === balA + 10,
      "a retried recognition is a no-op");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, B, 10, "Other", null, key)) === "bad_input",
      "a request key reused for someone else is refused");
    const row = (await db.query("select * from public.shift_quest_ledger where id = $1", [rec.entry_id])).rows[0];
    check(row.kind === "recognition" && row.source_key === `recognition:${key}` && row.reason === "recognition",
      "the ledger row is a recognition and holds no admin text", row);
    check((await call(bot, "shift_quest_inbox_list", A, false)).items.some((n: Json) => n.kind === "recognized" &&
      n.params.category === "Best lesson" && n.params.amount === 10 && n.params.reason === "Best lesson from a failed test"),
      "the student is told privately, with the reason");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, ADMIN, 5, "Me", null, randomUUID())) === "conflict_of_interest", "not oneself");
    check(await code(call(bot, "shift_quest_admin_recognize", R1, A, 5, "x", null, randomUUID())) === "not_authorized", "admins only");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, A, 201, "x", null, randomUUID())) === "bad_amount", "at most 200 coins");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, A, -1, "x", null, randomUUID())) === "bad_amount", "never negative");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, A, 0, "  ", null, randomUUID())) === "missing_text", "a reason is required");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, A, 0, "x", null, "short")) === "bad_input", "a request key is required");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, NOBODY, 0, "x", null, randomUUID())) === "not_found", "only known members");
    const ledgerZero = await ledgerCount();
    const zero = await call(bot, "shift_quest_admin_recognize", ADMIN, B, 0, "Most useful to another builder", "Most useful", randomUUID());
    check(zero.entry_id === null && (await ledgerCount()) === ledgerZero, "recognition without coins writes no ledger row", zero);
    const k2 = randomUUID();
    const recRace: Json[] = await overlap(bot,
      () => call(bot, "shift_quest_admin_recognize", ADMIN, C, 3, "Surprise", null, k2),
      () => call(bot2, "shift_quest_admin_recognize", ADMIN, C, 3, "Surprise", null, k2));
    check(recRace.filter((r: Json) => r.duplicate).length === 1 &&
      (await count("select count(*) from public.shift_quest_ledger where source_key = $1", [`recognition:${k2}`])) === 1,
      "two clicks at once credit once", recRace);
    // Surprise recognitions (no category): one per member per season unless the admin sets another cap.
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, C, 0, "Another surprise", "  ", randomUUID())) === "recognition_cap",
      "one surprise recognition per member per season by default (a blank category is a surprise)");
    check((await call(bot, "shift_quest_admin_recognize", ADMIN, C, 3, "Surprise", null, k2)).duplicate === true,
      "retrying the one that filled the cap is still a no-op, not a refusal");
    await call(bot, "shift_quest_admin_set", ADMIN, "awards", "off");
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, C, 5, "x", "Best demo", randomUUID())) === "awards_paused",
      "no coins while awards are paused");
    check((await call(bot, "shift_quest_admin_recognize", ADMIN, C, 0, "Kind words", "Kindest feedback", randomUUID())).duplicate === false,
      "recognition without coins still works");
    check((await scalar(db, "select season_id from public.shift_quest_recognitions where request_key = $1", [key])) === seasonId,
      "recognitions are filed under the active season");
    await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");
    // Category awards (demo-day categories) have no count cap.
    for (const cat of ["Best lesson", "Most useful", "Bravest test"]) {
      await call(bot, "shift_quest_admin_recognize", ADMIN, C, 0, "Won in the room", cat, randomUUID());
    }
    check((await count("select count(*) from public.shift_quest_recognitions where member_id = $1 and category is not null",
      [await memberId(C)])) === 4, "category awards are not capped by count");
    // The admin sets the surprise cap per season; leaving it out keeps it.
    check((await season1({ surprise: 2 })).surprise_cap === 2 && (await season1({ gu: "Island festival" })).surprise_cap === 2,
      "the season's surprise cap is admin-set, and an edit without it keeps it");
    const k3 = randomUUID();
    await call(bot, "shift_quest_admin_recognize", ADMIN, C, 0, "Second surprise", null, k3);
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, C, 0, "Third surprise", null, randomUUID())) === "recognition_cap",
      "a raised cap allows exactly that many");
    await season1({ surprise: 0 });
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, D, 0, "Surprise", null, randomUUID())) === "recognition_cap",
      "a cap of 0 turns surprise recognitions off");
    check(await code(season1({ surprise: -1 })) === "bad_input", "a negative cap is refused");
    await season1({ surprise: 1 });
    // Coins: at most 200 from recognitions per member per season, category awards included.
    await call(bot, "shift_quest_admin_recognize", ADMIN, D, 150, "Most useful to another builder", "Most useful", randomUUID());
    check(await code(call(bot, "shift_quest_admin_recognize", ADMIN, D, 60, "Again", "Best demo", randomUUID())) === "recognition_cap",
      "at most 200 coins from recognitions per member per season");
    check((await call(bot, "shift_quest_admin_recognize", ADMIN, D, 50, "Again", "Best demo", randomUUID())).duplicate === false,
      "up to the coin cap exactly");

    check((await count("select count(*) from public.shift_quest_ledger where (kind = 'award' and reason not in ('quest_award', 'season_unlock')) or (kind = 'recognition' and reason <> 'recognition')")) === 0,
      "award and recognition ledger rows hold no free text");

    // --- Squads ---------------------------------------------------------------------------------
    check(await code(call(bot, "shift_quest_squad_create", A, "Night owls", "Ship a demo")) === "squads_off" &&
      (await call(bot, "shift_quest_session", A, null)).settings.squads === false,
      "squads stay off until an admin switches them on");
    check(await code(call(bot, "shift_quest_admin_set", R1, "squads", "on")) === "not_authorized", "only admins switch squads");
    const squadsOn = await call(bot, "shift_quest_admin_set", ADMIN, "squads", "on");
    check(squadsOn.settings.squads_enabled === true && (await call(bot, "shift_quest_session", A, null)).settings.squads === true,
      "the squads switch needs nothing published first", squadsOn.settings);
    check(await code(call(bot, "shift_quest_squad_create", A, "Night owls", "Ship a demo", 0)) === "bad_input", "a squad lasts 1 to 28 days");
    await call(bot, "shift_quest_start", R1, "Isla Rev One", false);
    check(await code(call(bot, "shift_quest_squad_create", R1, "Mentor pair", "Help")) === "staff_no_squad", "staff cannot start a squad");
    const squad: string = await call(bot, "shift_quest_squad_create", A, "Night owls", "Ship a demo by demo day");
    const sq = (await db.query("select starts_on::text, ends_on::text, (ends_on - starts_on) as span from public.shift_quest_squads where id = $1", [squad])).rows[0];
    check(sq.starts_on === today && sq.span === 13, "a two-week window from today", sq);
    check(await code(call(bot, "shift_quest_squad_create", A, "Second", "x")) === "squad_limit", "one squad per member per season");
    check(await code(call(bot, "shift_quest_squad_invite", A, squad, R1)) === "staff_no_squad", "staff cannot be invited");
    check(await code(call(bot, "shift_quest_squad_view", R1, squad)) === "staff_no_squad" &&
      JSON.stringify(await call(bot, "shift_quest_squad_mine", R1)) === "[]", "staff see no squad");
    await call(bot, "shift_quest_squad_invite", A, squad, B);
    const inv = (await call(bot, "shift_quest_inbox_list", B, false)).items.find((n: Json) => n.kind === "squad_invite");
    check(inv?.params.squad_id === squad && inv.params.name === "Night owls" && inv.params.from === NAMES[A], "the invite arrives privately", inv);
    check(await code(call(bot, "shift_quest_squad_view", B, squad)) === "not_squad_member", "an invitee sees nothing before accepting");
    check(await code(call(bot, "shift_quest_squad_view", C, squad)) === "not_squad_member", "outsiders see nothing");
    check(await code(call(bot, "shift_quest_squad_invite", C, squad, D)) === "not_squad_member", "outsiders cannot invite");
    check(await code(call(bot, "shift_quest_squad_invite", A, squad, NOBODY)) === "invitee_not_started", "invitees must have run /start");
    check(await code(call(bot, "shift_quest_squad_invite", A, squad, A)) === "already_member", "not oneself");
    check(await code(call(bot, "shift_quest_squad_invite", A, squad, B)) === "already_member", "not twice");
    await call(bot, "shift_quest_squad_respond", B, squad, true);
    check(await code(call(bot, "shift_quest_squad_respond", B, squad, true)) === "no_invite", "accepting twice is refused");
    let view = await call(bot, "shift_quest_squad_view", A, squad);
    let mine: Json[] = await call(bot, "shift_quest_squad_mine", A);
    check(view.phase === "forming" && view.running === false && view.members_active === 2 &&
      mine.find((s) => s.id === squad)?.running === false, "two members: the squad is still forming", { view, mine });
    check(view.milestones_gained === null && view.members.every((x: Json) => Object.keys(x).sort().join(",") === "me,name"),
      "a forming squad shows no progress number, and members never carry one", view);
    await call(bot, "shift_quest_squad_invite", A, squad, C);
    await call(bot, "shift_quest_squad_invite", B, squad, D);
    check(await code(call(bot, "shift_quest_squad_invite", A, squad, E)) === "squad_full", "at most four, live invites included");
    await db.query("update public.shift_quest_squad_members set created_at = now() - interval '3 days 1 minute' where squad_id = $1 and member_id = $2",
      [squad, await memberId(C)]);
    check(await code(call(bot, "shift_quest_squad_respond", C, squad, true)) === "no_invite" &&
      !(await call<Json[]>(bot, "shift_quest_squad_mine", C)).some((s) => s.id === squad),
      "an invite expires after 3 days");
    await call(bot, "shift_quest_squad_invite", A, squad, E);
    await db.query("update public.shift_quest_squad_members set created_at = now() - interval '2 days 23 hours' where squad_id = $1 and member_id = $2",
      [squad, await memberId(E)]);
    const eInvite = (await call<Json[]>(bot, "shift_quest_squad_mine", E)).find((s) => s.id === squad);
    const eInvitedAt = await scalar<Date>(db, "select created_at from public.shift_quest_squad_members where squad_id = $1 and member_id = $2",
      [squad, await memberId(E)]);
    check(eInvite?.status === "invited" && Math.abs(new Date(eInvite.invite_expires_at).getTime() - (eInvitedAt.getTime() + 3 * 86_400_000)) < 1000,
      "an invite under 3 days old is live and says when it expires", eInvite);
    check(await code(call(bot, "shift_quest_squad_withdraw", B, squad, E)) === "no_invite", "only the member who invited can withdraw it");
    await call(bot, "shift_quest_squad_withdraw", A, squad, E);
    check(await code(call(bot, "shift_quest_squad_respond", E, squad, true)) === "no_invite" &&
      !(await call(bot, "shift_quest_inbox_list", E, false)).items.some((n: Json) => n.kind === "squad_invite" && n.params.squad_id === squad),
      "a withdrawn invite cannot be accepted and leaves the invitee's inbox");
    await call(bot, "shift_quest_squad_invite", A, squad, C);
    await call(bot, "shift_quest_squad_respond", C, squad, false);
    await call(bot, "shift_quest_squad_invite", A, squad, E);
    // Switched off: nobody starts, invites or answers; what exists stays visible to its members.
    await call(bot, "shift_quest_admin_set", ADMIN, "squads", "off");
    const offCodes = [
      await code(call(bot, "shift_quest_squad_create", F, "Early birds", "Interview five people")),
      await code(call(bot, "shift_quest_squad_invite", A, squad, J)),
      await code(call(bot, "shift_quest_squad_respond", E, squad, true)),
      await code(call(bot, "shift_quest_squad_respond", E, squad, false)),
    ];
    check(offCodes.every((c) => c === "squads_off"), "while squads are off, nobody starts a squad, invites or answers", offCodes);
    check((await code(call(bot, "shift_quest_squad_view", A, squad))) === "ok" &&
      (await call<Json[]>(bot, "shift_quest_squad_mine", E)).some((s) => s.id === squad && s.status === "invited"),
      "a squad and its invites stay as they were");
    await call(bot, "shift_quest_admin_set", ADMIN, "squads", "on");
    const other: string = await call(bot, "shift_quest_squad_create", F, "Early birds", "Interview five people");
    await call(bot, "shift_quest_squad_invite", F, other, E);
    await call(bot, "shift_quest_squad_respond", E, other, true);
    check(await code(call(bot, "shift_quest_squad_respond", E, squad, true)) === "squad_limit", "accepting a second squad is refused");
    check((await call<Json[]>(bot, "shift_quest_squad_mine", E)).length === 2, "the student sees both squads they are in or invited to");
    await call(bot, "shift_quest_squad_respond", D, squad, true);
    view = await call(bot, "shift_quest_squad_view", A, squad);
    check(view.phase === "running" && view.running === true && view.members_active === 3, "three members: the squad is running", view);

    // Progress in the window, each project once: plot one's earlier work moves before the window.
    for (const q of [ms1.instance_id, b1.instance_id, again3.instance_id]) await backdateQuest(q, 3);
    await call(bot, "shift_quest_review_decide", R1, a2b.submission_id, "approved", null, false);
    await reach(A, 7);
    view = await call(bot, "shift_quest_squad_view", A, squad);
    check(view.name === "Night owls" && view.members.length === 3 &&
      view.members.every((x: Json) => Object.keys(x).sort().join(",") === "me,name"),
      "members carry names only, never a number per member", view);
    // Plot one (A, B): milestones 2 and 7 in the window; plot three (D): milestone 3.
    check(view.milestones_gained === 3, "the squad's one number counts plot one once, though two members share it", view);
    check(view.members.some((x: Json) => x.me) && view.days_left === 14, "the view marks the caller and the days left", view);
    await call(bot, "shift_quest_squad_leave", B, squad);
    check(await code(call(bot, "shift_quest_squad_view", B, squad)) === "not_squad_member", "after leaving, nothing is visible");
    check(await code(call(bot, "shift_quest_squad_leave", B, squad)) === "not_squad_member", "leaving twice is refused");
    view = await call(bot, "shift_quest_squad_view", A, squad);
    check(view.phase === "forming" && view.milestones_gained === null, "down to two, it is forming again and shows no number", view);
    await call(bot, "shift_quest_admin_role", ADMIN, F, NAMES[F], "reviewer", true);
    check((await code(call(bot, "shift_quest_squad_view", E, other))) === "ok" &&
      !(await call(bot, "shift_quest_squad_view", E, other)).members.some((x: Json) => x.name === NAMES[F]),
      "a member made staff leaves their squad at once");
    await call(bot, "shift_quest_admin_role", ADMIN, F, NAMES[F], "reviewer", false);
    await db.query("update public.shift_quest_squads set starts_on = starts_on - 20, ends_on = ends_on - 20 where id = $1", [squad]);
    check(await code(call(bot, "shift_quest_squad_invite", A, squad, J)) === "squad_closed", "an ended squad takes no invites");
    check(await code(call(bot, "shift_quest_squad_respond", E, squad, true)) === "squad_closed", "nor joins");
    const round2: string = await call(bot, "shift_quest_squad_create", A, "Round two", "Second sprint");
    check(typeof round2 === "string", "once the window ends, a new squad can start");
    view = await call(bot, "shift_quest_squad_view", A, squad);
    check(view.days_left === 0 && view.phase === "ended" &&
      (view.members_active >= 3 ? typeof view.milestones_gained === "number" : view.milestones_gained === null),
      "an ended squad stays visible; its group number shows only with 3 or more members", view);
    for (const who of [G, H]) {
      await call(bot, "shift_quest_squad_invite", A, round2, who);
      await call(bot, "shift_quest_squad_respond", who, round2, true);
    }

    // --- Weekly island post ------------------------------------------------------------------------
    const MON_1830 = "2026-11-16T11:30:00Z"; // Monday 18:30 in Bangkok, ISO week 2026-W47
    check(Number(await call(bot, "shift_quest_enqueue_island_post", MON_1830)) === 0, "no island post while sharing is off");
    await call(bot, "shift_quest_admin_set", ADMIN, "celebrate_channel", "910000000000000001");
    await call(bot, "shift_quest_admin_set", ADMIN, "sharing", "on");
    await db.query("update public.shift_quest_seasons set status = 'draft' where id = $1", [seasonId]);
    check(Number(await call(bot, "shift_quest_enqueue_island_post", MON_1830)) === 0, "no island post without an active season");
    await db.query("update public.shift_quest_seasons set status = 'active' where id = $1", [seasonId]);
    check(Number(await call(bot, "shift_quest_enqueue_island_post", "2026-11-16T10:59:00Z")) === 0, "not before 18:00 Monday");
    check(Number(await call(bot, "shift_quest_enqueue_island_post", "2026-11-16T12:00:00Z")) === 0, "not after 18:59 Monday");
    check(Number(await call(bot, "shift_quest_enqueue_island_post", "2026-11-17T11:30:00Z")) === 0, "not on a Tuesday");
    check(Number(await call(bot, "shift_quest_enqueue_island_post", MON_1830)) === 1, "Monday evening queues the island post");
    check(Number(await call(bot, "shift_quest_enqueue_island_post", "2026-11-16T11:45:00Z")) === 0, "once a week");
    const post = (await db.query("select * from public.shift_quest_outbox where dedupe_key = 'island:2026-W47'")).rows[0];
    check(post?.kind === "island_weekly" && post.channel_key === "celebrate" && post.params.week === "2026-W47" &&
      post.params.goal_target === 2 && typeof post.params.goal_count === "number", "an island post for the celebrate channel", post);
    const postText = JSON.stringify(post.params);
    check(![...Object.values(NAMES), "Plot One", ...memberIds].some((s) => postText.includes(s)), "the post's params name nobody");
    check(Number(await call(bot, "shift_quest_enqueue_island_post", "2026-11-23T11:05:00Z")) === 1, "next Monday queues the next week");
    const claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows;
    check(claimed.some((r) => r.kind === "island_weekly" && r.channel_id === "910000000000000001"), "the bot picks it up for the channel");
    m = await postMap();
    check(m.goal?.target === 2 && m.season?.name === "Season 1" && isPlain(plotAt(m, 4)) && plotAt(m, 1).stage >= 3,
      "the post map has the goal, the season, and plain plots where consent is missing", m);

    // --- A second season --------------------------------------------------------------------------
    await call(bot, "shift_quest_admin_season", ADMIN, "Season 2", await day(61), await day(120), await day(90), 2, 3, null, null, null, null, false);
    check((await island(A)).season.name === "Season 1", "a draft season does not replace the active one");
    await call(bot, "shift_quest_admin_season", ADMIN, "Season 2", await day(61), await day(120), await day(90), 2, 3, null, null, null, null, true);
    check((await count("select count(*) from public.shift_quest_seasons where status = 'active'")) === 1 &&
      (await scalar(db, "select status from public.shift_quest_seasons where id = $1", [seasonId])) === "closed",
      "activating a season closes the other");
    isl = await island(A);
    check(isl.season.name === "Season 2" && isl.season.goal === null && isl.project.stage >= 3 &&
      isl.season.stage_at_cutoff === 0 && isl.season.qualifies === null,
      "Season 2 starts from the current tree but counts only work submitted in it", isl);
    check((await postMap()).goal === null, "no goal configured, no goal shown");
    const plot1 = plotAt(await map(A), 1);
    const plot4 = plotAt(await map(E), 4);
    check(plot1.visitor && plot1.lantern && !plot1.key && plot4.key && plot4.helper && plot4.visitor === false,
      "decorations follow milestones 3, 5, 6 and 7", { plot1, plot4 });

    const exported = await call(bot, "shift_quest_data_export", A);
    check(exported.recognitions.some((r: Json) => r.category === "Best lesson") && exported.squads.length >= 2 &&
      exported.season_unlocks.length >= 1 && exported.progress.some((p: Json) => p.kind === "tap") &&
      exported.projects.some((p: Json) => p.show_name_on_island === true),
      "/data exports island records too", { r: exported.recognitions, s: exported.squads, u: exported.season_unlocks });

    // --- Erasure ------------------------------------------------------------------------------------
    const eId = await memberId(E);
    const reqE: string = await call(bot, "shift_quest_data_request", E, "erasure", null);
    const solo: string = await call(bot, "shift_quest_squad_create", J, "Solo sprint", "J private target words");
    await call(bot, "shift_quest_squad_invite", J, solo, G);
    const reqJ: string = await call(bot, "shift_quest_data_request", J, "erasure", null);
    // N names a squad O joins, and a project only Q was invited to.
    const shared: string = await call(bot, "shift_quest_squad_create", N, "Hidden name", "N private target words");
    await call(bot, "shift_quest_squad_invite", N, shared, O);
    await call(bot, "shift_quest_squad_respond", O, shared, true);
    const secret: string = await call(bot, "shift_quest_project_create", N, "Secret Plot", "other", null);
    await call(bot, "shift_quest_project_invite", N, secret, Q);
    const reqN: string = await call(bot, "shift_quest_data_request", N, "erasure", null);
    for (const r of [reqE, reqJ, reqN]) await call(bot, "shift_quest_admin_erase", ADMIN, r);
    check((await count("select count(*) from public.shift_quest_squad_members where member_id = $1 and status in ('active', 'invited')", [eId])) === 0,
      "an erased member's squad memberships end");
    check((await count("select count(*) from public.shift_quest_squads where target like '%private target%' or name in ('Solo sprint', 'Hidden name')")) === 0,
      "every squad they named loses its words, also one others are still in");
    check((await count("select count(*) from public.shift_quest_inbox where params::text like '%Solo sprint%' or params::text like '%Hidden name%'")) === 0 &&
      (await count("select count(*) from public.shift_quest_inbox where kind = 'squad_invite' and params->>'name' = '[erased]'")) >= 2,
      "and in other people's squad invites");
    check((await count("select count(*) from public.shift_quest_inbox where params::text like '%Secret Plot%'")) === 0,
      "a project name they wrote leaves other people's invites");
    check((await count("select count(*) from public.shift_quest_season_unlock_earned where member_id = $1", [eId])) >= 1,
      "earned unlocks stay, keyed by the opaque ID");
    check((await count("select count(*) from public.shift_quest_inbox where params::text like '%Isla Jay%' or params::text like '%Isla Enn%'")) === 0,
      "their name leaves other people's squad invites");

    // --- Report ---------------------------------------------------------------------------------------
    const report = await call(bot, "shift_quest_admin_report", ADMIN, 14);
    const islandReport = report.island;
    check(islandReport && typeof islandReport.projects_by_stage === "object" && islandReport.taps_in_window >= 3,
      "the report counts stages and taps", islandReport);
    check(islandReport.season?.goal === null && islandReport.squads_active >= 1 && islandReport.unlocks_earned_in_window >= 2 &&
      islandReport.recognitions_in_window >= 3, "and season, unlock, recognition and squad totals", islandReport);
    const reportText = JSON.stringify(report);
    check(![...Object.keys(NAMES), ...Object.values(NAMES), "Plot One", "Night owls", ...memberIds].some((s) => reportText.includes(s)),
      "the report names no person, project or squad");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
