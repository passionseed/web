/**
 * SHIFT High Island: an admin resets their own island progress
 * (20261115120000_shift_quest_admin_reset_self). Only a member holding the
 * 'admin' application role may call it, only through the website, and it
 * only ever touches the caller's own rows: their quests and what hangs off
 * them, their journal and work sessions, and (when they are its only active
 * member) their current project, which is archived with its plot, tree,
 * canvas link and ownership checks cleared. A shared project and the
 * caller's approved quests on it stay: they are a team's tree. The ledger is
 * never touched: a quest an award points at refuses the reset.
 * Every student call goes through shift_quest_web or shift_quest_bot, as the
 * website and the bot make them. consent_required is switched off up front.
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
const ADMIN = "870000000000000001"; // the admin who plays, and resets
const R1 = "870000000000000002"; // a reviewer
const S = "880000000000000001"; // a student with a project of their own
const T = "880000000000000002"; // the admin's teammate, later
const NOBODY = "889999999999999999";
const NAMES: Record<string, string> = {
  [ADMIN]: "Reset Admin", [R1]: "Reset Reviewer", [S]: "Reset Ess", [T]: "Reset Tee",
};
const FN = "shift_quest_admin_reset_self(text)";
/** A reflection that counts toward roots (10 characters or more). */
const LEARNED = "learned how to ask about the last time";

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

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: Discord
  const web = await connect(webUrl!); // shift_quest_web: the island page

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const memberId = (who: string) => scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [who]);
  const reset = (who: string) => call<Json>(web, "shift_quest_admin_reset_self", who);

  // --- Privileges --------------------------------------------------------------------------------
  const g: Json = (await db.query(
    `select has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web,
            has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') as service_role,
            has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
            has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
            has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
            p.proacl is null or exists (
              select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'
            ) as public,
            p.prosecdef as definer,
            coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
     from pg_proc p where p.oid = $1::regprocedure`,
    [`public.${FN}`],
  )).rows[0];
  check(g?.web === true && g.service_role === true && g.bot === false && g.anon === false && g.authenticated === false &&
      g.public === false && g.definer === true && g.pinned === true,
    `${FN}: a security definer with a pinned search_path, the website's and service_role's only`, g);
  check((await sqlstate(call(bot, "shift_quest_admin_reset_self", ADMIN))) === "42501", "the bot cannot reset anyone (42501)");
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_admin_reset_self", ADMIN))) === "42501", `${r} cannot reset anyone (42501)`);
    await db.query("reset role");
  }

  // --- Fixtures --------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of [ADMIN, S, T]) await call(bot, "shift_quest_start", id, NAMES[id], false);
  const admin = await memberId(ADMIN);
  const s = await memberId(S);

  // --- Who may call ------------------------------------------------------------------------------
  check(await code(reset(NOBODY)) === "not_authorized", "an unknown caller is refused");
  check(await code(reset(S)) === "not_authorized", "a student is refused");
  check(await code(reset(R1)) === "not_authorized", "a reviewer is refused: only an admin resets");
  check(await count("select count(*) from public.shift_quest_audit where action = 'admin_reset_self'") === 0,
    "and the refusals wrote no audit row");

  // --- The other student's island (must survive every reset below) ------------------------------
  const ps: string = await call(web, "shift_quest_project_create", S, "Ess Project", "creative", "help my club");
  await call(web, "shift_quest_seed_plant", S, "oak", "help my club");
  await call(web, "shift_quest_checkin", S, null);
  await call(web, "shift_quest_progress_add", S, "บันทึกจากเกาะ", LEARNED, null, null, null, "private", null);
  const sQuest = await call<Json>(web, "shift_quest_milestone_submit", S, 1, "Talked to the club lead", "Ess learned", null);
  const sSnapshot = async () => (await db.query(
    `select
       (select count(*) from public.shift_quest_instances where member_id = $1)::int as quests,
       (select count(*) from public.shift_quest_submissions where submitted_by = $1)::int as submissions,
       (select count(*) from public.shift_quest_progress where member_id = $1)::int as journal,
       (select count(*) from public.shift_quest_plots where project_id = $2)::int as plot,
       (select count(*) from public.shift_quest_tree_style where project_id = $2)::int as tree,
       (select archived_at is null from public.shift_quest_projects where id = $2) as live,
       (select current_project_id from public.shift_quest_members where id = $1) as current`,
    [s, ps],
  )).rows[0];
  const sBefore = await sSnapshot();
  check(sBefore.quests === 1 && sBefore.submissions === 1 && sBefore.journal >= 2 && sBefore.plot === 1 &&
      sBefore.tree === 1 && sBefore.live === true && sBefore.current === ps, "the other student has a planted island", sBefore);

  // --- A solo admin island, then a reset -----------------------------------------------------------
  const pa: string = await call(web, "shift_quest_project_create", ADMIN, "Admin Project", "software", null);
  await call(web, "shift_quest_seed_plant", ADMIN, "sakura", "an app for the canteen");
  await call(web, "shift_quest_checkin", ADMIN, "first note");
  await call(web, "shift_quest_progress_add", ADMIN, "บันทึกจากเกาะ", LEARNED, null, "stuck on outreach", null, "private", null);
  const round: string = await call(bot, "shift_quest_work_start", ADMIN, "A round");
  await call(bot, "shift_quest_work_end", ADMIN, null);
  check(typeof round === "string", "the admin worked a round");
  const m1 = await call<Json>(web, "shift_quest_milestone_submit", ADMIN, 1, "Talked to the canteen", "Learned a lot", null);
  await call(web, "shift_quest_quest_gift", ADMIN, m1.instance_id);
  const sub1 = await scalar<string>(db, "select id from public.shift_quest_submissions where instance_id = $1", [m1.instance_id]);
  await call(bot, "shift_quest_review_decide", R1, sub1, "approved", "nice", false);
  const m2 = await call<Json>(web, "shift_quest_milestone_submit", ADMIN, 2, "Three more stories", "Real stories", null);
  const sub2 = await scalar<string>(db, "select id from public.shift_quest_submissions where instance_id = $1", [m2.instance_id]);
  await call(web, "shift_quest_help_create", ADMIN, "How do I ask a shop owner?", "community", "student", m2.instance_id);
  await db.query(
    "insert into public.shift_quest_canvas_links (project_id, board_id, frame_id, canvas_project, linked_by) values ($1, $2, 'frame-1', 'p', $3)",
    [pa, randomUUID(), admin],
  );
  await db.query(
    "insert into public.shift_quest_ownership_checks (project_id, item, state, updated_by) values ($1, 'access', 'demonstrated', $2) " +
      "on conflict (project_id, item) do update set state = 'demonstrated', updated_by = excluded.updated_by",
    [pa, admin],
  );
  // A message still queued about the open submission, and one already sent about the approved one.
  await db.query(
    "insert into public.shift_quest_outbox (dedupe_key, target_kind, channel_key, kind, params, status) values ($1, 'channel', 'staff', 'review_notice', '{}', 'pending')",
    [`test-review:${sub2}`],
  );
  await db.query(
    "insert into public.shift_quest_outbox (dedupe_key, target_kind, channel_key, kind, params, status, sent_at) values ($1, 'channel', 'staff', 'review_notice', '{}', 'sent', now())",
    [`test-sent:${sub1}`],
  );

  const before = (await db.query(
    `select
       (select count(*) from public.shift_quest_instances where member_id = $1)::int as quests,
       (select count(*) from public.shift_quest_reviews where submission_id = $3)::int as reviews,
       (select count(*) from public.shift_quest_progress where member_id = $1)::int as journal,
       (select count(*) from public.shift_quest_work_sessions where member_id = $1)::int as rounds,
       (select count(*) from public.shift_quest_help_requests where member_id = $1)::int as help,
       (select count(*) from public.shift_quest_tree_gifts where project_id = $2)::int as gifts,
       (select count(*) from public.shift_quest_inbox where member_id = $1)::int as inbox`,
    [admin, pa, sub1],
  )).rows[0];
  check(before.quests === 2 && before.reviews === 1 && before.journal >= 2 && before.rounds === 1 && before.help === 1 &&
      before.gifts === 1 && before.inbox >= 1,
    "the admin has quests, a review, a journal, a round, a help request, a gift and a notice about the review", before);
  const stageBefore = Number((await call<Json>(web, "shift_quest_island", ADMIN)).project?.stage);
  check(stageBefore === 1, "and their tree is at stage 1", stageBefore);
  const auditBefore = await count("select count(*) from public.shift_quest_audit");

  const r1 = await reset(ADMIN);
  check(r1.reset === true && r1.project === "archived" && r1.quests === 2 && r1.kept_quests === 0 &&
      r1.journal === before.journal && r1.ledger_rows === 0,
    "a solo admin's reset: {reset, project: 'archived', quests: 2, kept_quests: 0, journal, ledger_rows: 0}", r1);
  check(await count("select count(*) from public.shift_quest_instances where member_id = $1", [admin]) === 0,
    "their quests are gone");
  check(await count("select count(*) from public.shift_quest_submissions where id = any($1::uuid[])", [[sub1, sub2]]) === 0 &&
      await count("select count(*) from public.shift_quest_reviews where submission_id = any($1::uuid[])", [[sub1, sub2]]) === 0,
    "with their submissions and reviews");
  check(await count("select count(*) from public.shift_quest_progress where member_id = $1", [admin]) === 0 &&
      await count("select count(*) from public.shift_quest_work_sessions where member_id = $1", [admin]) === 0 &&
      await count("select count(*) from public.shift_quest_help_requests where member_id = $1", [admin]) === 0,
    "their journal, rounds and help requests are gone");
  check(await count("select count(*) from public.shift_quest_inbox where member_id = $1", [admin]) === 0,
    "their notices about those quests are gone", before.inbox);
  check(await scalar(db, "select status from public.shift_quest_outbox where dedupe_key = $1", [`test-review:${sub2}`]) === "dropped" &&
      await scalar(db, "select last_error from public.shift_quest_outbox where dedupe_key = $1", [`test-review:${sub2}`]) === "reset",
    "a message still queued about them is dropped (kept, last_error 'reset')");
  check(await scalar(db, "select status from public.shift_quest_outbox where dedupe_key = $1", [`test-sent:${sub1}`]) === "sent",
    "a message already sent stays as it was");
  const project: Json = (await db.query(
    `select p.archived_at is not null as archived,
       (select status from public.shift_quest_project_members where project_id = p.id and member_id = $2) as membership,
       (select count(*) from public.shift_quest_plots where project_id = p.id)::int as plot,
       (select count(*) from public.shift_quest_tree_style where project_id = p.id)::int as tree,
       (select count(*) from public.shift_quest_tree_gifts where project_id = p.id)::int as gifts,
       (select count(*) from public.shift_quest_canvas_links where project_id = p.id)::int as canvas,
       (select count(*) from public.shift_quest_ownership_checks where project_id = p.id)::int as ownership,
       (select current_project_id from public.shift_quest_members where id = $2) as current
     from public.shift_quest_projects p where p.id = $1`,
    [pa, admin],
  )).rows[0];
  check(project.archived === true && project.membership === "left" && project.plot === 0 && project.tree === 0 &&
      project.gifts === 0 && project.canvas === 0 && project.ownership === 0 && project.current === null,
    "the project is archived: they left it, its plot is free, its tree, gifts, canvas link and ownership checks are gone", project);
  check((await call<Json>(web, "shift_quest_island", ADMIN)).project === null, "the island shows them no project: planting again");
  check(await count("select count(*) from public.shift_quest_audit where action = 'admin_reset_self' and resource_id = $1 and actor_id = $1",
    [admin]) === 1 && await count("select count(*) from public.shift_quest_audit") === auditBefore + 1,
    "one audit row (admin_reset_self), no other");
  const sAfter = await sSnapshot();
  check(JSON.stringify(sAfter) === JSON.stringify(sBefore), "the other student's island is untouched", { sBefore, sAfter });
  check(await count("select count(*) from public.shift_quest_submissions where instance_id = $1", [sQuest.instance_id]) === 1,
    "including their pending submission");

  const again = await reset(ADMIN);
  check(again.project === "none" && again.quests === 0 && again.journal === 0, "a second reset finds nothing to do", again);

  // --- Planting again works, and a shared project stays the team's ---------------------------------
  const pb: string = await call(web, "shift_quest_project_create", ADMIN, "Admin Team", "service", null);
  check(await count("select count(*) from public.shift_quest_plots where project_id = $1", [pb]) === 1,
    "after a reset the admin plants a new project, on a plot");
  await call(bot, "shift_quest_project_invite", ADMIN, pb, T);
  await call(web, "shift_quest_project_respond", T, pb, true);
  await call(web, "shift_quest_seed_plant", T, "pine", "a booking service");
  const t1 = await call<Json>(web, "shift_quest_milestone_submit", ADMIN, 1, "Met a shop owner", "Learned to listen", null);
  const tSub = await scalar<string>(db, "select id from public.shift_quest_submissions where instance_id = $1", [t1.instance_id]);
  await call(bot, "shift_quest_review_decide", R1, tSub, "approved", null, false);
  const t2 = await call<Json>(web, "shift_quest_milestone_start", ADMIN, 2);
  await call(web, "shift_quest_checkin", T, null);
  const tJournal = await count("select count(*) from public.shift_quest_progress where member_id = $1", [await memberId(T)]);
  const shared = await reset(ADMIN);
  check(shared.project === "shared" && shared.quests === 1 && shared.kept_quests === 1,
    "with a teammate on it: {project: 'shared'}, the open quest reset, the approved one kept", shared);
  check(await count("select count(*) from public.shift_quest_instances where id = $1", [t1.instance_id]) === 1 &&
      await count("select count(*) from public.shift_quest_instances where id = $1", [t2.instance_id]) === 0,
    "the approved quest (the team's tree) stays, the open one goes");
  const team: Json = (await db.query(
    `select p.archived_at is null as live,
       (select status from public.shift_quest_project_members where project_id = p.id and member_id = $2) as membership,
       (select count(*) from public.shift_quest_plots where project_id = p.id)::int as plot,
       (select seed from public.shift_quest_tree_style where project_id = p.id) as seed,
       (select current_project_id from public.shift_quest_members where id = $2) as current
     from public.shift_quest_projects p where p.id = $1`,
    [pb, admin],
  )).rows[0];
  check(team.live === true && team.membership === "active" && team.plot === 1 && team.seed === "pine" && team.current === pb,
    "the shared project, its plot and its tree stay; the admin stays on it", team);
  check(Number((await call<Json>(web, "shift_quest_island", T)).project?.stage) === 1, "the team's tree is still at stage 1");
  check(await count("select count(*) from public.shift_quest_progress where member_id = $1", [await memberId(T)]) === tJournal,
    "the teammate's journal is untouched");

  // --- Never half a reset: an award on a quest refuses it -------------------------------------------
  const t3 = await call<Json>(web, "shift_quest_milestone_start", ADMIN, 3);
  await db.query(
    "insert into public.shift_quest_ledger (member_id, amount, kind, source_key, instance_id, reason) values ($1, 5, 'award', $2, $3, 'test award')",
    [admin, `test-award:${t3.instance_id}`, t3.instance_id],
  );
  check(await code(reset(ADMIN)) === "reset_blocked", "a quest an award points at refuses the reset");
  check(await count("select count(*) from public.shift_quest_instances where id = $1", [t3.instance_id]) === 1 &&
      await count("select count(*) from public.shift_quest_ledger where member_id = $1", [admin]) === 1,
    "and nothing changed: the quest and the ledger row are there");

  // Oversight exposes names only to application admins, even for private plots.
  check(await code(call(web, "shift_quest_admin_island", S)) === "not_authorized", "students cannot read admin oversight");
  check(await code(call(web, "shift_quest_admin_island", R1)) === "not_authorized", "reviewers cannot read admin oversight");
  const overview = await call<Json>(web, "shift_quest_admin_island", ADMIN);
  const oversightTeam = overview.projects.find((p: Json) => p.name === "Admin Team");
  check(!!oversightTeam && oversightTeam.members.includes(NAMES[T]) && oversightTeam.milestones.includes(1),
    "an admin sees team names, members and actual progress without public opt-in", oversightTeam);
  check(!JSON.stringify(overview).includes(T) && !JSON.stringify(overview).includes(ADMIN), "oversight never returns Discord IDs");
  check(!overview.projects.some((p: Json) => p.name === "Admin Project"), "archived plots are excluded from oversight");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
