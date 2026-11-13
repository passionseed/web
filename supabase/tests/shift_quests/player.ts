/**
 * SHIFT High Island: the player, the progress economy, AI island news and
 * parent consent (20261111095000_shift_quest_player). Student reads and
 * writes go through shift_quest_web, as the website makes them; staff work
 * and the digest post go through shift_quest_bot, as /admin and the bot's
 * digest loop make them. consent_required stays on (the default) except where
 * a case switches it off.
 *
 *   supabase/tests/shift_quests/run-local.sh
 *
 * Needs a disposable database with the shift_quest migrations applied (the
 * runner makes one). Refuses anything else: it writes committed rows.
 * All identities are synthetic.
 */
import { Client } from "pg";
import { createHash, randomUUID } from "node:crypto";

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
const ADMIN = "791000000000000001";
const R1 = "792000000000000001"; // a reviewer
const FUL = "792000000000000009"; // fulfillment
const A = "790000000000000001"; // project one with B; confirms their own age
const B = "790000000000000002"; // a parent agrees (no AI line)
const C = "790000000000000003"; // project two; a parent declines, then agrees with the AI line
const D = "790000000000000004"; // project three; consent imported from SHIFT
const E = "790000000000000005"; // project four; no consent
const F = "790000000000000006"; // too young at 20, adult at 18; erased at the end
const G = "790000000000000007"; // check-in run cases; consent imported while waiting
const H = "790000000000000008"; // check-in run cases; a parent declines, an import does not override
const NOBODY = "799999999999999999";
const CELEB = "793000000000000001";
const LIVE = "793000000000000002";
const M1 = "794000000000000001";
const M2 = "794000000000000002";
const NAMES: Record<string, string> = {
  [ADMIN]: "Player Admin", [R1]: "Player Rev", [FUL]: "Player Ful",
  [A]: "Player Aye", [B]: "Player Bee", [C]: "Player Cee", [D]: "Player Dee", [E]: "Player Eee",
  [F]: "Player Eff", [G]: "Player Gee", [H]: "Player Aitch",
};
const VERSION = "island-2026-11-11";

