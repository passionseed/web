/**
 * SHIFT High Island: the peer check (20261115140000_shift_quest_peer_check,
 * schema 15). Feedback only: a peer ticks the done-when items they think are
 * met and leaves one line; a mentor still decides. A peer is an onboarded
 * student who is not staff, not the submitter and not conflicted with the
 * quest (its project, any project shared with its owner); the submission
 * must be pending, the latest revision, opened to peers by its submitter, and
 * the submitter's consent must allow it. Checks are seen by the submitter,
 * the quest project's active teammates and reviewers (who also see the ones
 * they hid); a peer's name shows only with that peer's consent. Every
 * student call goes through shift_quest_web, as the website makes it.
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
const ADMIN = "890000000000000001";
const R1 = "890000000000000002"; // a reviewer
const A = "900000000000000001"; // project one (submits), with B
const B = "900000000000000002"; // A's teammate
const C = "900000000000000003"; // project two: a peer
const D = "900000000000000004"; // invited to project one, not answered: conflicted
const E = "900000000000000005"; // no project: a peer
const NOBODY = "909999999999999999";
const NAMES: Record<string, string> = {
  [ADMIN]: "Peer Admin", [R1]: "Peer Reviewer", [A]: "Peer Aye", [B]: "Peer Bee", [C]: "Peer Cee", [D]: "Peer Dee",
  [E]: "Peer Eee",
};

const WEB_FNS = [
  "shift_quest_peer_open(text,uuid,boolean)",
  "shift_quest_peer_queue(text)",
  "shift_quest_peer_view(text,uuid)",
  "shift_quest_peer_check(text,uuid,text[],text)",
  "shift_quest_peer_list(text,uuid)",
  "shift_quest_peer_hide(text,uuid,boolean)",
];
const HELPERS = [
  "shift_quest__peer_can_check(shift_quest_members,shift_quest_submissions)",
  "shift_quest__peer_name(uuid)",
  "shift_quest__peer_checks_json(uuid,boolean)",
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
  const db = await connect(adminUrl!);
  const bot = await connect(botUrl!);
  const web = await connect(webUrl!);
  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const queue = async (who: string): Promise<Json[]> => call<Json[]>(web, "shift_quest_peer_queue", who);

  // --- Schema and privileges -------------------------------------------------------------------
  check(Number(await call(web, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 15,
    "the website reads the latest schema version (the peer check starts from 15)");
  for (const fn of WEB_FNS) {
    const g: Json = (await db.query(
      `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
              has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web,
              has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
              has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
              p.prosecdef as definer,
              coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
       from pg_proc p where p.oid = $1::regprocedure`, [`public.${fn}`])).rows[0];
    check(g?.web === true && g.bot === false && g.anon === false && g.authenticated === false && g.definer && g.pinned,
      `${fn}: the website's only, a security definer with a pinned search_path`, g);
  }
  for (const fn of HELPERS) {
    const any: boolean = await scalar(db,
      `select bool_or(has_function_privilege(r, $1::regprocedure, 'EXECUTE'))
       from unnest(array['shift_quest_bot', 'shift_quest_web', 'service_role', 'anon', 'authenticated']) r`, [`public.${fn}`]);
    check(any === false, `${fn}: an internal helper nobody can call`);
  }
  const table: Json = (await db.query(
    "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies " +
    "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'shift_quest_peer_checks'"
  )).rows[0];
  check(table?.rls === true && table.policies === 0, "shift_quest_peer_checks has row level security on and no policies", table);
  check((await sqlstate(web.query("select * from public.shift_quest_peer_checks"))) === "42501",
    "the website cannot read the checks directly (42501)");
  check((await sqlstate(call(bot, "shift_quest_peer_queue", A))) === "42501", "the bot cannot read the peer queue (42501)");

  // --- Fixtures --------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of [A, B, C, D, E]) await call(bot, "shift_quest_start", id, NAMES[id], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "Peer One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(web, "shift_quest_project_respond", B, p1, true);
  await call(bot, "shift_quest_project_invite", A, p1, D);
  await call(web, "shift_quest_project_create", C, "Peer Two", "creative", null);

  const s1 = await call<Json>(web, "shift_quest_milestone_submit", A, 1, "คุยกับแม่ค้าหน้าโรงเรียน 15 นาที", "กลัวแต่ไปคุย", null);
  const sub1: string = s1.submission_id;
  const inst1: string = s1.instance_id;

  // --- Opening to peers ---------------------------------------------------------------------------
  check(await scalar(db, "select peer_open from public.shift_quest_submissions where id = $1", [sub1]) === false,
    "a submission starts closed to peers");
  check((await queue(C)).length === 0, "so no peer sees it");
  check(await code(call(web, "shift_quest_peer_open", B, sub1, true)) === "not_found", "a teammate cannot open it");
  check(await code(call(web, "shift_quest_peer_open", A, randomUUID(), true)) === "not_found", "nor can anyone open an unknown one");
  check((await call<Json>(web, "shift_quest_peer_open", A, sub1, true)).peer_open === true, "the submitter opens it");

  // --- Who may check ------------------------------------------------------------------------------
  const qc = await queue(C);
  check(qc.length === 1 && qc[0].submission_id === sub1 && qc[0].title && qc[0].revision === 1 && Number(qc[0].checks) === 0 &&
      Object.keys(qc[0]).sort().join(",") === "checks,created_at,photos,revision,submission_id,title",
    "another team's student sees it in the queue: no name, no project", qc);
  check((await queue(E)).length === 1, "a student with no project sees it too");
  check((await queue(A)).length === 0, "the submitter does not");
  check((await queue(B)).length === 0, "a teammate does not");
  check((await queue(D)).length === 0, "someone invited to the quest's project does not (conflicted, as a reviewer would be)");
  check(await code(queue(R1)) === "not_started", "a reviewer who never ran /start has no queue");
  await call(bot, "shift_quest_start", R1, NAMES[R1], false);
  check((await queue(R1)).length === 0, "and once started, staff are not peers");
  check(await code(queue(NOBODY)) === "not_started", "an unknown caller has none");

  const view = await call<Json>(web, "shift_quest_peer_view", C, sub1);
  check(view.submission_id === sub1 && view.kind === "main" && view.milestone === 1 && view.slug === "meet-one-real-person" &&
      view.evidence.includes("แม่ค้า") && view.can_check === true && view.mine === null && Array.isArray(view.photos) &&
      !JSON.stringify(view).includes(NAMES[A]) && !JSON.stringify(view).includes("Peer One"),
    "a peer reads the quest and the work, with its slug for the checklist, and no name or team", view);
  for (const who of [A, B, D]) {
    check(await code(call(web, "shift_quest_peer_view", who, sub1)) === "not_found", `${NAMES[who]} cannot open it as a peer`);
  }

  // A peer may see the photos of what they can check.
  const ph = await call<Json>(web, "shift_quest_evidence_add", A, sub1, 1000, 800, 600);
  check((await call<Json>(web, "shift_quest_evidence_list", C, inst1))?.photos?.[0]?.id === ph.id,
    "a peer allowed to check it sees its photos");
  check((await call<Json>(web, "shift_quest_peer_view", C, sub1)).photos.length === 1, "and the peer view carries them");
  check(Number((await queue(C))[0].photos) === 1, "the queue counts them");
  check(await call(web, "shift_quest_evidence_list", D, inst1) === null, "a conflicted student still sees none");

  // --- Checking --------------------------------------------------------------------------------------
  for (const [ticked, why] of [[["M1-target"], "an upper-case id"], [["x y"], "a space"], [["a".repeat(41)], "41 characters"],
    [Array.from({ length: 11 }, (_, i) => `m${i}`), "11 items"], [[null], "a null item"]] as [unknown[], string][]) {
    check(await code(call(web, "shift_quest_peer_check", C, sub1, ticked, "ดีมาก")) === "bad_input", `ticked with ${why} is refused`);
  }
  check(await code(call(web, "shift_quest_peer_check", C, sub1, [], "   ")) === "missing_text", "the line is required");
  check(await code(call(web, "shift_quest_peer_check", C, sub1, [], "ก".repeat(281))) === "text_too_long",
    "a line of 281 characters is refused");
  check(await count("select count(*) from public.shift_quest_peer_checks") === 0, "refused checks stored nothing");
  for (const who of [A, B, D]) {
    check(await code(call(web, "shift_quest_peer_check", who, sub1, [], "ดี")) === "not_found", `${NAMES[who]} cannot check it`);
  }
  const c1 = await call<Json>(web, "shift_quest_peer_check", C, sub1, ["m1-target", "m1-talked", "m1-target"],
    "  คุยจริงแล้ว ชัดดี ลองเล่าเพิ่มว่าเขาเสียอะไรไปบ้าง  ");
  check(typeof c1.id === "string", "a peer checks it", c1);
  const row: Json = (await db.query("select ticked, line from public.shift_quest_peer_checks where id = $1", [c1.id])).rows[0];
  check(JSON.stringify(row.ticked) === JSON.stringify(["m1-talked", "m1-target"]) && row.line === "คุยจริงแล้ว ชัดดี ลองเล่าเพิ่มว่าเขาเสียอะไรไปบ้าง",
    "ticked items are kept once, sorted; the line is trimmed", row);
  check(await code(call(web, "shift_quest_peer_check", C, sub1, [], "อีกครั้ง")) === "already_checked", "one check per peer");
  check((await queue(C)).length === 0, "and the queue drops what the peer already checked");
  const again = await call<Json>(web, "shift_quest_peer_view", C, sub1);
  check(again.can_check === false && again.mine?.id === c1.id && again.mine.line.startsWith("คุยจริง"),
    "the peer still reads it, with their own check");
  check(Number((await queue(E))[0].checks) === 1, "other peers see that one peer already checked");
  check(await count("select count(*) from public.shift_quest_audit where action = 'peer_check' and resource_id = $1", [sub1]) === 1,
    "the check is audited");

  // --- Ten a day ---------------------------------------------------------------------------------------
  const memberC: string = await scalar(db, "select id from public.shift_quest_members where discord_user_id = $1", [C]);
  const memberE: string = await scalar(db, "select id from public.shift_quest_members where discord_user_id = $1", [E]);
  await db.query(`
    with inst as (
      insert into public.shift_quest_instances (member_id, title, goal, next_step, criteria, state)
      select $1, 'fake ' || g, 'g', 'n', 'c', 'submitted' from generate_series(1, 10) g returning id
    ), subs as (
      insert into public.shift_quest_submissions (instance_id, revision, submitted_by, evidence, reflection, peer_open)
      select id, 1, $1, 'e', 'r', true from inst returning id
    )
    insert into public.shift_quest_peer_checks (submission_id, peer_id, line)
    select id, $2, 'ok' from subs`, [memberC, memberE]);
  check(await code(call(web, "shift_quest_peer_check", E, sub1, [], "ดี")) === "peer_limit", "a peer's eleventh check today is refused");
  await db.query("update public.shift_quest_peer_checks set created_at = now() - interval '2 days' where peer_id = $1", [memberE]);
  const e1 = await call<Json>(web, "shift_quest_peer_check", E, sub1, ["m1-target"], "ลองถามคนที่สองด้วย");
  check(typeof e1.id === "string", "earlier days do not count");

  // --- Who reads the checks --------------------------------------------------------------------------------
  const forA = await call<Json>(web, "shift_quest_peer_list", A, inst1);
  check(forA?.submission_id === sub1 && forA.peer_open === true && forA.checks.length === 2 &&
      forA.checks[0].peer === NAMES[C] && forA.checks[0].hidden === false && forA.checks[1].peer === NAMES[E],
    "the submitter reads both checks, oldest first, with the peers' names (consent off)", forA);
  check((await call<Json>(web, "shift_quest_peer_list", B, inst1))?.checks.length === 2, "a teammate reads them too");
  check(await call(web, "shift_quest_peer_list", C, inst1) === null, "a peer does not read the others' checks");
  check(await call(web, "shift_quest_peer_list", D, inst1) === null, "nor does someone only invited to the project");
  check(await call(web, "shift_quest_peer_list", A, randomUUID()) === null, "an unknown quest has none");

  // --- A mentor hides one ----------------------------------------------------------------------------------
  check(await code(call(web, "shift_quest_peer_hide", C, c1.id, true)) === "not_authorized", "a student cannot hide a check");
  check(await code(call(web, "shift_quest_peer_hide", R1, randomUUID(), true)) === "not_found", "an unknown check is not found");
  check((await call<Json>(web, "shift_quest_peer_hide", R1, c1.id, true)).hidden === true, "a reviewer hides it");
  const hiddenForA = await call<Json>(web, "shift_quest_peer_list", A, inst1);
  check(hiddenForA.checks.length === 1 && hiddenForA.checks[0].id === e1.id, "the team no longer sees it");
  const forR = await call<Json>(web, "shift_quest_peer_list", R1, inst1);
  check(forR.checks.length === 2 && forR.checks.find((x: Json) => x.id === c1.id)?.hidden === true,
    "the reviewer still sees it, marked hidden");
  check((await call<Json>(web, "shift_quest_peer_view", C, sub1)).mine.hidden === true, "the peer sees their own check was hidden");
  const reviewView = await call<Json>(web, "shift_quest_review_view", R1, sub1);
  check(reviewView.peer_open === true && reviewView.peer_checks.length === 2, "the web review page lists every check", reviewView.peer_checks);
  check(Number((await call<Json>(bot, "shift_quest_review_extras", R1, sub1)).peer_checks) === 1,
    "the bot's review card counts the visible one");
  check((await call<Json>(web, "shift_quest_peer_hide", R1, c1.id, false)).hidden === false &&
      (await call<Json>(web, "shift_quest_peer_list", A, inst1)).checks.length === 2, "and can show it again");

  // --- Consent ------------------------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = true where id");
  const s2 = await call<Json>(web, "shift_quest_milestone_submit", C, 1, "หลักฐานของซี", "สะท้อน", null);
  await call(web, "shift_quest_peer_open", C, s2.submission_id, true);
  check(!(await queue(E)).some((q) => q.submission_id === s2.submission_id),
    "with consent required, a submitter without consent on file is not in anyone's queue");
  const named = await call<Json>(web, "shift_quest_peer_list", A, inst1);
  check(named.checks.every((x: Json) => x.peer === null), "and a peer without consent on file shows no name", named.checks);
  await db.query("update public.shift_quest_settings set consent_required = false where id");

  // --- After a mentor decides -------------------------------------------------------------------------------------
  await call(bot, "shift_quest_review_decide", R1, sub1, "clarification", "เพิ่มอีกนิด", false);
  check(await code(call(web, "shift_quest_peer_open", A, sub1, false)) === "bad_state", "a decided submission cannot be reopened or closed");
  check(await code(call(web, "shift_quest_peer_check", C, sub1, [], "ช้าไป")) === "already_checked" &&
      await code(call(web, "shift_quest_peer_check", R1, sub1, [], "x")) === "not_found",
    "a decided submission takes no new check (already checked, or not a peer)");
  const memberF = "900000000000000006";
  await call(bot, "shift_quest_start", memberF, "Peer Eff", false);
  check(await code(call(web, "shift_quest_peer_check", memberF, sub1, [], "ช้าไป")) === "bad_state",
    "a new peer is told it was already decided");
  check(!(await queue(memberF)).some((q) => q.submission_id === sub1), "and it leaves every queue");

  // --- Export and erasure ---------------------------------------------------------------------------------------------
  const exported = await call<Json>(bot, "shift_quest_data_export", C);
  check(Array.isArray(exported.peer_checks) && exported.peer_checks.length === 1 && exported.peer_checks[0].line.startsWith("คุยจริง"),
    "the data export lists the checks the member wrote", exported.peer_checks);
  await db.query("select public.shift_quest__island_erase($1)", [memberC]);
  check(await count("select count(*) from public.shift_quest_peer_checks where peer_id = $1", [memberC]) === 0,
    "the erasure deletes the checks the member wrote");
  check((await call<Json>(web, "shift_quest_peer_list", A, inst1)).checks.length === 1, "so the team sees only the other one");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`\n${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
