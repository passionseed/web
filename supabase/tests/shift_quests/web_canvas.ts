/**
 * SHIFT High Island on the web: the SHIFT canvas link
 * (20261111091100_shift_quest_canvas_links). Every student call goes through
 * shift_quest_web, as the website makes it; invites and leaving go through
 * shift_quest_bot, as in Discord.
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
const A = "640000000000000001"; // owns project one
const B = "640000000000000002"; // A's teammate
const C = "640000000000000003"; // a project of their own
const D = "640000000000000004"; // no project; invited to project one but has not answered
const NOBODY = "649999999999999999";
const NAMES: Record<string, string> = { [A]: "Canvas Aye", [B]: "Canvas Bee", [C]: "Canvas Cee", [D]: "Canvas Dee" };

/** The full web allowlist after 20261111091200 (regprocedure text), as in web_board.ts. */
const WEB_ALLOWLIST = [
  "shift_quest_board(text)",
  "shift_quest_canvas_get(text)",
  "shift_quest_canvas_link(text,uuid,text,text)",
  "shift_quest_canvas_unlink(text)",
  "shift_quest_checkin(text,text)",
  "shift_quest_help_create(text,text,text,text,uuid)",
  "shift_quest_island(text)",
  "shift_quest_island_map(text)",
  "shift_quest_island_optin(text,uuid,boolean)",
  "shift_quest_milestone_start(text,smallint)",
  "shift_quest_milestone_submit(text,smallint,text,text,text)",
  "shift_quest_ownership_get(text)",
  "shift_quest_project_create(text,text,text,text)",
  "shift_quest_project_list(text)",
  "shift_quest_project_respond(text,uuid,boolean)",
  "shift_quest_propose(text,text,text,text,text,text)",
  "shift_quest_rest(text,boolean)",
  "shift_quest_resume(text,uuid)",
  "shift_quest_schema_version()",
  "shift_quest_session(text,text)",
  "shift_quest_side_choose(text,uuid)",
  "shift_quest_side_submit(text,uuid,text,text,text)",
  "shift_quest_start(text,text,boolean)",
  "shift_quest_submit(text,uuid,integer,text,text,text,text,text,text[])",
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

const keys = (o: Json | null | undefined) => (o ? Object.keys(o).sort().join(",") : String(o));

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: invites and leaving, as in Discord
  const web = await connect(webUrl!); // shift_quest_web: every student call, as the website makes it

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));

  // --- Schema, privileges, row security ------------------------------------------------
  check(Number(await call(web, "shift_quest_schema_version")) === 6, "the website reads schema version 6");

  const executable: string[] = (await db.query(`
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'shift\\_quest\\_%'
      and has_function_privilege('shift_quest_web', p.oid, 'EXECUTE')
    order by 1`)).rows.map((r) => r.sig);
  check(JSON.stringify(executable) === JSON.stringify([...WEB_ALLOWLIST].sort()),
    "the website executes exactly the allowlist, the canvas and ownership functions included", {
      extra: executable.filter((s) => !WEB_ALLOWLIST.includes(s)),
      missing: WEB_ALLOWLIST.filter((s) => !executable.includes(s)),
    });
  for (const fn of [
    "shift_quest_canvas_get(text)",
    "shift_quest_canvas_link(text,uuid,text,text)",
    "shift_quest_canvas_unlink(text)",
    "shift_quest_ownership_get(text)",
  ]) {
    const grants: Json = (await db.query(
      `select has_function_privilege('shift_quest_bot', $1::regprocedure, 'EXECUTE') as bot,
              has_function_privilege('anon', $1::regprocedure, 'EXECUTE') as anon,
              has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') as authenticated,
              (select prosecdef from pg_proc where oid = $1::regprocedure) as definer`,
      [`public.${fn}`],
    )).rows[0];
    // Website-only: only the website can check a canvas before linking it, and the bot reads project_view.
    check(grants.bot === false && grants.anon === false && grants.authenticated === false && grants.definer === true,
      `${fn}: security definer, website-only (neither the bot nor the Data API may run it)`, grants);
  }

  const table: Json = (await db.query(
    "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies " +
    "from pg_class c join pg_namespace n on n.oid = c.relnamespace " +
    "where n.nspname = 'public' and c.relname = 'shift_quest_canvas_links'"
  )).rows[0];
  check(table?.rls === true && table.policies === 0, "shift_quest_canvas_links has row level security on and no policies", table);
  for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
    const has = await scalar<boolean>(db,
      "select has_table_privilege($1, 'public.shift_quest_canvas_links', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')",
      [role]);
    check(has === false, `${role} holds no privilege on shift_quest_canvas_links`);
  }
  check(await scalar<boolean>(db,
      "select has_table_privilege('service_role', 'public.shift_quest_canvas_links', 'SELECT, INSERT, UPDATE, DELETE')"),
    "service_role keeps its table grant, as on every quest table");
  check((await sqlstate(web.query("select * from public.shift_quest_canvas_links"))) === "42501",
    "the website cannot read the table directly (42501)");
  check((await sqlstate(web.query("delete from public.shift_quest_canvas_links"))) === "42501",
    "the website cannot write the table directly (42501)");
  const columns: string[] = (await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'shift_quest_canvas_links' order by ordinal_position"
  )).rows.map((r) => r.column_name);
  check(columns.join(",") === "project_id,board_id,frame_id,canvas_project,linked_by,linked_at,updated_at",
    "the link holds pointers only: no canvas title, note text or Supabase user id", columns);

  // --- Gates before a project -----------------------------------------------------------
  check(await code(call(web, "shift_quest_canvas_get", NOBODY)) === "not_started", "canvas_get needs /start");
  check(await code(call(web, "shift_quest_canvas_link", NOBODY, randomUUID(), "f", "p")) === "not_started",
    "canvas_link needs /start");
  check(await code(call(web, "shift_quest_canvas_unlink", NOBODY)) === "not_started", "canvas_unlink needs /start");

  for (const id of [A, B, C, D]) await call(web, "shift_quest_start", id, NAMES[id], false);
  check(await call(web, "shift_quest_canvas_get", D) === null, "without a project the link reads null");
  check(await code(call(web, "shift_quest_canvas_link", D, randomUUID(), "f", "p")) === "no_project",
    "without a project linking is refused (no_project)");
  check(await call(web, "shift_quest_canvas_unlink", D) === false, "without a project unlinking is a no-op (false)");

  // --- Projects ----------------------------------------------------------------------------
  const p1: string = await call(web, "shift_quest_project_create", A, "Canvas One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(bot, "shift_quest_project_invite", A, p1, D);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "Canvas Two", "creative", null);

  check(await call(web, "shift_quest_canvas_get", A) === null, "a new project has no link");
  check(await code(call(web, "shift_quest_canvas_link", D, randomUUID(), "f", "p")) === "no_project",
    "an invited student who has not accepted cannot link the project");

  // --- Link -----------------------------------------------------------------------------------
  const board1 = randomUUID();
  const linked: Json = await call(web, "shift_quest_canvas_link", A, board1, "frame-one", "project-one");
  check(keys(linked) === "board_id,canvas_project,frame_id,linked_at" &&
      linked.board_id === board1 && linked.frame_id === "frame-one" && linked.canvas_project === "project-one" &&
      typeof linked.linked_at === "string",
    "linking returns the link", linked);
  const gotA: Json = await call(web, "shift_quest_canvas_get", A);
  check(JSON.stringify(gotA) === JSON.stringify(linked), "the owner reads the same link back", gotA);
  const gotB: Json = await call(web, "shift_quest_canvas_get", B);
  check(JSON.stringify(gotB) === JSON.stringify(linked), "a teammate sees the same link", gotB);
  check(await call(web, "shift_quest_canvas_get", C) === null, "another project's student sees no link");
  check(await call(web, "shift_quest_canvas_get", D) === null, "an invited student who has not accepted sees no link");
  const row: Json = (await db.query(
    "select l.*, m.discord_user_id from public.shift_quest_canvas_links l " +
    "left join public.shift_quest_members m on m.id = l.linked_by where l.project_id = $1", [p1]
  )).rows[0];
  check(row?.discord_user_id === A, "linked_by is the member who linked", row?.discord_user_id);
  check(await count("select count(*) from public.shift_quest_audit where action = 'canvas_link' and resource_id = $1", [p1]) === 1,
    "linking is audited (no text)");

  // --- Relink -------------------------------------------------------------------------------------
  const board2 = randomUUID();
  const relinked: Json = await call(web, "shift_quest_canvas_link", B, board2, "frame-two", "project-two");
  check(relinked.board_id === board2 && relinked.frame_id === "frame-two" && relinked.canvas_project === "project-two",
    "a teammate can relink the project", relinked);
  check(await count("select count(*) from public.shift_quest_canvas_links where project_id = $1", [p1]) === 1,
    "a project has one link, replaced in place");
  const after: Json = (await db.query(
    "select m.discord_user_id, l.updated_at >= l.linked_at as ordered from public.shift_quest_canvas_links l " +
    "left join public.shift_quest_members m on m.id = l.linked_by where l.project_id = $1", [p1]
  )).rows[0];
  check(after.discord_user_id === B && after.ordered === true, "relinking records who linked last", after);
  check(JSON.stringify(await call(web, "shift_quest_canvas_get", A)) === JSON.stringify(relinked),
    "the owner now reads the teammate's link");

  // The second project is independent.
  await call(web, "shift_quest_canvas_link", C, randomUUID(), "frame-c", "project-c");
  check((await call<Json>(web, "shift_quest_canvas_get", A)).frame_id === "frame-two" &&
      (await call<Json>(web, "shift_quest_canvas_get", C)).frame_id === "frame-c",
    "each project keeps its own link");

  // --- Input checks ----------------------------------------------------------------------------------
  for (const [label, args] of [
    ["a null board", [A, null, "f", "p"]],
    ["an empty frame id", [A, randomUUID(), "", "p"]],
    ["a frame id over 100", [A, randomUUID(), "f".repeat(101), "p"]],
    ["an empty project tag", [A, randomUUID(), "f", ""]],
    ["a project tag over 100", [A, randomUUID(), "f", "p".repeat(101)]],
  ] as [string, unknown[]][]) {
    check(await code(call(web, "shift_quest_canvas_link", ...args)) === "bad_input", `linking refuses ${label} (bad_input)`);
  }
  check((await call<Json>(web, "shift_quest_canvas_get", A)).frame_id === "frame-two", "a refused link changes nothing");

  // --- Unlink ---------------------------------------------------------------------------------------
  check(await call(web, "shift_quest_canvas_unlink", A) === true, "unlinking returns true when there was a link");
  check(await call(web, "shift_quest_canvas_get", B) === null, "the teammate sees the link gone too");
  check(await call(web, "shift_quest_canvas_unlink", A) === false, "unlinking again is a no-op (false)");
  check(await count("select count(*) from public.shift_quest_audit where action = 'canvas_unlink' and resource_id = $1", [p1]) === 1,
    "unlinking is audited once");
  check((await call<Json>(web, "shift_quest_canvas_get", C)).frame_id === "frame-c", "another project's link stays");

  // --- Leaving the project ------------------------------------------------------------------------
  await call(web, "shift_quest_canvas_link", A, board1, "frame-one", "project-one");
  await call(bot, "shift_quest_project_leave", B, p1);
  check(await call(web, "shift_quest_canvas_get", B) === null, "a student who left no longer reads the link");
  check(await code(call(web, "shift_quest_canvas_link", B, randomUUID(), "f", "p")) === "no_project",
    "a student who left cannot relink it");
  check(await call(web, "shift_quest_canvas_unlink", B) === false, "a student who left cannot unlink it");
  check((await call<Json>(web, "shift_quest_canvas_get", A)).frame_id === "frame-one", "the link stays for the project");
  check(await count("select count(*) from public.shift_quest_canvas_links where linked_by is not null and project_id = $1", [p1]) === 1,
    "linked_by stays set");

  // --- Ownership checklist (091200) ---------------------------------------------------------------
  check(await code(call(web, "shift_quest_ownership_get", NOBODY)) === "not_started", "ownership_get needs /start");
  check(await call(web, "shift_quest_ownership_get", D) === null, "without a project the checklist reads null");
  const fresh: Json[] = await call(web, "shift_quest_ownership_get", A);
  check(JSON.stringify(fresh.map((o) => o.item)) === JSON.stringify(["access", "export", "team", "costs", "portability"]) &&
      fresh.every((o) => o.state === "not_checked" && o.mentor_held === false && typeof o.updated_at === "string"),
    "a new project's checklist: five items, in the bot's order, none checked", fresh);
  check(fresh.every((o) => keys(o) === "item,mentor_held,state,updated_at"),
    "the website gets states only: no notes, continuation paths or help ids", fresh.map(keys));
  await call(bot, "shift_quest_ownership_set", A, p1, "access", "demonstrated", null, false, null);
  await call(bot, "shift_quest_ownership_set", A, p1, "costs", "not_applicable", "no costs", false, null);
  const ticked: Json[] = await call(web, "shift_quest_ownership_get", A);
  check(ticked.find((o) => o.item === "access")?.state === "demonstrated" &&
      ticked.find((o) => o.item === "costs")?.state === "not_applicable",
    "the website reads what was ticked in Discord", ticked);
  check(await call(web, "shift_quest_ownership_get", C) === null || (await call<Json[]>(web, "shift_quest_ownership_get", C))
      .every((o) => o.state === "not_checked"),
    "another project's student reads their own checklist, not this one");
  check(await call(web, "shift_quest_ownership_get", B) === null, "a student who left reads no checklist");

  // --- Cascade -------------------------------------------------------------------------------------
  check(await count("select count(*) from public.shift_quest_canvas_links where project_id = $1", [p2]) === 1,
    "project two has a link before it is deleted");
  await db.query("delete from public.shift_quest_projects where id = $1", [p2]);
  check(await count("select count(*) from public.shift_quest_canvas_links where project_id = $1", [p2]) === 0,
    "deleting a project deletes its link");
  check(await call(web, "shift_quest_canvas_get", C) === null, "and its student reads no link");

  // linked_by is ON DELETE SET NULL (erasure anonymizes members and never deletes them, so this only guards a hard delete).
  const fk = await scalar<string>(db,
    "select confdeltype from pg_constraint where conrelid = 'public.shift_quest_canvas_links'::regclass " +
    "and contype = 'f' and conkey = array[(select attnum from pg_attribute where attrelid = 'public.shift_quest_canvas_links'::regclass and attname = 'linked_by')]::smallint[]");
  check(fk === "n", "linked_by is ON DELETE SET NULL", fk);

  console.log(`\n${passes} passed, ${failures} failed`);
  await Promise.all([db.end(), bot.end(), web.end()]);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
