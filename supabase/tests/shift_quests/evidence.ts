/**
 * SHIFT High Island: photo evidence and the team's problem changed later
 * (20261115130000_shift_quest_evidence_photos, schema 14). A student reserves
 * up to three photos on their own pending submission (the website stores the
 * re-encoded image at the path the database gives), can take one back while a
 * mentor has not decided, and the photos are seen by the submitter,
 * teammates of a team-visible submission, and reviewers. Every photo row that
 * goes queues its Storage object for the website's daily deletion job. Any
 * active teammate can change the project's ambition. Every student call goes
 * through shift_quest_web (or shift_quest_bot where the bot does it), as the
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
const ADMIN = "870000000000000001";
const R1 = "870000000000000002"; // a reviewer
const A = "880000000000000001"; // project one, with B
const B = "880000000000000002"; // A's teammate
const C = "880000000000000003"; // project two
const NOBODY = "889999999999999999";
const NAMES: Record<string, string> = {
  [ADMIN]: "Photo Admin", [R1]: "Photo Reviewer", [A]: "Photo Aye", [B]: "Photo Bee", [C]: "Photo Cee",
};

/** The website-only entry points of schema 14. */
const WEB_FNS = [
  "shift_quest_evidence_add(text,uuid,integer,integer,integer)",
  "shift_quest_evidence_remove(text,uuid)",
  "shift_quest_evidence_list(text,uuid)",
  "shift_quest_review_view(text,uuid)",
  "shift_quest_storage_trash_claim(integer)",
  "shift_quest_storage_trash_done(text[])",
  "shift_quest_project_set_ambition(text,uuid,text)",
];
/** The bot's review card count. */
const BOT_FNS = ["shift_quest_review_extras(text,uuid)"];
const HELPERS = [
  "shift_quest__evidence_trash()",
  "shift_quest__evidence_json(shift_quest_evidence_photos)",
  "shift_quest__evidence_of(uuid)",
  "shift_quest__evidence_viewer(shift_quest_members,shift_quest_submissions)",
];
const TABLES = ["shift_quest_evidence_photos", "shift_quest_storage_trash"];
const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/;

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
  const photos = (sub: string) => count("select count(*) from public.shift_quest_evidence_photos where submission_id = $1", [sub]);
  const trash = () => count("select count(*) from public.shift_quest_storage_trash");

  // --- Schema, privileges, row security ------------------------------------------------------------
  check(Number(await call(web, "shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 14,
    "the website reads the latest schema version (photos start from 14)");

  const grants = async (fn: string): Promise<Json> => (await db.query(
    `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
            has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web,
            has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') as service_role,
            has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
            has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
            p.proacl is null or exists (
              select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'
            ) as public,
            p.prosecdef as definer,
            coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
     from pg_proc p where p.oid = $1::regprocedure`,
    [`public.${fn}`],
  )).rows[0];
  for (const fn of WEB_FNS) {
    const g = await grants(fn);
    check(g?.web === true && g.bot === false && g.service_role === true && g.anon === false && g.authenticated === false &&
        g.public === false && g.definer === true && g.pinned === true,
      `${fn}: a security definer with a pinned search_path, the website's only`, g);
  }
  for (const fn of BOT_FNS) {
    const g = await grants(fn);
    check(g?.bot === true && g.web === false && g.service_role === true && g.anon === false && g.authenticated === false &&
        g.public === false && g.definer === true && g.pinned === true,
      `${fn}: a security definer with a pinned search_path, the bot's only`, g);
  }
  for (const fn of HELPERS) {
    const g: Json = (await db.query(
      `select bool_or(has_function_privilege(r, $1::regprocedure, 'EXECUTE')) as any
       from unnest(array['shift_quest_bot', 'shift_quest_web', 'service_role', 'anon', 'authenticated']) r`,
      [`public.${fn}`],
    )).rows[0];
    check(g.any === false, `${fn}: an internal helper nobody can call`);
  }
  for (const t of TABLES) {
    const table: Json = (await db.query(
      "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies " +
      "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = $1", [t]
    )).rows[0];
    check(table?.rls === true && table.policies === 0, `${t} has row level security on and no policies`, table);
    for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
      const has = await scalar<boolean>(db,
        `select has_table_privilege($1, 'public.${t}', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')`, [role]);
      check(has === false, `${role} holds no privilege on ${t}`);
    }
  }
  check((await sqlstate(web.query("select * from public.shift_quest_evidence_photos"))) === "42501",
    "the website cannot read the photo rows directly (42501)");
  check((await sqlstate(call(web, "shift_quest_review_extras", R1, randomUUID()))) === "42501",
    "the website cannot call the bot's review count (42501)");
  check((await sqlstate(call(bot, "shift_quest_evidence_add", A, randomUUID(), 1, 1, 1))) === "42501",
    "the bot cannot reserve a photo (42501)");

  // --- Fixtures --------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of [A, B, C]) await call(bot, "shift_quest_start", id, NAMES[id], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "Photo One", "software", "เดิม");
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "Photo Two", "creative", null);

  const s1 = await call<Json>(web, "shift_quest_milestone_submit", A, 1, "คุยกับแม่ค้าหน้าโรงเรียน 15 นาที", "กลัวแต่ก็ไปคุย", null);
  const sub1: string = s1.submission_id;
  const inst1: string = s1.instance_id;
  check(typeof sub1 === "string" && typeof inst1 === "string", "a main quest submit returns its submission id", s1);

  // --- Reserving photos -------------------------------------------------------------------------
  check(await code(call(web, "shift_quest_evidence_add", NOBODY, sub1, 1000, 800, 600)) === "not_started",
    "an unknown caller cannot add a photo");
  check(await code(call(web, "shift_quest_evidence_add", B, sub1, 1000, 800, 600)) === "not_found",
    "a teammate cannot add a photo to someone else's submission");
  check(await code(call(web, "shift_quest_evidence_add", C, sub1, 1000, 800, 600)) === "not_found",
    "nor can another team");
  check(await code(call(web, "shift_quest_evidence_add", A, randomUUID(), 1000, 800, 600)) === "not_found",
    "an unknown submission is not found");
  for (const [bytes, w, h] of [[0, 800, 600], [4194305, 800, 600], [1000, 0, 600], [1000, 1601, 600], [1000, 800, 1601], [null, 1, 1]]) {
    check(await code(call(web, "shift_quest_evidence_add", A, sub1, bytes, w, h)) === "bad_input",
      `a photo of ${bytes} bytes, ${w}x${h} is refused`);
  }
  check(await photos(sub1) === 0, "refused photos stored nothing");

  const ph1 = await call<Json>(web, "shift_quest_evidence_add", A, sub1, 120000, 1600, 1200);
  check(PATH.test(ph1.path) && ph1.path.startsWith(`${sub1}/`) && ph1.path === `${sub1}/${ph1.id}.webp` && ph1.count === 1,
    "the first photo gets the path <submission>/<photo>.webp, count 1", ph1);
  const ph2 = await call<Json>(web, "shift_quest_evidence_add", A, sub1, 4194304, 1, 1600);
  const ph3 = await call<Json>(web, "shift_quest_evidence_add", A, sub1, 1, 900, 900);
  check(ph2.count === 2 && ph3.count === 3, "up to three photos (4 MB and 1 px are inside the limits)");
  check(await code(call(web, "shift_quest_evidence_add", A, sub1, 1000, 800, 600)) === "too_many_photos",
    "a fourth photo is refused");
  check(await count("select count(*) from public.shift_quest_audit where action = 'evidence_add' and resource_id = $1", [sub1]) === 3,
    "each photo is audited");

  // --- Who sees them -------------------------------------------------------------------------------
  const mine = await call<Json>(web, "shift_quest_evidence_list", A, inst1);
  check(mine?.submission_id === sub1 && mine.revision === 1 && mine.status === "pending" && mine.photos.length === 3 &&
      mine.photos[0].id === ph1.id && mine.photos[0].width === 1600 && mine.photos[0].height === 1200 &&
      Object.keys(mine.photos[0]).sort().join(",") === "height,id,path,width",
    "the submitter sees the photos of their latest submission, oldest first, as {id, path, width, height}", mine);
  check(await call(web, "shift_quest_evidence_list", B, inst1) === null,
    "a teammate does not see photos of a reviewers-only submission (the website's main submit)");
  check(await call(web, "shift_quest_evidence_list", C, inst1) === null, "another team sees nothing");
  check(await call(web, "shift_quest_evidence_list", A, randomUUID()) === null, "an unknown quest has no photos");
  const asReviewer = await call<Json>(web, "shift_quest_evidence_list", R1, inst1);
  check(asReviewer?.photos.length === 3, "a reviewer sees them, without having run /start", asReviewer);
  // Team-visible submissions (the bot's /quest flow can pick it) show to teammates too.
  await db.query("update public.shift_quest_submissions set visibility = 'team' where id = $1", [sub1]);
  check((await call<Json>(web, "shift_quest_evidence_list", B, inst1))?.photos.length === 3,
    "a teammate sees the photos of a team-visible submission");
  check(await call(web, "shift_quest_evidence_list", C, inst1) === null, "another team still sees nothing");
  await db.query("update public.shift_quest_submissions set visibility = 'reviewers' where id = $1", [sub1]);

  // --- The web review page and the bot's count -------------------------------------------------------
  check(await code(call(web, "shift_quest_review_view", A, sub1)) === "not_authorized", "a student cannot open the review page");
  check(await code(call(web, "shift_quest_review_view", R1, randomUUID())) === "not_found", "an unknown submission is not found");
  const view = await call<Json>(web, "shift_quest_review_view", R1, sub1);
  check(view.submission_id === sub1 && view.instance_id === inst1 && view.revision === 1 && view.is_latest === true &&
      view.status === "pending" && view.photos.length === 3 && view.evidence.includes("แม่ค้า") && view.redacted === false &&
      !("student" in view),
    "a reviewer reads the submission with its photos, and no student name", view);
  // 20261116080000: a reviewer too close to the work (here A's teammate, made a reviewer) is refused,
  // as the Discord review card refuses them; the student themself, made a reviewer, too.
  await call(bot, "shift_quest_admin_role", ADMIN, B, NAMES[B], "reviewer", true);
  check(await code(call(web, "shift_quest_review_view", B, sub1)) === "conflict_of_interest",
    "a teammate who is also a reviewer cannot open the review page (conflict_of_interest)");
  check(await code(call(bot, "shift_quest_review_get", B, sub1)) === "conflict_of_interest",
    "the same rule as the Discord review card");
  check(await code(call(web, "shift_quest_review_view", B, randomUUID())) === "not_found",
    "an unknown submission is still not found for them");
  await call(bot, "shift_quest_admin_role", ADMIN, B, NAMES[B], "reviewer", false);
  await call(bot, "shift_quest_admin_role", ADMIN, A, NAMES[A], "reviewer", true);
  check(await code(call(web, "shift_quest_review_view", A, sub1)) === "conflict_of_interest",
    "a student made a reviewer cannot open their own submission");
  await call(bot, "shift_quest_admin_role", ADMIN, A, NAMES[A], "reviewer", false);
  check(await code(call(web, "shift_quest_review_view", B, sub1)) === "not_authorized",
    "without the role the teammate is refused as a student again");
  check((await call<Json>(web, "shift_quest_review_view", R1, sub1)).submission_id === sub1,
    "an unrelated reviewer still reads it");
  check(await code(call(bot, "shift_quest_review_extras", A, sub1)) === "not_authorized", "a student cannot read the count");
  const extras = await call<Json>(bot, "shift_quest_review_extras", R1, sub1);
  check(extras.instance_id === inst1 && Number(extras.photos) === 3, "the bot's review card counts 3 photos", extras);

  // --- Taking one back, and the trash -------------------------------------------------------------
  check(await code(call(web, "shift_quest_evidence_remove", B, ph3.id)) === "not_found", "a teammate cannot remove it");
  check(await code(call(web, "shift_quest_evidence_remove", A, randomUUID())) === "not_found", "an unknown photo is not found");
  const removed = await call<Json>(web, "shift_quest_evidence_remove", A, ph3.id);
  check(removed.path === ph3.path && await photos(sub1) === 2, "the submitter takes one back and gets its path", removed);
  check(await trash() === 1 &&
      await count("select count(*) from public.shift_quest_storage_trash where object_path = $1", [ph3.path]) === 1,
    "its object is queued for deletion from Storage");
  const claimed = await call<string[]>(web, "shift_quest_storage_trash_claim", 10);
  check(claimed.length === 1 && claimed[0] === ph3.path, "the daily job claims it", claimed);
  check((await call<string[]>(web, "shift_quest_storage_trash_claim", 0)).length === 0, "a limit of 0 claims nothing");
  check(await trash() === 1, "claiming does not delete");
  check(await call(web, "shift_quest_storage_trash_done", [ph3.path, "not/a-path"]) === 1 && await trash() === 0,
    "done clears exactly the deleted paths");
  const ph4 = await call<Json>(web, "shift_quest_evidence_add", A, sub1, 5000, 400, 300);
  check(ph4.count === 3, "a removed photo frees its place");

  // --- After a mentor decides ---------------------------------------------------------------------------
  await call(bot, "shift_quest_review_decide", R1, sub1, "clarification", "เพิ่มรายละเอียดอีกนิด", false);
  check(await code(call(web, "shift_quest_evidence_add", A, sub1, 1000, 800, 600)) === "bad_state",
    "a decided submission takes no photo");
  check(await code(call(web, "shift_quest_evidence_remove", A, ph4.id)) === "bad_state", "and keeps the ones it was decided on");
  const s2 = await call<Json>(web, "shift_quest_milestone_submit", A, 1, "คุยเพิ่มอีก 2 คน", "ชัดขึ้น", null);
  check(s2.instance_id === inst1 && Number(s2.revision) === 2, "the resubmit is revision 2 of the same quest", s2);
  check(await code(call(web, "shift_quest_evidence_add", A, sub1, 1000, 800, 600)) === "bad_state",
    "the old revision still takes none");
  const ph5 = await call<Json>(web, "shift_quest_evidence_add", A, s2.submission_id, 2000, 640, 480);
  check(ph5.count === 1 && ph5.path.startsWith(`${s2.submission_id}/`), "the new revision starts its own three", ph5);
  const latest = await call<Json>(web, "shift_quest_evidence_list", A, inst1);
  check(latest.revision === 2 && latest.photos.length === 1 && latest.photos[0].id === ph5.id,
    "the quest page shows the latest revision's photos only", latest);
  const old = await call<Json>(web, "shift_quest_review_view", R1, sub1);
  check(old.is_latest === false && old.photos.length === 3, "the review page still shows an older revision's photos");

  // --- The team's problem, changed later ------------------------------------------------------------
  check(await code(call(web, "shift_quest_project_set_ambition", NOBODY, p1, "x")) === "not_started", "an unknown caller cannot");
  check(await code(call(web, "shift_quest_project_set_ambition", C, p1, "ของคนอื่น")) === "not_found",
    "another team cannot change it");
  check(await code(call(web, "shift_quest_project_set_ambition", B, randomUUID(), "x")) === "not_found", "nor an unknown project");
  check(await code(call(web, "shift_quest_project_set_ambition", B, null, "x")) === "not_found", "nor no project");
  check(await code(call(web, "shift_quest_project_set_ambition", B, p1, "   ")) === "missing_text", "the line is required");
  check(await code(call(web, "shift_quest_project_set_ambition", B, p1, "x".repeat(501))) === "text_too_long",
    "a line of 501 characters is refused");
  const NEW_AIM = "แม่ค้าหน้าโรงเรียนไม่รู้ว่าจะมีคนสั่งกี่จาน";
  const set = await call<Json>(web, "shift_quest_project_set_ambition", B, p1, `  ${NEW_AIM}  `);
  check(set.ambition === NEW_AIM &&
      await scalar(db, "select ambition from public.shift_quest_projects where id = $1", [p1]) === NEW_AIM,
    "a teammate changes it, trimmed", set);
  check((await call<Json>(web, "shift_quest_tree_get", A)).ambition === NEW_AIM, "the tree reads the new line");
  check(await count("select count(*) from public.shift_quest_audit where action = 'project_ambition' and resource_id = $1", [p1]) === 1,
    "and the change is audited");
  check((await call<Json>(web, "shift_quest_project_set_ambition", A, p1, "ก".repeat(500))).ambition.length === 500,
    "500 characters fit");
  await db.query("update public.shift_quest_projects set archived_at = now() where id = $1", [p2]);
  check(await code(call(web, "shift_quest_project_set_ambition", C, p2, "y")) === "not_found", "an archived project cannot change");
  await db.query("update public.shift_quest_projects set archived_at = null where id = $1", [p2]);

  // --- Export and erasure ------------------------------------------------------------------------------
  const memberA: string = await scalar(db, "select id from public.shift_quest_members where discord_user_id = $1", [A]);
  const exported = await call<Json>(bot, "shift_quest_data_export", A);
  const listed = JSON.stringify(exported);
  const exportPhotos: Json[] = exported.evidence_photos ?? exported.island?.evidence_photos ?? [];
  check(Array.isArray(exportPhotos) && exportPhotos.length === 4 && !listed.includes(ph5.path) &&
      exportPhotos.every((p) => p.bytes > 0 && p.width > 0 && p.created_at),
    "the data export lists A's photos (size and when, never the image or its path)", exportPhotos);
  const before = await trash();
  await db.query("select public.shift_quest__island_erase($1)", [memberA]);
  check(await count("select count(*) from public.shift_quest_evidence_photos where member_id = $1", [memberA]) === 0,
    "the erasure deletes the member's photos");
  check(await trash() === before + 4, "and queues their objects for deletion from Storage");

  // A deleted submission (the admin self-reset deletes them) takes its photos with it, queued too.
  const s3 = await call<Json>(web, "shift_quest_milestone_submit", C, 1, "หลักฐาน", "สะท้อน", null);
  const ph6 = await call<Json>(web, "shift_quest_evidence_add", C, s3.submission_id, 3000, 300, 300);
  await db.query("delete from public.shift_quest_submissions where id = $1", [s3.submission_id]);
  check(await count("select count(*) from public.shift_quest_storage_trash where object_path = $1", [ph6.path]) === 1,
    "a cascade from a deleted submission queues the object too");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`\n${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
