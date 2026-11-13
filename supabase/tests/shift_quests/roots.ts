/**
 * SHIFT High Island: roots (20261113090000_shift_quest_roots). Reflections grow
 * a tree's roots; the read is shift_quest_island_roots(), called as
 * shift_quest_bot (the live post, /island) and as shift_quest_web (the island
 * page). Checks what counts (a journal note with at least 10 characters of
 * learned, written for the project by a current member), the cap of 3 per
 * member per Bangkok day, the levels (1: 1 to 4, 2: 5 to 14, 3: 15 or more),
 * and that a plain plot (not every member agreed to show it, or no consent)
 * has no public roots. Schema 11 adds a private own-tree level using the
 * same counter, regardless of visibility. consent_required starts off and
 * is switched on at the end.
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
const ADMIN = "810000000000000001";
const A = "830000000000000001"; // project one, with B
const B = "830000000000000002"; // A's teammate; leaves later
const C = "830000000000000003"; // project two
const D = "830000000000000004"; // project three, archived later
const NAMES: Record<string, string> = {
  [ADMIN]: "Roots Admin", [A]: "Roots Aye", [B]: "Roots Bee", [C]: "Roots Cee", [D]: "Roots Dee",
};

const ROOTS = "shift_quest_island_roots()";
/** Ten characters exactly: the shortest reflection that counts. */
const TEN = "learned it";
const NINE = "123456789";

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
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: the live post and /island
  const web = await connect(webUrl!); // shift_quest_web: the island page

  /** The roots as the bot reads them; the website must read exactly the same. */
  const roots = async (): Promise<Json[]> => {
    const fromBot = await call<Json[]>(bot, "shift_quest_island_roots");
    const fromWeb = await call<Json[]>(web, "shift_quest_island_roots");
    if (JSON.stringify(fromBot) !== JSON.stringify(fromWeb)) {
      check(false, "the bot and the website read the same roots", { fromBot, fromWeb });
    }
    return fromBot;
  };
  const own = async (actor: string): Promise<number> => {
    const b = await call<number>(bot, "shift_quest_island_my_roots", actor);
    const w = await call<number>(web, "shift_quest_island_my_roots", actor);
    check(b === w, "bot and web read the same own-tree level");
    return w;
  };
  const show = (r: Json[]) => r.map((x) => `${x.slot}:${x.roots}`).join(",");
  const slotOf = (project: string) => scalar<number>(db, "select slot from public.shift_quest_plots where project_id = $1", [project]);

  // --- Schema, privileges ------------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === 11, "the bot reads schema version 11 (roots start from 10)");
  check(Number(await call(web, "shift_quest_schema_version")) === 11, "the website reads schema version 11");
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
    [`public.${ROOTS}`],
  )).rows[0];
  check(grants.bot === true && grants.web === true && grants.service_role === true && grants.anon === false &&
      grants.authenticated === false && grants.public === false && grants.definer === true && grants.pinned === true &&
      grants.volatility === "s",
    `${ROOTS}: a STABLE security definer read with a pinned search_path, the bot's and the website's`, grants);
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_island_roots"))) === "42501", `${r} cannot read the roots`);
    await db.query("reset role");
  }
  check(show(await roots()) === "", "an empty island has no roots: []");

  for (const role of ["shift_quest_bot", "shift_quest_web", "service_role", "anon", "authenticated"]) {
    check(await scalar<boolean>(db, "select has_function_privilege($1, 'public.shift_quest_island_my_roots(text)', 'EXECUTE')", [role]) ===
      !["anon", "authenticated"].includes(role), `${role}: own roots grant`);
    check(await scalar<boolean>(db, "select has_function_privilege($1, 'public.shift_quest__project_roots(uuid)', 'EXECUTE')", [role]) === false,
      `${role}: internal counter is not callable`);
  }
  // --- Fixtures --------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  for (const id of [A, B, C, D]) await call(bot, "shift_quest_start", id, NAMES[id], false);
  check(await own(A) === 0, "no current project returns 0");
  const p1: string = await call(bot, "shift_quest_project_create", A, "Roots One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(bot, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(bot, "shift_quest_project_create", C, "Roots Two", "creative", null);
  const p3: string = await call(bot, "shift_quest_project_create", D, "Roots Three", "service", null);
  const [s1, s2, s3] = [await slotOf(p1), await slotOf(p2), await slotOf(p3)];
  const optin = (who: string, project: string, on = true) => call(bot, "shift_quest_island_optin", who, project, on);

  /** A journal row written straight into the table, at a given time (the journal itself stamps now()). */
  const note = (who: string, project: string | null, learned: string | null, at: string, kind = "note") =>
    db.query(
      `insert into public.shift_quest_progress (member_id, project_id, kind, changed, learned, created_at)
       values ((select id from public.shift_quest_members where discord_user_id = $1), $2, $3, $4, $5, $6::timestamptz)`,
      [who, project, kind, kind === "note" ? "worked on it" : null, learned, at],
    );
  /** n reflections on one Bangkok day, a minute apart from hh:mm Bangkok time. */
  const notes = async (who: string, project: string, n: number, day: string, hhmm = "10:00") => {
    for (let k = 0; k < n; k++) {
      await note(who, project, `${TEN} ${k}`, `${day} ${hhmm}+07`);
    }
  };

  // --- Quiet trees have no roots ------------------------------------------------------------------
  await notes(A, p1, 2, "2026-10-01");
  check(show(await roots()) === "", "a quiet tree (nobody agreed to show it) has no roots, whatever its members wrote");
  check(await own(A) === 1 && await own(B) === 1 && await own(C) === 0, "quiet teammates see their own roots, never another project");
  await optin(A, p1);
  check(show(await roots()) === "", "one of two members agreed: still quiet, no roots");
  await optin(B, p1);
  check(show(await roots()) === `${s1}:1`, "every member agreed: 2 reflections are level 1", await roots());
  const shape = (await roots())[0];
  check(Object.keys(shape).sort().join(",") === "roots,slot" && Number.isInteger(shape.slot) && Number.isInteger(shape.roots),
    "each entry is {slot, roots} and nothing else", shape);
  await db.query("delete from public.shift_quest_progress");

  // --- What counts ---------------------------------------------------------------------------------
  await note(A, p1, NINE, "2026-10-01 09:00+07");
  await note(A, p1, null, "2026-10-01 09:01+07");
  await note(A, p1, "x".repeat(40), "2026-10-01 09:02+07", "tap");
  await note(A, null, TEN, "2026-10-01 09:03+07");
  await note(A, p2, TEN, "2026-10-01 09:04+07");
  await note(C, p1, TEN, "2026-10-01 09:05+07");
  check(show(await roots()) === "",
    "nothing counts yet: 9 characters, no learned, a tap, a note for no project, for another project, or by a non-member");
  await note(A, p1, TEN, "2026-10-01 09:06+07");
  check(show(await roots()) === `${s1}:1`, "a note with exactly 10 characters of learned counts (level 1)", await roots());

  check(await own(A) === 1, "exactly ten characters count privately");
  // --- The cap: 3 per member per Bangkok day ----------------------------------------------------------
  await notes(A, p1, 4, "2026-10-01", "22:00");
  check(show(await roots()) === `${s1}:1`, "5 notes on one Bangkok day count as 3 (still level 1)");
  // 2026-10-02 00:30 in Bangkok is still 2026-10-01 in UTC: a UTC day would cap these too.
  await notes(A, p1, 1, "2026-10-02", "00:30");
  check(show(await roots()) === `${s1}:1`, "3 + 1 after midnight in Bangkok: 4 counted, level 1");
  await notes(B, p1, 1, "2026-10-01", "23:00");
  check(show(await roots()) === `${s1}:2`, "a teammate's note adds to the same tree: 5 counted, level 2", await roots());

  check(await own(A) === 2, "private read uses the per-member Bangkok cap");
  // --- Levels: 5 to 14 is 2, 15 or more is 3 ------------------------------------------------------
  await notes(B, p1, 3, "2026-10-02"); // B: 1 + 3 = 4, total 8
  await notes(B, p1, 3, "2026-10-03"); // total 11
  await notes(A, p1, 5, "2026-10-03"); // A: 3 count, total 14
  check(show(await roots()) === `${s1}:2`, "14 counted reflections are still level 2", await roots());
  check(await own(A) === 2, "14 counted reflections are privately level 2");
  await notes(B, p1, 1, "2026-10-04"); // total 15
  check(show(await roots()) === `${s1}:3`, "15 counted reflections are level 3", await roots());
  await notes(A, p1, 30, "2026-10-05");
  await notes(A, p1, 3, "2026-10-06");
  check(show(await roots()) === `${s1}:3`, "level 3 is the top: more reflections show nothing more", await roots());
  await db.query("delete from public.shift_quest_progress where created_at >= '2026-10-05 00:00+07'");

  check(await own(A) === 3, "private read reaches level 3");
  // --- Another tree, through the real journal ---------------------------------------------------------
  await call(bot, "shift_quest_progress_add", C, "Built the first screen", "Users want a bigger button", null, null, null, "private", null);
  check(show(await roots()) === `${s1}:3`, "a quiet second tree has no roots");
  await optin(C, p2);
  check(show(await roots()) === `${s1}:3,${s2}:1`, "it agrees to show: a private journal entry grows its roots (level 1), by slot",
    await roots());
  await notes(D, p3, 3, "2026-10-01");
  await optin(D, p3);
  check(show(await roots()) === `${s1}:3,${s2}:1,${s3}:1`, "every shown tree with reflections is listed, by slot", await roots());
  await db.query("update public.shift_quest_projects set archived_at = now() where id = $1", [p3]);
  check(show(await roots()) === `${s1}:3,${s2}:1`, "an archived project is not drawn and has no roots");

  check(await own(D) === 0, "archived project returns 0");
  // --- Current members only -----------------------------------------------------------------------
  await call(bot, "shift_quest_project_leave", B, p1);
  // B's 9 counted reflections leave with B: A's 3 + 1 + 3 = 7 remain.
  check(show(await roots()) === `${s1}:2,${s2}:1`, "a member who leaves takes their reflections along (15 down to 7: level 2)",
    await roots());

  check(await own(B) === 0 && await own(A) === 2, "leaving removes membership and counted notes");
  // --- Plain again ------------------------------------------------------------------------------------
  await optin(A, p1, false);
  check(show(await roots()) === `${s2}:1`, "a member stops showing the tree: plain, no roots");
  await optin(A, p1);
  check(show(await roots()) === `${s1}:2,${s2}:1`, "shown again: its roots come back as they were");

  // --- Consent (20261111095000) -----------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = true where id");
  check(show(await roots()) === "", "consent required and nobody has it: every tree is plain, no roots");
  check(await own(A) === 2 && await own(C) === 1, "missing consent never hides own roots");
  await call(web, "shift_quest_consent_import", A, "shift_adult", null, false, false);
  check(show(await roots()) === `${s1}:2`, "A's consent arrives: their tree has roots again, the other stays plain", await roots());

  // --- Nothing personal leaves ------------------------------------------------------------------------
  const text = JSON.stringify(await roots());
  const ids: string[] = (await db.query("select id::text from public.shift_quest_members")).rows.map((r) => r.id);
  const leaks = [p1, p2, p3, ...ids, ...Object.values(NAMES), "Roots One", TEN, A, B, C, D].filter((s) => text.includes(s));
  check(leaks.length === 0, "the answer carries no project or member id, no name, no Discord id and no journal text", leaks);
  check(await scalar<number>(db, "select count(*) from public.shift_quest_progress where kind = 'note'") > 0,
    "and reading roots left the journal as it was");

  console.log(`\n${passes} passed, ${failures} failed`);
  await Promise.all([db.end(), bot.end(), web.end()]);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
