/**
 * Drives the real bot handlers (bot/src/quests) with fake Discord
 * interactions against a disposable database, as shift_quest_bot. Catches
 * wiring between the TypeScript and the SQL functions: argument order,
 * types, custom IDs, modal fields. Run by run-local.sh after the SQL tests.
 */
import { randomInt } from "node:crypto";

import { Client } from "pg";

import { handleInteraction } from "../../../bot/src/quests";
import { createQuestApi } from "../../../bot/src/quests/api";
import { T } from "../../../bot/src/quests/copy";
import { createRolePool } from "../../../bot/src/pg";

import { readCard, type CardComponent } from "./cards";

const adminUrl = process.env.SHIFT_QUESTS_TEST_DATABASE_URL!;
const botUrl = process.env.SHIFT_QUESTS_BOT_DATABASE_URL!;
if (!adminUrl || !botUrl || process.env.SHIFT_QUESTS_TEST_DISPOSABLE !== "1") {
  console.error("Run through supabase/tests/shift_quests/run-local.sh");
  process.exit(2);
}

const GUILD = "700000000000000001";
const PILOT_ROLE = "710000000000000001";
const ADMIN = "800000000000000001";
const MENTOR = "800000000000000002";
const STUDENT = "800000000000000003";
const FRIEND = "800000000000000004";

