/**
 * The student island flow end to end, through the real bot handlers
 * (bot/src/quests, handleInteraction) with fake Discord interactions, as
 * shift_quest_bot, against a disposable database: /start, /island without and
 * with a plot, taps and notes, a milestone from pick to mentor approval, rest,
 * name consent with a teammate, squads, a season with an unlock, a
 * recognition, and the weekly island post through the real outbox loop with a
 * fake Discord client (nothing reaches Discord). Run by run-local.sh.
 *
 * Same harness as bot_flows.ts, plus the defers /island uses and the files
 * each reply carries. All identities are synthetic.
 */
import { createHash, randomInt } from "node:crypto";

import { Client } from "pg";

import { REQUIRED_SCHEMA, checkQuestSchema, handleInteraction } from "../../../bot/src/quests";
import { QuestError, createQuestApi } from "../../../bot/src/quests/api";
import { questCommands } from "../../../bot/src/quests/commands";
import { STATE, T, errorText } from "../../../bot/src/quests/copy";
import { I, PENDING_SLOT, SQ } from "../../../bot/src/quests/island/copy";
import { startOutbox } from "../../../bot/src/quests/outbox";
import { createRolePool } from "../../../bot/src/pg";

import { readCard, type CardComponent } from "./cards";

const adminUrl = process.env.SHIFT_QUESTS_TEST_DATABASE_URL!;
const botUrl = process.env.SHIFT_QUESTS_BOT_DATABASE_URL!;
if (!adminUrl || !botUrl || process.env.SHIFT_QUESTS_TEST_DISPOSABLE !== "1") {
  console.error("Run through supabase/tests/shift_quests/run-local.sh");
  process.exit(2);
}
for (const url of [adminUrl, botUrl]) {
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)) {
    console.error("Refusing a non-local database");
    process.exit(2);
  }
}

const GUILD = "700000000000000011";
const PILOT_ROLE = "710000000000000011";
const CELEBRATE = "720000000000000011";
const ADMIN = "810000000000000001";
const MENTOR = "810000000000000002";
const STUDENT = "810000000000000003";
const FRIEND = "810000000000000004";
const THIRD = "810000000000000005";
const FOURTH = "810000000000000006";

