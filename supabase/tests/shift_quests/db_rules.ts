/**
 * SHIFT High quest database tests: the spec's acceptance criteria, run against
 * the real functions with real concurrent connections.
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

// Synthetic Discord IDs.
const ADMIN = "100000000000000001";
const R1 = "200000000000000001";
const R2 = "200000000000000002";
const FUL = "300000000000000001";
const A = "400000000000000001";
const B = "400000000000000002";
const C = "400000000000000003";
const NOBODY = "499999999999999999";

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

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: every app call
  const bot2 = await connect(botUrl!); // a second bot connection for races

  // --- Privileges -----------------------------------------------------------
  for (const role of ["anon", "authenticated"]) {
    await db.query(`set role ${role}`);
    check((await code(call(db, "shift_quest_session", A, "x"))).includes("permission denied"),
      `${role} cannot call quest functions`);
    check((await code(db.query("select * from public.shift_quest_members"))).includes("permission denied"),
      `${role} cannot read quest tables`);
    await db.query("reset role");
  }
  check((await code(bot.query("select * from public.shift_quest_ledger"))).includes("permission denied"),
    "bot cannot read tables directly");
  check((await code(bot.query("select public.shift_quest__issue_award($1, null)", [randomUUID()]))).includes("permission denied"),
    "bot cannot call internal helpers");
  check((await code(call(bot, "shift_quest_bootstrap_admin", R1, "x"))).includes("permission denied"),
    "bot cannot bootstrap an admin");

  // Every shift_quest function, table and sequence, from the catalog: nothing
  // reaches PUBLIC, anon or authenticated (the Data API); the bot executes every
  // entry point and nothing else, and reads no table.
  const fns: Json[] = (await db.query(`
    select p.oid::regprocedure::text as sig, p.proname,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
      has_function_privilege('shift_quest_bot', p.oid, 'EXECUTE') as bot,
      p.proacl is null or exists (
        select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'
      ) as public
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'shift\\_quest\\_%'
    order by 1`)).rows;
  const internal = (f: Json) => f.proname.startsWith("shift_quest__") || f.proname === "shift_quest_bootstrap_admin";
  check(fns.length >= 100 && fns.some((f) => f.proname === "shift_quest_island_post_map") &&
    fns.some((f) => f.proname === "shift_quest_schema_version"), "the privilege check sees every shift_quest function", fns.length);
  const open = fns.filter((f) => f.public || f.anon || f.authenticated).map((f) => f.sig);
  check(open.length === 0, "no shift_quest function is executable by PUBLIC, anon or authenticated", open);
  // Website-only entry points (091100, 091200, 093000, 094000, 095000): only the website can check a canvas, it alone
  // reads ownership this way, only it reads the campfire's names and the menu links, and the player's character,
  // wallet, consent, island news and the digest job are the website's.
  const webOnly = (f: Json) => f.proname.startsWith("shift_quest_canvas_") ||
    ["shift_quest_ownership_get", "shift_quest_campfire", "shift_quest_island_links",
      "shift_quest_character", "shift_quest_wallet", "shift_quest_consent_get", "shift_quest_consent_adult",
      "shift_quest_consent_link", "shift_quest_consent_import", "shift_quest_consent_parent_view",
      "shift_quest_consent_parent_answer", "shift_quest_consent_parent_withdraw", "shift_quest_island_news",
      "shift_quest_digest_inputs", "shift_quest_digest_save"].includes(f.proname);
  const missing = fns.filter((f) => !internal(f) && !webOnly(f) && !f.bot).map((f) => f.sig);
  check(missing.length === 0, "the bot can execute every shift_quest entry point but the website-only ones", missing);
  const leaked = fns.filter((f) => internal(f) && f.bot).map((f) => f.sig);
  check(leaked.length === 0, "no helper (shift_quest__*) and not bootstrap_admin is granted to the bot", leaked);
  const webLeaked = fns.filter((f) => webOnly(f) && f.bot).map((f) => f.sig);
  check(webLeaked.length === 0, "no website-only function (canvas link, ownership read, campfire read, menu links) is granted to the bot", webLeaked);
  const rels: Json[] = (await db.query(`
    select c.relname, c.relkind, c.relrowsecurity,
      exists (
        select 1 from aclexplode(coalesce(c.relacl, acldefault((case when c.relkind = 'S' then 's' else 'r' end)::"char", c.relowner))) a
        where a.grantee = 0
      ) as public,
      bool_or(case when c.relkind = 'S'
        then has_sequence_privilege(r.role, c.oid, 'USAGE, SELECT, UPDATE')
        else has_table_privilege(r.role, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') end) as granted
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated'), ('shift_quest_bot')) r(role)
    where n.nspname = 'public' and c.relname like 'shift\\_quest\\_%' and c.relkind in ('r', 'p', 'v', 'm', 'S')
    group by c.oid, c.relname, c.relkind, c.relrowsecurity
    order by 1`)).rows;
  check(rels.filter((r) => r.relkind === "r").length >= 30 && rels.some((r) => r.relname === "shift_quest_squads"),
    "the privilege check sees every shift_quest table", rels.length);
  const noRls = rels.filter((r) => r.relkind === "r" && !r.relrowsecurity).map((r) => r.relname);
  check(noRls.length === 0, "every shift_quest table has row level security on", noRls);
  const readable = rels.filter((r) => r.public || r.granted).map((r) => r.relname);
  check(readable.length === 0, "no shift_quest table or sequence is open to PUBLIC, anon, authenticated or the bot", readable);

  // --- Join and choose ------------------------------------------------------
  const anon = await call(bot, "shift_quest_session", NOBODY, "Nobody");
  check(anon.member_id === null, "session for an unknown user creates nothing");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_members")) === 0, "no member rows yet");

  await call(db, "shift_quest_bootstrap_admin", ADMIN, "Admin");
  check(await code(call(db, "shift_quest_bootstrap_admin", R1, "x")) === "admin_exists", "bootstrap only once");
  check(await code(call(bot, "shift_quest_admin_role", A, R1, "Rev One", "reviewer", true)) === "not_authorized",
    "a non-admin cannot grant roles");
  await call(bot, "shift_quest_admin_role", ADMIN, R1, "Rev One", "reviewer", true);
  await call(bot, "shift_quest_admin_role", ADMIN, R2, "Rev Two", "reviewer", true);
  await call(bot, "shift_quest_admin_role", ADMIN, FUL, "Ful", "fulfillment", true);
  check(await code(call(bot, "shift_quest_admin_role", ADMIN, ADMIN, "Admin", "admin", false)) === "last_admin",
    "the last admin cannot remove themselves");

  for (const [id, name] of [[A, "Aye"], [B, "Bee"], [C, "Cee"]]) {
    const s = await call(bot, "shift_quest_start", id, name, false);
    check(s.onboarded === true && s.prefs.reminders_opt_in === false && s.prefs.notify_dm === false,
      `${name} starts with reminders and DMs off`);
  }
  check(await code(call(bot, "shift_quest_project_list", NOBODY)) === "not_started", "unstarted users are refused");

  const project: string = await call(bot, "shift_quest_project_create", A, "Trip Splitter", "software", "Split costs");
  check(await code(call(bot, "shift_quest_project_invite", A, project, NOBODY)) === "invitee_not_started",
    "cannot invite someone who has not started");
  await call(bot, "shift_quest_project_invite", A, project, B);
  check(await code(call(bot, "shift_quest_project_view", B, project)) === "not_project_member",
    "an invite alone does not open the project");
  await call(bot, "shift_quest_project_respond", B, project, true);
  check((await call(bot, "shift_quest_project_view", B, project)).members.length === 2, "accepted teammate joins");

  const templates: Json[] = await call(bot, "shift_quest_templates", A);
  check(templates.length === 7, "seven starter quests", templates.length);
  const t = (slug: string) => templates.find((x) => x.slug === slug)!.id as string;

  // --- Manage without penalty -------------------------------------------------
  const i1: string = await call(bot, "shift_quest_choose", A, t("make-it-exist"), "Ship a calculator", "Sketch screens", null, null);
  check(await code(call(bot, "shift_quest_update", A, i1, 99, "x", null, null, null, false)) === "stale_version",
    "an edit against an old version is refused");
  let v: number = await call(bot, "shift_quest_set_state", A, i1, 1, "pause");
  v = await call(bot, "shift_quest_set_state", A, i1, v, "resume");
  v = await call(bot, "shift_quest_update", A, i1, v, "Ship a smaller calculator", "One screen", null, null, false);
  check(v === 4, "pause, resume and resize bump the version", v);
  check(Number(await scalar(db, "select count(*) from public.shift_quest_ledger")) === 0, "no deductions for pausing or resizing");

  // --- Revisions and stale approvals -----------------------------------------
  let sub = await call(bot, "shift_quest_submit", A, i1, v, "It works for one trip", "Learned forms", null, "reviewers", "I built it", []);
  const s1 = sub.submission_id;
  sub = await call(bot, "shift_quest_submit", A, i1, sub.version, "Now two trips", "Learned state", "https://example.org/demo", "reviewers", "I built it", []);
  const s2 = sub.submission_id;
  check(await code(call(bot, "shift_quest_review_decide", R1, s1, "approved", null, false)) === "stale_revision",
    "a superseded revision cannot be approved");
  v = await call(bot, "shift_quest_withdraw", A, i1, sub.version);
  check(await code(call(bot, "shift_quest_review_decide", R1, s2, "approved", null, false)) === "stale_revision",
    "a withdrawn revision cannot be approved");
  check(await code(call(bot, "shift_quest_submit", A, i1, v, "x", "y", "http://insecure", "reviewers", null, [])) === "bad_url",
    "artifact links must be https");

  // Conflicts of interest.
  await call(bot, "shift_quest_admin_role", ADMIN, B, "Bee", "reviewer", true);
  sub = await call(bot, "shift_quest_submit", A, i1, v, "Two trips, shared", "Learned teamwork", null, "team", "Logic", [B]);
  const s3 = sub.submission_id;
  check(await code(call(bot, "shift_quest_review_get", B, s3)) === "conflict_of_interest", "a teammate cannot review");
  check(await code(call(bot, "shift_quest_review_decide", B, s3, "approved", null, false)) === "conflict_of_interest",
    "a teammate cannot approve");
  await call(bot, "shift_quest_admin_role", ADMIN, B, "Bee", "reviewer", false);
  const queueR1 = await call(bot, "shift_quest_review_queue", R1);
  check(queueR1.submissions.some((q: Json) => q.submission_id === s3), "submission appears in the review queue");

  // Approval while awards are off: approved, nothing credited.
  let res = await call(bot, "shift_quest_review_decide", R1, s3, "approved", null, false);
  check(res.award.issued === false && res.award.reason === "awards_paused", "awards off: approval credits nothing", res);
  check(Number(await scalar(db, "select count(*) from public.shift_quest_ledger")) === 0, "ledger still empty");

  // --- Reward configuration ----------------------------------------------------
  let err = await code(call(bot, "shift_quest_admin_set", ADMIN, "awards", "on"));
  check(err === "config_incomplete", "awards refuse to switch on without terms and a rule", err);
  await call(bot, "shift_quest_admin_set", ADMIN, "reward_terms", "Published terms for the pilot.");
  await call(bot, "shift_quest_admin_rule", ADMIN, "build", 10, 3, null, "Agreed quest done", "Human review", "Reversals explained privately");
  await call(bot, "shift_quest_admin_template_rule", ADMIN, "let-reality-surprise-you", "build");
  await call(bot, "shift_quest_admin_template_rule", ADMIN, "make-it-exist", "build");
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");

  res = await call(bot, "shift_quest_issue_award", R1, i1);
  check(res.issued === false && res.reason === "no_reward_rule", "a quest keeps the (absent) rule it was chosen under", res);

  // Rule version pinning.
  const i2: string = await call(bot, "shift_quest_choose", A, t("let-reality-surprise-you"), "Let 3 classmates try", "Book a slot", null, null);
  await call(bot, "shift_quest_admin_rule", ADMIN, "build", 20, 3, null, "v2", "v2", "v2");
  sub = await call(bot, "shift_quest_submit", A, i2, 1, "Nobody finished the flow", "My onboarding was confusing; I will cut a step", null, "reviewers", null, []);

  // Concurrent approvals of the same revision: one credit.
  const [ra, rb] = await Promise.all([
    call(bot, "shift_quest_review_decide", R1, sub.submission_id, "approved", null, false).catch((e) => ({ error: e.message })),
    call(bot2, "shift_quest_review_decide", R2, sub.submission_id, "approved", null, false).catch((e) => ({ error: e.message })),
  ]);
  check(!("error" in ra) && !("error" in rb), "both concurrent approvals return cleanly", [ra, rb]);
  check([ra, rb].filter((r: Json) => r.already).length === 1, "exactly one of them did the work", [ra, rb]);
  await call(bot, "shift_quest_review_decide", R1, sub.submission_id, "approved", null, false);
  const awardsI2 = await db.query("select amount from public.shift_quest_ledger where instance_id = $1", [i2]);
  check(awardsI2.rowCount === 1, "retried approvals create one credit", awardsI2.rowCount);
  check(awardsI2.rows[0]?.amount === 10, "credit uses the rule version pinned at choose time (v1 = 10)", awardsI2.rows[0]);
  check((await call(bot, "shift_quest_coins", A)).balance === 10, "negative user test with a credible reflection earns the award");

  // --- Team credit ----------------------------------------------------------------
  const i3: string = await call(bot, "shift_quest_choose", A, t("make-it-exist"), "Second slice", "Pair with Bee", null, null);
  sub = await call(bot, "shift_quest_submit", A, i3, 1, "Export to sheet", "Learned CSV", null, "team", "Backend", [B]);
  res = await call(bot, "shift_quest_review_decide", R1, sub.submission_id, "approved", null, true);
  check(res.award.reason === "contributions_pending", "team award waits for every teammate's confirmation", res.award);
  check(await code(call(bot, "shift_quest_contribution_respond", B, sub.submission_id, true, "  ")) === "missing_text",
    "a teammate must state their own contribution");
  await call(bot, "shift_quest_contribution_respond", B, sub.submission_id, true, "Frontend table");
  res = await call(bot, "shift_quest_issue_award", R1, i3);
  check(res.reason === "team_allocation_missing", "no team split is inferred without a configured rule", res);

  await call(bot, "shift_quest_admin_rule", ADMIN, "build", 10, 3, "each_confirmed", "v3", "v3", "v3");
  const i4: string = await call(bot, "shift_quest_choose", A, t("make-it-exist"), "Third slice", "Pair again", null, null);
  sub = await call(bot, "shift_quest_submit", A, i4, 1, "Share link", "Learned URLs", null, "team", "Backend", [B]);
  await call(bot, "shift_quest_contribution_respond", B, sub.submission_id, true, "Copy and testing");
  res = await call(bot, "shift_quest_review_decide", R2, sub.submission_id, "approved", null, false);
  check(res.award.reason === "distinct_not_confirmed", "a repeat needs a reviewer to confirm distinct learning", res.award);
  // The approval stands; the reviewer confirms distinctness by retrying after a fresh submission.
  const i5: string = await call(bot, "shift_quest_choose", A, t("make-it-exist"), "Fourth slice", "Pair again", null, null);
  sub = await call(bot, "shift_quest_submit", A, i5, 1, "Offline mode", "Learned caching", null, "team", "Backend", [B]);
  await call(bot, "shift_quest_contribution_respond", B, sub.submission_id, true, "Testing offline");
  res = await call(bot, "shift_quest_review_decide", R2, sub.submission_id, "approved", null, true);
  check(res.award.issued === true && res.award.members === 2, "confirmed team members are each credited", res.award);
  check((await call(bot, "shift_quest_coins", B)).balance === 10, "teammate received their own credit");

  // --- Clarification, decline, appeal --------------------------------------------
  const i6: string = await call(bot, "shift_quest_choose", B, t("find-something-worth-fixing"), "Interview 3 people", "Write questions", null, null);
  sub = await call(bot, "shift_quest_submit", B, i6, 1, "Talked to two", "Hmm", null, "reviewers", null, []);
  check(await code(call(bot, "shift_quest_review_decide", R1, sub.submission_id, "clarification", "  ", false)) === "feedback_required",
    "clarification needs a specific next step");
  await call(bot, "shift_quest_review_decide", R1, sub.submission_id, "clarification", "Say which problem you picked and why", false);
  const quests: Json[] = await call(bot, "shift_quest_my_quests", B, false);
  const q6 = quests.find((q) => q.id === i6)!;
  check(q6.state === "clarification" && q6.latest_review.feedback.includes("problem"), "student sees the clarification");
  sub = await call(bot, "shift_quest_submit", B, i6, q6.version, "Two Grade 11 students; picked revision timing", "It is my problem too", null, "reviewers", null, []);
  await call(bot, "shift_quest_review_decide", R1, sub.submission_id, "declined", "Needs a third conversation as agreed", false);
  await call(bot, "shift_quest_appeal", B, i6, "The third person cancelled; I documented it");
  check(await code(call(bot, "shift_quest_review_decide", R1, sub.submission_id, "approved", null, false)) === "appeal_needs_other_reviewer",
    "the decliner cannot decide the appeal");
  check(!(await call(bot, "shift_quest_review_queue", R1)).submissions.some((q: Json) => q.submission_id === sub.submission_id),
    "the appeal is not in the decliner's queue");
  res = await call(bot, "shift_quest_review_decide", R2, sub.submission_id, "approved", null, false);
  check(res.already === false, "a different reviewer decides the appeal");

  // Self-review.
  await call(bot, "shift_quest_start", R1, "Rev One", false);
  // Island milestones need a current project.
  await call(bot, "shift_quest_project_create", R1, "Mentor guide", "other", null);
  const i7: string = await call(bot, "shift_quest_choose", R1, t("improve-our-community"), "Write a guide", "Outline", null, null);
  sub = await call(bot, "shift_quest_submit", R1, i7, 1, "Guide", "Learned", null, "reviewers", null, []);
  check(await code(call(bot, "shift_quest_review_decide", R1, sub.submission_id, "approved", null, false)) === "conflict_of_interest",
    "a reviewer cannot approve their own quest");

  // --- Coworking never mints coins ------------------------------------------------
  const before = Number(await scalar(db, "select count(*) from public.shift_quest_ledger"));
  await call(bot, "shift_quest_work_start", C, "Fix the login bug");
  check(await code(call(bot, "shift_quest_work_start", C, "again")) === "session_open", "one open session at a time");
  await call(bot, "shift_quest_work_end", C, "Found it");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_ledger")) === before, "coworking creates no ledger entry");

  // --- Help survives pauses and missing channels ------------------------------------
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "off");
  const help: string = await call(bot, "shift_quest_help_create", C, "Stuck deploying", "community", "student", null);
  check(typeof help === "string", "help works while awards are paused");
  let claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows;
  check(!claimed.some((r) => r.kind === "help_community"), "help post waits while no help channel is set");
  check(await scalar(db, "select status from public.shift_quest_outbox where dedupe_key = $1", [`help:${help}`]) === "blocked",
    "the waiting post is parked, not lost");
  await call(bot, "shift_quest_admin_set", ADMIN, "help_channel", "900000000000000001");
  claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows;
  const helpMsg = claimed.find((r) => r.kind === "help_community");
  check(helpMsg?.channel_id === "900000000000000001" && helpMsg?.member_user_id === C, "setting the channel releases it");
  await call(bot, "shift_quest_outbox_done", helpMsg.id, false, "discord 500", null, false);
  check(await scalar(db, "select status from public.shift_quest_outbox where id = $1", [helpMsg.id]) === "pending",
    "a failed send is retried later");
  await db.query("update public.shift_quest_outbox set next_attempt_at = now() where id = $1", [helpMsg.id]);
  claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows;
  await call(bot, "shift_quest_outbox_done", helpMsg.id, true, null, "123", false);
  check(await scalar(db, "select status from public.shift_quest_outbox where id = $1", [helpMsg.id]) === "sent", "then sent");
  // A crashed sender's lease expires and the message is claimed again.
  await db.query("update public.shift_quest_outbox set status = 'sending', lease_until = now() - interval '1 minute' where id = $1", [helpMsg.id]);
  claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows;
  check(claimed.some((r) => r.id === helpMsg.id), "an expired lease is reclaimed after a restart");
  await call(bot, "shift_quest_outbox_done", helpMsg.id, true, null, "123", false);

  // --- Ownership ---------------------------------------------------------------------
  check(await code(call(bot, "shift_quest_ownership_set", A, project, "access", "demonstrated", null, true, null)) === "continuation_required",
    "a mentor-held account is not independent without a continuation path");
  check(await code(call(bot, "shift_quest_ownership_set", A, project, "costs", "not_applicable", null, false, null)) === "reason_required",
    "not applicable needs a reason");
  const own1 = await call(bot, "shift_quest_ownership_set", A, project, "export", "needs_help", "Cannot export from the tool", false, null);
  const own2 = await call(bot, "shift_quest_ownership_set", A, project, "export", "needs_help", "Still stuck", false, null);
  check(own1.help_request_id && own1.help_request_id === own2.help_request_id, "a blocked check opens one help request");
  check((await call(bot, "shift_quest_help_queue", R1)).some((h: Json) => h.id === own1.help_request_id), "mentors see it in the queue");

  // --- Sharing -------------------------------------------------------------------------
  const share: string = await call(bot, "shift_quest_share_create", A, "celebration", "Our trip splitter got its first real user", i2, null);
  check(await code(call(bot, "shift_quest_share_confirm", A, share)) === "sharing_paused", "nothing is shared while sharing is off");
  check(await code(call(bot, "shift_quest_admin_set", ADMIN, "sharing", "on")) === "config_incomplete", "sharing needs a channel");
  await call(bot, "shift_quest_admin_set", ADMIN, "celebrate_channel", "900000000000000002");
  await call(bot, "shift_quest_admin_set", ADMIN, "sharing", "on");
  check(await call(bot, "shift_quest_share_confirm", A, share) === "queued", "a confirmed preview is queued");
  check(await call(bot, "shift_quest_share_confirm", A, share) === "queued", "a second click is a no-op");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_outbox where dedupe_key = $1", [`share:${share}`])) === 1,
    "one post per share");
  const rec: string = await call(bot, "shift_quest_share_create", A, "recognition", "Bee fixed my layout", null, B);
  check(await call(bot, "shift_quest_share_confirm", A, rec) === "awaiting_peer", "recognition waits for the peer");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_outbox where dedupe_key = $1", [`share:${rec}`])) === 0,
    "nothing posted before the peer agrees");
  check(await call(bot, "shift_quest_share_respond", B, rec, true) === "queued", "posted after the peer agrees");
  const rec2: string = await call(bot, "shift_quest_share_create", A, "recognition", "Cee helped", null, C);
  await call(bot, "shift_quest_share_confirm", A, rec2);
  check(await call(bot, "shift_quest_share_respond", C, rec2, false) === "peer_declined", "a peer can say no");
  check(await code(call(bot, "shift_quest_share_create", A, "celebration", "x", i6, null)) === "not_found",
    "cannot celebrate someone else's quest");

  // Private journal entries stay private.
  await call(bot, "shift_quest_progress_add", B, "Private worry", null, null, null, null, "private", null);
  await call(bot, "shift_quest_progress_add", B, "Shared update", "CSS grid", "Mobile", null, null, "team", null);
  const teamView: Json[] = await call(bot, "shift_quest_progress_list", A, project, 10);
  check(teamView.length === 1 && teamView[0].changed === "Shared update", "teammates see only entries shared with the team", teamView);
  check(await code(call(bot, "shift_quest_progress_list", C, project, 10)) === "not_project_member", "outsiders see nothing");

  // --- Redemption -------------------------------------------------------------------------
  let cat = await call(bot, "shift_quest_catalog_list", A);
  check(cat.live === false && cat.items.length === 0, "no catalog is shown while redemption is not live");
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");
  err = await code(call(bot, "shift_quest_admin_set", ADMIN, "redemption", "on"));
  check(err === "config_incomplete", "redemption refuses to go live half-configured");
  await call(bot, "shift_quest_admin_set", ADMIN, "redemption_terms", "Terms");
  await call(bot, "shift_quest_admin_set", ADMIN, "fulfillment_process", "Private form handled by ops");
  await call(bot, "shift_quest_admin_set", ADMIN, "fulfillment_owner", "Ops");
  const sticker = await call(bot, "shift_quest_admin_catalog", ADMIN, null, "Sticker", null, 5, 1, true);
  await call(bot, "shift_quest_admin_set", ADMIN, "redemption", "on");
  cat = await call(bot, "shift_quest_catalog_list", A);
  check(cat.live === true && cat.items.length === 1, "catalog shown once live");

  // Two students race for the last unit.
  const race = await Promise.all([
    code(call(bot, "shift_quest_redeem", A, sticker.id, randomUUID(), sticker.cost)),
    code(call(bot2, "shift_quest_redeem", B, sticker.id, randomUUID(), sticker.cost)),
  ]);
  check(race.filter((r) => r === "ok").length === 1 && race.includes("out_of_stock"), "one unit cannot be reserved twice", race);

  // One student fires two requests that together cost more than their balance.
  const spendA = (await call(bot, "shift_quest_coins", A)).balance as number;
  check(spendA > 0, "Aye has coins to spend", spendA);
  const hoodie = await call(bot, "shift_quest_admin_catalog", ADMIN, null, "Hoodie", null, spendA, 5, true);
  const overspend = await Promise.all([
    code(call(bot, "shift_quest_redeem", A, hoodie.id, randomUUID(), hoodie.cost)),
    code(call(bot2, "shift_quest_redeem", A, hoodie.id, randomUUID(), hoodie.cost)),
  ]);
  check(overspend.filter((r) => r === "ok").length === 1 && overspend.includes("insufficient_balance"),
    "concurrent requests cannot overspend", overspend);
  check((await call(bot, "shift_quest_coins", A)).balance === 0, "the reserved cost is no longer spendable");

  // Duplicate clicks on the same confirm button.
  const balanceB = (await call(bot, "shift_quest_coins", B)).balance as number;
  const cheap = await call(bot, "shift_quest_admin_catalog", ADMIN, null, "Pin", null, 1, 5, true);
  const k2 = randomUUID();
  const [d1, d2] = await Promise.all([
    call(bot, "shift_quest_redeem", B, cheap.id, k2, cheap.cost),
    call(bot2, "shift_quest_redeem", B, cheap.id, k2, cheap.cost).catch(() => call(bot2, "shift_quest_redeem", B, cheap.id, k2, cheap.cost)),
  ]);
  check(d1.redemption_id === d2.redemption_id, "duplicate clicks create one request");
  check((await call(bot, "shift_quest_coins", B)).balance === balanceB - 1, "and debit once");

  // Cancellation releases exactly once.
  const stockBefore = Number(await scalar(db, "select stock_available from public.shift_quest_catalog where id = $1", [cheap.id]));
  const [c1, c2] = await Promise.all([
    call(bot, "shift_quest_redeem_cancel", B, d1.redemption_id),
    call(bot2, "shift_quest_redeem_cancel", B, d1.redemption_id),
  ]);
  check([c1, c2].filter(Boolean).length === 1, "concurrent cancels release once", [c1, c2]);
  check((await call(bot, "shift_quest_coins", B)).balance === balanceB, "coins returned once");
  check(Number(await scalar(db, "select stock_available from public.shift_quest_catalog where id = $1", [cheap.id])) === stockBefore + 1,
    "stock returned once");

  // Fulfillment.
  const k3 = randomUUID();
  const r3 = await call(bot, "shift_quest_redeem", B, cheap.id, k3, cheap.cost);
  check((await call(bot, "shift_quest_fulfill_queue", FUL)).some((x: Json) => x.id === r3.redemption_id), "operator sees the request");
  check(await code(call(bot, "shift_quest_fulfill_queue", A)) === "not_authorized", "students cannot see the fulfillment queue");
  check(await call(bot, "shift_quest_fulfill_update", FUL, r3.redemption_id, "complete", null) === "complete", "operator completes it");
  check(await call(bot, "shift_quest_fulfill_update", FUL, r3.redemption_id, "cancel", "late") === "unchanged",
    "a completed request cannot be cancelled into a refund");

  // Pausing awards pauses redemption, never help.
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "off");
  check(await code(call(bot, "shift_quest_redeem", B, cheap.id, randomUUID(), cheap.cost)) === "redemption_paused", "pausing awards pauses redemption");
  check(typeof (await call(bot, "shift_quest_help_create", B, "Need a tester", "mentors", "student", null)) === "string",
    "help still works");

  // --- Reversals and the append-only ledger -------------------------------------------------
  const entry = (await db.query("select id, amount from public.shift_quest_ledger where kind = 'award' and member_id = (select id from public.shift_quest_members where discord_user_id = $1) limit 1", [B])).rows[0];
  check(await code(call(bot, "shift_quest_admin_reverse", ADMIN, entry.id, entry.amount + 1, "too much", randomUUID())) === "bad_amount",
    "cannot reverse more than was awarded");
  const rk = randomUUID();
  const rev = await call(bot, "shift_quest_admin_reverse", ADMIN, entry.id, 3, "Duplicate of an earlier quest", rk);
  const rev2 = await call(bot, "shift_quest_admin_reverse", ADMIN, entry.id, 3, "Duplicate of an earlier quest", rk);
  check(rev.duplicate === false && rev2.duplicate === true, "a retried reversal is a no-op");
  const inbox = await call(bot, "shift_quest_inbox_list", B, false);
  check(inbox.items.some((n: Json) => n.kind === "reversal"), "the student is told privately");
  check((await code(db.query("update public.shift_quest_ledger set amount = 1"))).includes("ledger_append_only"), "ledger rows cannot be edited");
  check((await code(db.query("delete from public.shift_quest_ledger"))).includes("ledger_append_only"), "or deleted");

  // --- Reminders ----------------------------------------------------------------------------
  const now = new Date();
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  const dow = bkk.getUTCDay();
  const hour = bkk.getUTCHours();
  check(await code(call(bot, "shift_quest_update_prefs", A, true, [], null, null)) === "reminder_time_required", "reminders need a time");
  await bot.query("select public.shift_quest_update_prefs($1, true, $2::smallint[], $3::smallint, null)", [A, [dow], hour]);
  check(Number(await call(bot, "shift_quest_enqueue_reminders")) === 0, "no reminders while the feature is off");
  await call(bot, "shift_quest_admin_set", ADMIN, "reminders", "on");
  check(Number(await call(bot, "shift_quest_enqueue_reminders")) === 1, "only the opted-in student is reminded");
  check(Number(await call(bot, "shift_quest_enqueue_reminders")) === 0, "once per day");
  await bot.query("select public.shift_quest_update_prefs($1, false, null, null, null)", [A]);
  claimed = (await bot.query("select * from public.shift_quest_outbox_claim(50)")).rows;
  check(!claimed.some((r) => r.kind === "reminder"), "opting out cancels a queued reminder");

  // --- Data rights ------------------------------------------------------------------------
  const exported = await call(bot, "shift_quest_data_export", B);
  check(exported.quests.length >= 1 && exported.progress.length === 2, "export includes the student's own records");
  const reqId: string = await call(bot, "shift_quest_data_request", B, "erasure", null);
  check(await code(call(bot, "shift_quest_admin_erase", A, reqId)) === "not_authorized", "only admins erase");
  const ledgerBefore = Number(await scalar(db, "select count(*) from public.shift_quest_ledger"));
  await call(bot, "shift_quest_admin_erase", ADMIN, reqId);
  check((await call(bot, "shift_quest_session", B, "Bee")).member_id === null, "an erased student is no longer linked");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_ledger")) === ledgerBefore, "the ledger stays whole");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_progress p join public.shift_quest_members m on m.id = p.member_id where m.erased_at is not null")) === 0,
    "their journal is gone");
  check((await call(bot, "shift_quest_project_view", A, project)).members.length === 1, "teammates no longer see them");

  // --- Regressions from the independent review ------------------------------------------
  const D = "400000000000000004";
  const E = "400000000000000005";
  const R3 = "200000000000000003";
  await call(bot, "shift_quest_admin_role", ADMIN, R3, "Rev Three", "reviewer", true);
  for (const [id, name] of [[R3, "Rev Three"], [D, "Dee"], [E, "Eee"]]) await call(bot, "shift_quest_start", id, name, false);

  // A reviewer who shares any project with the student is conflicted, wherever the quest is filed.
  const shared: string = await call(bot, "shift_quest_project_create", D, "Shared", "creative", null);
  await call(bot, "shift_quest_project_invite", D, shared, R3);
  await call(bot, "shift_quest_project_respond", R3, shared, true);
  const solo: string = await call(bot, "shift_quest_project_create", D, "Solo", "creative", null);
  const dq: string = await call(bot, "shift_quest_choose", D, t("make-it-exist"), "Goal", "Next", null, null);
  const ds = await call(bot, "shift_quest_submit", D, dq, 1, "Evidence", "Reflection", null, "reviewers", null, []);
  check(await code(call(bot, "shift_quest_review_decide", R3, ds.submission_id, "approved", null, false)) === "conflict_of_interest",
    "a teammate from another project cannot approve");
  await call(bot, "shift_quest_project_leave", R3, shared);
  check(await code(call(bot, "shift_quest_review_decide", R3, ds.submission_id, "approved", null, false)) === "conflict_of_interest",
    "leaving the project just before deciding does not clear the conflict");

  // One appeal per declined revision.
  await call(bot, "shift_quest_review_decide", R1, ds.submission_id, "declined", "Needs a demo", false);
  await call(bot, "shift_quest_appeal", D, dq, "The demo is linked in my reflection");
  await call(bot, "shift_quest_review_decide", R2, ds.submission_id, "declined", "Still needs a demo", false);
  check(await code(call(bot, "shift_quest_appeal", D, dq, "Again")) === "appeal_used", "a declined appeal ends the route");

  // Erasing a teammate who never confirmed does not block the award; their words leave with them.
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");
  await call(bot, "shift_quest_project_invite", D, solo, E);
  await call(bot, "shift_quest_project_respond", E, solo, true);
  await call(bot, "shift_quest_help_create", E, "zebra-secret deploy question", "community", "student", null);
  const recE: string = await call(bot, "shift_quest_share_create", E, "recognition", "zebra-secret thanks", null, D);
  await call(bot, "shift_quest_share_confirm", E, recE);
  const dq2: string = await call(bot, "shift_quest_choose", D, t("make-it-exist"), "Goal 2", "Next", null, null);
  const ds2 = await call(bot, "shift_quest_submit", D, dq2, 1, "Evidence", "Reflection", null, "team", "Backend", [E]);
  const eraseE: string = await call(bot, "shift_quest_data_request", E, "erasure", null);
  await call(bot, "shift_quest_admin_erase", ADMIN, eraseE);
  res = await call(bot, "shift_quest_review_decide", R2, ds2.submission_id, "approved", null, false);
  check(res.award.issued === true, "an erased teammate's pending confirmation does not block the award", res.award);
  check(Number(await scalar(db, "select count(*) from public.shift_quest_outbox where params::text like '%zebra-secret%'")) === 0,
    "erasure strips their words from queued and sent messages");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_inbox where params::text like '%zebra-secret%' or params::text like '%Eee%'")) === 0,
    "erasure strips their name and words from other people's notices");
  check(Number(await scalar(db, "select count(*) from public.shift_quest_ledger where kind = 'award' and reason not in ('quest_award', 'season_unlock')")) === 0,
    "the append-only ledger holds no student-written text");

  // Redemption: price changes are refused; a student cannot cancel once an operator started.
  await call(bot, "shift_quest_admin_catalog", ADMIN, cheap.id, null, null, null, 20, true);
  await call(bot, "shift_quest_admin_set", ADMIN, "redemption", "on");
  check(await code(call(bot, "shift_quest_redeem", D, cheap.id, randomUUID(), cheap.cost + 1)) === "price_changed",
    "a price change between preview and confirm is refused");
  const dr = await call(bot, "shift_quest_redeem", D, cheap.id, randomUUID(), cheap.cost);
  await call(bot, "shift_quest_fulfill_update", FUL, dr.redemption_id, "start", null);
  check(await code(call(bot, "shift_quest_redeem_cancel", D, dr.redemption_id)) === "bad_state", "no student cancel after the operator started");
  let deadlocks = 0;
  for (let n = 0; n < 6; n += 1) {
    const r = await call(bot, "shift_quest_redeem", D, cheap.id, randomUUID(), cheap.cost);
    const outcomes = await Promise.all([
      code(call(bot, "shift_quest_fulfill_update", FUL, r.redemption_id, "start", null)),
      code(call(bot2, "shift_quest_redeem_cancel", D, r.redemption_id)),
    ]);
    if (outcomes.some((o) => o.includes("deadlock"))) deadlocks += 1;
    const status = await scalar(db, "select status from public.shift_quest_redemptions where id = $1", [r.redemption_id]);
    const released = Number(await scalar(db, "select count(*) from public.shift_quest_ledger where source_key = $1", [`release:${r.redemption_id}`]));
    check((status === "cancelled") === (released === 1), `start vs cancel race ${n + 1} leaves a consistent state`, { status, released, outcomes });
  }
  check(deadlocks === 0, "operator start and student cancel never deadlock", deadlocks);

  // Reversal request keys.
  const dEntry = (await db.query("select id from public.shift_quest_ledger where kind = 'award' and member_id = (select id from public.shift_quest_members where discord_user_id = $1) limit 1", [D])).rows[0].id;
  const aEntry = (await db.query("select id from public.shift_quest_ledger where kind = 'award' and member_id = (select id from public.shift_quest_members where discord_user_id = $1) limit 1", [A])).rows[0].id;
  check(await code(call(bot, "shift_quest_admin_reverse", ADMIN, dEntry, 1, "x", null)) === "bad_input", "a reversal needs a request key");
  const key2 = randomUUID();
  await call(bot, "shift_quest_admin_reverse", ADMIN, dEntry, 1, "Counted twice", key2);
  check(await code(call(bot, "shift_quest_admin_reverse", ADMIN, aEntry, 1, "Counted twice", key2)) === "bad_input",
    "a request key reused for another entry is refused, not reported as done");

  // A fully reversed award no longer counts toward the cap.
  await call(bot, "shift_quest_admin_rule", ADMIN, "tiny", 2, 1, null, "e", "r", "v");
  await call(bot, "shift_quest_admin_template_rule", ADMIN, "help-another-builder-move", "tiny");
  const h1: string = await call(bot, "shift_quest_choose", D, t("help-another-builder-move"), "Help Eee", "Ask", null, null);
  let hs = await call(bot, "shift_quest_submit", D, h1, 1, "Helped", "Learned", null, "reviewers", null, []);
  await call(bot, "shift_quest_review_decide", R1, hs.submission_id, "approved", null, false);
  const h1Entry = await scalar(db, "select id from public.shift_quest_ledger where instance_id = $1", [h1]);
  await call(bot, "shift_quest_admin_reverse", ADMIN, h1Entry, 2, "Wrong quest", randomUUID());
  const h2: string = await call(bot, "shift_quest_choose", D, t("help-another-builder-move"), "Help again", "Ask", null, null);
  hs = await call(bot, "shift_quest_submit", D, h2, 1, "Helped someone else", "Learned more", null, "reviewers", null, []);
  res = await call(bot, "shift_quest_review_decide", R1, hs.submission_id, "approved", null, true);
  check(res.award.issued === true, "a fully reversed award frees its place under the cap", res.award);

  // The last admin cannot be erased into an adminless pilot.
  const eraseAdmin: string = await call(bot, "shift_quest_data_request", ADMIN, "erasure", null);
  check(await code(call(bot, "shift_quest_admin_erase", ADMIN, eraseAdmin)) === "last_admin", "the last admin cannot be erased");

  // --- Reporting ---------------------------------------------------------------------------
  const report = await call(bot, "shift_quest_admin_report", ADMIN, 14);
  const text = JSON.stringify(report);
  check(![ADMIN, R1, R2, FUL, A, B, C, "Aye", "Cee", "Rev One"].some((s) => text.includes(s)), "the report names nobody");
  check(report.members_onboarded >= 3 && report.quests_by_state.approved >= 1, "the report has aggregate counts", report);
  check(await code(call(bot, "shift_quest_admin_report", R1, 14)) === "not_authorized", "reviewers cannot pull the report");

  // Audit trail carries no free text.
  const auditCols = (await db.query("select column_name from information_schema.columns where table_name = 'shift_quest_audit'")).rows.map((r) => r.column_name);
  check(!auditCols.some((c) => ["note", "body", "evidence", "summary", "feedback"].includes(c)), "audit rows hold no free text");

  await Promise.all([db.end(), bot.end(), bot2.end()]);
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
