/**
 * SHIFT High Island: seeds, tree style and gifts (20261114120000_shift_quest_tree_style,
 * schema 13). A team plants one of four seeds once (it sets the tree's look and
 * fills the project's ambition when empty), earns gifts (pick 1 of up to 3
 * unowned items) after a closed campfire round (2 per member per Bangkok day)
 * and after the first submit of each quest (one per source, ever, not capped),
 * picks and equips items, and reads its own tree (shift_quest_tree_get: style,
 * waiting gifts, root counts, stage). Other teams' styles are read through
 * shift_quest_island_styles(), only for plots every member agreed to show.
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
import { DEFAULT_STYLE, SEEDS, TREE_ITEMS } from "../../../lib/shift-island/tree-style";

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
const ADMIN = "850000000000000001";
const R1 = "850000000000000002"; // a reviewer
const A = "860000000000000001"; // project one, with B
const B = "860000000000000002"; // A's teammate
const C = "860000000000000003"; // project two
const D = "860000000000000004"; // project three, created with an ambition
const E = "860000000000000005"; // no project
const NOBODY = "869999999999999999";
const NAMES: Record<string, string> = {
  [ADMIN]: "Tree Admin", [R1]: "Tree Reviewer", [A]: "Tree Aye", [B]: "Tree Bee", [C]: "Tree Cee", [D]: "Tree Dee",
  [E]: "Tree Eee",
};
const IDEA = "แอปจองโต๊ะอ่านหนังสือในห้องสมุด";
const AIM = "Already has an aim";
/** A reflection that counts toward roots (10 characters or more). */
const LEARNED = "learned how to split the work";

/** The new entry points of schema 13: the bot's and the website's. */
const PUBLIC_FNS = [
  "shift_quest_tree_get(text)",
  "shift_quest_seed_plant(text,text,text)",
  "shift_quest_round_close_gift(text,uuid,text,text)",
  "shift_quest_quest_gift(text,uuid)",
  "shift_quest_tree_pick(text,uuid,text)",
  "shift_quest_tree_equip(text,text)",
  "shift_quest_island_styles()",
];
/** Internal helpers: nobody but the definer functions calls them. */
const HELPERS = [
  "shift_quest__project_root_notes(uuid,timestamp with time zone)",
  "shift_quest__gift_create(uuid,uuid,text)",
  "shift_quest__tree_json(uuid)",
  "shift_quest__tree_equipped(jsonb)",
  "shift_quest__tree_seed(text)",
  "shift_quest__tree_lock(uuid)",
];
const TABLES = ["shift_quest_tree_items", "shift_quest_tree_style", "shift_quest_tree_gifts"];

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
/** Object keys sorted (jsonb orders them its own way), array order kept. */
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, canon(x)]))
    : v;
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const sorted = (xs: string[]) => [...xs].sort();
const ORDER = TREE_ITEMS.map((i) => i.id);
const SLOT_OF = new Map(TREE_ITEMS.map((i) => [i.id, i.slot]));
const DEFAULTS = Object.values(DEFAULT_STYLE);
/** Ids in catalog order, as the database returns them. */
const inOrder = (ids: Iterable<string>) => {
  const set = new Set(ids);
  return ORDER.filter((id) => set.has(id));
};