let failures = 0;
let passes = 0;
/** The latest reply, shown when a failed check names no detail of its own. */
let lastContent: string | undefined;
function check(ok: boolean, name: string, detail?: unknown): void {
  if (ok) passes += 1;
  else failures += 1;
  if (!ok && detail === undefined) detail = lastContent;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${ok || detail === undefined ? "" : ` :: ${JSON.stringify(detail).slice(0, 600)}`}`);
}

type Component = CardComponent;

interface File {
  name: string;
  data: Buffer;
}

interface Response {
  type: "reply" | "update" | "modal" | "followUp" | "editReply";
  content: string;
  components: Component[];
  modal?: { custom_id: string; fields: string[]; values: Record<string, string | undefined> };
  files: File[];
  flags?: number;
}

function files(payload: { files?: any[] }): File[] {
  return (payload.files ?? []).map((f) => ({ name: f.name ?? "", data: f.attachment as Buffer }));
}

type Kind = "command" | "button" | "select" | "modal";

interface FakeOptions {
  user: string;
  name: string;
  roles?: string[];
  command?: string;
  sub?: string;
  options?: Record<string, unknown>;
  customId?: string;
  values?: string[];
  fields?: Record<string, string | string[]>;
  /** The interaction ID (a modal resubmit reuses it). */
  id?: string;
}

const responses: Response[] = [];
/** Flags of every deferReply: /island acknowledges before rendering. */
const deferFlags: number[] = [];

function fake(kind: Kind, o: FakeOptions) {
  const state = { replied: false, deferred: false };
  const record = (type: Response["type"]) => async (payload: any) => {
    responses.push({
      type,
      ...readCard(payload),
      files: files(payload),
      flags: payload.flags,
    });
    state.replied = true;
  };
  const opt = (name: string) => o.options?.[name] ?? null;
  const i: any = {
    id: o.id ?? String(randomInt(1e9, 9e9)) + String(randomInt(1e9, 9e9)),
    inGuild: () => true,
    guildId: GUILD,
    user: { id: o.user, username: o.name, globalName: o.name },
    member: { roles: o.roles ?? [PILOT_ROLE], nick: o.name },
    get replied() {
      return state.replied;
    },
    get deferred() {
      return state.deferred;
    },
    isAutocomplete: () => false,
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button" || kind === "select",
    isModalSubmit: () => kind === "modal",
    isButton: () => kind === "button",
    isStringSelectMenu: () => kind === "select",
    commandName: o.command,
    customId: o.customId,
    values: o.values ?? [],
    options: {
      getSubcommand: () => o.sub ?? null,
      getString: (n: string) => opt(n) as string | null,
      getBoolean: (n: string) => opt(n) as boolean | null,
      getInteger: (n: string) => opt(n) as number | null,
      getUser: (n: string) => (opt(n) ? { id: opt(n), username: "u", globalName: "U" } : null),
      getMember: (n: string) => (opt(n) ? { displayName: "Member" } : null),
      getRole: (n: string) => (opt(n) ? { id: opt(n) } : null),
      getChannel: (n: string) => (opt(n) ? { id: opt(n) } : null),
    },
    fields: {
      getTextInputValue: (id: string) => {
        const v = o.fields?.[id];
        if (v === undefined) throw new Error("no field");
        return v as string;
      },
      getStringSelectValues: (id: string) => (o.fields?.[id] as string[]) ?? [],
      getSelectedUsers: (id: string) => new Map(((o.fields?.[id] as string[]) ?? []).map((u) => [u, { id: u }])),
    },
    deferReply: async (payload: any) => {
      deferFlags.push(payload?.flags ?? 0);
      state.deferred = true;
    },
    deferUpdate: async () => {
      state.deferred = true;
    },
    reply: record("reply"),
    update: record("update"),
    followUp: record("followUp"),
    editReply: record("editReply"),
    showModal: async (m: any) => {
      const json = m.toJSON();
      responses.push({
        type: "modal",
        content: json.title,
        components: [],
        modal: {
          custom_id: json.custom_id,
          fields: json.components.map((c: any) => c.component?.custom_id),
          values: Object.fromEntries(json.components.map((c: any) => [c.component?.custom_id, c.component?.value])),
        },
        files: [],
      });
      state.replied = true;
    },
  };
  return i;
}

async function run(kind: Kind, o: FakeOptions): Promise<Response> {
  const before = responses.length;
  await handleInteraction(api, GUILD, fake(kind, o));
  const r = responses[responses.length - 1];
  if (responses.length === before) throw new Error(`no response to ${o.command ?? ""} ${o.sub ?? ""} ${o.customId ?? ""}`);
  const generic = responses.slice(before).find((x) => x.content.includes(T.generic.slice(0, 20)));
  if (generic) throw new Error(`generic error from ${o.command ?? ""} ${o.sub ?? ""} ${o.customId ?? ""}`);
  lastContent = r.content;
  return r;
}

function find(r: Response, pred: (c: Component) => boolean): Component {
  const c = r.components.find(pred);
  if (!c) throw new Error(`component not found in ${JSON.stringify(r.components.map((x) => x.custom_id))}`);
  return c;
}

/** /start, then ข้าม to the story's last page, where the start button is. */
async function startCard(who: FakeOptions): Promise<Response> {
  const intro = await run("command", { ...who, command: "start" });
  return run("button", { ...who, customId: find(intro, (c) => c.label === T.storySkip).custom_id });
}

const has = (r: Response, id: string) => r.components.some((c) => c.custom_id === id);
/** A refusal: the error's words first, then the reference line every error reply ends with. */
const refused = (r: Response, text: string) => r.content.startsWith(text) && /\n-# อ้างอิง [A-Z2-9]{6}$/.test(r.content);
/** A "not yet" (a gate or an expected state): its own title and the words, no error reference. */
const notYet = (r: Response, text: string) => r.content === `### ${T.notYetTitle}\n${text}`;
const ids = (r: Response) => r.components.map((c) => c.custom_id);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isPng = (f: File | undefined) => Boolean(f && Buffer.isBuffer(f.data) && f.data.subarray(0, 8).equals(PNG_MAGIC));
const hash = (f: File | undefined) => (f ? createHash("sha256").update(f.data).digest("hex") : "");

const pool = createRolePool(botUrl, "test");
const api = createQuestApi(pool);

interface Plot {
  slot: number;
  stage: number;
  visitor: boolean;
  helper: boolean;
  name: string | null;
  mine: boolean;
  plain: boolean;
}

async function main(): Promise<void> {
  const db = new Client({ connectionString: adminUrl }); // superuser: fixtures and inspection only
  await db.connect();
  const scalar = async <X = any>(sql: string, args: unknown[] = []): Promise<X> =>
    Object.values((await db.query(sql, args)).rows[0])[0] as X;
  /** A Bangkok calendar day relative to today, as YYYY-MM-DD. */
  const day = (offset: number) =>
    scalar<string>("select ((now() at time zone 'Asia/Bangkok')::date + $1::int)::text", [offset]);
  // The weekly post's view: every plot as an outsider sees it (the island map itself refuses a null caller).
  const publicMap = () => api.call<{ plots: Plot[]; season: unknown }>("shift_quest_island_post_map");
  const mapOf = (user: string) => api.call<{ plots: Plot[] }>("shift_quest_island_map", user);

  // --- The bot's startup check: it refuses a database older than itself -------
  check((await checkQuestSchema(api)) >= REQUIRED_SCHEMA, "the startup check accepts this database", REQUIRED_SCHEMA);
  const wave1 = (await db.query("select 1 from pg_database where datname = 'wave1'")).rowCount === 1;
  if (wave1) {
    const url = new URL(botUrl);
    url.pathname = "/wave1";
    const oldPool = createRolePool(url.toString(), "test-wave1");
    const message = await checkQuestSchema(createQuestApi(oldPool)).then(
      () => "",
      (error: Error) => error.message
    );
    await oldPool.end();
    check(
      message.includes(`needs quest database schema ${REQUIRED_SCHEMA}, but the database has 1`) && message.includes("20261111090800"),
      "the startup check refuses wave 1 alone with a clear message",
      message
    );
  }

  await db.query("select public.shift_quest_bootstrap_admin($1, 'Admin')", [ADMIN]);

  const A = { user: ADMIN, name: "Admin", roles: [] };
  const M = { user: MENTOR, name: "Mentor", roles: [] };
  const S = { user: STUDENT, name: "Student Sorn" };
  const F = { user: FRIEND, name: "Friend Fah" };
  const island = (who: FakeOptions) => run("command", { ...who, command: "island" });
  /** The season details behind the island card's ℹ️ button. */
  const seasonOf = (who: FakeOptions) => run("button", { ...who, customId: "sq|is_season" });

  await run("command", { ...A, command: "admin", sub: "student-role", options: { action: "add", role: PILOT_ROLE } });
  await run("command", { ...A, command: "admin", sub: "role", options: { user: MENTOR, role: "reviewer", action: "grant" } });

  // --- /start, then an island with no plot ------------------------------------
  let r = await island(S);
  check(notYet(r, T.notStarted), "/island before /start asks for /start", r.content);

  r = await startCard(S);
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.startButton).custom_id });
  check(r.content.startsWith(`### ${T.startedTitle}\n${T.started}`) && has(r, "sq|nav|island"), "start onboards and offers the island", { content: r.content, ids: ids(r) });

  r = await run("button", { ...S, customId: "sq|nav|island" });
  check(r.type === "editReply" && r.content.includes(I.noPlot), "the island button replaces the message with the island", r);
  check(isPng(r.files[0]) && r.files[0].name === "shift-island.png", "the island view carries the picture", r.files.map((f) => f.name));

  r = await island(S);
  check(r.type === "editReply" && deferFlags.at(-1) === 64, "/island is acknowledged privately before rendering", { type: r.type, deferFlags });
  check(r.content.includes(I.noPlot), "no plot yet", r.content);
  // The old quest form never grew a tree from here (review finding 14): claim, or read how it works.
  check(has(r, "sq|is_claim") && has(r, "sq|is_how") && !has(r, "sq|browse") && !has(r, "sq|is_tap"), "no plot: claim and how-it-works only", ids(r));
  check(r.files.length === 1 && isPng(r.files[0]), "no plot: the picture is still attached");
  r = await run("button", { ...S, customId: "sq|is_how" });
  check(r.content.startsWith(`### ${I.btnHow}\n${I.how}`) && has(r, "sq|is_claim"), "how the island works, with the claim button", r.content);

  // --- Claim a plot (create the project) --------------------------------------
  r = await run("button", { ...S, customId: "sq|is_claim" });
  check(r.type === "modal" && r.modal!.custom_id === "sq|proj_new", "claim opens the new-project modal", r.modal);
  r = await run("modal", {
    ...S,
    customId: r.modal!.custom_id,
    fields: { name: "Trip Splitter", route: ["software"], ambition: "Split trip costs fairly" },
  });
  check(r.content.startsWith(`### ${T.projectCreatedTitle}\n${T.projectCreated("Trip Splitter")}`), "project created from the island", r.content);

  r = await island(S);
  check(r.content.includes(I.plot(1, 0, "Trip Splitter")), "the plot shows on /island", r.content);
  check(r.files.length === 1 && isPng(r.files[0]), "the island image is attached", r.files.map((f) => f.name));
  const projectId = find(r, (c) => c.custom_id.startsWith("sq|is_name|")).custom_id.split("|")[2];
  check(
    ["sq|is_tap", "sq|is_ms", "sq|is_stuck", "sq|is_rest|on", "sq|is_work", `sq|is_name|${projectId}|off`].every((id) => has(r, id)) &&
      !has(r, "sq|is_claim"),
    "with a plot: tap, milestone, stuck, rest, work and a hide-name button (names show by default)",
    ids(r)
  );
  const firstView = await api.call<{ milestones: { milestone: number; title: string }[] }>("shift_quest_island", STUDENT);
  const title = (n: number) => firstView.milestones.find((m) => m.milestone === n)!.title;
  check(r.content.includes(title(1)), "the next milestone is suggested", r.content);

  // A teammate joins before anything is approved.
  r = await startCard(F);
  await run("button", { ...F, customId: find(r, (c) => c.label === T.startButton).custom_id });
  r = await run("command", { ...S, command: "project", sub: "invite", options: { user: FRIEND } });
  r = await run("command", { ...F, command: "inbox" });
  r = await run("button", { ...F, customId: find(r, (c) => c.custom_id === `sq|invite|${projectId}|y`).custom_id });
  check(r.content === `✅ ${T.projectJoined}`, "teammate accepts the project invite");
  r = await island(F);
  check(r.content.includes("Trip Splitter") && r.content.includes("แปลง #1"), "the teammate sees the same plot", r.content);

  // --- One tap a day, and a private note ---------------------------------------
  r = await run("button", { ...S, customId: "sq|is_tap" });
  check(r.content === `### ${I.tappedTitle}\n${I.tapped}` && has(r, "sq|is_note") && has(r, "sq|is_view"), "first tap is logged", r);
  r = await run("button", { ...S, customId: "sq|is_tap" });
  check(r.content === `### ${I.tapAgainTitle}\n${I.tapAgain}`, "second tap today says it is already logged", r.content);
  const taps = Number(
    await scalar(
      `select count(*) from public.shift_quest_progress p join public.shift_quest_members m on m.id = p.member_id
       where m.discord_user_id = $1 and p.kind = 'tap'`,
      [STUDENT]
    )
  );
  check(taps === 1, "two taps store one check-in", taps);
  r = await island(S);
  check(r.content.includes(I.tappedToday), "/island remembers today's tap", r.content);

  r = await run("button", { ...S, customId: "sq|is_note" });
  check(r.type === "modal" && r.modal!.custom_id === "sq|is_note" && r.modal!.fields.includes("note"), "note button opens a modal", r.modal);
  r = await run("modal", { ...S, customId: "sq|is_note", fields: { note: "Sketched the totals screen" } });
  check(r.content === `### ${I.noteSavedTitle}\n-# ${I.noteSaved}`, "note saved", r.content);
  const note = await db.query(
    `select p.changed, p.visibility from public.shift_quest_progress p join public.shift_quest_members m on m.id = p.member_id
     where m.discord_user_id = $1 and p.kind = 'note'`,
    [STUDENT]
  );
  check(note.rows.length === 1 && note.rows[0].changed === "Sketched the totals screen" && note.rows[0].visibility === "private", "the note is private", note.rows);

  // --- Admin: a season, then an unlock from the button's modal ----------------
  r = await run("command", {
    ...A,
    command: "admin",
    sub: "season",
    options: {
      name: "Season 1",
      starts: await day(-1),
      ends: await day(30),
      demo_day: await day(20),
      table_bar: 1,
      stage_bar: 2,
      goal_milestone: 1,
      goal_target: 3,
      goal_deadline: await day(25),
      goal_unlock: "Pizza night",
      activate: true,
    },
  });
  check(r.content.includes("### 🎪 Season 1\nactive ·") && r.content.includes("**0**/3"), "season created and active", r.content);
  const unlockButton = find(r, (c) => c.custom_id.startsWith("sq|ad_unlock|")).custom_id;
  r = await run("command", { ...A, command: "admin", sub: "season", options: { name: "Season 1", starts: "2026-13-01", ends: await day(30), demo_day: await day(20) } });
  check(refused(r, errorText("bad_date")), "a malformed season date is refused clearly", r.content);
  r = await run("command", { ...S, command: "admin", sub: "season", options: { name: "x", starts: await day(0), ends: await day(1), demo_day: await day(1) } });
  check(notYet(r, T.staffOnly), "students cannot set a season", r.content);
  r = await run("command", { ...A, command: "admin", sub: "season", options: { name: "Season 2", demo_day: await day(5) } });
  check(refused(r, errorText("bad_dates")), "a new season needs all three dates", r.content);

  r = await run("button", { ...A, customId: unlockButton });
  check(r.type === "modal" && ["label", "count", "deadline", "rule"].every((f) => r.modal!.fields.includes(f)), "unlock button opens its modal", r.modal);
  const unlockModal = r.modal!.custom_id;
  r = await run("modal", { ...A, customId: unlockModal, fields: { label: "สติกเกอร์ SHIFT High", count: "๑", deadline: await day(20), rule: "" } });
  check(refused(r, errorText("bad_input")), "a count that is not a digit 1 to 7 is refused clearly", r.content);
  r = await run("modal", { ...A, customId: unlockModal, fields: { label: "สติกเกอร์ SHIFT High", count: "1", deadline: await day(20), rule: "" } });
  check(r.content.startsWith("### ✅ เพิ่มของปลดล็อกแล้ว\n"), "unlock added", r.content);
  // Re-running with the name only changes nothing (review finding 5): the goal and the bars stay.
  r = await run("command", { ...A, command: "admin", sub: "season", options: { name: "Season 1" } });
  check(r.content.includes("🎁 สติกเกอร์ SHIFT High: ครบ 1 ขั้น") && r.content.includes("ได้แล้ว **0** คน"), "the admin view lists the unlock with a count only", r.content);
  check(
    r.content.includes("\nactive ·") && r.content.includes("โต๊ะโชว์งาน **1** ขั้น") && r.content.includes("ขึ้นเวที **2** ขั้น") &&
      r.content.includes("**0**/3") && r.content.includes("Pizza night") && has(r, unlockButton),
    "a name-only re-run keeps the goal, the bars and the unlock button",
    r.content
  );

  r = await island(S);
  check(
    r.content.includes("🎪 **Season 1**") && r.content.includes("อีก 1 ขั้น ได้โต๊ะโชว์งาน") && has(r, "sq|is_season"),
    "the island card shows the season's headline, the bar and a details button",
    r.content
  );
  r = await seasonOf(S);
  check(
    r.content.startsWith("### 🎪 Season 1\n") && r.content.includes("🎁 ครบ 1 ขั้นก่อน") && r.content.includes("🎯 ทั้งเกาะ: 0/3"),
    "the season details show the unlock and the island goal",
    r.content
  );

  // --- 🌟 Milestone 1: pick, prove, mentor approves, the tree grows ----------
  r = await run("button", { ...S, customId: "sq|is_ms" });
  const picker = find(r, (c) => c.custom_id === "sq|is_mspick");
  check(picker.options!.length === 7 && picker.options![0].value === "1", "the milestone picker lists the seven, next first", picker.options);
  r = await run("select", { ...S, customId: "sq|is_mspick", values: ["1"] });
  check(
    // Proof once (a link or a line) plus the portfolio question; milestone 1's long criteria sit above them as text.
    r.type === "modal" && r.modal!.custom_id === "sq|is_msgo|1" && ["proof", "note"].every((f) => r.modal!.fields.includes(f)) &&
      !r.modal!.fields.includes("link"),
    "picking a milestone opens the proof modal",
    r.modal
  );
  r = await run("modal", {
    ...S,
    customId: "sq|is_msgo|1",
    fields: { proof: "Asked 5 classmates how they split trip costs", note: "Nobody likes chasing friends for money" },
  });
  check(r.content.startsWith(`### ${I.sentTitle}\n${I.sent}`) && has(r, "sq|is_view"), "milestone sent for a visit", r);

  r = await island(S);
  check(r.content.includes(I.inFlight(title(1), STATE.submitted)), "/island shows the milestone waiting", r.content);
  const beforeApproval = hash(r.files[0]);
  const slot = (await publicMap()).plots.find((p) => p.slot === 1);
  check(slot?.stage === 0, "the shared map shows an empty plot before approval", slot);

  r = await run("command", { ...M, command: "review", sub: "queue" });
  const queue = find(r, (c) => c.custom_id === "sq|rv_sub").options!;
  check(queue.length === 1 && queue[0].label.includes(title(1)), "the mentor sees the milestone in the queue", queue);
  r = await run("select", { ...M, customId: "sq|rv_sub", values: [queue[0].value] });
  check(r.content.includes("Asked 5 classmates") && r.content.includes("Nobody likes chasing"), "the mentor sees proof and portfolio note", r.content);
  r = await run("button", { ...M, customId: find(r, (c) => c.label === "อนุมัติ").custom_id });
  r = await run("modal", { ...M, customId: r.modal!.custom_id, fields: { feedback: "Real conversations, a clear choice" } });
  check(r.content.startsWith("### ✅ บันทึกแล้ว: อนุมัติ\n"), "mentor approves", r.content);

  r = await island(S);
  check(r.content.includes(I.plot(1, 1, "Trip Splitter")), "/island shows stage 1", r.content);
  check(r.files.length === 1 && isPng(r.files[0]) && hash(r.files[0]) !== beforeApproval, "the picture changes: the tree grew", { beforeApproval, after: hash(r.files[0]) });
  const islandCard = r;
  r = await seasonOf(S);
  check(r.content.includes("🎁 ปลดล็อกแล้ว: สติกเกอร์ SHIFT High"), "the student sees the unlock earned", r.content);
  check(r.content.includes("🎯 ทั้งเกาะ: 1/3"), "the island goal counts the project", r.content);
  r = islandCard;
  // A gallery table needs milestone 2 among the counted ones, whatever the bar (review finding 9).
  check(
    r.content.includes(`อีก 1 ขั้น ได้โต๊ะโชว์งานใน Demo Day (ต้องมีขั้น "${title(2)}" ด้วย)`) && !r.content.includes("✅ ได้โต๊ะ"),
    "one counted milestone meets the bar of 1, but a table also needs milestone 2",
    r.content
  );
  check(r.content.includes(title(2)) && !r.content.includes(I.inFlight(title(1), STATE.submitted)), "the next milestone moves on", r.content);
  // Names show by default: outsiders and the weekly post see the real stage and the name with nobody opting in.
  const shownByDefault = (await publicMap()).plots.find((p) => p.slot === 1);
  check(shownByDefault?.stage === 1 && shownByDefault.plain === false && shownByDefault.name === "Trip Splitter" && !shownByDefault.mine,
    "the shared map shows the name by default", shownByDefault);
  const own = (await mapOf(STUDENT)).plots.find((p) => p.slot === 1);
  check(own?.stage === 1 && own.mine && !own.plain, "the student's own map shows the seed", own);
  const outsider = (await mapOf(ADMIN)).plots.find((p) => p.slot === 1);
  check(outsider?.stage === 1 && !outsider.plain && outsider.name === "Trip Splitter" && !outsider.mine,
    "someone outside the project sees the name by default", outsider);
  // An explicit hide gives the plain slot (review findings 1, 3), and showing again brings it back.
  r = await run("button", { ...S, customId: `sq|is_name|${projectId}|off` });
  check(r.content === `### ${I.nameHiddenTitle}\n${I.nameHidden}`, "hiding the name from the first card", r.content);
  const plain = (await publicMap()).plots.find((p) => p.slot === 1);
  check(plain?.stage === 0 && plain.plain === true && plain.name === null && !plain.mine, "the shared map shows a plain slot after a hide", plain);
  const outsiderPlain = (await mapOf(ADMIN)).plots.find((p) => p.slot === 1);
  check(outsiderPlain?.stage === 0 && outsiderPlain.plain && !outsiderPlain.mine, "someone outside the project sees a plain slot after a hide", outsiderPlain);
  r = await run("button", { ...S, customId: `sq|is_name|${projectId}|on` });
  check(r.content === `### ${I.nameShown}`, "showing it again", r.content);
  const nullCaller = await api.call("shift_quest_island_map", null).then(
    () => "allowed",
    (error) => (error instanceof QuestError ? error.code : String(error))
  );
  check(nullCaller === "not_started", "the island map refuses a null caller", nullCaller);
  r = await island(F);
  const friendSeason = await seasonOf(F);
  check(
    r.content.includes(I.plot(1, 1, "Trip Splitter")) && friendSeason.content.includes("🎁 ปลดล็อกแล้ว: สติกเกอร์ SHIFT High"),
    "the teammate's tree grew and earned the unlock too",
    { island: r.content, season: friendSeason.content }
  );
  r = await run("command", { ...S, command: "inbox" });
  check(r.content.includes("ผ่านแล้ว") && r.content.includes("ได้ **สติกเกอร์ SHIFT High**"), "the inbox tells the approval and the unlock", r.content);

  // --- Milestone 2 asks for more; 🌙 rest pauses it, ☀️ wakes it -------------
  r = await run("select", { ...S, customId: "sq|is_mspick", values: ["2"] });
  r = await run("modal", {
    ...S,
    customId: r.modal!.custom_id,
    fields: { proof: "A paper prototype of the totals page", note: "I can now sketch a flow before coding", link: "https://example.org/proto" },
  });
  check(r.content.startsWith(`### ${I.sentTitle}\n${I.sent}`), "milestone 2 sent");
  // Sent, not seen by a mentor yet: the table rests on it, and /island says it waits for the mentor.
  r = await island(S);
  check(r.content.includes(PENDING_SLOT.table) && !r.content.includes("✅ ได้โต๊ะ"), "a slot that needs pending work says it waits for the mentor", r.content);
  r = await run("command", { ...M, command: "review", sub: "queue" });
  r = await run("select", { ...M, customId: "sq|rv_sub", values: [find(r, (c) => c.custom_id === "sq|rv_sub").options![0].value] });
  r = await run("button", { ...M, customId: find(r, (c) => c.label === "ขอข้อมูลเพิ่ม").custom_id });
  r = await run("modal", { ...M, customId: r.modal!.custom_id, fields: { feedback: "Show one person trying it" } });
  check(r.content.startsWith("### ✅ บันทึกแล้ว: ขอข้อมูลเพิ่ม\n"), "mentor asks for more on milestone 2", r.content);
  r = await island(S);
  check(r.content.includes(I.inFlight(title(2), STATE.clarification)) && has(r, "sq|is_rest|on"), "/island shows the question and offers rest", r.content);

  // The project has one open quest per milestone: the teammate sees who holds it and cannot open a second.
  r = await island(F);
  check(r.content.includes(I.inFlightHeld(title(2), STATE.clarification, "Student Sorn")), "the teammate sees who holds milestone 2", r.content);
  r = await run("button", { ...F, customId: "sq|is_ms" });
  const friendPicker = find(r, (c) => c.custom_id === "sq|is_mspick");
  check(
    !friendPicker.options!.some((o) => o.value === "2") && friendPicker.options!.some((o) => o.value === "3") && r.content.includes(I.heldBy("Student Sorn")),
    "the teammate's picker leaves out the milestone someone else holds",
    { options: friendPicker.options, content: r.content }
  );
  r = await run("select", { ...F, customId: "sq|is_mspick", values: ["2"] });
  check(refused(r, errorText("milestone_open")), "an old picker cannot open the held milestone's form", r.content);
  r = await run("modal", { ...F, customId: "sq|is_msgo|2", fields: { proof: "A second prototype", note: "n" } });
  check(refused(r, errorText("milestone_open")), "the database refuses a second open quest for the milestone", r.content);
  const openTwo = Number(
    await scalar("select count(*) from public.shift_quest_instances where milestone = 2 and state not in ('approved', 'declined', 'archived')")
  );
  check(openTwo === 1, "still one open quest for milestone 2", openTwo);

  r = await run("button", { ...S, customId: "sq|is_rest|on" });
  check(r.content === `### ${I.restedTitle}\n${I.rested(1)}`, "rest pauses the open milestone", r.content);
  r = await island(S);
  check(r.content.includes(I.resting) && has(r, "sq|is_rest|off") && !has(r, "sq|is_rest|on"), "/island shows resting and a wake button", { content: r.content, ids: ids(r) });
  check(r.content.includes(I.plot(1, 1, "Trip Splitter")), "resting never lowers the tree", r.content);
  r = await run("button", { ...S, customId: "sq|is_rest|off" });
  check(r.content === `### ${I.wokeTitle}\n${I.woke(1)}`, "wake resumes it", r.content);
  r = await island(S);
  check(!r.content.includes(I.resting) && has(r, "sq|is_rest|on"), "awake again", r.content);
  r = await run("button", { ...S, customId: "sq|is_work" });
  check(r.content.includes(title(2)) && has(r, "sq|q"), "the work button lists the open milestone", r);

  r = await run("button", { ...S, customId: "sq|is_stuck" });
  check(r.type === "modal" && r.modal!.fields.includes("summary"), "stuck opens the help modal", r.modal);
  r = await run("modal", { ...S, customId: r.modal!.custom_id, fields: { summary: "How do I find testers?", visibility: ["mentors"] } });
  check(r.content === `### ${T.helpSentTitle}\n${T.helpSent(false)}`, "help goes to the mentors' group queue", r.content);

  // Milestone 2 answered and approved: a table now, and the stage needs milestone 3.
  r = await run("select", { ...S, customId: "sq|is_mspick", values: ["2"] });
  r = await run("modal", {
    ...S,
    customId: r.modal!.custom_id,
    fields: { proof: "Two classmates tried the paper prototype", note: "Watching someone use it beats guessing" },
  });
  check(r.content.startsWith(`### ${I.sentTitle}\n${I.sent}`), "the answer to the question is sent", r.content);
  r = await run("command", { ...M, command: "review", sub: "queue" });
  r = await run("select", { ...M, customId: "sq|rv_sub", values: [find(r, (c) => c.custom_id === "sq|rv_sub").options![0].value] });
  r = await run("button", { ...M, customId: find(r, (c) => c.label === "อนุมัติ").custom_id });
  r = await run("modal", { ...M, customId: r.modal!.custom_id, fields: { feedback: "It works on paper" } });
  check(r.content.startsWith("### ✅ บันทึกแล้ว: อนุมัติ\n"), "mentor approves milestone 2", r.content);
  r = await island(S);
  check(
    r.content.includes(I.plot(1, 2, "Trip Splitter")) && r.content.includes(`✅ ได้โต๊ะโชว์งานแล้ว อีก 1 ขั้นได้ขึ้นเวที (ต้องมีขั้น "${title(3)}" ด้วย)`),
    "milestone 2 gives a table; two counted meet the stage bar of 2, but a stage slot also needs milestone 3",
    r.content
  );

  // --- 🪧 Name on the island: shown by default, hidden when any teammate hides it ---------------
  r = await island(F);
  r = await run("button", { ...F, customId: find(r, (c) => c.custom_id === `sq|is_name|${projectId}|off`).custom_id });
  check(r.content === `### ${I.nameHiddenTitle}\n${I.nameHidden}`, "a teammate hides the name", r.content);
  check((await publicMap()).plots.find((p) => p.slot === 1)?.name === null, "the shared map has no name while one teammate hides it");
  r = await run("button", { ...S, customId: `sq|is_name|${projectId}|on` });
  check(r.content === `### ${I.nameWaitingTitle}\n${I.nameWaiting}`, "showing it waits for the teammate who hid it", r.content);
  check((await publicMap()).plots.find((p) => p.slot === 1)?.name === null, "still no name with one teammate hiding");
  r = await island(F);
  r = await run("button", { ...F, customId: find(r, (c) => c.custom_id === `sq|is_name|${projectId}|on`).custom_id });
  check(r.content === `### ${I.nameShown}`, "the teammate shows it again: the name shows", r.content);
  const named = await publicMap();
  const namedPlot = named.plots.find((p) => p.slot === 1);
  check(
    namedPlot?.name === "Trip Splitter" && namedPlot.stage === 2 && !namedPlot.plain && !namedPlot.mine,
    "the shared map shows the name and the real tree once both show it",
    named.plots
  );
  const mapJson = JSON.stringify(named);
  check(![STUDENT, FRIEND, "Student Sorn", "Friend Fah"].some((x) => mapJson.includes(x)), "the shared map carries no identity", mapJson);
  r = await island(S);
  check(r.content.includes(`${I.signs} #1 Trip Splitter`) && has(r, `sq|is_name|${projectId}|off`), "/island lists the sign and offers to hide it", r.content);

  // --- Squads: off until an admin switches them on; then new, invite, accept, view --
  r = await run("command", { ...S, command: "squad", sub: "view" });
  check(notYet(r, SQ.notOpen), "/squad answers not open yet while squads are off", r.content);
  r = await run("command", { ...S, command: "squad", sub: "new", options: { name: "Too Early", target: "x" } });
  check(notYet(r, SQ.notOpen), "and starts nothing", r.content);
  check(Number(await scalar("select count(*) from public.shift_quest_squads")) === 0, "no squad was made while off");
  r = await run("command", { ...A, command: "admin", sub: "feature", options: { name: "squads", state: "on" } });
  check(r.content.includes("สควอด: เปิด"), "an admin switches squads on, with nothing to publish first", r.content);
  const squadNew = (questCommands().find((c) => c.name === "squad")!.options as any[]).find((o) => o.name === "new");
  check(squadNew.options.find((o: any) => o.name === "target")?.required === true, "/squad new requires the target the database requires", squadNew.options);
  r = await run("command", { ...S, command: "squad", sub: "new", options: { name: "No Target" } });
  check(refused(r, errorText("missing_text")), "a squad without a target is refused clearly", r.content);
  // Squads are for students: staff are told so before anything else (safeguarding, review findings 4 and 10).
  r = await run("command", { ...M, command: "squad", sub: "view" });
  check(notYet(r, errorText("staff_no_squad")), "staff cannot open squads", r.content);
  r = await run("command", { ...M, command: "squad", sub: "new", options: { name: "Mentor Pod", target: "x" } });
  check(notYet(r, errorText("staff_no_squad")), "staff cannot start a squad", r.content);
  r = await run("command", { ...S, command: "squad", sub: "new", options: { name: "Sprint Crew", target: "Ship the totals screen", days: 7 } });
  check(r.content.startsWith(`### ${SQ.createdTitle}\n${SQ.created}`), "squad created", r.content);
  const squadId = find(r, (c) => c.custom_id.startsWith("sq|squad_view|")).custom_id.split("|")[2];
  r = await run("command", { ...S, command: "squad", sub: "invite", options: { user: FRIEND } });
  check(r.content.startsWith(`### 📨 ส่งคำชวนแล้ว\n${SQ.invited(`<@${FRIEND}>`)}`), "teammate invited to the squad", r.content);
  r = await run("command", { ...F, command: "inbox" });
  check(r.content.includes("Sprint Crew") && has(r, `sq|squad_rsvp|${squadId}|y`), "the squad invite shows in the inbox", r);
  r = await run("button", { ...F, customId: `sq|squad_rsvp|${squadId}|y` });
  check(
    r.content.includes("Sprint Crew") && r.content.includes("Ship the totals screen") && r.content.includes("Friend Fah (คุณ)") &&
      r.content.includes("Student Sorn") && r.content.includes(SQ.private),
    "accepting shows the squad, private to its members",
    r.content
  );
  // Two members: the squad is still forming, so it shows who is in and no progress number.
  check(r.content.includes(SQ.forming(2)) && !r.content.includes(SQ.together(2)), "a squad of two is forming", r.content);
  check(!/\+\d+ ขั้น/.test(r.content), "members carry no numbers to compare", r.content);
  r = await run("command", { ...S, command: "squad", sub: "view" });
  check(r.content.includes("Student Sorn (คุณ)") && r.content.includes("Friend Fah") && has(r, `sq|squad_leave|${squadId}`), "/squad view shows the squad", r.content);
  r = await run("button", { ...S, customId: `sq|squad_view|${squadId}` });
  check(r.content.includes("Sprint Crew"), "the view button shows the squad", r.content);

  // A third student joins: the squad runs, with one group number that counts the shared project once.
  const Third = { user: THIRD, name: "Third Tan" };
  const Fourth = { user: FOURTH, name: "Fourth Fon" };
  for (const who of [Third, Fourth]) {
    r = await startCard(who);
    await run("button", { ...who, customId: find(r, (c) => c.label === T.startButton).custom_id });
  }
  r = await run("command", { ...S, command: "squad", sub: "invite", options: { user: THIRD } });
  r = await run("command", { ...Third, command: "squad", sub: "view" });
  check(r.content.includes("Sprint Crew") && r.content.includes("ตอบได้ถึง") && has(r, `sq|squad_rsvp|${squadId}|y`), "the invite shows until when it can be answered", r.content);
  r = await run("button", { ...Third, customId: `sq|squad_rsvp|${squadId}|y` });
  // Milestones 1 and 2 of Trip Splitter were submitted today; Sorn and Fah share it, so it counts 2, not 4.
  check(r.content.includes(SQ.together(2)) && r.content.includes("Third Tan (คุณ)") && !r.content.includes(SQ.forming(3)), "three members: the squad runs, each project counted once", r.content);
  check(!/\+\d+ ขั้น/.test(r.content), "a running squad still shows no per-member numbers", r.content);

  // Withdrawing an invite: only the member who sent it, and it leaves the invitee's inbox.
  r = await run("command", { ...S, command: "squad", sub: "invite", options: { user: FOURTH } });
  check(r.content.startsWith(`### 📨 ส่งคำชวนแล้ว\n${SQ.invited(`<@${FOURTH}>`)}`), "a fourth student invited", r.content);
  r = await run("command", { ...Fourth, command: "inbox" });
  check(r.content.includes("Sprint Crew") && has(r, `sq|squad_rsvp|${squadId}|y`), "the fourth student sees the invite", r.content);
  r = await run("command", { ...F, command: "squad", sub: "withdraw", options: { user: FOURTH } });
  check(refused(r, errorText("no_invite")), "only the member who sent an invite can withdraw it", r.content);
  r = await run("command", { ...S, command: "squad", sub: "withdraw", options: { user: FOURTH } });
  check(r.content === `### ${SQ.withdrawnTitle}\n${SQ.withdrawn(`<@${FOURTH}>`)}`, "the inviter withdraws the invite", r.content);
  r = await run("command", { ...Fourth, command: "inbox" });
  check(!r.content.includes("Sprint Crew") && !has(r, `sq|squad_rsvp|${squadId}|y`), "the withdrawn invite is gone from the inbox", r.content);
  r = await run("button", { ...Fourth, customId: `sq|squad_rsvp|${squadId}|y` });
  check(refused(r, errorText("no_invite")), "a withdrawn invite cannot be accepted", r.content);

  // A student cannot pull an adult in either.
  r = await startCard(M);
  await run("button", { ...M, customId: find(r, (c) => c.label === T.startButton).custom_id });
  r = await run("command", { ...S, command: "squad", sub: "invite", options: { user: MENTOR } });
  check(notYet(r, errorText("staff_no_squad")), "a mentor cannot be invited into a squad", r.content);
  r = await run("command", { ...M, command: "inbox" });
  check(!r.content.includes("Sprint Crew") && !r.components.some((c) => c.custom_id.startsWith("sq|squad_")), "staff see no squad in their inbox", r.content);

  // --- Admin recognition through its modal -------------------------------------
  const category = "บทเรียนดีที่สุดจากการทดสอบที่ล้ม"; // the command's own example
  r = await run("command", { ...A, command: "admin", sub: "recognize", options: { user: STUDENT, amount: 0, category } });
  check(
    r.type === "modal" && r.modal!.fields.includes("reason") && r.modal!.values.category === category,
    "recognize opens the reason modal with the whole category filled in",
    r.modal
  );
  const recogModal = r.modal!;
  const recogFields = { reason: "Turned a failed test into a clear next step", category: recogModal.values.category ?? "" };
  r = await run("modal", { ...A, customId: recogModal.custom_id, id: "991000000000000001", fields: recogFields });
  check(r.content === `### ✅ บันทึกแล้ว\n<@${STUDENT}> ได้รับแจ้งใน /inbox`, "recognition recorded", r.content);
  r = await run("modal", { ...A, customId: recogModal.custom_id, id: "991000000000000001", fields: recogFields });
  check(r.content === "### ✅ บันทึกไปแล้ว", "a resubmitted recognition is a no-op", r.content);
  const recog = await db.query("select category, amount, ledger_entry_id from public.shift_quest_recognitions");
  check(recog.rows.length === 1 && recog.rows[0].category === category && recog.rows[0].ledger_entry_id === null, "one recognition, full category, no coins", recog.rows);
  r = await run("command", { ...S, command: "inbox" });
  // The reason is what the admin was told the student sees (review findings 6 and 12).
  check(
    r.content.includes(`🌟 ทีมพี่เลี้ยงชื่นชมงานของคุณ (${category}): Turned a failed test into a clear next step`),
    "the student is told, with the category and the reason",
    r.content
  );
  r = await run("command", { ...A, command: "admin", sub: "recognize", options: { user: ADMIN, amount: 0 } });
  r = await run("modal", { ...A, customId: r.modal!.custom_id, fields: { reason: "Self praise", category: "" } });
  check(refused(r, errorText("conflict_of_interest")), "admins cannot recognize themselves", r.content);
  // One surprise recognition (no category) per member per season unless the admin raises it; categories have no count cap.
  const recognize = async (category: string, reason: string) => {
    const opened = await run("command", { ...A, command: "admin", sub: "recognize", options: { user: STUDENT, amount: 0 } });
    return run("modal", { ...A, customId: opened.modal!.custom_id, fields: { reason, category } });
  };
  const recorded = `### ✅ บันทึกแล้ว\n<@${STUDENT}> ได้รับแจ้งใน /inbox`;
  r = await recognize("", "Kept testing after a flop");
  check(r.content === recorded, "a surprise recognition recorded", r.content);
  r = await recognize("", "Kept testing, round 2");
  check(refused(r, errorText("recognition_cap")), "a second surprise in the season is refused clearly", r.content);
  r = await recognize("ช่วยเพื่อนมากที่สุด", "Helped two teams find testers");
  check(r.content === recorded, "a category award is not capped by count", r.content);
  r = await run("command", { ...A, command: "admin", sub: "season", options: { name: "Season 1", surprise_cap: 2 } });
  check(r.content.includes("คำชมแบบเซอร์ไพรส์: ได้ 2 ครั้ง"), "the admin raises the season's surprise cap", r.content);
  r = await recognize("", "Kept testing, round 2");
  check(r.content === recorded, "then a second surprise is recorded", r.content);

  // --- The weekly island post ----------------------------------------------------
  r = await run("command", { ...A, command: "admin", sub: "feature", options: { name: "sharing", state: "on" } });
  check(r.content.startsWith(errorText("config_incomplete")) && r.content.includes("/admin channel celebrate"), "sharing needs the celebrate channel first", r.content);
  r = await run("command", { ...A, command: "admin", sub: "channel", options: { kind: "celebrate", channel: CELEBRATE } });
  r = await run("command", { ...A, command: "admin", sub: "feature", options: { name: "sharing", state: "on" } });
  check(r.content.includes("แชร์สาธารณะ: เปิด"), "sharing on", r.content);

  const monday = "2026-11-09T18:30:00+07:00"; // a Monday, 18:30 in Bangkok
  check((await api.call<number>("shift_quest_enqueue_island_post", "2026-11-09T17:59:00+07:00")) === 0, "nothing queued before 18:00 Bangkok");
  check((await api.call<number>("shift_quest_enqueue_island_post", monday)) === 1, "the Monday 18:30 post is queued");
  check((await api.call<number>("shift_quest_enqueue_island_post", "2026-11-09T18:59:00+07:00")) === 0, "one post per week");
  const queued = await db.query("select params from public.shift_quest_outbox where kind = 'island_weekly'");
  check(
    queued.rows.length === 1 && !JSON.stringify(queued.rows[0].params).includes("Trip Splitter"),
    "the queued post holds counts only",
    queued.rows
  );

  const sent: { target: string; payload: any }[] = [];
  const isIslandPost = (payload: any) => readCard(payload).content.startsWith("### 🏝️");
  let nextMessage = 1;
  const fakeDiscord: any = {
    channels: {
      fetch: async (id: string) => ({
        isSendable: () => true,
        send: async (payload: any) => {
          sent.push({ target: `channel:${id}`, payload });
          return { id: `95000000000000000${nextMessage++}` };
        },
      }),
    },
    users: {
      fetch: async (id: string) => ({
        send: async (payload: any) => {
          sent.push({ target: `dm:${id}`, payload });
          return { id: `96000000000000000${nextMessage++}` };
        },
      }),
    },
  };
  // One delivery tick per pass, run by hand instead of on the 10-second timer.
  const realSetInterval = globalThis.setInterval;
  for (let pass = 0; pass < 5 && !sent.some((s) => isIslandPost(s.payload)); pass += 1) {
    let tick: (() => void) | null = null;
    (globalThis as any).setInterval = (fn: () => void) => {
      tick = fn;
      return realSetInterval(() => undefined, 2 ** 30);
    };
    const loop = startOutbox(fakeDiscord, api, () => true);
    globalThis.setInterval = realSetInterval;
    tick!();
    await loop.stop();
  }
  const post = sent.find((s) => isIslandPost(s.payload));
  const postText = post ? readCard(post.payload).content : "";
  check(post?.target === `channel:${CELEBRATE}`, "the island post goes to the celebrate channel", sent.map((s) => s.target));
  check(
    postText.includes("🎯 เป้าหมายของเกาะ") && postText.includes("**1**/3 โปรเจกต์") && postText.includes(`${I.signs} #1 Trip Splitter`),
    "the post has the goal count and the opt-in sign",
    postText
  );
  const attachment = post?.payload.files?.[0];
  check(
    post?.payload.files?.length === 1 && attachment?.name === "shift-island.png" && isPng({ name: attachment.name, data: attachment.attachment }),
    "the post carries the island picture",
    post?.payload.files?.map((f: any) => f.name)
  );
  check(
    Boolean(post) && !/Student Sorn|Friend Fah|<@/.test(postText) && post!.payload.allowedMentions?.parse?.length === 0 &&
      post!.payload.allowedMentions?.users?.length === 0,
    "the post names nobody and pings nobody",
    post?.payload
  );
  const delivered = await db.query("select status, discord_message_id from public.shift_quest_outbox where kind = 'island_weekly'");
  check(delivered.rows[0]?.status === "sent" && Boolean(delivered.rows[0]?.discord_message_id), "the outbox row is marked sent", delivered.rows);

  r = await run("button", { ...S, customId: `sq|is_name|${projectId}|off` });
  check(r.content === `### ${I.nameHiddenTitle}\n${I.nameHidden}`, "hiding the name", r.content);
  const hidden = (await publicMap()).plots.find((p) => p.slot === 1);
  check(hidden?.name === null && hidden.plain && hidden.stage === 0, "one hide takes the name and the tree down again", hidden);

  // --- Season edits: one change keeps the rest; clear_goal removes the goal ----------
  r = await run("command", { ...A, command: "admin", sub: "season", options: { name: "Season 1", goal_target: 5 } });
  check(r.content.includes("**1**/5") && r.content.includes("โต๊ะโชว์งาน **1** ขั้น") && r.content.includes("Pizza night"), "changing the target alone keeps the rest of the goal and the bars", r.content);
  r = await run("command", { ...A, command: "admin", sub: "season", options: { name: "Season 1", clear_goal: true, goal_target: 4 } });
  check(refused(r, errorText("bad_input")), "clear_goal with goal values is refused", r.content);
  r = await run("command", { ...A, command: "admin", sub: "season", options: { name: "Season 1", clear_goal: true } });
  check(r.content.includes("ยังไม่มีเป้าทั้งเกาะ") && r.content.includes("\nactive ·") && r.content.includes("ขึ้นเวที **2** ขั้น"), "clear_goal removes the goal only", r.content);
  r = await seasonOf(S);
  check(r.content.startsWith("### 🎪 Season 1\n") && !r.content.includes("🎯 ทั้งเกาะ"), "the season details no longer show a goal", r.content);

  // Every reply was private: a fresh reply or follow-up is ephemeral, and every
  // edit is of an ephemeral reply or of the private message it replaces.
  const fresh = responses.filter((x) => x.type === "reply" || x.type === "followUp");
  // Components V2 (32768) is set on every card as well; Ephemeral is 64.
  const ephemeral = (flags: number | undefined) => ((flags ?? 0) & 64) === 64;
  check(fresh.length > 0 && fresh.every((x) => ephemeral(x.flags)), "every reply is ephemeral", fresh.filter((x) => !ephemeral(x.flags)).map((x) => x.content.slice(0, 60)));
  check(deferFlags.length > 0 && deferFlags.every((f) => f === 64), "every deferred reply is ephemeral", deferFlags);

  await db.end();
  await pool.end();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  console.log(`\n${passes} passed, ${failures + 1} failed`);
  process.exit(1);
});