const WEB_ONLY = [
  "shift_quest_character(text)",
  "shift_quest_wallet(text)",
  "shift_quest_consent_get(text)",
  "shift_quest_consent_adult(text,date,text)",
  "shift_quest_consent_link(text,text,text,text)",
  "shift_quest_consent_import(text,text,timestamp with time zone,boolean,boolean)",
  "shift_quest_consent_parent_view(text)",
  "shift_quest_consent_parent_answer(text,boolean,boolean,text,text,text,text,text)",
  "shift_quest_consent_parent_withdraw(text)",
  "shift_quest_island_news(text)",
  "shift_quest_digest_inputs(date,text)",
  "shift_quest_digest_save(date,text,jsonb)",
];
const SHARED = [
  "shift_quest_digest_hide(text,integer,boolean,text)",
  "shift_quest_redeem(text,uuid,text,integer)",
  "shift_quest_redeem_cancel(text,uuid)",
];
const BOT_ONLY = [
  "shift_quest_digest_post_next()",
  "shift_quest_digest_mark(date,text,text)",
  "shift_quest_digest_claim(date,text,text)",
  "shift_quest_digest_post_current()",
  "shift_quest_admin_consent_reset(text,text)",
  "shift_quest_admin_island_status(text)",
  "shift_quest_admin_island_set(text,text,text)",
  "shift_quest_admin_catalog_gate(text,uuid,smallint,boolean)",
  "shift_quest_admin_staff_award(text,text,text,text,text)",
];
const HELPERS = [
  "shift_quest__consent_ok(uuid)",
  "shift_quest__consent_ai_ok(uuid)",
  "shift_quest__member_stage(uuid)",
  "shift_quest__community_done(uuid)",
  "shift_quest__item_lock(uuid,shift_quest_catalog)",
  "shift_quest__digest_eligible(uuid)",
  "shift_quest__consent_json(uuid)",
  "shift_quest__parent_said_no(uuid)",
  "shift_quest__staff_key(text)",
];
const READS = new Set([
  "shift_quest_character(text)", "shift_quest_wallet(text)", "shift_quest_consent_get(text)",
  "shift_quest_consent_parent_view(text)", "shift_quest_island_news(text)", "shift_quest_digest_inputs(date,text)",
  "shift_quest_digest_post_next()", "shift_quest_admin_island_status(text)", "shift_quest_digest_post_current()",
]);
const TABLES = ["shift_quest_consents", "shift_quest_digests", "shift_quest_digest_hides", "shift_quest_digest_posts"];

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
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/** JSON with object keys sorted at every level (jsonb returns keys in its own order). */
const canon = (x: unknown): string => JSON.stringify(x, (_k, v) =>
  v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v);

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: /admin, reviews, the digest post
  const web = await connect(webUrl!); // shift_quest_web: every student call and the digest job

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const today: string = await scalar(db, "select public.shift_quest__bkk_today()::text");
  const isodow = Number(await scalar(db, "select extract(isodow from public.shift_quest__bkk_today())::int"));
  /** A Bangkok calendar day relative to today, as YYYY-MM-DD. */
  const day = (offset: number) => scalar<string>(db, "select (public.shift_quest__bkk_today() + $1::int)::text", [offset]);
  const birthday = (years: number, plusDays: number) => scalar<string>(db,
    "select ((public.shift_quest__bkk_today() - make_interval(years => $1::int))::date + $2::int)::text", [years, plusDays]);
  const memberId = (who: string) => scalar<string>(db, "select id from public.shift_quest_members where discord_user_id = $1", [who]);
  const consentRow = async (who: string): Promise<Json | undefined> => (await db.query(
    "select c.* from public.shift_quest_consents c join public.shift_quest_members m on m.id = c.member_id where m.discord_user_id = $1", [who],
  )).rows[0];

  // --- Schema, privileges, defaults ---------------------------------------------------------
  check(Number(await call(web, "shift_quest_schema_version")) === 12, "the website reads schema version 12");
  check(Number(await call(bot, "shift_quest_schema_version")) === 12, "the bot reads schema version 12 (the digest post starts from 9)");

  const fnInfo = async (sig: string): Promise<Json> => (await db.query(
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
    [`public.${sig}`],
  )).rows[0];
  for (const [list, bot1, web1, label] of [
    [WEB_ONLY, false, true, "the website's only"], [SHARED, true, true, "the website's and the bot's"],
    [BOT_ONLY, true, false, "the bot's only"], [HELPERS, false, false, "a helper nobody logs in to run"],
  ] as const) {
    for (const sig of list) {
      const g = await fnInfo(sig);
      check(g.bot === bot1 && g.web === web1 && !g.anon && !g.authenticated && !g.public && g.service_role &&
          g.definer && g.pinned,
        `${sig}: security definer, pinned search_path, ${label}`, g);
      if (list !== HELPERS && list !== SHARED) {
        check(g.volatility === (READS.has(sig) ? "s" : "v"), `${sig} is ${READS.has(sig) ? "STABLE" : "VOLATILE"}`, g.volatility);
      }
    }
  }
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_character", A))) === "42501", `${r} cannot read a character`);
    check((await sqlstate(call(db, "shift_quest_consent_parent_view", sha("x")))) === "42501", `${r} cannot open a parent page`);
    check((await sqlstate(call(db, "shift_quest_digest_post_next"))) === "42501", `${r} cannot read the digest post`);
    for (const t of TABLES) {
      check((await sqlstate(db.query(`select * from public.${t}`))) === "42501", `${r} cannot read ${t}`);
    }
    await db.query("reset role");
  }
  check((await sqlstate(call(bot, "shift_quest_consent_get", A))) === "42501", "the bot cannot read consent (42501)");
  check((await sqlstate(call(bot, "shift_quest_digest_inputs", today, "day"))) === "42501", "the bot cannot read digest inputs (42501)");
  check((await sqlstate(call(web, "shift_quest_digest_post_next"))) === "42501", "the website cannot read the digest post (42501)");
  check((await sqlstate(call(web, "shift_quest_admin_staff_award", ADMIN, A, "helped-most", "x", "key-12345"))) === "42501",
    "the website cannot give staff awards (42501)");

  for (const t of TABLES) {
    const info: Json = (await db.query(
      "select c.relrowsecurity as rls, (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies " +
      "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = $1", [t],
    )).rows[0];
    check(info?.rls === true && info.policies === 0, `${t} has row level security on and no policies`, info);
    for (const role of ["shift_quest_web", "shift_quest_bot", "anon", "authenticated"]) {
      const has = await scalar<boolean>(db,
        "select has_table_privilege($1, $2::regclass, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')", [role, `public.${t}`]);
      check(has === false, `${role} holds no privilege on ${t}`);
    }
  }
  const settings: Json = (await db.query(
    "select consent_required, consent_adult_age, digest_enabled from public.shift_quest_settings where id")).rows[0];
  check(settings.consent_required === true && settings.consent_adult_age === 20 && settings.digest_enabled === false,
    "defaults: consent required, adult age 20, the digest off", settings);
  check((await code(db.query("update public.shift_quest_settings set consent_adult_age = 12 where id"))).includes("check constraint"),
    "the adult age cannot go below 13");
  const consentCols: string[] = (await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'shift_quest_consents' order by ordinal_position",
  )).rows.map((r) => r.column_name);
  check(!consentCols.includes("token") && consentCols.includes("token_hash"), "only the token's hash is stored, never the token", consentCols);

  // --- Fixtures ---------------------------------------------------------------------------------
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  await call(bot, "shift_quest_admin_role", ADMIN, FUL, NAMES[FUL], "fulfillment", true);
  for (const id of [A, B, C, D, E, F, G, H]) await call(web, "shift_quest_start", id, NAMES[id], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "Player One", "software", "A tool for the school canteen");
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "Player Two", "creative", null);
  const p3: string = await call(web, "shift_quest_project_create", D, "Player Three", "service", null);
  const p4: string = await call(web, "shift_quest_project_create", E, "Player Four", "other", null);
  const slotOf = async (project: string) => Number(await scalar(db, "select slot from public.shift_quest_plots where project_id = $1", [project]));
  const [s1, s2, s3] = [await slotOf(p1), await slotOf(p2), await slotOf(p3)];
  /** Submits a milestone for the student (as the website) and has R1 approve it. */
  const reach = async (who: string, milestone: number, proof = `Proof ${milestone}`) => {
    const s = await call(web, "shift_quest_milestone_submit", who, milestone, proof, `Learned ${milestone}`, null);
    await call(bot, "shift_quest_review_decide", R1, s.submission_id, "approved", null, false);
  };
  const optin = (who: string, project: string, show = true) => call(web, "shift_quest_island_optin", who, project, show);
  const consent = (who: string) => call<Json>(web, "shift_quest_consent_get", who);
  const link = (who: string, hash: string, label = "Nick") => call<Json>(web, "shift_quest_consent_link", who, hash, label, VERSION);
  const view = (hash: string) => call<Json | null>(web, "shift_quest_consent_parent_view", hash);
  const answer = (hash: string, agree: boolean, ai: boolean, name = "Parent Name", rel = "แม่", ip: string | null = null,
    ua: string | null = null) =>
    call<Json>(web, "shift_quest_consent_parent_answer", hash, agree, ai, name, rel, ip, ua, VERSION);
  const withdraw = (hash: string) => call<Json>(web, "shift_quest_consent_parent_withdraw", hash);
  const importShift = (who: string, basis: string, at: string | null, ai: boolean | null, withdrawn: boolean) =>
    call<Json>(web, "shift_quest_consent_import", who, basis, at, ai, withdrawn);
  const islandSet = (key: string, value: string, actor = ADMIN) => call<Json>(bot, "shift_quest_admin_island_set", actor, key, value);
  const inbox = async (who: string, kind: string): Promise<Json[]> => (await db.query(
    "select i.params from public.shift_quest_inbox i join public.shift_quest_members m on m.id = i.member_id " +
    "where m.discord_user_id = $1 and i.kind = $2 order by i.created_at", [who, kind])).rows.map((r) => r.params);

  // --- Consent: the state and the adult path ------------------------------------------------------------
  let cg = await consent(A);
  check(keys(cg) === "adult_age,ai,basis,link_expires_at,ok,parent_said_no,required,state", "consent_get's shape", keys(cg));
  check(cg.required === true && cg.state === "none" && cg.ok === false && cg.ai === false && cg.basis === null &&
      cg.link_expires_at === null && cg.adult_age === 20 && cg.parent_said_no === false,
    "no row yet: state none, not ok, no AI", cg);
  check(await code(consent(NOBODY)) === "not_started", "an unknown caller is not_started");

  const exactly20 = await birthday(20, 0);
  const almost20 = await birthday(20, 1);
  check(await code(call(web, "shift_quest_consent_adult", A, almost20, VERSION)) === "consent_too_young",
    "one day short of 20: consent_too_young");
  for (const [date, version, why] of [
    [today, VERSION, "today"], [await day(1), VERSION, "tomorrow"], ["1900-01-01", VERSION, "1900"],
    [null, VERSION, "no date"], [exactly20, null, "no notice version"], [exactly20, "x".repeat(41), "a notice version over 40"],
  ] as const) {
    check(await code(call(web, "shift_quest_consent_adult", A, date, version)) === "bad_input", `the adult path refuses ${why} (bad_input)`);
  }
  check((await consentRow(A)) === undefined, "a refused confirmation stores nothing");
  cg = await call<Json>(web, "shift_quest_consent_adult", A, exactly20, VERSION);
  check(cg.state === "granted" && cg.basis === "adult" && cg.ok === true && cg.ai === true,
    "exactly 20 today: granted on the adult basis, AI news included", cg);
  const rowA = await consentRow(A);
  check(rowA?.notice_version === VERSION && rowA.decided_at instanceof Date && rowA.token_hash === null &&
      rowA.parent_name === null && rowA.ai_ok === true,
    "the adult row records the notice version and the time, no parent details", rowA);
  check(await code(link(A, sha("a-1"))) === "consent_not_needed", "a granted student needs no parent link");

  // The adult age is a setting (13..25).
  const eighteen = await birthday(18, 0);
  check(await code(call(web, "shift_quest_consent_adult", F, eighteen, VERSION)) === "consent_too_young", "18 is too young at the default age 20");
  let island = await islandSet("consent_adult_age", "18");
  check(island.consent.adult_age === 18, "an admin sets the adult age to 18", island.consent);
  check((await consent(F)).adult_age === 18, "consent_get shows the new age");
  check((await call<Json>(web, "shift_quest_consent_adult", F, eighteen, VERSION)).ok === true, "18 is enough at 18");
  for (const v of ["12", "26", "abc", "", "1.5"]) {
    check(await code(islandSet("consent_adult_age", v)) === "bad_input", `the adult age refuses ${JSON.stringify(v)}`);
  }
  check(await code(islandSet("consent_adult_age", "20", R1)) === "not_authorized", "only admins change the island switches");
  check(await code(islandSet("nonsense", "on")) === "bad_input", "an unknown island key is bad_input");
  check(await code(islandSet("digest_enabled", "maybe")) === "bad_input", "a switch takes on or off only");
  island = await islandSet("consent_adult_age", "20");
  check(island.consent.adult_age === 20, "and back to 20");

  // --- Consent: parent links ----------------------------------------------------------------------
  const hb1 = sha("b-1"), hb2 = sha("b-2"), hb3 = sha("b-3"), hb4 = sha("b-4"), hb5 = sha("b-5");
  const l1 = await link(B, hb1, "  Bee  ");
  check(keys(l1) === "expires_at", "a link returns its expiry only", l1);
  const days = (Date.parse(l1.expires_at) - Date.now()) / 86400000;
  check(days > 13.9 && days < 14.1, "a link answers for 14 days", days);
  cg = await consent(B);
  check(cg.state === "waiting" && cg.ok === false && cg.link_expires_at !== null && cg.basis === null, "waiting for the parent", cg);
  let v = await view(hb1);
  check(keys(v) === "ai_only,answerable,expires_at,state,student_label,withdrawable", "the parent page's shape: no id, no Discord name", keys(v));
  check(v?.student_label === "Bee" && v.state === "waiting" && v.answerable === true && v.withdrawable === false && v.ai_only === false,
    "the parent sees the trimmed nickname and may answer", v);
  check(!JSON.stringify(v).includes(await memberId(B)) && !JSON.stringify(v).includes(B), "the parent page carries no member id");
  await link(B, hb2);
  check((await view(hb1)) === null, "a new link replaces the old one: the old page is gone");
  check((await view(hb2))?.answerable === true, "the new link answers");
  await link(B, hb3);
  check(await code(link(B, hb4)) === "consent_rate_limited", "a fourth link within 24 hours is consent_rate_limited");
  check((await view(hb3))?.answerable === true, "the refused fourth link changed nothing");
  check(await count("select count(*) from public.shift_quest_audit where action = 'consent_link' and resource_id = $1", [await memberId(B)]) === 3,
    "three links, three audit rows");
  for (const [hash, label, why] of [
    ["not-a-hash", "Nick", "a malformed hash"], [sha("x").toUpperCase(), "Nick", "an uppercase hash"],
    [sha("y"), "   ", "a blank nickname"], [sha("z"), "x".repeat(41), "a nickname over 40"],
  ]) {
    check(await code(link(G, hash, label)) === "bad_input", `a link refuses ${why} (bad_input)`);
  }
  check((await consentRow(G)) === undefined, "and stores nothing");

  // Expiry: the page stays, answering stops.
  await db.query("update public.shift_quest_consents set token_expires_at = now() - interval '1 minute' where member_id = $1", [await memberId(B)]);
  check((await view(hb3))?.answerable === false, "an expired link cannot be answered");
  check(await code(answer(hb3, true, true)) === "consent_link_dead", "answering an expired link is consent_link_dead");
  // The rate window passes.
  await db.query("update public.shift_quest_audit set created_at = created_at - interval '25 hours' where action = 'consent_link' and resource_id = $1",
    [await memberId(B)]);
  await link(B, hb5, "Bee");
  check((await view(hb5))?.answerable === true, "after 24 hours a new link works again");
  check(await code(answer(hb3, true, true)) === "consent_link_dead", "the replaced link is dead");
  check(await code(answer(sha("never"), true, true)) === "consent_link_dead", "an unknown link is dead");
  check(await code(answer("short", true, true)) === "consent_link_dead", "a malformed link is dead");
  check(await code(answer(hb5, true, false, "X")) === "bad_input", "a one-letter name is bad_input");
  check(await code(answer(hb5, true, false, "Parent Bee", "ลุง")) === "bad_input", "a relationship outside the list is bad_input");
  check((await consent(B)).state === "waiting", "a refused answer changes nothing");

  const agreed = await answer(hb5, true, false, "  Parent Bee  ", "แม่", "203.0.113.7", "Mozilla/5.0 (test)");
  check(keys(agreed) === "state" && agreed.state === "granted", "the parent agrees: {state: granted}", agreed);
  const rowB = await consentRow(B);
  check(rowB?.state === "granted" && rowB.basis === "parent" && rowB.ai_ok === false && rowB.parent_name === "Parent Bee" &&
      rowB.parent_relationship === "แม่" && rowB.ip === "203.0.113.7" && rowB.user_agent === "Mozilla/5.0 (test)" &&
      rowB.notice_version === VERSION && rowB.decided_at instanceof Date,
    "the answer records the name, relationship, IP, user agent, notice version and time", rowB);
  cg = await consent(B);
  check(cg.ok === true && cg.ai === false && cg.basis === "parent" && cg.link_expires_at === null,
    "granted without the AI line: ok, no AI news", cg);
  check(canon(await inbox(B, "consent_recorded")) === canon([{ state: "granted" }]),
    "the student is told in the inbox (the state only)");
  check(await code(answer(hb5, true, true)) === "consent_link_dead", "an answered link cannot answer again");
  v = await view(hb5);
  check(v?.state === "granted" && v.answerable === false && v.withdrawable === true, "the same link can withdraw later", v);
  check(await count("select count(*) from public.shift_quest_audit where action = 'consent_parent_agree' and actor_id is null") === 1,
    "the parent's answer is audited without an actor");

  // A parent declines, then changes their mind within the window.
  const hc = sha("c-1");
  await link(C, hc, "Cee");
  check((await answer(hc, false, true, "Parent Cee", "พ่อ")).state === "declined", "the parent declines");
  cg = await consent(C);
  check(cg.state === "declined" && cg.ok === false && cg.ai === false, "declined: not ok", cg);
  check((await view(hc))?.answerable === true && (await consentRow(C))?.ai_ok === false,
    "a declined link may still be answered while it lasts; a decline never keeps the AI tick");
  check((await consent(C)).parent_said_no === true, "a parent's decline is on record for the student");
  check(await code(link(C, sha("c-x"))) === "consent_parent_said_no", "after a parent's decline the student cannot send a new link");
  check(await code(call(web, "shift_quest_consent_adult", C, exactly20, VERSION)) === "consent_parent_said_no",
    "nor confirm their own age over a parent's decline");
  check((await consentRow(C))?.parent_name === "Parent Cee" && (await consentRow(C))?.decided_at instanceof Date,
    "the parent's decision stays on record");
  check((await answer(hc, true, true, "Parent Cee", "พ่อ")).state === "granted", "then agrees, with the AI line");
  cg = await consent(C);
  check(cg.ok === true && cg.ai === true && cg.basis === "parent", "granted with AI news", cg);

  // Import from SHIFT.
  const decided = "2026-10-01T03:00:00.000Z";
  cg = await importShift(D, "shift_parent", decided, true, false);
  check(cg.state === "granted" && cg.basis === "shift_parent" && cg.ai === false && cg.ok === true,
    "SHIFT parent consent imports, never as AI news (SHIFT's AI tick is for mentor notes)", cg);
  check((await consentRow(D))?.ai_ok === false, "the imported row has no AI tick even when SHIFT's was ticked");
  const D_ID = await memberId(D);
  const importAudits = () => count("select count(*) from public.shift_quest_audit where action like 'consent_import%' and resource_id = $1", [D_ID]);
  const before = await importAudits();
  cg = await importShift(D, "shift_parent", decided, true, false);
  check(cg.state === "granted" && (await importAudits()) === before, "the same import twice changes nothing", cg);
  cg = await importShift(D, "shift_parent", decided, true, true);
  check(cg.state === "withdrawn" && cg.ok === false, "a withdrawn SHIFT consent withdraws the import", cg);
  check((await importShift(D, "shift_parent", decided, true, true)).state === "withdrawn", "withdrawing twice is a no-op");
  check((await importShift(D, "shift_parent", decided, true, false)).state === "granted", "a new SHIFT consent imports again");
  check((await importShift(A, "shift_parent", decided, false, false)).basis === "adult", "an import never replaces an adult's own consent");
  check((await importShift(A, "shift_adult", null, null, true)).state === "granted", "an import withdraw never withdraws an island consent");
  check((await importShift(B, "shift_parent", decided, true, false)).basis === "parent" && (await consentRow(B))?.ai_ok === false,
    "an import never replaces a parent's island answer");
  check(await code(importShift(D, "parent", decided, true, false)) === "bad_input", "only the shift bases import");
  const hh = sha("h-1");
  await link(H, hh, "Aitch");
  await answer(hh, false, false, "Parent Aitch", "ผู้ปกครอง");
  check((await importShift(H, "shift_parent", decided, true, false)).state === "declined",
    "an import never overrides a parent's decline on the island");
  const hg = sha("g-1");
  await link(G, hg, "Gee");
  cg = await importShift(G, "shift_adult", null, false, false);
  check(cg.state === "granted" && cg.basis === "shift_adult" && cg.ai === false, "a waiting student with SHIFT consent on file is recognised (no AI news)", cg);
  check((await view(hg)) === null, "and the waiting link stops");
  check(await code(link(G, sha("g-2"))) === "consent_not_needed", "an adult's SHIFT consent needs no parent link (they confirm their own age for AI news)");

  // The AI line for consent imported from SHIFT: an AI link to the parent.
  const hd1 = sha("d-ai-1"), hd2 = sha("d-ai-2");
  const ld = await link(D, hd1, "Dee");
  cg = await consent(D);
  check(cg.state === "granted" && cg.ok === true && cg.ai === false && cg.link_expires_at === ld.expires_at,
    "a granted SHIFT import may send an AI link; consent stays granted meanwhile", cg);
  v = await view(hd1);
  check(v?.ai_only === true && v.answerable === true && v.state === "granted" && v.withdrawable === false, "the parent page asks for the AI line only", v);
  check((await answer(hd1, false, false, "Parent Dee", "พ่อ")).state === "granted", "a parent who says no to AI news keeps the consent");
  check((await consent(D)).ok === true && (await consent(D)).ai === false && (await consentRow(D))?.basis === "shift_parent" &&
      (await consentRow(D))?.parent_name === null, "nothing else changed");
  check(await code(answer(hd1, true, true, "Parent Dee", "พ่อ")) === "consent_link_dead", "the AI link is spent");
  await link(D, hd2, "Dee");
  check((await answer(hd2, true, true, "Parent Dee", "พ่อ")).state === "granted", "a parent ticks the AI line on a new link");
  cg = await consent(D);
  check(cg.ai === true && cg.basis === "parent" && (await consentRow(D))?.parent_name === "Parent Dee",
    "AI news on, recorded as the parent's island answer", cg);
  check((await importShift(D, "shift_parent", decided, true, false)).basis === "parent", "later imports leave it alone");

  // The kill switch.
  island = await islandSet("consent_required", "off");
  check(island.consent.required === false, "an admin switches consent off");
  cg = await consent(E);
  check(cg.required === false && cg.ok === true && cg.ai === false && cg.state === "none",
    "consent off: everyone is ok for the island, but never for AI news", cg);
  check(await scalar(db, "select public.shift_quest__consent_ai_ok($1)", [await memberId(E)]) === false &&
      await scalar(db, "select public.shift_quest__consent_ai_ok($1)", [await memberId(G)]) === false,
    "the AI check ignores the switch: no row, or an imported adult, stays off");
  island = await islandSet("consent_required", "on");
  check((await consent(E)).ok === false, "and on again");

  // --- Public appearance needs consent ---------------------------------------------------------------
  await reach(A, 1);
  await reach(B, 2);
  await optin(A, p1);
  await optin(B, p1);
  const plotFor = async (viewer: string, slot: number) =>
    (await call<Json>(web, "shift_quest_island_map", viewer)).plots.find((x: Json) => x.slot === slot);
  const postPlot = async (slot: number) => (await call<Json>(bot, "shift_quest_island_post_map")).plots.find((x: Json) => x.slot === slot);
  let plot = await plotFor(C, s1);
  check(plot?.name === "Player One" && plot.stage === 2, "both consented and opted in: another student sees the name and stage", plot);
  check((await call<Json>(bot, "shift_quest_live_post")).approved === 2, "the live post counts the shown stage");
  check((await withdraw(hb5)).state === "withdrawn", "the parent withdraws with the same link");
  check(canon(await inbox(B, "consent_recorded")) === canon([{ state: "granted" }, { state: "withdrawn" }]),
    "the student is told");
  check(await code(withdraw(hb5)) === "consent_link_dead", "withdrawing twice is consent_link_dead");
  check(await code(withdraw(sha("unknown-link"))) === "consent_link_dead", "an unknown link cannot withdraw");
  plot = await plotFor(C, s1);
  check(plot?.name === null && plot.plain === true && plot.stage === 0, "one member without consent: the plot is plain for others", plot);
  check((await postPlot(s1))?.name === null, "and in the weekly post");
  check((await call<Json>(bot, "shift_quest_live_post")).approved === 0, "and the live post counts nothing for it");
  check((await call<Json>(web, "shift_quest_island", A)).project.name_visible === false, "the team sees that its name is not shown");
  check((await plotFor(A, s1))?.mine === true && (await plotFor(A, s1))?.stage === 2, "the team still sees its own tree");
  await islandSet("consent_required", "off");
  check((await plotFor(C, s1))?.name === "Player One", "consent off: the name shows again");
  await islandSet("consent_required", "on");
  const hb6 = sha("b-6");
  check(await code(link(B, hb6, "Bee")) === "consent_parent_said_no", "after a parent withdrew, the student cannot send a new link");
  check(await code(call(web, "shift_quest_consent_adult", B, exactly20, VERSION)) === "consent_parent_said_no",
    "nor confirm their own age over it");
  check(await code(call(bot, "shift_quest_admin_consent_reset", R1, B)) === "not_authorized", "only admins reset consent");
  check(await code(call(bot, "shift_quest_admin_consent_reset", ADMIN, NOBODY)) === "not_found", "an unknown student is not_found");
  check(canon(await call(bot, "shift_quest_admin_consent_reset", ADMIN, B)) === canon({ state: "none" }) &&
      (await consentRow(B)) === undefined && (await consent(B)).parent_said_no === false,
    "an admin resets it after talking with the family");
  check(await count("select count(*) from public.shift_quest_audit where action = 'consent_reset' and resource_id = $1", [await memberId(B)]) === 1 &&
      await count("select count(*) from public.shift_quest_audit where action = 'consent_parent_withdraw' and resource_id = $1", [await memberId(B)]) === 1,
    "the reset and the parent's earlier answer stay in the audit log");
  await link(B, hb6, "Bee");
  await answer(hb6, true, false, "Parent Bee", "แม่");
  check((await plotFor(C, s1))?.name === "Player One", "the parent agrees again: the name shows");

  // --- Shares to Discord need consent ----------------------------------------------------------------
  await call(bot, "shift_quest_admin_set", ADMIN, "celebrate_channel", CELEB);
  await call(bot, "shift_quest_admin_set", ADMIN, "sharing", "on");
  const shareE: string = await call(bot, "shift_quest_share_create", E, "celebration", "Shipped it", null, null);
  check(await code(call(bot, "shift_quest_share_confirm", E, shareE)) === "consent_required", "a celebration without consent is refused");
  check(await scalar(db, "select status from public.shift_quest_shares where id = $1", [shareE]) === "draft" &&
      await count("select count(*) from public.shift_quest_outbox where dedupe_key = $1", [`share:${shareE}`]) === 0,
    "nothing is queued or posted");
  const shareA: string = await call(bot, "shift_quest_share_create", A, "celebration", "Shipped it", null, null);
  check(await call(bot, "shift_quest_share_confirm", A, shareA) === "queued", "with consent it is queued");
  const recog: string = await call(bot, "shift_quest_share_create", A, "recognition", "Thanks for testing", null, E);
  check(await call(bot, "shift_quest_share_confirm", A, recog) === "awaiting_peer", "a recognition waits for the peer");
  check(await code(call(bot, "shift_quest_share_respond", E, recog, true)) === "consent_required",
    "the named peer without consent cannot be posted about");
  check(await scalar(db, "select status from public.shift_quest_shares where id = $1", [recog]) === "awaiting_peer", "the recognition still waits");
  const thanksA: string = await call(bot, "shift_quest_share_create", C, "recognition", "Thanks for the help", null, A);
  await call(bot, "shift_quest_share_confirm", C, thanksA);
  check(await call(bot, "shift_quest_share_respond", A, thanksA, true) === "queued", "both consented: the recognition is queued");

  // Help requests to the community room quote the student in public: consent first.
  const helpsBefore = await count("select count(*) from public.shift_quest_help_requests");
  check(await code(call(web, "shift_quest_help_create", E, "Stuck on the login page", "community", "student", null)) === "help_consent",
    "a community help request without consent is help_consent");
  check(await count("select count(*) from public.shift_quest_help_requests") === helpsBefore &&
      await count("select count(*) from public.shift_quest_outbox where kind = 'help_community'") === 0,
    "nothing is stored or posted");
  check(typeof (await call(web, "shift_quest_help_create", E, "Stuck on the login page", "mentors", "student", null)) === "string",
    "the mentors' queue stays open without consent");
  check(typeof (await call(web, "shift_quest_help_create", A, "Stuck on the login page", "community", "student", null)) === "string",
    "with consent the community room works");

  // --- Economy: rules, the staff keys, the shop ----------------------------------------------------
  // A main quest opened before any rule is pinned (coins switched on mid-season).
  const openedEarly = await call<Json>(web, "shift_quest_milestone_start", C, 2);
  const rule = (key: string, amount: number, cap: number | null, alloc: string | null) =>
    call(bot, "shift_quest_admin_rule", ADMIN, key, amount, cap, alloc, "Who earns it", "How it is reviewed", "How it is reversed");
  await call(bot, "shift_quest_admin_set", ADMIN, "reward_terms", "Coins come from approved progress and community value, not hours.");
  await rule("main-quest", 300, 5, "each_confirmed");
  await rule("community-quest", 500, 4, "each_confirmed");
  await rule("side-quest", 100, 11, "each_confirmed");
  await rule("taught-next-shift", 3000, 1, null);
  const slugs: Json[] = (await db.query(
    "select slug, milestone from public.shift_quest_templates where status = 'published' and milestone is not null order by milestone")).rows;
  for (const t of slugs) {
    await call(bot, "shift_quest_admin_template_rule", ADMIN, t.slug, t.milestone >= 6 ? "community-quest" : "main-quest");
  }
  for (const key of ["taught-next-shift", "helped-most"]) {
    check(await code(call(bot, "shift_quest_admin_template_rule", ADMIN, slugs[0].slug, key)) === "bad_input",
      `a staff key (${key}) can never pay for a quest (bad_input)`);
  }
  check(await scalar(db, "select reward_rule_key from public.shift_quest_templates where slug = $1 and status = 'published'", [slugs[0].slug]) ===
    "main-quest", "the template keeps its rule");
  check(await scalar(db, "select r.key from public.shift_quest_instances i join public.shift_quest_reward_rules r on r.id = i.reward_rule_id where i.id = $1",
    [openedEarly.instance_id]) === "main-quest", "pinning a rule prices quests of that template still open without one");
  await call(bot, "shift_quest_admin_template_state", ADMIN, "side-five-voices", true);
  await call(bot, "shift_quest_admin_template_rule", ADMIN, "side-five-voices", "side-quest");
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");

  let w = await call<Json>(web, "shift_quest_wallet", A);
  check(w.awards_live === true && w.redemption_live === false && w.shop.live === false && JSON.stringify(w.shop.items) === "[]",
    "awards on, redemption off: the shop lists nothing", w.shop);

  // Staff awards.
  const award = (actor: string, target: string, kind: string, key: string, reason = "Taught a session at the next SHIFT") =>
    call<Json>(bot, "shift_quest_admin_staff_award", actor, target, kind, reason, key);
  check(await code(award(ADMIN, A, "helped-most", randomUUID())) === "rule_not_found", "an unpublished staff rule is rule_not_found");
  check(await code(award(ADMIN, A, "main-quest", randomUUID())) === "bad_input", "only the staff keys (bad_input)");
  check(await code(award(ADMIN, A, "taught-next-shift", "short")) === "bad_input", "a request key under 8 characters (bad_input)");
  check(await code(award(ADMIN, A, "taught-next-shift", randomUUID(), "   ")) === "missing_text", "a reason is required");
  check(await code(award(R1, A, "taught-next-shift", randomUUID())) === "not_authorized", "admins only");
  check(await code(award(ADMIN, ADMIN, "taught-next-shift", randomUUID())) === "conflict_of_interest", "never to oneself");
  check(await code(award(ADMIN, NOBODY, "taught-next-shift", randomUUID())) === "not_found", "an unknown target is not_found");
  check(await code(award(ADMIN, E, "taught-next-shift", randomUUID())) === "consent_required", "a target without consent is refused");
  const k1 = randomUUID();
  let aw = await award(ADMIN, A, "taught-next-shift", k1);
  check(keys(aw) === "amount,balance,duplicate" && aw.amount === 3000 && aw.duplicate === false && aw.balance >= 3000,
    "the teaching award pays 3,000 with a written reason", aw);
  const balanceAfterAward = aw.balance;
  aw = await award(ADMIN, A, "taught-next-shift", k1);
  check(aw.duplicate === true && aw.amount === 3000 && aw.balance === balanceAfterAward, "the same request key returns the first award", aw);
  check(await code(award(ADMIN, B, "taught-next-shift", k1)) === "bad_input", "the same key for someone else is bad_input");
  check(await code(award(ADMIN, A, "taught-next-shift", randomUUID())) === "cap_reached", "cap 1: a second teaching award is cap_reached");
  const staffRow: Json = (await db.query(
    "select l.*, r.key from public.shift_quest_ledger l join public.shift_quest_reward_rules r on r.id = l.reward_rule_id where l.source_key = $1",
    [`staff:${k1}`])).rows[0];
  check(staffRow?.kind === "award" && staffRow.key === "taught-next-shift" && staffRow.reason === "Taught a session at the next SHIFT" &&
      staffRow.actor_id === await memberId(ADMIN),
    "a ledger award under the rule, with the staff reason and the admin", staffRow);
  check(canon(await inbox(A, "staff_award")) ===
      canon([{ amount: 3000, reason: "Taught a session at the next SHIFT", rule_key: "taught-next-shift" }]),
    "the student is told in the inbox", await inbox(A, "staff_award"));
  const coinsA = await call<Json>(bot, "shift_quest_coins", A);
  check(coinsA.entries.some((e: Json) => e.rule_key === "taught-next-shift" && e.amount === 3000 && "category" in e),
    "the bot's coin history names the rule key", coinsA.entries);
  const rev = await call<Json>(bot, "shift_quest_admin_reverse", ADMIN, staffRow.id, 3000, "Given by mistake", randomUUID());
  check(rev.balance === balanceAfterAward - 3000, "an admin can reverse a staff award", rev);
  aw = await award(ADMIN, A, "taught-next-shift", randomUUID());
  check(aw.duplicate === false && aw.balance === balanceAfterAward, "a fully reversed award no longer counts toward the cap", aw);
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "off");
  check(await code(award(ADMIN, C, "taught-next-shift", randomUUID())) === "awards_paused", "awards paused: awards_paused");
  await call(bot, "shift_quest_admin_set", ADMIN, "awards", "on");
  await rule("helped-most", 1000, 1, null);
  check((await award(ADMIN, C, "helped-most", randomUUID(), "Helped three teams test")).amount === 1000, "the helped-most award pays 1,000");

  // The staff keys never pay through a reviewer or a season unlock.
  const proposed: string = await call(web, "shift_quest_propose", D, "Run a stall at the school fair", "To meet users", "Ten sign-ups",
    "Photos and a sign-up list", "Book the table");
  const pget = await call<Json>(bot, "shift_quest_proposal_get", R1, proposed);
  check(pget.rules.length > 0 && pget.rules.every((r: Json) => r.key !== "taught-next-shift" && r.key !== "helped-most"),
    "reviewers are never offered the staff award keys for a proposed quest", pget.rules);
  for (const key of ["taught-next-shift", "helped-most"]) {
    check(await code(call(bot, "shift_quest_proposal_agree", R1, proposed, key, null)) === "bad_input",
      `a reviewer cannot agree a proposed quest under ${key} (bad_input)`);
    check(await code(call(bot, "shift_quest_admin_unlock", ADMIN, randomUUID(), "Sticker", 1, today, key)) === "bad_input",
      `a season unlock cannot pay under ${key} (bad_input)`);
  }
  await db.query("update public.shift_quest_instances set reward_rule_id = (select id from public.shift_quest_reward_rules " +
    "where key = 'taught-next-shift' and status = 'published'), reward_agreed_at = now() - interval '1 hour', reward_agreed_by = $2 where id = $1",
    [proposed, await memberId(R1)]);
  const psub = await call<Json>(bot, "shift_quest_submit", D, proposed, null, "Ran the stall", "People like stickers", null, "reviewers", null, []);
  await call(bot, "shift_quest_review_decide", R1, psub.submission_id, "approved", null, false);
  check(await scalar(db, "select award_note from public.shift_quest_instances where id = $1", [proposed]) === "no_reward_rule" &&
      await count("select count(*) from public.shift_quest_ledger where instance_id = $1", [proposed]) === 0,
    "a quest pinned to a staff key some other way still pays nothing (no_reward_rule)");

  // The shop and its gates.
  await call(bot, "shift_quest_admin_set", ADMIN, "redemption_terms", "Terms for redeeming");
  await call(bot, "shift_quest_admin_set", ADMIN, "fulfillment_process", "Staff hand items over at the next session");
  await call(bot, "shift_quest_admin_set", ADMIN, "fulfillment_owner", "Ops");
  const shirt = await call<Json>(bot, "shift_quest_admin_catalog", ADMIN, null, "Shirt", "A PassionSeed shirt", 2000, 10, true);
  const matcha = await call<Json>(bot, "shift_quest_admin_catalog", ADMIN, null, "Matcha", "A matcha", 8000, 5, true);
  const gate = (item: string, stage: number | null, community: boolean | null, actor = ADMIN) =>
    call<Json>(bot, "shift_quest_admin_catalog_gate", actor, item, stage, community);
  let g = await gate(shirt.id, 3, null);
  check(keys(g) === "active,cost,id,min_stage,name,requires_community,stock_available" && g.min_stage === 3 && g.requires_community === false,
    "an admin gates the shirt at stage 3", g);
  g = await gate(matcha.id, 5, true);
  check(g.min_stage === 5 && g.requires_community === true, "and the matcha at stage 5 plus a community quest", g);
  check((await gate(matcha.id, null, null)).min_stage === 5, "null keeps the current gates");
  check(await code(gate(shirt.id, 8, null)) === "bad_input", "a stage over 7 is bad_input");
  check(await code(gate(randomUUID(), 1, null)) === "not_found", "an unknown item is not_found");
  check(await code(gate(shirt.id, 1, null, R1)) === "not_authorized", "admins only");
  const adminList = await call<Json[]>(bot, "shift_quest_admin_catalog_list", ADMIN);
  check(adminList.find((x) => x.id === matcha.id)?.min_stage === 5 && adminList.find((x) => x.id === matcha.id)?.requires_community === true,
    "the admin catalog shows the gates", adminList);
  await call(bot, "shift_quest_admin_set", ADMIN, "redemption", "on");

  const redeem = (who: string, item: Json, key: string, cost = item.cost) => call<Json>(web, "shift_quest_redeem", who, item.id, key, cost);
  check(await code(redeem(E, matcha, randomUUID(), 7999)) === "price_changed", "the price check comes before consent");
  check(await code(redeem(E, matcha, randomUUID())) === "consent_required", "then consent, before the stage");
  check(await code(redeem(A, shirt, randomUUID())) === "stage_required", "stage 2 of 3: stage_required");
  check(await code(redeem(A, matcha, randomUUID())) === "stage_required", "stage before community");
  w = await call<Json>(web, "shift_quest_wallet", A);
  const lockOf = (wallet: Json, id: string) => wallet.shop.items.find((x: Json) => x.id === id);
  check(lockOf(w, shirt.id)?.locked === "stage" && lockOf(w, shirt.id)?.affordable === true &&
      lockOf(w, matcha.id)?.locked === "stage" && lockOf(w, matcha.id)?.affordable === false,
    "the wallet shows each lock and whether the balance covers it", w.shop.items);
  await reach(A, 3);
  const ks = randomUUID();
  const bal0 = (await call<Json>(web, "shift_quest_wallet", A)).balance;
  const got = await redeem(A, shirt, ks);
  check(keys(got) === "balance,duplicate,redemption_id,status" && got.status === "reserved" && got.duplicate === false &&
      got.balance === bal0 - 2000,
    "stage 3: the shirt is reserved and its cost held", got);
  check(await count("select count(*) from public.shift_quest_outbox where kind = 'redemption_requested' and params->>'redemption_id' = $1",
    [got.redemption_id]) === 1, "the fulfillment request goes to staff");
  await gate(shirt.id, 7, null);
  const again = await redeem(A, shirt, ks);
  check(again.duplicate === true && again.redemption_id === got.redemption_id, "the same request key after a gate change finds the first request");
  check(await code(redeem(A, shirt, randomUUID())) === "stage_required", "a new request meets the new gate");
  await gate(shirt.id, 3, null);
  check((await call<boolean>(web, "shift_quest_redeem_cancel", A, got.redemption_id)) === true, "the website cancels a reservation");
  await reach(B, 4);
  await reach(B, 5);
  check(await code(redeem(A, matcha, randomUUID())) === "community_required", "stage 5 without a community quest: community_required");
  await reach(A, 6);
  await call(bot, "shift_quest_admin_catalog", ADMIN, matcha.id, null, null, null, -5, null);
  check(await code(redeem(A, matcha, randomUUID())) === "out_of_stock", "the gates pass: then stock");
  await call(bot, "shift_quest_admin_catalog", ADMIN, matcha.id, null, null, null, 5, null);
  check(await code(redeem(A, matcha, randomUUID())) === "insufficient_balance", "then the balance");
  const cat = await call<Json>(bot, "shift_quest_catalog_list", A);
  check(cat.stage === 6 && cat.community_done === true && cat.consent_ok === true &&
      cat.items.every((x: Json) => "min_stage" in x && "requires_community" in x && "locked" in x && "affordable" in x),
    "the bot's catalog carries the gates, locks and the member's stage, community and consent", cat);
  check(cat.items.find((x: Json) => x.id === matcha.id)?.locked === null &&
      cat.items.find((x: Json) => x.id === matcha.id)?.affordable === false, "matcha unlocked but not affordable");

  // --- The character sheet ----------------------------------------------------------------------------
  const side = await call<Json>(web, "shift_quest_side_submit", A,
    await scalar(db, "select id from public.shift_quest_templates where slug = 'side-five-voices' and status = 'published'"),
    "Talked to five people", "Learned a lot", null);
  await call(bot, "shift_quest_review_decide", R1, side.submission_id, "approved", null, false);
  await call(bot, "shift_quest_admin_recognize", ADMIN, A, 10, "Best demo of the week", "Best demo", randomUUID());
  const ch = await call<Json>(web, "shift_quest_character", A);
  check(keys(ch) === "checkins,coins,community,main,side,stage", "the character's shape", keys(ch));
  check(ch.stage === 6 && ch.main.team === 6 && ch.main.mine === 3, "stage 6; the team passed 6 main quests, Aye took part in 3 (1, 3, 6)", ch.main);
  check(ch.side.team === 1 && ch.side.mine === 1, "one side quest passed, Aye's own", ch.side);
  check(ch.community.milestones === 1 && ch.community.mine === 1 && ch.community.thanks === 2,
    "community: one milestone, Aye's own, and two thanks (a peer and an admin)", ch.community);
  const coinsNow = await call<Json>(bot, "shift_quest_coins", A);
  check(ch.coins.live === true && ch.coins.shop_live === true && ch.coins.balance === coinsNow.balance && ch.coins.reserved === 0,
    "coins: live, the shop live, the same balance as the ledger", ch.coins);
  const idsAndNames = [
    ...Object.keys(NAMES), ...Object.values(NAMES), p1, p2, p3, p4,
    ...(await db.query("select id::text from public.shift_quest_members")).rows.map((r) => r.id),
  ];
  check(!idsAndNames.some((s) => JSON.stringify(ch).includes(s)), "the character carries no id and no name");
  check(ch.checkins.days_active === 0 && ch.checkins.this_week === 0 && ch.checkins.run === 0, "no check-ins yet", ch.checkins);

  // The rest-tolerant run, from check-ins on chosen Bangkok days.
  const checkinOn = async (who: string, offset: number, kind: "tap" | "note") => db.query(
    `insert into public.shift_quest_progress (member_id, kind, changed, visibility, created_at)
     values ($1, $2, $3, 'private', ((public.shift_quest__bkk_today() + $4::int)::timestamp + interval '12 hours') at time zone 'Asia/Bangkok')`,
    [await memberId(who), kind, kind === "note" ? "A note" : null, offset]);
  for (const [offset, kind] of [[-6, "tap"], [-3, "note"], [-2, "tap"], [-2, "note"], [0, "tap"]] as const) await checkinOn(G, offset, kind);
  const monday = -(isodow - 1);
  const expectWeek = [-6, -3, -2, 0].filter((o) => o >= monday).length;
  let gc = (await call<Json>(web, "shift_quest_character", G)).checkins;
  check(keys(gc) === "days_active,run,this_week", "check-ins' shape", keys(gc));
  check(gc.days_active === 4, "four distinct Bangkok days (two entries on one day count once)", gc);
  check(gc.run === 3, "one empty day keeps the run (today, -2, -3); two empty days end it (-6)", gc);
  check(gc.this_week === expectWeek, `this week counts from Monday (Bangkok): ${expectWeek}`, gc);
  await checkinOn(H, -3, "tap");
  check((await call<Json>(web, "shift_quest_character", H)).checkins.run === 0, "nothing for the last two days: the run is 0");
  await checkinOn(E, -2, "tap");
  check((await call<Json>(web, "shift_quest_character", E)).checkins.run === 1, "one rest day so far: the run is still alive");

  // --- The wallet --------------------------------------------------------------------------------------
  w = await call<Json>(web, "shift_quest_wallet", A);
  check(keys(w) === "awards_live,balance,community_done,consent_ok,earn,entries,redemption_live,reserved,reward_terms,shop,stage",
    "the wallet's shape", keys(w));
  check(canon(w.earn) === canon({
    main: { amount: 300, cap: 5 }, side: { amount: 100, cap: 11 }, community: { amount: 500, cap: 4 },
    taught: { amount: 3000, cap: 1 }, helped: { amount: 1000, cap: 1 },
  }), "earn rates come from the published rules pinned on the templates", w.earn);
  check(w.entries.length <= 10 && w.entries.every((e: Json) => keys(e) === "amount,category,created_at,kind,rule_key,title"),
    "at most 10 entries, none with an id", w.entries);
  check(w.entries.some((e: Json) => e.rule_key === "taught-next-shift") && w.entries.some((e: Json) => e.category === "Best demo") &&
      w.entries.some((e: Json) => e.rule_key === "main-quest" && e.title),
    "entries name the rule key, the recognition category and the quest title", w.entries);
  check(w.reward_terms?.includes("not hours") && w.stage === 6 && w.community_done === true && w.consent_ok === true,
    "terms, stage, community and consent", { t: w.reward_terms, s: w.stage });
  check(w.shop.items.every((x: Json) => keys(x) === "affordable,cost,description,id,in_stock,locked,min_stage,name,requires_community"),
    "shop items' shape", w.shop.items);
  check(w.shop.mine.length === 1 && w.shop.mine[0].status === "cancelled", "the cancelled reservation shows for 30 days", w.shop.mine);
  check(![...Object.keys(NAMES), ...Object.values(NAMES), await memberId(A)].some((s) => JSON.stringify(w).includes(s)),
    "the wallet carries no member id and no name");
  const wE = await call<Json>(web, "shift_quest_wallet", E);
  check(wE.consent_ok === false && wE.shop.items.every((x: Json) => x.locked === "consent"), "without consent every item says consent", wE.shop.items);
  check(await code(call(web, "shift_quest_wallet", NOBODY)) === "not_started", "the wallet needs a started student");

  // --- AI island news -----------------------------------------------------------------------------------
  const inputs = (kind = "day", d = today) => call<Json>(web, "shift_quest_digest_inputs", d, kind);
  const save = (entries: Json[], kind = "day", d = today) => call<number>(web, "shift_quest_digest_save", d, kind, JSON.stringify(entries));
  const news = (who: string) => call<Json>(web, "shift_quest_island_news", who);
  const postNext = () => call<Json | null>(bot, "shift_quest_digest_post_next");
  await optin(C, p2);
  await optin(D, p3);
  await optin(E, p4);
  let inp = await inputs();
  check(keys(inp) === "day,enabled,from,kind,projects,to" && inp.enabled === false && inp.projects.length === 0,
    "digest off: no projects", inp);
  check(await save([{ project_id: p2, summary: "x", no_update: false, model: "m" }]) === 0, "digest off: nothing is saved");
  let n = await news(A);
  check(n.enabled === false && n.teams.length === 0 && !("hidden" in n), "digest off: no news", n);
  await call(bot, "shift_quest_admin_set", ADMIN, "live_channel", LIVE);
  check((await postNext()) === null, "digest off: nothing to post");
  island = await islandSet("digest_enabled", "on");
  check(island.digest.enabled === true && island.digest.channel === "live", "an admin switches the digest on", island.digest);

  await reach(C, 1, "Built a paper prototype with Player Cee and tested it");
  await call(web, "shift_quest_checkin", C, null);
  // Work by someone outside the team (or without AI news) never reaches the model.
  await db.query(
    `insert into public.shift_quest_submissions (instance_id, revision, submitted_by, evidence, status)
     select i.id, 50, $2, 'Outsider work with a private name', 'clarification'
     from public.shift_quest_instances i where i.project_id = $1 and i.milestone = 1`, [p2, await memberId(E)]);
  // The window ends now: 23 hours ago is in, 25 hours ago is out (the evening before the 20:00 job counts).
  // A note 23 hours ago and a tap 25 hours ago (one tap a Bangkok day, so the two kinds keep them apart).
  for (const [hours, kind] of [[23, "note"], [25, "tap"]] as const) {
    await db.query(
      "insert into public.shift_quest_progress (member_id, project_id, kind, changed, visibility, created_at) values ($1, $2, $3, $4, 'private', now() - make_interval(hours => $5::int))",
      [await memberId(D), p3, kind, kind === "note" ? "Worked on the stall sign" : null, hours]);
  }
  inp = await inputs();
  check(inp.enabled === true && inp.day === today && inp.from === today && inp.to === today, "a day window is the day itself", inp);
  check(JSON.stringify(inp.projects.map((x: Json) => x.slot)) === JSON.stringify([s2, s3]),
    "only eligible teams: Player One has no AI consent for Bee, Player Four no consent", inp.projects.map((x: Json) => x.slot));
  const two = inp.projects.find((x: Json) => x.slot === s2);
  check(keys(two) === "ambition,approved,checkins,name,previous,project_id,redact,redact_teams,route,slot,stage,submitted", "a project's inputs", keys(two));
  check(JSON.stringify(two.redact) === JSON.stringify(["Player Cee"]), "redact lists everyone ever on the team", two.redact);
  check(JSON.stringify(two.redact_teams) === JSON.stringify(["Player Four"]), "redact_teams lists every team name that may not be shown", two.redact_teams);
  check(!JSON.stringify(two.submitted).includes("Outsider"), "work submitted by someone off the team is left out", two.submitted);
  const c3 = inp.projects.find((x: Json) => x.slot === s3)?.checkins;
  check(c3?.taps === 0 && c3.days === 1 && c3.members_active === 1, "the window is the 24 hours ending now (23 hours ago in, 25 out)", c3);
  check(two.submitted.length === 1 && two.submitted[0].evidence.includes("paper prototype") && two.approved.length === 1 &&
      two.approved[0].milestone === 1 && two.approved[0].side === false && two.stage === 1,
    "today's submitted work and the approved quests", two);
  check(canon(two.checkins) === canon({ members_active: 1, days: 1, taps: 1 }), "check-in counts in the window", two.checkins);
  check(two.previous === null, "no previous summary yet");
  const weekInp = await inputs("week");
  check(weekInp.from === await day(-6) && weekInp.to === today, "a week window is the 7 days ending on the day", weekInp);
  check(await code(inputs("month")) === "bad_input", "an unknown kind is bad_input");
  await db.query("update public.shift_quest_consents set ai_ok = true where member_id = $1", [await memberId(B)]);
  check((await inputs()).projects.some((x: Json) => x.slot === s1), "Bee's parent ticks the AI line: Player One is eligible");
  await db.query("update public.shift_quest_consents set ai_ok = false where member_id = $1", [await memberId(B)]);

  check(await save([
    { project_id: p1, summary: "Player One summary", no_update: false, model: "m" },
    { project_id: p2, summary: "  ทีมทำต้นแบบกระดาษและทดสอบกับผู้ใช้  ", no_update: false, model: "claude-haiku-5-5" },
    { project_id: p3, summary: "ignored", no_update: true, model: "claude-haiku-5-5" },
    { project_id: p4, summary: "Player Four summary", no_update: false, model: "m" },
    { project_id: "not-a-uuid", summary: "x", no_update: false },
    "not an object",
  ] as Json[]) === 2, "save stores eligible teams only (2 of 4), skips bad entries");
  const stored = async (project: string, kind = "day") => (await db.query(
    "select * from public.shift_quest_digests where project_id = $1 and kind = $2 and day = $3::date", [project, kind, today])).rows;
  check((await stored(p2))[0]?.summary === "ทีมทำต้นแบบกระดาษและทดสอบกับผู้ใช้" && (await stored(p2))[0]?.model === "claude-haiku-5-5",
    "the summary is trimmed and the model recorded");
  check((await stored(p3))[0]?.summary === null && (await stored(p3))[0]?.no_update === true, "no_update stores no summary");
  check((await stored(p1)).length === 0 && (await stored(p4)).length === 0, "ineligible teams are never stored");
  await save([{ project_id: p2, summary: "ข".repeat(700), no_update: false, model: "m" }]);
  check((await stored(p2)).length === 1 && (await stored(p2))[0].summary.length === 600, "a second save updates the row, capped at 600");
  await save([{ project_id: p2, summary: "", no_update: false, model: "m" }]);
  check((await stored(p2))[0].no_update === true && (await stored(p2))[0].summary === null, "an empty summary is no update");
  await save([{ project_id: p2, summary: "ทีมทำต้นแบบกระดาษ", no_update: false, model: "m" }]);
  await optin(C, p2, false);
  check(await save([{ project_id: p2, summary: "changed", no_update: false, model: "m" }]) === 0 &&
      (await stored(p2))[0].summary === "ทีมทำต้นแบบกระดาษ",
    "save checks eligibility again: a team that opted out is not stored");
  check((await news(A)).teams.every((t: Json) => t.slot !== s2), "and leaves the news");
  await optin(C, p2, true);
  check(await code(save([], "day", null as unknown as string)) === "bad_input" && await code(call(web, "shift_quest_digest_save", today, "day", "{}")) === "bad_input",
    "save needs a day and an array");
  await save([{ project_id: p2, summary: "สรุปสัปดาห์ของทีม", no_update: false, model: "m" }], "week");

  n = await news(A);
  check(keys(n) === "day,enabled,teams,week_of" && n.enabled === true && n.day === today, "the news' shape for a student (no hidden list)", keys(n));
  check(JSON.stringify(n.teams.map((t: Json) => t.slot)) === JSON.stringify([s2, s3]), "eligible teams only, by slot", n.teams);
  const t2 = n.teams.find((t: Json) => t.slot === s2);
  check(t2.name === "Player Two" && t2.day.summary === "ทีมทำต้นแบบกระดาษ" && t2.day.no_update === false &&
      t2.week.summary === "สรุปสัปดาห์ของทีม" && keys(t2.day) === "created_at,day,no_update,summary" &&
      t2.day.day === today && t2.week.day === today,
    "a team: name, today's summary and the week recap, each with the day it is for", t2);
  check(n.teams.find((t: Json) => t.slot === s3).day.no_update === true && n.teams.find((t: Json) => t.slot === s3).week === null,
    "a team with no update says so");
  check(n.week_of === await day(-(isodow - 1)), "week_of is the Monday of the latest recap", n.week_of);
  check(!["Player Cee", "Player Dee", C, D, p2, p3, await memberId(C)].some((s) => JSON.stringify(n).includes(s)),
    "the news never carries a member's name, Discord id or any id");
  check((await news(R1)).hidden?.length === 0, "staff get a hidden list (empty)");

  // Hide and show.
  check(await code(call(web, "shift_quest_digest_hide", A, s3, true, null)) === "not_authorized", "students cannot hide a team");
  check(await code(call(web, "shift_quest_digest_hide", R1, 999, true, null)) === "not_found", "an unknown plot is not_found");
  check(await code(call(web, "shift_quest_digest_hide", R1, s3, null, null)) === "bad_input", "hidden must be true or false");
  const hid = await call<Json>(web, "shift_quest_digest_hide", R1, s3, true, "Off topic for the island");
  check(canon(hid) === canon({ slot: s3, hidden: true }), "a reviewer hides a team on the website", hid);
  n = await news(R1);
  check(n.teams.every((t: Json) => t.slot !== s3) && canon(n.hidden) === canon([{ slot: s3, name: "Player Three" }]),
    "hidden teams leave the news; staff see them listed", n);
  check(!("hidden" in (await news(A))) && (await news(A)).teams.every((t: Json) => t.slot !== s3), "students only see the team gone");
  check((await inputs()).projects.every((x: Json) => x.slot !== s3), "and the summariser no longer reads it");
  check((await call<Json>(bot, "shift_quest_admin_island_status", ADMIN)).digest.hidden.some((x: Json) => x.slot === s3),
    "/admin island status lists it");
  check((await call<Json>(bot, "shift_quest_digest_hide", ADMIN, s3, false, null)).hidden === false, "an admin shows it again from Discord");
  check((await news(A)).teams.some((t: Json) => t.slot === s3), "and it is back");
  check(await count("select count(*) from public.shift_quest_audit where action in ('digest_hide', 'digest_show')") === 2, "both audited");

  // The Discord post.
  await call(bot, "shift_quest_admin_set", ADMIN, "live_channel", null);
  await call(bot, "shift_quest_admin_set", ADMIN, "celebrate_channel", null);
  check((await postNext()) === null, "no live or celebrate channel: nothing to post");
  await call(bot, "shift_quest_admin_set", ADMIN, "celebrate_channel", CELEB);
  let pn = await postNext();
  check(pn?.channel_id === CELEB, "the celebrate channel when the live channel is unset", pn);
  await call(bot, "shift_quest_admin_set", ADMIN, "live_channel", LIVE);
  pn = await postNext();
  check(keys(pn) === "channel_id,day,entries,kind" && pn!.channel_id === LIVE && pn!.day === today,
    "the live channel first", pn);
  check(pn!.kind === (isodow === 7 ? "week" : "day"), `kind ${isodow === 7 ? "week on a Bangkok Sunday" : "day on a weekday"}`, pn);
  check(pn!.entries.every((x: Json) => keys(x) === "name,slot,summary") &&
      JSON.stringify(pn!.entries.map((x: Json) => x.slot)) === JSON.stringify([s2]),
    "entries: eligible teams with a summary only (no_update teams are left out)", pn!.entries);
  await save([{ project_id: p2, summary: null, no_update: true, model: "m" }]);
  if (isodow !== 7) check((await postNext()) === null, "no summaries today: nothing to post");
  await save([{ project_id: p2, summary: "ทีมทำต้นแบบกระดาษ", no_update: false, model: "m" }]);
  check(await code(call(bot, "shift_quest_digest_mark", today, LIVE, "not-a-snowflake")) === "bad_input", "mark needs snowflakes");
  const claim = (kind = pn!.kind) => call<string | null>(bot, "shift_quest_digest_claim", today, LIVE, kind);
  check(await code(claim("month")) === "bad_input", "a claim needs a kind");
  check(await claim() === "new", "the bot claims the day before it sends");
  check(await claim() === null && (await postNext()) === null, "a fresh claim: nobody else sends (and the post is not offered)");
  await db.query("update public.shift_quest_digest_posts set claimed_at = now() - interval '20 minutes' where day = $1::date", [today]);
  check((await postNext()) !== null, "a claim over 15 minutes old without a message is offered again");
  check(await claim() === "stale", "and claimed as stale, so the bot looks for its own message first");
  check(await call(bot, "shift_quest_digest_mark", today, LIVE, M1) === M1, "the first mark stores its message");
  check(await call(bot, "shift_quest_digest_mark", today, LIVE, M2) === M1, "a second process gets the first message back (compare and set)");
  check((await postNext()) === null, "one post per Bangkok day");
  check(await claim() === null, "a marked day is never claimed again");
  check(await count("select count(*) from public.shift_quest_digest_posts") === 1, "one row for the day");
  const current = () => call<Json[]>(bot, "shift_quest_digest_post_current");
  let cur = await current();
  check(cur.length === 1 && keys(cur[0]) === "channel_id,day,entries,kind,message_id" && cur[0].message_id === M1 &&
      cur[0].day === today && cur[0].kind === pn!.kind,
    "the posted message, as it should read now", cur);
  const slotsNow = (c: Json[]) => JSON.stringify(c[0].entries.map((x: Json) => x.slot));
  const postedSlots = slotsNow(cur);
  await call(bot, "shift_quest_digest_hide", ADMIN, s2, true, null);
  cur = await current();
  check(!slotsNow(cur).includes(String(s2)), "a hidden team leaves the posted message (the bot edits it)", cur);
  await call(bot, "shift_quest_digest_hide", ADMIN, s2, false, null);
  check(slotsNow(await current()) === postedSlots, "and comes back when shown again");
  island = await call<Json>(bot, "shift_quest_admin_island_status", ADMIN);
  check(keys(island) === "consent,digest" && keys(island.consent) === "adult_age,granted,none,required,waiting" &&
      keys(island.digest) === "channel,enabled,hidden,last_day" && island.digest.last_day === today && island.digest.channel === "live",
    "/admin island status: counts and the digest", island);
  check(island.consent.granted + island.consent.waiting + island.consent.none ===
      await count("select count(*) from public.shift_quest_members where onboarded_at is not null and erased_at is null"),
    "the counts add up to the students", island.consent);
  check(await code(call(bot, "shift_quest_admin_island_status", R1)) === "not_authorized", "admins only");

  // --- Erasure takes the consent row --------------------------------------------------------------------
  check((await consentRow(F)) !== undefined, "Eff has a consent row");
  const p5: string = await call(web, "shift_quest_project_create", F, "Player Five", "other", null);
  await db.query("insert into public.shift_quest_digests (day, kind, project_id, summary, no_update, model) values ($1::date, 'day', $2, 'From Eff''s work', false, 'm')",
    [today, p5]);
  const req: string = await call(bot, "shift_quest_data_request", F, "erasure", null);
  await call(bot, "shift_quest_admin_erase", ADMIN, req);
  check((await consentRow(F)) === undefined && await count("select count(*) from public.shift_quest_consents where member_id = $1", [await scalar(db,
    "select member_id from public.shift_quest_data_requests where id = $1", [req])]) === 0, "erasure deletes the consent row");
  check(await count("select count(*) from public.shift_quest_digests where project_id = $1", [p5]) === 0,
    "and the AI summaries of every project the member was on");
  check(await count("select count(*) from public.shift_quest_digests where project_id = $1", [p2]) > 0, "other teams' summaries stay");

  await db.end();
  await bot.end();
  await web.end();
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