async function main(): Promise<void> {
  const db = await connect(adminUrl!); // superuser: fixtures and inspection only
  const bot = await connect(botUrl!); // shift_quest_bot: Discord
  const web = await connect(webUrl!); // shift_quest_web: the island page
  const web2 = await connect(webUrl!); // a second browser on the island page, for the race

  const count = async (sql: string, args: unknown[] = []) => Number(await scalar(db, sql, args));
  const gifts = () => count("select count(*) from public.shift_quest_tree_gifts");

  /** The caller's tree as the website reads it; the bot must read exactly the same. */
  const tree = async (who: string): Promise<Json> => {
    const fromWeb = await call<Json>(web, "shift_quest_tree_get", who);
    const fromBot = await call<Json>(bot, "shift_quest_tree_get", who);
    if (!same(fromWeb, fromBot)) check(false, "the bot and the website read the same tree", { fromWeb, fromBot });
    return fromWeb;
  };
  const styles = async (): Promise<Json[]> => {
    const fromWeb = await call<Json[]>(web, "shift_quest_island_styles");
    const fromBot = await call<Json[]>(bot, "shift_quest_island_styles");
    if (!same(fromWeb, fromBot)) check(false, "the bot and the website read the same island styles", { fromWeb, fromBot });
    return fromWeb;
  };

  // --- Schema, privileges, row security ------------------------------------------------------------
  check(Number(await call(bot, "shift_quest_schema_version")) === 13, "the bot reads schema version 13 (tree style)");
  check(Number(await call(web, "shift_quest_schema_version")) === 13, "the website reads schema version 13");

  for (const fn of PUBLIC_FNS) {
    const g: Json = (await db.query(
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
    check(g?.bot === true && g.web === true && g.service_role === true && g.anon === false && g.authenticated === false &&
        g.public === false && g.definer === true && g.pinned === true,
      `${fn}: a security definer with a pinned search_path, the bot's and the website's only`, g);
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
  check((await sqlstate(web.query("select * from public.shift_quest_tree_gifts"))) === "42501",
    "the website cannot read the gifts directly (42501)");
  for (const r of ["anon", "authenticated"]) {
    await db.query(`set role ${r}`);
    check((await sqlstate(call(db, "shift_quest_island_styles"))) === "42501", `${r} cannot read the island styles`);
    check((await sqlstate(call(db, "shift_quest_tree_get", A))) === "42501", `${r} cannot read a tree`);
    await db.query("reset role");
  }

  // The catalog in SQL is the catalog in code (lib/shift-island/tree-style.ts), in its order.
  const catalog: Json[] = (await db.query("select id, slot, is_default from public.shift_quest_tree_items order by sort")).rows;
  check(same(catalog.map((r) => [r.id, r.slot]), TREE_ITEMS.map((i) => [i.id, i.slot])),
    "shift_quest_tree_items holds the code's 22 items with their slots, in catalog order", catalog.map((r) => r.id));
  check(same(sorted(catalog.filter((r) => r.is_default).map((r) => r.id)), sorted(DEFAULTS)),
    "the defaults are DEFAULT_STYLE's four items");
  for (const [seed, { style }] of Object.entries(SEEDS)) {
    const fromSql = await call<Json>(db, "shift_quest__tree_seed", seed);
    check(same(fromSql, style), `the ${seed} seed has the code's look`, fromSql);
  }
  check(same(await styles(), []), "an empty island has no styles: []");

  // --- Fixtures --------------------------------------------------------------------------------
  await db.query("update public.shift_quest_settings set consent_required = false where id");
  await call(db, "shift_quest_bootstrap_admin", ADMIN, NAMES[ADMIN]);
  await call(bot, "shift_quest_admin_role", ADMIN, R1, NAMES[R1], "reviewer", true);
  for (const id of [A, B, C, D, E]) await call(bot, "shift_quest_start", id, NAMES[id], false);
  const p1: string = await call(web, "shift_quest_project_create", A, "Tree One", "software", null);
  await call(bot, "shift_quest_project_invite", A, p1, B);
  await call(web, "shift_quest_project_respond", B, p1, true);
  const p2: string = await call(web, "shift_quest_project_create", C, "Tree Two", "creative", null);
  const p3: string = await call(web, "shift_quest_project_create", D, "Tree Three", "service", AIM);
  const slotOf = (project: string) => count("select slot from public.shift_quest_plots where project_id = $1", [project]);
  const [s1, s3] = [await slotOf(p1), await slotOf(p3)];
  const styleRow = async (project: string) =>
    (await db.query("select seed, equipped, owned from public.shift_quest_tree_style where project_id = $1", [project])).rows[0];

  // --- Who may call ------------------------------------------------------------------------------
  check(await code(call(web, "shift_quest_tree_get", NOBODY)) === "not_started", "an unknown caller has no tree");
  check(await code(call(web, "shift_quest_tree_get", E)) === "no_project", "a caller with no project has no tree");
  check(await code(call(web, "shift_quest_quest_gift", E, randomUUID())) === "no_project",
    "quest_gift refuses a caller with no project");
  check(await code(call(web, "shift_quest_seed_plant", E, "oak", IDEA)) === "no_project", "and so does seed_plant");
  check(await code(call(web, "shift_quest_tree_equip", E, "leaf:forest")) === "no_project", "and so does equip");

  // --- A fresh tree ----------------------------------------------------------------------------------
  let t1 = await tree(A);
  check(keys(t1) === "equipped,gifts,owned,roots,seed,stage", "the tree is {seed, equipped, owned, gifts, roots, stage}", keys(t1));
  check(t1.seed === null && same(t1.equipped, DEFAULT_STYLE) && same(t1.owned, inOrder(DEFAULTS)) &&
      same(t1.gifts, []) && same(t1.roots, { count: 0, recent: 0 }) && t1.stage === 0,
    "a fresh tree: no seed, the default look, the defaults owned, no gifts, no roots, stage 0", t1);
  check(await styleRow(p1) === undefined, "and reading it stored nothing");

  // --- Seeds ----------------------------------------------------------------------------------------
  check(await code(call(web, "shift_quest_seed_plant", A, "cedar", IDEA)) === "seed_unknown", "an unknown seed is refused");
  check(await code(call(web, "shift_quest_seed_plant", A, null, IDEA)) === "seed_unknown", "so is no seed");
  check(await code(call(web, "shift_quest_seed_plant", A, "sakura", "   ")) === "missing_text", "the idea is required");
  check(await code(call(web, "shift_quest_seed_plant", A, "sakura", "x".repeat(501))) === "text_too_long",
    "an idea of 501 characters is refused");
  check(await styleRow(p1) === undefined, "refused seeds stored nothing");
  t1 = await call<Json>(web, "shift_quest_seed_plant", A, "sakura", `  ${IDEA}  `);
  const sakura = Object.values(SEEDS.sakura.style);
  check(t1.seed === "sakura" && same(t1.equipped, SEEDS.sakura.style), "planting sakura sets the seed and its look", t1);
  check(sakura.every((id) => t1.owned.includes(id)) && same(t1.owned, inOrder([...DEFAULTS, ...sakura])),
    "the seed's items are owned, with the defaults", t1.owned);
  check(same(await tree(A), t1), "seed_plant returns the tree, as tree_get reads it");
  check(await scalar(db, "select ambition from public.shift_quest_projects where id = $1", [p1]) === IDEA,
    "the idea, trimmed, fills an empty ambition");
  check(await code(call(web, "shift_quest_seed_plant", B, "pine", "another idea")) === "seed_planted",
    "a teammate cannot plant a second seed");
  check(await code(call(bot, "shift_quest_seed_plant", A, "sakura", IDEA)) === "seed_planted", "nor can the planter, from Discord");
  check((await tree(B)).seed === "sakura", "the teammate sees the team's seed");
  const t3 = await call<Json>(bot, "shift_quest_seed_plant", D, "maple", "ก".repeat(500));
  check(t3.seed === "maple" && same(t3.equipped, SEEDS.maple.style), "an idea of exactly 500 characters plants (Discord)");
  check(await scalar(db, "select ambition from public.shift_quest_projects where id = $1", [p3]) === AIM,
    "an ambition already set is kept");

  // --- Gifts after a campfire round --------------------------------------------------------------
  const owned1 = new Set<string>(t1.owned);
  const roundA1: string = await call(bot, "shift_quest_work_start", A, "Round one");
  const r1 = await call<Json>(web, "shift_quest_round_close_gift", A, roundA1, LEARNED, null);
  check(keys(r1) === "gift,id" && typeof r1.id === "string", "round_close_gift returns {id, gift}", r1);
  check(await count("select count(*) from public.shift_quest_progress where id = $1 and kind = 'note' and learned = $2",
    [r1.id, LEARNED]) === 1, "id is the journal note the round close wrote");
  check(await scalar(db, "select ended_at is not null from public.shift_quest_work_sessions where id = $1", [roundA1]) === true,
    "and the round is closed");
  const g1 = r1.gift;
  check(keys(g1) === "id,options" && g1.options.length === 3 && new Set(g1.options).size === 3,
    "the gift is {id, options} with 3 distinct options", g1);
  check(g1.options.every((id: string) => SLOT_OF.has(id) && !owned1.has(id)), "every option is a catalog item the team does not own");
  // Sakura owns heart, cedar and sakura beyond the defaults, so leaf has the most unowned items (5): its first 3.
  check(same(g1.options, ["leaf:autumn", "leaf:mint", "leaf:gold"]),
    "the options come from the slot with the most unowned items, in catalog order", g1.options);
  check(await scalar(db, "select source from public.shift_quest_tree_gifts where id = $1", [g1.id]) === `round:${roundA1}`,
    "its source is the round");
  check((await call<Json>(web, "shift_quest_round_close_gift", A, roundA1, LEARNED, null)).gift === null,
    "closing the same round again (a retry) gives no second gift");
  check((await call<Json>(web, "shift_quest_round_close_gift", A, null, LEARNED, null)).gift === null,
    "a round close with no captured session gives no gift");
  const roundB0: string = await call(bot, "shift_quest_work_start", B, "B's round");
  check((await call<Json>(web, "shift_quest_round_close_gift", A, roundB0, LEARNED, null)).gift === null,
    "another member's session gives no gift");
  check(await scalar(db, "select ended_at is null from public.shift_quest_work_sessions where id = $1", [roundB0]) === true,
    "and stays open");
  await call(bot, "shift_quest_work_end", B, null);
  check(await gifts() === 1, "so far one gift");

  const roundA2: string = await call(bot, "shift_quest_work_start", A, "Round two");
  const g2 = (await call<Json>(bot, "shift_quest_round_close_gift", A, roundA2, LEARNED, "a blocker")).gift;
  check(g2 !== null && g2.options.length === 3, "a second round the same day gives a second gift (Discord)", g2);
  const roundA3: string = await call(bot, "shift_quest_work_start", A, "Round three");
  const r3 = await call<Json>(web, "shift_quest_round_close_gift", A, roundA3, LEARNED, null);
  check(r3.gift === null && typeof r3.id === "string", "a third round the same Bangkok day saves the note but gives no gift", r3);
  check(await scalar(db, "select ended_at is not null from public.shift_quest_work_sessions where id = $1", [roundA3]) === true,
    "and still closes the round");

  // Schema 12's round close is unchanged: a bot that has not upgraded gets no gift.
  const before12 = await gifts();
  const roundC0: string = await call(bot, "shift_quest_work_start", C, "Old bot round");
  const id12 = await call(bot, "shift_quest_round_close", C, roundC0, LEARNED, null);
  check(typeof id12 === "string" && await gifts() === before12, "shift_quest_round_close still returns the note id and gives no gift");

  // Ties: the slot order (shape, leaf, bark, bloom) turns by the project's gift count.
  const roundC1: string = await call(bot, "shift_quest_work_start", C, "C round one");
  const c1 = (await call<Json>(bot, "shift_quest_round_close_gift", C, roundC1, LEARNED, null)).gift;
  check(same(c1?.options, ["shape:maple", "shape:heart", "shape:pine"]),
    "a plain tree: shape and leaf tie at 5 unowned, the first gift offers shapes", c1);
  const roundC2: string = await call(bot, "shift_quest_work_start", C, "C round two");
  const c2 = (await call<Json>(web, "shift_quest_round_close_gift", C, roundC2, LEARNED, null)).gift;
  check(same(c2?.options, ["leaf:autumn", "leaf:mint", "leaf:gold"]), "the second gift's tie turns to leaves", c2);

  // --- Picking a gift --------------------------------------------------------------------------------
  t1 = await tree(A);
  check(same(t1.gifts, [g1, g2]), "the team's waiting gifts, oldest first, as {id, options}", t1.gifts);
  check(same((await tree(B)).gifts, t1.gifts), "a teammate sees the same gifts");
  check(await code(call(web, "shift_quest_tree_pick", A, g1.id, "bark:birch")) === "item_not_offered",
    "picking an item the gift does not offer is refused");
  check(await code(call(web, "shift_quest_tree_pick", A, g1.id, null)) === "item_not_offered", "so is picking nothing");
  check(await code(call(web, "shift_quest_tree_pick", C, g1.id, "leaf:mint")) === "gift_gone",
    "a member of another project cannot pick the gift");
  check(await code(call(web, "shift_quest_tree_pick", E, g1.id, "leaf:mint")) === "gift_gone",
    "nor can a member with no project");
  check(await code(call(web, "shift_quest_tree_pick", A, randomUUID(), "leaf:mint")) === "gift_gone", "an unknown gift is gone");
  check(await code(call(web, "shift_quest_tree_pick", NOBODY, g1.id, "leaf:mint")) === "not_started", "an unknown caller is refused");
  const ownedBefore: string[] = t1.owned;
  const picked = await call<Json>(web, "shift_quest_tree_pick", A, g1.id, "leaf:mint");
  check(picked.owned.length === ownedBefore.length + 1 && picked.owned.includes("leaf:mint"), "the pick is owned by the team",
    picked.owned);
  check(picked.equipped.leaf === "leaf:mint" && picked.equipped.shape === "shape:heart", "and worn at once, in its slot",
    picked.equipped);
  check(same(picked.gifts, [g2]), "the picked gift is gone from the tree", picked.gifts);
  check(same(await tree(A), picked), "tree_pick returns the tree, as tree_get reads it");
  check(await code(call(web, "shift_quest_tree_pick", B, g1.id, "leaf:gold")) === "gift_gone", "a gift is picked once");

  // Two teammates pick the same gift at once: the first holds the gift's row lock, the second waits for it.
  await web2.query("begin");
  const first = await code(call(web2, "shift_quest_tree_pick", A, g2.id, "leaf:mint"));
  const secondP = code(call(web, "shift_quest_tree_pick", B, g2.id, "leaf:autumn"));
  let waited = false;
  for (let k = 0; k < 50 && !waited; k++) {
    waited = await scalar<boolean>(db,
      "select exists (select 1 from pg_stat_activity where usename = 'shift_quest_web' and wait_event_type = 'Lock')");
    if (!waited) await new Promise((r) => setTimeout(r, 50));
  }
  check(waited, "the second pick waits on the first one's lock");
  await web2.query("commit");
  const second = await secondP;
  check(same([first, second], ["ok", "gift_gone"]), "exactly one concurrent pick wins, the other is told the gift is gone",
    [first, second]);
  const row1 = await styleRow(p1);
  check(row1.owned.length === new Set(row1.owned).size, "picking an item the team already owns adds no duplicate", row1.owned);
  check(!(await tree(A)).owned.includes("leaf:autumn"), "and the losing pick changed nothing");

  // --- The wardrobe ----------------------------------------------------------------------------------
  check(await code(call(web, "shift_quest_tree_equip", A, "bark:birch")) === "item_not_owned", "an unowned item cannot be worn");
  check(await code(call(web, "shift_quest_tree_equip", A, "bark:nope")) === "item_not_owned", "nor an unknown one");
  check(await code(call(web, "shift_quest_tree_equip", A, null)) === "item_not_owned", "nor nothing");
  let worn = await call<Json>(web, "shift_quest_tree_equip", B, "leaf:forest");
  check(worn.equipped.leaf === "leaf:forest" && worn.equipped.bark === "bark:cedar", "a teammate wears a default", worn.equipped);
  worn = await call<Json>(bot, "shift_quest_tree_equip", A, "bark:oak");
  check(same(worn.equipped, { shape: "shape:heart", leaf: "leaf:forest", bark: "bark:oak", bloom: "bloom:sakura" }),
    "and switches back to any owned item, slot by slot (Discord)", worn.equipped);
  worn = await call<Json>(web, "shift_quest_tree_equip", A, "leaf:mint");
  check(worn.equipped.leaf === "leaf:mint" && same(await tree(B), worn), "a picked item can be worn again");
  const plain = await call<Json>(web, "shift_quest_tree_equip", C, "shape:round");
  check(plain.seed === null && same(plain.equipped, DEFAULT_STYLE), "a tree with no seed can still wear its defaults", plain);

  // --- Gifts after a quest submit ----------------------------------------------------------------------
  const noGift = { gift: null };
  check(same(await call(web, "shift_quest_quest_gift", A, randomUUID()), noGift), "an unknown quest gives no gift, without raising");
  check(same(await call(web, "shift_quest_quest_gift", A, null), noGift), "no quest gives no gift");
  const started = await call<Json>(web, "shift_quest_milestone_start", A, 1);
  check(same(await call(web, "shift_quest_quest_gift", A, started.instance_id), noGift),
    "a quest with no submission yet gives no gift");
  const ms1 = await call<Json>(web, "shift_quest_milestone_submit", A, 1, "Proof one", "Learned one", null);
  const q1 = await call<Json>(web, "shift_quest_quest_gift", A, ms1.instance_id);
  check(keys(q1) === "gift" && q1.gift?.options?.length === 3 && keys(q1.gift) === "id,options",
    "the first submit of a main quest gives {gift: {id, options}} with 3 options", q1);
  check(await scalar(db, "select source from public.shift_quest_tree_gifts where id = $1", [q1.gift.id]) === "quest:main:1",
    "its source is the milestone");
  check(same(await call(web, "shift_quest_quest_gift", A, ms1.instance_id), noGift), "asking again gives nothing");
  const ms1b = await call<Json>(web, "shift_quest_milestone_submit", A, 1, "Proof one, again", "Learned more", null);
  check(ms1b.instance_id === ms1.instance_id && Number(ms1b.revision) === 2 &&
      same(await call(bot, "shift_quest_quest_gift", A, ms1.instance_id), noGift), "a resubmit gives nothing");
  check(same(await call(web, "shift_quest_quest_gift", B, ms1.instance_id), noGift), "a teammate asking for the same quest gets nothing");
  check(same(await call(web, "shift_quest_quest_gift", C, ms1.instance_id), noGift),
    "another project's quest gives no gift, without raising");
  await db.query("update public.shift_quest_instances set state = 'declined' where id = $1", [ms1.instance_id]);
  const msB = await call<Json>(web, "shift_quest_milestone_submit", B, 1, "B's proof", "B learned", null);
  check(msB.instance_id !== ms1.instance_id && same(await call(web, "shift_quest_quest_gift", B, msB.instance_id), noGift),
    "a teammate's new quest for the same milestone gives nothing: one gift per milestone, ever");
  check(await count("select count(*) from public.shift_quest_tree_gifts where source = 'quest:main:1'") === 1,
    "one gift for main quest 1");

  // Quest gifts are not capped, and do not use up the round cap.
  check(q1.gift !== null, "A's quest gift landed though A had two round gifts today");
  await call(bot, "shift_quest_admin_template_state", ADMIN, "side-review-a-friend", true);
  const friend = await scalar<string>(db, "select id from public.shift_quest_templates where slug = 'side-review-a-friend'");
  const sideB = await call<Json>(web, "shift_quest_side_submit", B, friend, "Reviewed a friend", "Learned to listen", null);
  const qB = await call<Json>(web, "shift_quest_quest_gift", B, sideB.instance_id);
  check(qB.gift?.options?.length === 3 &&
      await scalar(db, "select source from public.shift_quest_tree_gifts where id = $1", [qB.gift.id]) === `quest:side:${friend}`,
    "the first submit of a side quest gives a gift, sourced by its template", qB);
  for (const n of [1, 2]) {
    const round: string = await call(bot, "shift_quest_work_start", B, `B round ${n}`);
    const r = await call<Json>(web, "shift_quest_round_close_gift", B, round, LEARNED, null);
    check(r.gift !== null, `B's round gift ${n} lands the same day as B's quest gift`, r);
  }
  const sideA = await call<Json>(web, "shift_quest_side_submit", A, friend, "A reviewed too", "A learned", null);
  check(sideA.instance_id !== sideB.instance_id && same(await call(web, "shift_quest_quest_gift", A, sideA.instance_id), noGift),
    "a teammate's own quest of the same side template gives nothing: one gift per template");

  const own1: string = await call(web, "shift_quest_propose", A, "Own quest one", null, "Goal", "Criteria", "Step");
  check(same(await call(web, "shift_quest_quest_gift", A, own1), noGift), "a proposed quest gives nothing before its submit");
  await call(web, "shift_quest_submit", A, own1, 1, "Evidence", "Reflection", null, "reviewers", null, []);
  const qOwn = await call<Json>(web, "shift_quest_quest_gift", A, own1);
  check(qOwn.gift?.options?.length === 3 &&
      await scalar(db, "select source from public.shift_quest_tree_gifts where id = $1", [qOwn.gift.id]) === `quest:proposed:${own1}`,
    "the first submit of a proposed quest gives a gift, sourced by the quest", qOwn);

  // --- Running out --------------------------------------------------------------------------------------
  const proposeAndSubmit = async (title: string) => {
    const id: string = await call(web, "shift_quest_propose", A, title, null, "Goal", "Criteria", "Step");
    await call(web, "shift_quest_submit", A, id, 1, "Evidence", "Reflection", null, "reviewers", null, []);
    return call<Json>(web, "shift_quest_quest_gift", A, id);
  };
  const allButTwo = ORDER.filter((id) => !DEFAULTS.includes(id) && id !== "leaf:sky" && id !== "bloom:peach");
  await db.query("update public.shift_quest_tree_style set owned = $2 where project_id = $1", [p1, allButTwo]);
  const two = await proposeAndSubmit("Own quest two");
  check(same(sorted(two.gift?.options ?? []), ["bloom:peach", "leaf:sky"]),
    "owning all but 2 items: the gift offers those 2, from different slots", two);
  // B's two round gifts move to yesterday (Bangkok): the cap is per day, so B's next round gives again.
  await db.query(
    `update public.shift_quest_tree_gifts set created_at = created_at - interval '1 day'
     where source like 'round:%' and member_id = (select id from public.shift_quest_members where discord_user_id = $1)`, [B]);
  const roundB3: string = await call(bot, "shift_quest_work_start", B, "B round 3");
  const b3 = (await call<Json>(web, "shift_quest_round_close_gift", B, roundB3, LEARNED, null)).gift;
  check(same(sorted(b3?.options ?? []), ["bloom:peach", "leaf:sky"]), "a new Bangkok day: B's round gives again, the same 2", b3);
  await db.query("update public.shift_quest_tree_style set owned = $2 where project_id = $1",
    [p1, ORDER.filter((id) => !DEFAULTS.includes(id))]);
  const giftsBefore = await gifts();
  check(same(await proposeAndSubmit("Own quest three"), noGift) && await gifts() === giftsBefore,
    "owning everything: no gift after a quest, and none stored");
  const roundB4: string = await call(bot, "shift_quest_work_start", B, "B round 4");
  check((await call<Json>(web, "shift_quest_round_close_gift", B, roundB4, LEARNED, null)).gift === null &&
      await gifts() === giftsBefore, "nor after a round (B is under today's cap)");
  check(same((await tree(A)).owned, ORDER), "the team owns the whole catalog");

  // --- Roots and stage in the tree -------------------------------------------------------------------------
  await db.query("delete from public.shift_quest_progress where project_id = $1", [p1]);
  check(same((await tree(A)).roots, { count: 0, recent: 0 }), "no reflections: no roots");
  /** A journal note written straight into the table, some time ago. */
  const note = (who: string, ago: string, learned = LEARNED) =>
    db.query(
      `insert into public.shift_quest_progress (member_id, project_id, kind, changed, learned, created_at)
       values ((select id from public.shift_quest_members where discord_user_id = $1), $2, 'note', 'worked on it', $3,
               now() - $4::interval)`,
      [who, p1, learned, ago],
    );
  for (let k = 0; k < 4; k++) await note(A, `20 days ${k} minutes`); // 3 count (the daily cap)
  for (let k = 0; k < 2; k++) await note(B, `10 days ${k} minutes`); // 2 count, older than 7 days
  for (let k = 0; k < 2; k++) await note(A, `1 day ${k} minutes`); // 2 count, recent
  await note(B, "2 hours"); // 1 counts, recent
  await note(A, "1 hour", "123456789"); // 9 characters: never counts
  check(same((await tree(A)).roots, { count: 8, recent: 3 }),
    "roots.count is the qualifying notes (8, the daily cap applied) and recent the last 7 days' (3)", (await tree(A)).roots);
  check(await call(web, "shift_quest_island_my_roots", A) === 2, "the same counter gives the own-tree level (8: level 2)");
  for (let day = 30; day < 35; day++) {
    for (let k = 0; k < 3; k++) await note(A, `${day} days ${k} minutes`);
  }
  check(same((await tree(A)).roots, { count: 15, recent: 3 }), "roots.count stops at 15, the top roots level",
    (await tree(A)).roots);
  check(await call(web, "shift_quest_island_my_roots", A) === 3, "and the own-tree level is 3");

  const subB = await scalar<string>(db, "select id from public.shift_quest_submissions where instance_id = $1", [msB.instance_id]);
  await call(bot, "shift_quest_review_decide", R1, subB, "approved", null, false);
  check((await tree(A)).stage === 1, "an approved main quest grows the tree: stage 1");

  // --- Other teams see only shown trees' styles ------------------------------------------------------------
  check(same(await styles(), []), "nobody agreed to show a tree: no styles");
  await call(web, "shift_quest_island_optin", A, p1, true);
  check(same(await styles(), []), "one of two members agreed: still plain, no style");
  await call(web, "shift_quest_island_optin", B, p1, true);
  const eq1 = (await tree(A)).equipped;
  let st = await styles();
  check(same(st, [{ slot: s1, seed: "sakura", equipped: eq1 }]), "every member agreed: the tree's slot, seed and look", st);
  check(st.every((x) => keys(x) === "equipped,seed,slot"), "each entry is {slot, seed, equipped}: never roots, a count or a name");
  const p4: string = await call(web, "shift_quest_project_create", E, "Tree Four", "other", null);
  for (const [who, project] of [[D, p3], [C, p2], [E, p4]]) await call(web, "shift_quest_island_optin", who, project, true);
  const [s2, s4] = [await slotOf(p2), await slotOf(p4)];
  st = await styles();
  check(same(st.map((x) => x.slot), [s1, s2, s3].sort((a, b) => a - b)), "shown trees with a style are listed by slot",
    st.map((x) => x.slot));
  check(st.find((x) => x.slot === s3)?.seed === "maple" && same(st.find((x) => x.slot === s3)?.equipped, SEEDS.maple.style),
    "a maple tree is listed with its seed and look");
  check(st.find((x) => x.slot === s2)?.seed === null && same(st.find((x) => x.slot === s2)?.equipped, DEFAULT_STYLE),
    "a shown tree that wore something but has no seed: seed null, the default look");
  check(!st.some((x) => x.slot === s4), "a shown tree that never had a style is not listed (it draws as the default)");
  await db.query("update public.shift_quest_projects set archived_at = now() where id = $1", [p3]);
  check(!(await styles()).some((x) => x.slot === s3), "an archived project has no style");
  await call(web, "shift_quest_island_optin", B, p1, false);
  check(!(await styles()).some((x) => x.slot === s1), "a member stops showing the tree: plain again, no style");
  await call(web, "shift_quest_island_optin", B, p1, true);

  const text = JSON.stringify(await styles());
  const ids: string[] = (await db.query("select id::text from public.shift_quest_members")).rows.map((r) => r.id);
  const leaks = [p1, p2, p3, p4, ...ids, ...Object.values(NAMES), "Tree One", "Tree Two", "Tree Three", "Tree Four", IDEA, AIM,
    A, B, C, D, E, "roots", "count"]
    .filter((s) => text.includes(s));
  check(leaks.length === 0, "the styles carry no project or member id, no name, no Discord id, no idea and no roots", leaks);

  console.log(`\n${passes} passed, ${failures} failed`);
  await Promise.all([db.end(), bot.end(), web.end(), web2.end()]);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
