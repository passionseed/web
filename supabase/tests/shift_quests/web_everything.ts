/**
 * SHIFT High Island: the website does everything but Discord
 * (20261116090000_shift_quest_web_everything, schema 16). Every call below
 * goes through shift_quest_web, as the website makes it; the bot is used only
 * for what stays in Discord (channels, new staff, project invites by Discord
 * id) and to check what it can no longer reach.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Covers: the new wrappers' privileges, actor-first refusals (a stranger or a
 * non-admin learns nothing about a member uuid), the teammate picker and the
 * contributor checks, the award that waits for teammates and is issued by
 * the last answer, community credit, celebrating and thanking a peer with its
 * daily cap (the campfire's intentions not counted), data rights with one
 * open request per kind (a second note joins it), the admin wrappers over
 * member uuids (a status and settings without Discord ids or keys, search,
 * detail, roles, recognition and staff-award keys, consent reset, seasons),
 * the review conflict rule on help requests ('help_conflict'), the award held
 * when awards are paused, and the 8-teammate cap that never counts the caller.
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

// Synthetic Discord IDs and names. Every name holds "Every" so one search finds them all.
const ADMIN = "910000000000000001";
const R1 = "910000000000000002"; // a reviewer with no project
const R2 = "910000000000000003"; // started as a student on project one, then made a reviewer: conflicted
const A = "920000000000000001"; // project one
const B = "920000000000000002"; // A's teammate
const C = "920000000000000003"; // project two
const D = "920000000000000004"; // no project
const G = "920000000000000005"; // project one, erased later
const H = "920000000000000006"; // invited to project one, has not answered
const NOBODY = "929999999999999999";
const NAMES: Record<string, string> = {
  [ADMIN]: "Every Admin", [R1]: "Every Reviewer", [R2]: "Every Mentor", [A]: "Every Aye", [B]: "Every Bee",
  [C]: "Every Cee", [D]: "Every Dee", [G]: "Every Gee", [H]: "Every Aitch",
};
const DISCORD_IDS = Object.keys(NAMES);

/** The website-only wrappers of 20261116090000 (regprocedure text). */
const WEB_FNS = [
  "shift_quest_project_teammates(text)",
  "shift_quest_islanders(text,text)",
  "shift_quest_share_draft(text,text,text,uuid,uuid)",
  "shift_quest_milestone_submit_team(text,smallint,text,text,text,text,uuid[])",
  "shift_quest_side_submit_team(text,uuid,text,text,text,text,uuid[])",
  "shift_quest_admin_web_status(text)",
  "shift_quest_admin_setting(text,text,text)",
  "shift_quest_admin_members(text,text)",
  "shift_quest_admin_member(text,uuid)",
  "shift_quest_admin_member_role(text,uuid,text,boolean)",
  "shift_quest_admin_member_recognize(text,uuid,integer,text,text,uuid)",
  "shift_quest_admin_member_award(text,uuid,text,text,uuid)",
  "shift_quest_admin_member_consent_reset(text,uuid)",
  "shift_quest_admin_seasons(text)",
];
/** Existing functions 20261116090000 grants to the website; the bot keeps them while both work. */
const SHARED_FNS = [
  "shift_quest_inbox_list(text,boolean)", "shift_quest_contribution_respond(text,uuid,boolean,text)",
  "shift_quest_data_request(text,text,text)", "shift_quest_review_decide(text,uuid,text,text,boolean)",
  "shift_quest_help_queue(text)", "shift_quest_help_update(text,uuid,text,text)",
  "shift_quest_admin_rule_retire(text,text)", "shift_quest_admin_erase(text,uuid)",
];
const HELPERS = [
  "shift_quest__discord_of(uuid)",
  "shift_quest__contributors_of(uuid[],uuid)",
  "shift_quest__help_conflicted(uuid,shift_quest_help_requests)",
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

/** Synthetic Discord channel and role ids the suite configures through the bot. */
const HELP_CHANNEL = "700000000000000001";
const STUDENT_ROLE = "700000000000000002";
const CELEBRATE_CHANNEL = "930000000000000001";

/** True when a payload carries none of the synthetic Discord ids: members, channels or roles. */
const noDiscord = (value: unknown) => {
  const text = JSON.stringify(value);
  return [...DISCORD_IDS, HELP_CHANNEL, STUDENT_ROLE, CELEBRATE_CHANNEL].every((id) => !text.includes(id));
};

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: what stays in Discord
  const web = await connect(webUrl!); // shift_quest_web: every flow, as the website makes it
  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const idOf = async (discord: string): Promise<string> =>
    scalar(db, "select id from public.shift_quest_members where discord_user_id = $1", [discord]);
  const w = <T = any>(fn: string, ...args: unknown[]) => call<T>(web, fn, ...args);

  // --- Schema and privileges -------------------------------------------------------------------
  check(Number(await w("shift_quest_schema_version")) === LATEST_SCHEMA && LATEST_SCHEMA >= 16,
    "the website reads the latest schema version (every flow but Discord starts from 16)");
  for (const fn of WEB_FNS) {
    const g: Json = (await db.query(
      `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
              has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web,
              has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
              has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
              exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0) as public,
              p.prosecdef as definer,
              coalesce(p.proconfig, '{}') @> array['search_path=public'] as pinned
       from pg_proc p where p.oid = $1::regprocedure`, [`public.${fn}`])).rows[0];
    check(g?.web === true && g.bot === false && g.anon === false && g.authenticated === false && g.public === false &&
        g.definer && g.pinned,
      `${fn}: the website's only, a security definer with a pinned search_path`, g);
  }
  for (const fn of SHARED_FNS) {
    const g: Json = (await db.query(
      `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
              has_function_privilege('shift_quest_web', $1::regprocedure, 'EXECUTE') as web`, [`public.${fn}`])).rows[0];
    check(g.web === true && g.bot === true, `${fn}: the website and, for now, the bot`, g);
  }
  for (const fn of HELPERS) {
    const g: Json = (await db.query(
      `select bool_or(has_function_privilege(r, $1::regprocedure, 'EXECUTE')) as any,
              (select exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0)
               from pg_proc p where p.oid = $1::regprocedure) as public
       from unnest(array['shift_quest_bot', 'shift_quest_web', 'service_role', 'anon', 'authenticated']) r`,
      [`public.${fn}`])).rows[0];
    check(g.any === false && g.public === false, `${fn}: an internal helper nobody can call, PUBLIC included`, g);
  }
  for (const [label, sql, args] of [
    ["raw role grants", "select public.shift_quest_admin_role($1, $2, null, 'reviewer', true)", [ADMIN, A]],
    ["raw settings", "select public.shift_quest_admin_set($1, 'help_channel', '700000000000000001')", [ADMIN]],
    ["raw recognition", "select public.shift_quest_admin_recognize($1, $2, 0, 'x', null, 'request-key-1')", [ADMIN, A]],
    ["raw staff awards", "select public.shift_quest_admin_staff_award($1, $2, 'helped-most', 'x', 'request-key-1')", [ADMIN, A]],
    ["the raw ledger", "select public.shift_quest_admin_ledger($1, $2)", [ADMIN, A]],
    ["raw consent resets", "select public.shift_quest_admin_consent_reset($1, $2)", [ADMIN, A]],
    ["the raw admin status (Discord channel and role ids)", "select public.shift_quest_admin_status($1)", [ADMIN]],
    ["raw shares", "select public.shift_quest_share_create($1, 'recognition', 'x', null, $2)", [A, B]],
    ["ownership ticking (dropped)", "select public.shift_quest_ownership_set($1, $2, 'x', 'done', null, false, null)", [A, randomUUID()]],
  ] as [string, string, unknown[]][]) {
    check((await sqlstate(web.query(sql, args))) === "42501", `the website is refused ${label} (42501)`);
  }
  for (const [fn, args] of [
    ["shift_quest_project_teammates", [A]],
    ["shift_quest_admin_member", [ADMIN, randomUUID()]],
    ["shift_quest_admin_setting", [ADMIN, "awards", "on"]],
    ["shift_quest_admin_web_status", [ADMIN]],
  ] as [string, unknown[]][]) {
    check((await sqlstate(call(bot, fn, ...args))) === "42501", `the bot cannot call ${fn} (42501)`);
  }

  // --- Fixtures --------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  // New staff are added in Discord (/admin role): the only way to map a new Discord user.
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of [A, B, C, D, G, H, R1, R2]) await w("shift_quest_start", id, NAMES[id], false);
  const p1: string = await w("shift_quest_project_create", A, "Every One", "software", null);
  for (const who of [B, G, R2]) {
    await call(bot, "shift_quest_project_invite", A, p1, who);
    await w("shift_quest_project_respond", who, p1, true);
  }
  await call(bot, "shift_quest_project_invite", A, p1, H);
  await w("shift_quest_project_create", C, "Every Two", "creative", null);
  const [mAdmin, mR1, mR2, mA, mB, mC, mD, mG, mH] = await Promise.all(
    [ADMIN, R1, R2, A, B, C, D, G, H].map((id) => idOf(id)));
  // A member who already has a row becomes staff from the website, by uuid; the stored name is kept.
  const granted = await w<Json>("shift_quest_admin_member_role", ADMIN, mR2, "reviewer", true);
  check(JSON.stringify(granted.roles) === JSON.stringify(["reviewer"]) &&
      await scalar(db, "select display_name from public.shift_quest_members where id = $1", [mR2]) === NAMES[R2],
    "an admin makes an existing member a reviewer from the website, keeping their name", granted);

  // --- Actor first: a stranger or a non-admin learns nothing --------------------------------------
  const adminCalls: [string, (actor: string, member: string) => unknown[]][] = [
    ["shift_quest_admin_member", (actor, member) => [actor, member]],
    ["shift_quest_admin_member_role", (actor, member) => [actor, member, "reviewer", true]],
    ["shift_quest_admin_member_recognize", (actor, member) => [actor, member, 0, "ช่วยเพื่อน", null, randomUUID()]],
    ["shift_quest_admin_member_award", (actor, member) => [actor, member, "helped-most", "ช่วยเพื่อน", randomUUID()]],
    ["shift_quest_admin_member_consent_reset", (actor, member) => [actor, member]],
  ];
  for (const [fn, args] of adminCalls) {
    for (const actor of [NOBODY, A, R1]) {
      const real = await code(w(fn, ...args(actor, mB)));
      const fake = await code(w(fn, ...args(actor, randomUUID())));
      check(real === "not_authorized" && fake === "not_authorized",
        `${fn}: ${actor === NOBODY ? "a stranger" : NAMES[actor]} is refused the same way for a real and an unknown member`,
        { real, fake });
    }
  }
  for (const [fn, args] of [
    ["shift_quest_admin_members", [R1, "every"]],
    ["shift_quest_admin_setting", [R1, "awards", "on"]],
    // Actor first: a non-admin sending a Discord key learns nothing about which keys exist.
    ["shift_quest_admin_setting", [R1, "help_channel", "x"]],
    ["shift_quest_admin_setting", [A, "no_such_key", "x"]],
    ["shift_quest_admin_web_status", [R1]],
    ["shift_quest_admin_seasons", [A]],
  ] as [string, unknown[]][]) {
    check(await code(w(fn, ...args)) === "not_authorized", `${fn}(${String(args[1] ?? "")}): only admins`);
  }
  for (const [fn, args] of [
    ["shift_quest_project_teammates", [NOBODY]],
    ["shift_quest_islanders", [NOBODY, "every"]],
    ["shift_quest_share_draft", [NOBODY, "recognition", "ขอบคุณ", null, mB]],
    ["shift_quest_milestone_submit_team", [NOBODY, 1, "p", "r", null, null, [mB]]],
    ["shift_quest_side_submit_team", [NOBODY, randomUUID(), "p", "r", null, null, [mB]]],
  ] as [string, unknown[]][]) {
    check(await code(w(fn, ...args)) === "not_started", `${fn}: a stranger is refused before any member lookup`);
  }
  check(await count("select count(*) from public.shift_quest_recognitions") === 0 &&
      await count("select count(*) from public.shift_quest_shares") === 0,
    "and those calls stored nothing");

  // --- The teammate picker -----------------------------------------------------------------------
  const mates = await w<Json[]>("shift_quest_project_teammates", A);
  check(JSON.stringify(mates.map((m) => m.name)) === JSON.stringify([NAMES[B], NAMES[G]]) &&
      mates.every((m) => Object.keys(m).sort().join(",") === "id,name") && noDiscord(mates),
    "the picker lists active, started, non-staff teammates by uuid and name: not the caller, not staff, not the invited",
    mates);
  check(JSON.stringify(await w("shift_quest_project_teammates", D)) === "[]", "no project, nobody to pick");

  // --- Islanders: who a student may thank -----------------------------------------------------------
  check(await code(w("shift_quest_islanders", A, "e")) === "invalid_input", "a search needs at least 2 characters");
  check(await code(w("shift_quest_islanders", R1, "every")) === "not_eligible", "staff do not use the student search");
  let found = await w<Json[]>("shift_quest_islanders", A, "every");
  check(JSON.stringify(found.map((f) => f.name)) ===
      JSON.stringify([NAMES[B], NAMES[G], NAMES[H], NAMES[C], NAMES[D]]) &&
      found.slice(0, 2).every((f) => f.teammate === true) && found.slice(2).every((f) => f.teammate === false) &&
      noDiscord(found),
    "started non-staff students, teammates first, never the caller or staff, never a Discord id", found);

  // --- The admin status without Discord ids ------------------------------------------------------
  // Channels and student roles are still set in Discord, with /admin channel and /admin student-role.
  await call(bot, "shift_quest_admin_set", ADMIN, "help_channel", HELP_CHANNEL);
  await call(bot, "shift_quest_admin_set", ADMIN, "student_role_add", STUDENT_ROLE);
  const webStatus = await w<Json>("shift_quest_admin_web_status", ADMIN);
  check(webStatus.settings?.help_channel === true && webStatus.settings?.staff_channel === false &&
      webStatus.settings?.student_roles === 1 && !Object.keys(webStatus.settings).some((k) => k.endsWith("_id") || k.endsWith("_ids")) &&
      noDiscord(webStatus),
    "the website's admin status says which channels and roles are set, never their Discord ids", webStatus.settings);
  const rawStatus = await call<Json>(bot, "shift_quest_admin_status", ADMIN);
  const { settings: rawSettings, ...rawRest } = rawStatus;
  const { settings: webSettings, ...webRest } = webStatus;
  check(JSON.stringify(rawRest) === JSON.stringify(webRest) &&
      ["awards_enabled", "redemption_enabled", "sharing_enabled", "reminders_enabled", "reward_terms", "squads_enabled"]
        .every((k) => JSON.stringify(rawSettings[k]) === JSON.stringify(webSettings[k])),
    "and everything else is the bot's admin status unchanged", { rawRest, webRest });

  // --- Rewards set up through the website ---------------------------------------------------------
  check(await code(w("shift_quest_admin_setting", ADMIN, "awards", "on")) === "config_incomplete",
    "awards refuse to switch on without terms and a rule");
  for (const key of ["help_channel", "staff_channel", "celebrate_channel", "live_channel", "suggest_channel",
    "coworking_channel", "student_role_add", "student_role_remove", "squads", "no_such_key"]) {
    check(await code(w("shift_quest_admin_setting", ADMIN, key, "700000000000000001")) === "bad_input",
      `admin_setting refuses '${key}' (Discord configuration stays in Discord)`);
  }
  const status = await w<Json>("shift_quest_admin_setting", ADMIN, "reward_terms", "เหรียญตามกติกาที่ประกาศ");
  check(status.settings?.reward_terms === true && Array.isArray(status.blockers?.awards) &&
      status.settings?.help_channel === true && noDiscord(status),
    "a term saves and returns the admin status, without Discord ids", status.settings);
  await w("shift_quest_admin_rule", ADMIN, "build", 10, 3, "each_confirmed", "ทำเควสต์เสร็จ", "พี่เลี้ยงรีวิว", "อธิบายเป็นการส่วนตัว");
  await w("shift_quest_admin_template_rule", ADMIN, "meet-one-real-person", "build");
  check((await w<Json>("shift_quest_admin_setting", ADMIN, "awards", "on")).settings.awards_enabled === true,
    "then awards switch on from the website");

  // --- Teammates on a main quest ------------------------------------------------------------------
  const instancesOfA = () => count("select count(*) from public.shift_quest_instances where member_id = $1", [mA]);
  for (const [label, list, expected] of [
    ["another project's student", [mC], "contributor_not_teammate"],
    ["an unknown uuid", [randomUUID()], "contributor_not_teammate"],
    ["someone invited who has not answered", [mH], "contributor_not_teammate"],
    ["a null in the list", [mB, null], "contributor_not_teammate"],
    ["nine teammates", Array.from({ length: 9 }, () => randomUUID()), "bad_input"],
  ] as [string, unknown[], string][]) {
    const got = await code(w("shift_quest_milestone_submit_team", A, 1, "คุยกับคนจริง", "ได้เรียนรู้", null, "ถามคำถาม", list));
    check(got === expected, `naming ${label} is refused (${expected})`, got);
  }
  check(await instancesOfA() === 0, "and a refused submit leaves no quest behind");

  const sub1 = await w<Json>("shift_quest_milestone_submit_team", A, 1, "คุยกับแม่ค้า 15 นาที", "กลัวแต่ไปคุย", null,
    "ตั้งคำถาม", [mB, mB, mA]);
  const inst1: string = sub1.instance_id;
  check(sub1.created === true && sub1.revision === 1 && typeof sub1.submission_id === "string",
    "a main quest is sent with a teammate (duplicates and the caller ignored)", sub1);
  const contribs: Json[] = (await db.query(
    "select member_id, status, contribution from public.shift_quest_contributions where submission_id = $1 order by status",
    [sub1.submission_id])).rows;
  check(contribs.length === 2 && contribs.some((c) => c.member_id === mA && c.status === "confirmed" && c.contribution === "ตั้งคำถาม") &&
      contribs.some((c) => c.member_id === mB && c.status === "pending"),
    "the caller's part is confirmed and the teammate's waits for them", contribs);
  check(await scalar(db, "select visibility from public.shift_quest_submissions where id = $1", [sub1.submission_id]) === "team",
    "named teammates make the proof visible to the team");
  check(await count("select count(*) from public.shift_quest_inbox where member_id = $1 and kind = 'contribution_requested'", [mB]) === 1,
    "the teammate gets a contribution request in their inbox");

  // --- The inbox and settings ---------------------------------------------------------------------
  const peek = await w<Json>("shift_quest_inbox_list", B, false);
  check(peek.items.some((i: Json) => i.kind === "contribution_requested" && i.unread === true) &&
      peek.contributions.length === 1 && noDiscord(peek),
    "inbox_list(false) shows the request unread, with the pending contribution", peek);
  await w("shift_quest_inbox_list", B, true);
  check((await w<Json>("shift_quest_inbox_list", B, false)).items.every((i: Json) => i.unread === false),
    "inbox_list(true) marks everything read");
  check(await code(w("shift_quest_update_prefs", B, true, [1, 3], null, null)) === "reminder_time_required",
    "reminders need a day and an hour");
  check((await w<Json>("shift_quest_update_prefs", B, true, [1, 3], 18, false)) !== null, "settings save from the website");

  // --- Review conflicts and decisions ------------------------------------------------------------------
  check(await code(w("shift_quest_review_get", R2, sub1.submission_id)) === "conflict_of_interest" &&
      await code(w("shift_quest_review_view", R2, sub1.submission_id)) === "conflict_of_interest",
    "a reviewer on the student's project cannot open the review card or the review page");
  const queueR2 = await w<Json>("shift_quest_review_queue", R2);
  check(!JSON.stringify(queueR2).includes(sub1.submission_id), "and does not see it in the queue");
  check(await code(w("shift_quest_review_decide", R1, sub1.submission_id, "clarification", "  ", false)) === "feedback_required",
    "a clarification needs feedback");
  const first = await w<Json>("shift_quest_review_decide", R1, sub1.submission_id, "approved", null, false);
  check(first.award?.issued === false && first.award?.reason === "contributions_pending",
    "the approval holds the award until the teammate answers", first.award);
  const again = await w<Json>("shift_quest_review_decide", R1, sub1.submission_id, "approved", null, false);
  check(again.already === true, "a retried approval is a no-op", again);
  check((await w<Json[]>("shift_quest_awards_pending", R1)).some((a) => a.instance_id === inst1),
    "the withheld award is on the awards page");

  // --- The last answer issues the award ------------------------------------------------------------------
  check(await code(w("shift_quest_contribution_respond", B, sub1.submission_id, true, "  ")) === "missing_text",
    "a teammate states their own part");
  await w("shift_quest_contribution_respond", B, sub1.submission_id, true, "จดบันทึก");
  const ledger1: Json[] = (await db.query(
    "select member_id, amount, actor_id from public.shift_quest_ledger where instance_id = $1 order by member_id", [inst1])).rows;
  check(ledger1.length === 2 && ledger1.every((l) => l.amount === 10 && l.actor_id === mR1) &&
      ledger1.some((l) => l.member_id === mA) && ledger1.some((l) => l.member_id === mB),
    "the teammate's answer issues the withheld award to both, as the approving reviewer", ledger1);
  check(await scalar(db, "select award_status from public.shift_quest_instances where id = $1", [inst1]) === "issued" &&
      !(await w<Json[]>("shift_quest_awards_pending", R1)).some((a) => a.instance_id === inst1),
    "the quest leaves the awards page");
  check(await count("select count(*) from public.shift_quest_audit where action = 'award_after_contributions' and resource_id = $1", [inst1]) === 1,
    "the automatic award is audited");
  check(await code(w("shift_quest_contribution_respond", B, sub1.submission_id, true, "อีกครั้ง")) === "not_found",
    "a second answer finds nothing to answer");

  // A teammate who says "not mine" also unblocks the award, for the ones who did confirm.
  await w("shift_quest_admin_template_rule", ADMIN, "real-stories-not-compliments", "build");
  const sub2 = await w<Json>("shift_quest_milestone_submit_team", A, 2, "เรื่องจริงจากลูกค้า", "ฟังมากกว่าพูด", null, "สัมภาษณ์", [mB, mG]);
  await w("shift_quest_review_decide", R1, sub2.submission_id, "approved", null, false);
  await w("shift_quest_contribution_respond", B, sub2.submission_id, false, null);
  check(await count("select count(*) from public.shift_quest_ledger where instance_id = $1", [sub2.instance_id]) === 0,
    "while one teammate has not answered, nothing is issued");
  await w("shift_quest_contribution_respond", G, sub2.submission_id, true, "ถอดเทป");
  const ledger2: Json[] = (await db.query("select member_id from public.shift_quest_ledger where instance_id = $1", [sub2.instance_id])).rows;
  check(ledger2.length === 2 && !ledger2.some((l) => l.member_id === mB),
    "the last answer issues it to the confirmed members only", ledger2);

  // Without a team split the award stays withheld with the real reason, as a staff retry would record it.
  await w("shift_quest_admin_rule", ADMIN, "solo", 5, null, null, "ทำเควสต์เสร็จ", "พี่เลี้ยงรีวิว", "อธิบายเป็นการส่วนตัว");
  await w("shift_quest_admin_template_rule", ADMIN, "first-partner", "solo");
  const sub3 = await w<Json>("shift_quest_milestone_submit_team", A, 3, "ได้พาร์ตเนอร์", "ต่อรองเป็น", null, "นัดคุย", [mB]);
  await w("shift_quest_review_decide", R1, sub3.submission_id, "approved", null, false);
  await w("shift_quest_contribution_respond", B, sub3.submission_id, true, "เตรียมสไลด์");
  check(await scalar(db, "select award_note from public.shift_quest_instances where id = $1", [sub3.instance_id]) === "team_allocation_missing" &&
      await count("select count(*) from public.shift_quest_ledger where instance_id = $1", [sub3.instance_id]) === 0,
    "a rule with no team split records team_allocation_missing and issues nothing");

  // Awards paused after the approval: the last answer records awards_paused, as a staff retry would.
  await w("shift_quest_admin_template_rule", ADMIN, "in-their-hands", "build");
  const sub4 = await w<Json>("shift_quest_milestone_submit_team", A, 4, "ให้ลองใช้หนึ่งสัปดาห์", "ใช้จริง", null, "ทำหน้าเว็บ", [mB]);
  const held = await w<Json>("shift_quest_review_decide", R1, sub4.submission_id, "approved", null, false);
  check(held.award?.reason === "contributions_pending", "the approval holds the award for the teammate", held.award);
  await w("shift_quest_admin_setting", ADMIN, "awards", "off");
  await w("shift_quest_contribution_respond", B, sub4.submission_id, true, "หาคนลอง");
  check(await scalar(db, "select award_note from public.shift_quest_instances where id = $1", [sub4.instance_id]) === "awards_paused" &&
      await scalar(db, "select award_status from public.shift_quest_instances where id = $1", [sub4.instance_id]) === "not_issued" &&
      await count("select count(*) from public.shift_quest_ledger where instance_id = $1", [sub4.instance_id]) === 0,
    "with awards paused the last answer issues nothing and records awards_paused");
  check(await count(
    "select count(*) from public.shift_quest_audit where action = 'award_after_contributions' and resource_id = $1 and outcome = 'awards_paused'",
    [sub4.instance_id]) === 1, "and audits the attempt with its reason");
  check((await w<Json[]>("shift_quest_awards_pending", R1)).some((a) => a.instance_id === sub4.instance_id),
    "so the quest stays on the awards page for a staff retry");
  await w("shift_quest_admin_setting", ADMIN, "awards", "on");

  // --- Teammates on side quests: the community quests only ---------------------------------------
  const tpl = async (slug: string): Promise<string> =>
    scalar(db, "select id from public.shift_quest_templates where slug = $1 and status = 'published'", [slug]);
  const practice = await tpl("side-practice-talk");
  const helpBuilder = await tpl("side-help-a-builder");
  check(await code(w("shift_quest_side_submit_team", A, practice, "ซ้อมพูด", "มั่นใจขึ้น", null, null, [mB])) === "bad_input",
    "teammates cannot be named on a side quest other than the two community quests");
  const solo = await w<Json>("shift_quest_side_submit_team", A, practice, "ซ้อมพูด", "มั่นใจขึ้น", null, null, []);
  check(await scalar(db, "select visibility from public.shift_quest_submissions where id = $1", [solo.submission_id]) === "reviewers",
    "with nobody named a side quest is sent to reviewers only");
  const improve = await tpl("side-improve-community");
  for (const [label, list] of [["another project's student", [mC]], ["an unknown uuid", [randomUUID()]]] as [string, string[]][]) {
    const got = await code(w("shift_quest_side_submit_team", A, improve, "ปรับห้องรวม", "ฟังทุกคน", null, "จัดห้อง", list));
    check(got === "contributor_not_teammate", `a community quest refuses ${label} (contributor_not_teammate)`, got);
  }
  const improved = await w<Json>("shift_quest_side_submit_team", A, improve, "ปรับห้องรวม", "ฟังทุกคน", null, "จัดห้อง", [mB]);
  check(await scalar(db, "select visibility from public.shift_quest_submissions where id = $1", [improved.submission_id]) === "team" &&
      await count("select count(*) from public.shift_quest_contributions where submission_id = $1 and member_id = $2 and status = 'pending'",
        [improved.submission_id, mB]) === 1,
    "the second community quest takes a teammate too, visible to the team");
  const community = await w<Json>("shift_quest_side_submit_team", A, helpBuilder, "ช่วยทีมสองตั้งหน้าแรก", "สอนแล้วเข้าใจเอง", null,
    "สอนตั้งหน้าเว็บ", [mB]);
  await w("shift_quest_review_decide", R1, community.submission_id, "approved", null, false);
  check(await scalar(db, "select public.shift_quest__community_done($1)", [mB]) === false,
    "a teammate's community credit waits for their own confirmation");
  await w("shift_quest_contribution_respond", B, community.submission_id, true, "ช่วยอธิบาย");
  check(await scalar(db, "select public.shift_quest__community_done($1)", [mB]) === true,
    "once confirmed, the community quest counts for the teammate");

  // --- Celebrate and thank a peer ------------------------------------------------------------------------
  await call(bot, "shift_quest_admin_set", ADMIN, "celebrate_channel", CELEBRATE_CHANNEL);
  await call(bot, "shift_quest_admin_set", ADMIN, "coworking_channel", "930000000000000002");
  await w("shift_quest_admin_setting", ADMIN, "sharing", "on");
  // The campfire's intentions, posted from Discord, never use up the website's drafts.
  for (let i = 0; i < 5; i += 1) await call(bot, "shift_quest_share_create", A, "intention", `วันนี้จะทำ ${i}`, null, null);
  for (const [label, args, expected] of [
    ["a celebration naming a peer", [A, "celebration", "เย้", inst1, mB], "bad_input"],
    ["a thank-you without a peer", [A, "recognition", "ขอบคุณ", null, null], "bad_input"],
    ["the campfire's intention", [A, "intention", "วันนี้จะทำ", null, null], "bad_input"],
    ["thanking staff", [A, "recognition", "ขอบคุณ", null, mR1], "invitee_not_started"],
    ["thanking an unknown uuid", [A, "recognition", "ขอบคุณ", null, randomUUID()], "invitee_not_started"],
    ["thanking oneself", [A, "recognition", "ขอบคุณ", null, mA], "bad_input"],
    ["a staff caller", [R1, "recognition", "ขอบคุณ", null, mB], "not_eligible"],
  ] as [string, unknown[], string][]) {
    const got = await code(w("shift_quest_share_draft", ...args));
    check(got === expected, `share_draft refuses ${label} (${expected})`, got);
  }
  const thanks: string = await w("shift_quest_share_draft", A, "recognition", "ขอบคุณที่ช่วยจดบันทึก", null, mB);
  const preview = await w<Json>("shift_quest_share_get", A, thanks);
  check(preview && noDiscord(preview), "the author previews the draft, with no Discord id", preview);
  check(await w("shift_quest_share_confirm", A, thanks) === "awaiting_peer", "a thank-you waits for the peer");
  check(await w("shift_quest_share_confirm", A, thanks) === "awaiting_peer", "a second confirm is a no-op");
  check((await w<Json>("shift_quest_inbox_list", B, false)).recognitions.some((r: Json) => r.share_id === thanks),
    "the peer finds it in their inbox");
  check(await w("shift_quest_share_respond", B, thanks, true) === "queued" &&
      await count("select count(*) from public.shift_quest_outbox where dedupe_key = $1 and channel_key = 'celebrate'", [`share:${thanks}`]) === 1,
    "the peer allows it and the bot's outbox posts it in the celebrate channel");
  const party: string = await w("shift_quest_share_draft", A, "celebration", "ผ่านเควสต์แรก", inst1, null);
  check(await w("shift_quest_share_confirm", A, party) === "queued", "a celebration of an approved quest is queued");
  for (let i = 0; i < 3; i += 1) {
    await w("shift_quest_share_cancel", A, await w("shift_quest_share_draft", A, "celebration", `ร่าง ${i}`, inst1, null));
  }
  check(await code(w("shift_quest_share_draft", A, "celebration", "อีกครั้ง", inst1, null)) === "share_limit",
    "the sixth draft in 24 hours is refused (share_limit), cancelled drafts included");
  check(await count("select count(*) from public.shift_quest_shares where member_id = $1 and kind <> 'intention'", [mA]) === 5 &&
      await count("select count(*) from public.shift_quest_shares where member_id = $1 and kind = 'intention'", [mA]) === 5,
    "and stores nothing; the five campfire intentions did not count toward it");
  check(await code(w("shift_quest_share_draft", B, "recognition", "ขอบคุณเช่นกัน", null, mA)) === "ok",
    "the cap is per student");

  // --- Data rights -----------------------------------------------------------------------------------------
  const exported = await w<Json>("shift_quest_data_export", D);
  check(exported && typeof exported === "object" && noDiscord(exported), "the data export carries no Discord id", Object.keys(exported ?? {}));
  const erase1: string = await w("shift_quest_data_request", D, "erasure", null);
  const erase2: string = await w("shift_quest_data_request", D, "erasure", null);
  check(erase1 === erase2, "a second erasure request returns the open one");
  check(await count("select count(*) from public.shift_quest_data_requests where member_id = $1", [mD]) === 1 &&
      await count("select count(*) from public.shift_quest_outbox where kind = 'data_request' and dedupe_key = $1", [`data:${erase1}`]) === 1,
    "so staff get one alert");
  check(await code(w("shift_quest_data_request", D, "correction", null)) === "missing_text", "a correction needs a note");
  const fix1: string = await w("shift_quest_data_request", D, "correction", "ชื่อสะกดผิด");
  check(fix1 !== erase1 && await w("shift_quest_data_request", D, "correction", "อีกเรื่อง") === fix1,
    "one open request per kind: a correction is its own, and deduplicated too");
  check(await code(w("shift_quest_data_request", D, "correction", "  ")) === "missing_text",
    "a second correction still needs a note");
  await w("shift_quest_data_request", D, "correction", "อีกเรื่อง");
  check(await scalar(db, "select note from public.shift_quest_data_requests where id = $1", [fix1]) === "ชื่อสะกดผิด\n---\nอีกเรื่อง" &&
      await count("select count(*) from public.shift_quest_audit where action = 'data_request_correction_more' and resource_id = $1", [fix1]) === 1,
    "the second note joins the open request for staff, once (a repeat adds nothing), and is audited");
  check(await code(w("shift_quest_data_request", D, "correction", "ก".repeat(990))) === "text_too_long",
    "a note that no longer fits is refused, not dropped");
  const open = await w<Json[]>("shift_quest_admin_data_requests", ADMIN);
  check(open.length === 2 && noDiscord(open), "admins see the two open requests", open);
  await w("shift_quest_admin_data_close", ADMIN, erase1, false);
  check(await w("shift_quest_data_request", D, "erasure", null) !== erase1, "once closed, a new request opens");

  // An erased member drops out of every picker.
  const eraseG: string = await w("shift_quest_data_request", G, "erasure", null);
  await w("shift_quest_admin_erase", ADMIN, eraseG);
  check(await code(w("shift_quest_milestone_submit_team", A, 5, "วนรอบ", "ฟังแล้วแก้", null, null, [mG])) === "contributor_not_teammate",
    "an erased member cannot be named");
  check(!(await w<Json[]>("shift_quest_islanders", A, "every")).some((f) => f.id === mG) &&
      !(await w<Json[]>("shift_quest_project_teammates", A)).some((f) => f.id === mG),
    "nor found in the pickers");
  check(await code(w("shift_quest_admin_member", ADMIN, mG)) === "not_found", "nor opened by an admin");

  // --- Help requests honour the review conflict rule ----------------------------------------------
  const helpA: string = await w("shift_quest_help_create", A, "ติดเรื่องตั้งราคา", "mentors", "student", null);
  const helpC: string = await w("shift_quest_help_create", C, "ติดเรื่องหาลูกค้า", "mentors", "student", null);
  const qR1 = await w<Json[]>("shift_quest_help_queue", R1);
  const qR2 = await w<Json[]>("shift_quest_help_queue", R2);
  check(qR1.some((h) => h.id === helpA) && qR1.some((h) => h.id === helpC), "a reviewer outside the team sees both");
  check(!qR2.some((h) => h.id === helpA) && qR2.some((h) => h.id === helpC),
    "a reviewer on the student's team does not see their help request", qR2.map((h) => h.id));
  check(await code(w("shift_quest_help_update", R2, helpA, "claim", null)) === "help_conflict" &&
      await code(w("shift_quest_help_update", R2, helpA, "resolve", "ช่วยแล้ว")) === "help_conflict",
    "and cannot claim or resolve it (help_conflict, words of its own)");
  await w("shift_quest_help_update", R1, helpA, "claim", null);
  check((await w<Json[]>("shift_quest_help_mine", A)).some((h) => h.id === helpA && h.status === "claimed"),
    "another reviewer claims it and the student sees that");
  check(await code(w("shift_quest_help_update", R2, helpA, "release", null)) === "ok" &&
      await scalar(db, "select status from public.shift_quest_help_requests where id = $1", [helpA]) === "open",
    "releasing stays open to every reviewer, the conflicted one included");
  await w("shift_quest_help_update", R1, helpA, "claim", null);
  await w("shift_quest_help_update", R2, helpC, "claim", null);
  check(await scalar(db, "select status from public.shift_quest_help_requests where id = $1", [helpC]) === "claimed",
    "the conflicted reviewer still helps other teams");

  // --- Admin: members by uuid ----------------------------------------------------------------------
  check(await code(w("shift_quest_admin_members", ADMIN, "e")) === "invalid_input", "the admin search needs 2 characters");
  const people = await w<Json[]>("shift_quest_admin_members", ADMIN, "every");
  check(people.some((p) => p.id === mR1 && JSON.stringify(p.roles) === JSON.stringify(["reviewer"]) && p.started === true) &&
      people.some((p) => p.id === mAdmin && p.started === false) && !people.some((p) => p.id === mG) &&
      people.every((p) => Object.keys(p).sort().join(",") === "id,name,roles,started") && noDiscord(people),
    "admins find staff and students by name, never the erased, never a Discord id", people);
  const detail = await w<Json>("shift_quest_admin_member", ADMIN, mA);
  check(detail.id === mA && detail.name === NAMES[A] && detail.started === true && detail.project?.id === p1 &&
      detail.consent?.state === "none" && detail.balance === 20 && Array.isArray(detail.entries) && detail.entries.length >= 1 &&
      noDiscord(detail),
    "one member: roles, project, consent, balance and ledger, no Discord id", detail);
  check(await code(w("shift_quest_admin_member", ADMIN, randomUUID())) === "not_found", "an unknown uuid is not found");

  // Roles: only members who already have a row.
  check(JSON.stringify((await w<Json>("shift_quest_admin_member_role", ADMIN, mC, "fulfillment", true)).roles) === '["fulfillment"]' &&
      JSON.stringify((await w<Json>("shift_quest_admin_member_role", ADMIN, mC, "fulfillment", false)).roles) === "[]",
    "an admin grants and removes a role by uuid");
  check(await code(w("shift_quest_admin_member_role", ADMIN, mC, "owner", true)) === "bad_input", "an unknown role is refused");
  check(await code(w("shift_quest_admin_member_role", ADMIN, randomUUID(), "reviewer", true)) === "not_found",
    "a uuid with no member row is not found (new staff are added in Discord)");
  check(await code(w("shift_quest_admin_member_role", ADMIN, mAdmin, "admin", false)) === "last_admin",
    "the last admin cannot remove themselves");
  check(await count("select count(*) from public.shift_quest_members") === 9, "no member row was created from the website");

  // Recognition: the request uuid is the idempotency key.
  const req = randomUUID();
  const rec1 = await w<Json>("shift_quest_admin_member_recognize", ADMIN, mC, 0, "ช่วยเพื่อนต่างทีม", "community", req);
  const rec2 = await w<Json>("shift_quest_admin_member_recognize", ADMIN, mC, 0, "ช่วยเพื่อนต่างทีม", "community", req);
  check(rec1.duplicate === false && rec2.duplicate === true && rec2.recognition_id === rec1.recognition_id,
    "the same request uuid twice records one recognition", [rec1, rec2]);
  check(await scalar(db, "select request_key from public.shift_quest_recognitions where id = $1", [rec1.recognition_id]) === `web-recog:${req}`,
    "stored under a 'web-recog:' key the bot never uses");
  check(await code(w("shift_quest_admin_member_recognize", ADMIN, mD, 0, "x", "community", req)) === "bad_input",
    "the same uuid for another member is a mistake, not a retry");
  check(await code(w("shift_quest_admin_member_recognize", ADMIN, mD, 0, "x", "community", null)) === "bad_input",
    "a recognition needs a request uuid");
  check(await code(w("shift_quest_admin_member_recognize", ADMIN, mAdmin, 0, "x", "community", randomUUID())) === "conflict_of_interest",
    "an admin cannot recognise themselves");

  // Staff awards and reversals.
  await w("shift_quest_admin_rule", ADMIN, "helped-most", 5, null, null, "ช่วยมากที่สุด", "ทีมงานเลือก", "อธิบายเป็นการส่วนตัว");
  const awardReq = randomUUID();
  const award1 = await w<Json>("shift_quest_admin_member_award", ADMIN, mC, "helped-most", "ช่วยทั้งเกาะ", awardReq);
  const award2 = await w<Json>("shift_quest_admin_member_award", ADMIN, mC, "helped-most", "ช่วยทั้งเกาะ", awardReq);
  check(award1.duplicate === false && award1.amount === 5 && award2.duplicate === true, "a staff award is idempotent", [award1, award2]);
  const entry: string = await scalar(db, "select id from public.shift_quest_ledger where source_key = $1", [`staff:web-award:${awardReq}`]);
  check(typeof entry === "string", "stored under a 'web-award:' key");
  const rev = await w<Json>("shift_quest_admin_reverse", ADMIN, entry, 2, "กดผิด", `web-rev:${randomUUID()}`);
  check(typeof rev.entry_id === "string" && (await w<Json>("shift_quest_admin_member", ADMIN, mC)).balance === 3,
    "an admin reverses part of it from the website", rev);

  check((await w<Json>("shift_quest_admin_member_consent_reset", ADMIN, mC)).state === "none", "consent resets by uuid");

  // --- Admin: seasons ---------------------------------------------------------------------------------
  check(JSON.stringify(await w("shift_quest_admin_seasons", ADMIN)) === "[]", "no season yet");
  await w("shift_quest_admin_season", ADMIN, "Every Season", "2026-12-01", "2027-02-28", "2027-02-20",
    null, null, null, null, null, null, false, false, null);
  const seasons = await w<Json[]>("shift_quest_admin_seasons", ADMIN);
  check(seasons.length === 1 && seasons[0].name === "Every Season" && seasons[0].status === "draft" && Array.isArray(seasons[0].unlocks),
    "admin_seasons lists the draft season with its id", seasons);
  const unlock: string = await w("shift_quest_admin_unlock", ADMIN, seasons[0].id, "สติกเกอร์", 2, "2027-02-15", null);
  check((await w<Json[]>("shift_quest_admin_seasons", ADMIN))[0].unlocks.some((u: Json) => u.id === unlock),
    "and admin_unlock works with that id");

  // --- Admin: what else the website now runs ---------------------------------------------------------------
  check(await code(w("shift_quest_admin_rule_retire", ADMIN, "solo")) === "ok" &&
      await code(w("shift_quest_admin_rule_retire", ADMIN, "solo")) === "rule_not_found",
    "a rule retires from the website");
  check(await code(w("shift_quest_fulfill_queue", R1)) === "not_authorized", "the fulfillment queue is for fulfillment staff");
  check(typeof (await w<Json>("shift_quest_admin_report", ADMIN, 7)) === "object", "the report runs from the website");

  // --- The 8-teammate cap never counts the caller ---------------------------------------------------
  // A crew of ten (names without "Every", so the searches above are unchanged): a lead and nine others.
  const CREW = Array.from({ length: 10 }, (_, i) => `95000000000000000${i}`);
  for (const [i, id] of CREW.entries()) await w("shift_quest_start", id, `Crew ${i}`, false);
  const crewProject: string = await w("shift_quest_project_create", CREW[0], "Crew", "software", null);
  for (const id of CREW.slice(1)) {
    await call(bot, "shift_quest_project_invite", CREW[0], crewProject, id);
    await w("shift_quest_project_respond", id, crewProject, true);
  }
  const crew = await Promise.all(CREW.map((id) => idOf(id)));
  check(await code(w("shift_quest_milestone_submit_team", CREW[0], 1, "คุยกับคนจริง", "ได้เรียนรู้", null, "นัดคุย", crew.slice(1))) === "bad_input",
    "nine teammates are refused (bad_input)");
  const crewSub = await w<Json>("shift_quest_milestone_submit_team", CREW[0], 1, "คุยกับคนจริง", "ได้เรียนรู้", null, "นัดคุย",
    [crew[0], ...crew.slice(1, 9)]);
  check(await count("select count(*) from public.shift_quest_contributions where submission_id = $1 and status = 'pending'",
      [crewSub.submission_id]) === 8,
    "eight teammates plus the caller's own uuid are accepted: the caller is not one of the eight");

  await Promise.all([db.end(), bot.end(), web.end()]);
  console.log(`\n${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