let failures = 0;
let passes = 0;
/** The latest reply, shown when a failed check names no detail of its own. */
let lastContent: string | undefined;
function check(ok: boolean, name: string, detail?: unknown): void {
  if (ok) passes += 1;
  else failures += 1;
  if (!ok && detail === undefined) detail = lastContent;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${ok || detail === undefined ? "" : ` :: ${JSON.stringify(detail).slice(0, 400)}`}`);
}

type Component = CardComponent;

interface Response {
  type: "reply" | "update" | "modal" | "followUp" | "editReply";
  content: string;
  components: Component[];
  modal?: { custom_id: string; fields: string[] };
  files: number;
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
}

const responses: Response[] = [];

function fake(kind: Kind, o: FakeOptions) {
  const record = (type: Response["type"]) => async (payload: any) => {
    responses.push({
      type,
      ...readCard(payload),
      files: (payload.files ?? []).length,
    });
    state.replied = true;
  };
  const state = { replied: false, deferred: false };
  const opt = (name: string) => o.options?.[name] ?? null;
  const i: any = {
    id: String(randomInt(1e9, 9e9)) + String(randomInt(1e9, 9e9)),
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
        modal: { custom_id: json.custom_id, fields: json.components.map((c: any) => c.component?.custom_id) },
        files: 0,
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
  if (responses.length === before) throw new Error(`no response to ${o.command ?? o.customId}`);
  const generic = responses.slice(before).find((x) => x.content.includes(T.generic.slice(0, 20)));
  if (generic) throw new Error(`generic error from ${o.command ?? ""} ${o.sub ?? ""} ${o.customId ?? ""}`);
  lastContent = r.content;
  return r;
}

/** A "not yet" (a gate or an expected state): its own title and the words, no error reference. */
const notYet = (r: Response, text: string) => r.content === `### ${T.notYetTitle}\n${text}`;

function find(r: Response, pred: (c: Component) => boolean): Component {
  const c = r.components.find(pred);
  if (!c) throw new Error(`component not found in ${JSON.stringify(r.components.map((x) => x.custom_id))}`);
  return c;
}

const pool = createRolePool(botUrl, "test");
const api = createQuestApi(pool);

async function main(): Promise<void> {
  const db = new Client({ connectionString: adminUrl });
  await db.connect();
  await db.query("select public.shift_quest_bootstrap_admin($1, 'Admin')", [ADMIN]).catch(() =>
    db.query("update public.shift_quest_members set roles = array['admin'] where discord_user_id = $1", [ADMIN])
  );
  await db.query(
    "insert into public.shift_quest_members (discord_user_id, display_name, roles) values ($1, 'Admin', array['admin']) on conflict (discord_user_id) do update set roles = array['admin']",
    [ADMIN]
  );

  const A = { user: ADMIN, name: "Admin", roles: [] };
  const S = { user: STUDENT, name: "Student" };
  const F = { user: FRIEND, name: "Friend" };
  const M = { user: MENTOR, name: "Mentor", roles: [] };

  // Admin configures the pilot.
  let r = await run("command", { ...A, command: "admin", sub: "student-role", options: { action: "add", role: PILOT_ROLE } });
  check(r.content.includes(`<@&${PILOT_ROLE}>`), "admin sets the pilot role");
  await run("command", { ...A, command: "admin", sub: "role", options: { user: MENTOR, role: "reviewer", action: "grant" } });
  await run("command", { ...A, command: "admin", sub: "channel", options: { kind: "staff", channel: "720000000000000001" } });
  r = await run("command", { ...A, command: "admin", sub: "feature", options: { name: "awards", state: "on" } });
  check(r.content.includes("ยังเปิดไม่ได้") && r.content.includes("/admin terms"), "incomplete config is explained, not enabled", r.content);
  r = await run("command", { ...A, command: "admin", sub: "terms", options: { kind: "reward_terms" } });
  check(r.type === "modal", "terms open a modal");
  await run("modal", { ...A, customId: r.modal!.custom_id, fields: { text: "Coins for reviewed quests." } });
  r = await run("command", { ...A, command: "admin", sub: "rule", options: { key: "learn", amount: 5 } });
  await run("modal", { ...A, customId: r.modal!.custom_id, fields: { eligibility: "e", review: "r", reversal: "v" } });
  await run("command", { ...A, command: "admin", sub: "template-rule", options: { template: "make-it-exist", rule: "learn" } });
  r = await run("command", { ...A, command: "admin", sub: "feature", options: { name: "awards", state: "on" } });
  check(r.content.includes("✅ เหรียญ: เปิด ใช้งานอยู่"), "awards go live once configured", r.content);

  // A student outside the pilot is turned away before anything is stored.
  r = await run("command", { user: "800000000000000099", name: "Outsider", roles: ["1"], command: "start" });
  check(notYet(r, T.notEligible), "non-pilot students are turned away", r.content);

  // Join.
  r = await run("command", { ...S, command: "start" });
  check(r.content.includes("SHIFT High quests"), "start explains the program");
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.startButton).custom_id });
  check(r.content.startsWith(`### ${T.startedTitle}\n`), "start button onboards");
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.btnNewProject).custom_id });
  check(r.type === "modal", "new project opens a modal");
  r = await run("modal", { ...S, customId: r.modal!.custom_id, fields: { name: "Trip Splitter", route: ["software"], ambition: "x" } });
  check(r.content.includes("Trip Splitter"), "project created");

  // Friend joins the project by consent.
  await run("command", { ...F, command: "start" }).then((x) => run("button", { ...F, customId: x.components[0].custom_id }));
  r = await run("command", { ...S, command: "project", sub: "invite", options: { user: FRIEND } });
  r = await run("command", { ...F, command: "inbox" });
  r = await run("button", { ...F, customId: find(r, (c) => c.custom_id.startsWith("sq|invite|") && c.custom_id.endsWith("|y")).custom_id });
  check(r.content === `✅ ${T.projectJoined}`, "friend accepts the invite");

  // Choose a quest from the library.
  r = await run("command", { ...S, command: "quest", sub: "browse" });
  const pick = find(r, (c) => c.custom_id === "sq|tpl");
  const make = pick.options!.find((o) => o.label === "ทำให้มันมีอยู่จริง")!;
  r = await run("select", { ...S, customId: "sq|tpl", values: [make.value] });
  check(r.content.includes("5 Passioncoin"), "template shows the published reward", r.content);
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.btnChoose).custom_id });
  check(r.modal?.fields.includes("criteria") ?? false, "choose modal asks for criteria");
  r = await run("modal", { ...S, customId: r.modal!.custom_id, fields: { goal: "Split one trip", next: "Sketch", criteria: "A demo", date: "" } });
  check(r.content.includes("ทำให้มันมีอยู่จริง"), "quest chosen");

  // Progress: private first, then shared.
  r = await run("command", { ...S, command: "progress", sub: "add" });
  r = await run("modal", { ...S, customId: r.modal!.custom_id, fields: { changed: "Built the form", learned: "Forms", next: "Totals", blocker: "Deploy fails", link: "" } });
  check(r.content === `### ${T.progressSavedTitle}\n${T.progressSaved}`, "progress saved privately");
  const shareTeam = find(r, (c) => c.label === T.btnShareTeam);
  r = await run("button", { ...S, customId: shareTeam.custom_id });
  check(r.content === `### ${T.progressShared}`, "progress shared with the team");
  r = await run("command", { ...F, command: "progress", sub: "view", options: { team: true } });
  check(r.content.includes("Built the form"), "teammate sees the shared entry");

  // Help from a blocker.
  r = await run("command", { ...S, command: "help" });
  r = await run("modal", { ...S, customId: r.modal!.custom_id, fields: { summary: "Deploy fails", visibility: ["mentors"] } });
  check(r.content === `### ${T.helpSentTitle}\n${T.helpSent(false)}`, "help goes to mentors");

  // Submit with a teammate, preview first.
  r = await run("command", { ...S, command: "quest", sub: "status" });
  const quest = find(r, (c) => c.custom_id === "sq|q").options![0].value;
  r = await run("select", { ...S, customId: "sq|q", values: [quest] });
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.btnSubmit).custom_id });
  check(r.modal?.fields.includes("teammates") ?? false, "submit modal offers teammates for a project quest");
  r = await run("modal", {
    ...S,
    customId: r.modal!.custom_id,
    fields: { evidence: "Two classmates used it", reflection: "Totals confused them", artifact: "https://example.org", part: "Logic", teammates: [FRIEND] },
  });
  check(r.content.startsWith(`### ${T.submitPreview}\n`) && r.content.includes("Two classmates used it"), "submission shows a preview");
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.visTeam).custom_id });
  check(r.content.startsWith(`### ${T.submittedTitle}\n${T.submitted(1)}`), "submitted", r.content);

  // Teammate confirms their part.
  r = await run("command", { ...F, command: "inbox" });
  r = await run("button", { ...F, customId: find(r, (c) => c.label === T.btnConfirmPart).custom_id });
  r = await run("modal", { ...F, customId: r.modal!.custom_id, fields: { part: "UI" } });
  check(r.content === `✅ ${T.contributionDone}`, "teammate confirms");

  // Mentor reviews.
  r = await run("command", { ...M, command: "review", sub: "queue" });
  const sub = find(r, (c) => c.custom_id === "sq|rv_sub").options![0].value;
  r = await run("select", { ...M, customId: "sq|rv_sub", values: [sub] });
  check(r.content.includes("Two classmates used it"), "mentor sees the evidence");
  r = await run("button", { ...M, customId: find(r, (c) => c.label === "อนุมัติ").custom_id });
  r = await run("modal", { ...M, customId: r.modal!.custom_id, fields: { feedback: "Clear test" } });
  check(r.content.includes("ไม่มีเหรียญ") && r.content.includes("ยังไม่มีกติกาแบ่งเหรียญ"), "team award waits for an allocation rule", r.content);

  r = await run("command", { ...S, command: "inbox" });
  check(r.content.includes("ผ่านแล้ว"), "student sees the approval privately");
  r = await run("command", { ...S, command: "coins" });
  check(r.content.includes("**0**"), "no coins without a team allocation rule");

  // Mentor help queue.
  r = await run("command", { ...M, command: "review", sub: "help" });
  const help = find(r, (c) => c.custom_id === "sq|rv_help").options![0].value;
  r = await run("select", { ...M, customId: "sq|rv_help", values: [help] });
  r = await run("button", { ...M, customId: find(r, (c) => c.label === "รับเรื่อง").custom_id });
  check(r.content.startsWith("### ✅ รับเรื่องแล้ว\n"), "mentor claims help");

  // Celebrate: needs sharing on.
  r = await run("command", { ...S, command: "celebrate" });
  r = await run("modal", { ...S, customId: r.modal!.custom_id, fields: { body: "First real users" } });
  check(r.content.startsWith(`### ${T.sharePreview}\n`) && r.content.includes("First real users"), "celebration preview");
  check(find(r, (c) => c.label === T.btnPost).disabled === true, "post is disabled while sharing is off");

  // Settings and data.
  r = await run("command", { ...S, command: "settings" });
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.btnRemindersOn).custom_id });
  r = await run("modal", { ...S, customId: r.modal!.custom_id, fields: { days: ["1", "3"], hour: ["19"] } });
  check(r.content.includes("19:00"), "reminders set", r.content);
  r = await run("command", { ...S, command: "data" });
  r = await run("button", { ...S, customId: find(r, (c) => c.label === T.btnExport).custom_id });
  check(r.files === 1, "export attaches a file");

  // Work session.
  r = await run("command", { ...S, command: "work", sub: "start", options: { intention: "Fix deploy" } });
  check(r.content === `### ${T.workStartedTitle}\n**Fix deploy**\n-# ${T.workStarted}`, "work starts");
  r = await run("command", { ...S, command: "work", sub: "end", options: { reflection: "Fixed" } });
  check(r.content.includes("Fix deploy"), "work ends");

  // Rewards stay closed; report names nobody.
  r = await run("command", { ...S, command: "rewards" });
  check(r.content.includes(T.rewardsOff), "rewards closed");
  r = await run("command", { ...A, command: "admin", sub: "report", options: { days: 30 } });
  check(r.content.includes("รายงานรวม") && !r.content.includes("Student"), "report is aggregate only");
  r = await run("command", { ...S, command: "admin", sub: "status" });
  check(notYet(r, T.staffOnly), "students cannot use admin commands", r.content);

  await db.end();
  await pool.end();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
