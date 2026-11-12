/**
 * @jest-environment node
 *
 * /project and /squad as compact Components V2 cards: same database calls and
 * custom IDs as before, the facts that matter up top, actions as buttons.
 */
import { ButtonStyle, MessageFlags } from "discord.js";

import { ACTION_HANDLERS, COMMAND_HANDLERS } from "..";
import type { QuestApi, Session } from "../api";
import type { Ctx } from "../context";
import { OWNERSHIP_ICON, OWNERSHIP_ITEM, OWNERSHIP_STATE, T } from "../copy";
import { ownershipCard, projectCard } from "../handlers/project";
import { invitesCard, squadCard } from "../handlers/squad";
import { I, SQ } from "../island/copy";
import { LIMITS, NO_MENTIONS, TONE_COLORS, renderView } from "../ui";
import { accentColor, bodyText, componentCount, customIds, textLength, viewText } from "../test-helpers/view";

const PID = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f";
const SID = "9a8b7c6d-1d2b-4c3d-9e8f-0a1b2c3d4e5f";
const V2_PRIVATE = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

function session(): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles: [],
    current_project_id: PID,
    unread: 0,
    prefs: null,
    settings: {
      student_role_ids: ["555"],
      awards: true,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      squads: true,
    },
  };
}

function ctx(call: (fn: string, ...args: unknown[]) => unknown): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: ["555"], session: session() };
}

type Sent = { components?: unknown[]; flags?: number; allowedMentions?: unknown; content?: unknown };

/** A minimal Discord interaction that records what the bot sent, and how. */
function interaction(kind: "button" | "select" | "modal" | "command", over: Record<string, unknown> = {}) {
  const sent: Sent[] = [];
  const how: string[] = [];
  const modals: { custom_id: string }[] = [];
  const i: Record<string, unknown> = {
    id: "222222222222222222",
    deferred: false,
    replied: false,
    customId: "sq|x",
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button" || kind === "select",
    isButton: () => kind === "button",
    isStringSelectMenu: () => kind === "select",
    isModalSubmit: () => kind === "modal",
    reply: async (p: Sent) => {
      i.replied = true;
      how.push("reply");
      sent.push(p);
    },
    update: async (p: Sent) => {
      how.push("update");
      sent.push(p);
    },
    editReply: async (p: Sent) => {
      how.push("editReply");
      sent.push(p);
    },
    followUp: async (p: Sent) => {
      how.push("followUp");
      sent.push(p);
    },
    showModal: async (m: { toJSON: () => { custom_id: string } }) => modals.push(m.toJSON()),
    ...over,
  };
  return { i: i as never, sent, how, modals };
}

const fields = (values: Record<string, string>) => ({
  getTextInputValue: (id: string) => {
    if (!(id in values)) throw new Error("no field");
    return values[id];
  },
});

const projectView = (over: Record<string, unknown> = {}) => ({
  id: PID,
  name: "แอปจดการบ้าน",
  route: "software",
  ambition: "ช่วยเพื่อน\n# จดการบ้าน",
  members: [
    { name: "Ploy", status: "active" },
    { name: "Ton", status: "invited" },
  ],
  quests: Array.from({ length: 8 }, (_, n) => ({ title: `ขั้น ${n + 1}`, state: n < 2 ? "approved" : "submitted", owner: "Ploy" })),
  ownership: [
    { item: "access", state: "demonstrated", note: null, mentor_held: false, continuation_path: null },
    { item: "export", state: "not_checked", note: null, mentor_held: false, continuation_path: null },
    { item: "team", state: "needs_help", note: "ยังไม่ได้คุย\nเรื่องคนออก", mentor_held: false, continuation_path: null },
    { item: "costs", state: "not_applicable", note: "ไม่ได้ใช้ของที่มีลิขสิทธิ์", mentor_held: false, continuation_path: null },
    { item: "portability", state: "not_checked", note: null, mentor_held: false, continuation_path: null },
  ],
  ...over,
});

/** Every card: Components V2, inside Discord's limits, pinging nobody. */
function expectCard(p: Sent, flags = V2_PRIVATE): void {
  expect(p.flags).toBe(flags);
  expect(p.content).toBeUndefined();
  expect(p.allowedMentions).toEqual(NO_MENTIONS);
  expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
  expect(textLength(p)).toBeLessThanOrEqual(LIMITS.text);
}

describe("/project cards", () => {
  it("shows the project as one card: team, the first quests, the checklist bar and buttons instead of a command to type", async () => {
    const c = ctx(() => projectView());
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("project view")!(i, c);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_project_view", "1111111111", PID]]);
    expectCard(sent[0]);
    const body = bodyText(sent[0]);
    expect(body.startsWith("### 🌳 แอปจดการบ้าน\n-# ซอฟต์แวร์\n")).toBe(true);
    // Student text never starts a line, so it cannot become a heading.
    expect(body).toContain("> ช่วยเพื่อน # จดการบ้าน");
    expect(body.split("\n").slice(1).filter((line) => /^#{1,3} /.test(line))).toEqual([]);
    expect(body).toContain(T.projectTeam(`Ploy · Ton${T.projectPending}`));
    expect(body).toContain("• ขั้น 5 (Ploy): รอรีวิว");
    expect(body).not.toContain("ขั้น 6");
    expect(body).toContain(`-# ${I.more(3)}`);
    // demonstrated + not applicable count as done
    expect(body).toContain(T.projectOwnership("▰▰▱▱▱", 2, 5));
    expect(body).not.toContain("/project ownership");
    expect(customIds(sent[0])).toEqual([`sq|own_view|${PID}`, "sq|is_view"]);
    expect(accentColor(sent[0])).toBe(TONE_COLORS.island);
  });

  it("says when a project has no quests yet", () => {
    const text = bodyText(renderView(projectCard(PID, projectView({ quests: [], ambition: null }) as never)));
    expect(text).toContain(`${T.projectQuests}\n${T.projectNoQuests}`);
    expect(text).not.toContain("> ");
  });

  it("shows the ownership checklist compactly: one icon per item, notes as fine print, the safety line kept", async () => {
    const c = ctx(() => projectView());
    const { i, sent, how } = interaction("command");
    await COMMAND_HANDLERS.get("project ownership")!(i, c);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_project_view", "1111111111", PID]]);
    expect(how).toEqual(["reply"]);
    expectCard(sent[0]);
    const body = bodyText(sent[0]);
    expect(body.startsWith(`### ${T.ownershipTitle}\n${T.ownershipOf("แอปจดการบ้าน", "▰▰▱▱▱", 2, 5)}\n-# ${T.ownershipWhy}\n`)).toBe(true);
    expect(body).toContain(`✅ ${OWNERSHIP_ITEM.access.label}\n⬜ ${OWNERSHIP_ITEM.export.label}\n🆘 ${OWNERSHIP_ITEM.team.label}\n-# ยังไม่ได้คุย เรื่องคนออก\n➖ ${OWNERSHIP_ITEM.costs.label}`);
    for (const [state, label] of Object.entries(OWNERSHIP_STATE)) expect(body).toContain(`${OWNERSHIP_ICON[state]} ${label}`);
    expect(body).toContain("ห้ามส่งรหัสผ่าน โทเคน หรือภาพหน้าจอบัญชีส่วนตัว");
    // The hints moved to the picker, the fine print stays last.
    expect(body).not.toContain(OWNERSHIP_ITEM.access.hint);
    expect(body.endsWith(`-# ${T.ownershipFine}`)).toBe(true);
    expect(customIds(sent[0])).toEqual([`sq|own_pick|${PID}`, "sq|is_view"]);
    const json = JSON.stringify(sent[0].components!.map((x) => (x as { toJSON: () => unknown }).toJSON()));
    for (const item of Object.keys(OWNERSHIP_ITEM)) expect(json).toContain(`"value":"${item}"`);
    expect(viewText(sent[0])).toContain(`🆘 ${OWNERSHIP_ITEM.team.label}`);
  });

  it("opens one checklist item with a button per state and a way back to the checklist", async () => {
    const c = ctx(() => null);
    const { i, sent, how } = interaction("select", { values: ["team"] });
    await ACTION_HANDLERS.get("own_pick")!(i, c, [PID]);
    expect(c.api.call).not.toHaveBeenCalled();
    expect(how).toEqual(["update"]);
    expectCard(sent[0], MessageFlags.IsComponentsV2);
    expect(bodyText(sent[0])).toBe(`### 🔑 ${OWNERSHIP_ITEM.team.label}\n${OWNERSHIP_ITEM.team.hint}`);
    expect(customIds(sent[0])).toEqual([
      ...Object.keys(OWNERSHIP_STATE).map((state) => `sq|own_set|${PID}|team|${state}`),
      `sq|own_view|${PID}`,
    ]);
    expect(viewText(sent[0])).toContain("🆘 ต้องการความช่วยเหลือ");
  });

  it("own_view reopens the checklist in place, and ignores a forged ID", async () => {
    expect(ACTION_HANDLERS.has("own_view")).toBe(true);
    const c = ctx(() => projectView());
    const { i, sent, how } = interaction("button");
    await ACTION_HANDLERS.get("own_view")!(i, c, [PID]);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_project_view", "1111111111", PID]]);
    expect(how).toEqual(["update"]);
    expect(bodyText(sent[0])).toContain(T.ownershipTitle);

    const forged = ctx(() => projectView());
    const other = interaction("button");
    await ACTION_HANDLERS.get("own_view")!(other.i, forged, ["not-a-uuid"]);
    expect(forged.api.call).not.toHaveBeenCalled();
    expect(other.sent).toEqual([]);
  });

  it("confirms a saved item in a small card, and says when it went to the mentors' queue", async () => {
    const c = ctx(() => ({ help_request_id: "h1" }));
    const { i, sent } = interaction("modal", { fields: fields({ note: "ช่วยด้วย" }) });
    await ACTION_HANDLERS.get("own_set")!(i, c, [PID, "team", "needs_help"]);
    expect((c.api.call as jest.Mock).mock.calls[0]).toEqual(["shift_quest_ownership_set", "1111111111", PID, "team", "needs_help", "ช่วยด้วย", false, null]);
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.ownershipSaved}\n${T.ownershipHelp}`);
    // The help request's status is in the inbox, one tap away.
    expect(customIds(sent[0])).toEqual([`sq|own_view|${PID}`, "sq|inbox", "sq|is_view"]);
    expect(T.ownershipHelp).toContain("/inbox");
    expect(accentColor(sent[0])).toBe(TONE_COLORS.success);

    const quiet = ctx(() => ({ help_request_id: null }));
    const saved = interaction("modal", { fields: fields({ note: "ok" }) });
    await ACTION_HANDLERS.get("own_set")!(saved.i, quiet, [PID, "export", "demonstrated"]);
    expect(bodyText(saved.sent[0])).toBe(`### ${T.ownershipSaved}`);
  });

  it("lists projects with the current one starred, one answer row per invite, and a way back", async () => {
    const c = ctx(() => [
      { id: PID, name: "แอป", route: "software", status: "active", is_current: true, inviter: null },
      { id: "b0000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f", name: "ร้าน", route: "service", status: "active", is_current: false, inviter: null },
      { id: "c0000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f", name: "เกม", route: "creative", status: "invited", is_current: false, inviter: "Ploy" },
    ]);
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("project list")!(i, c);
    expectCard(sent[0]);
    const body = bodyText(sent[0]);
    expect(body).toContain(`### ${T.projectListTitle}`);
    expect(body).toContain(`🌳 **แอป** · ซอฟต์แวร์ · ${T.projectCurrent}`);
    expect(body).toContain(`📨 **เกม** · งานสร้างสรรค์ · ${T.projectInviteFrom("Ploy")}`);
    expect(customIds(sent[0])).toEqual([
      "sq|proj_pick",
      "sq|invite|c0000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f|y",
      "sq|invite|c0000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f|n",
      "sq|is_view",
    ]);
    expect(viewText(sent[0])).toContain(`${T.btnAccept}: เกม`);
  });

  it("offers a create button when there is no project yet", async () => {
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("project list")!(i, ctx(() => []));
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.projectListTitle}\n${T.projectEmpty}`);
    expect(customIds(sent[0])).toEqual(["sq|proj_new", "sq|is_view"]);
  });

  it("confirms an invite without pinging anyone", async () => {
    const c = ctx(() => null);
    const { i, sent } = interaction("command", { options: { getUser: () => ({ id: "4444444444" }) } });
    await COMMAND_HANDLERS.get("project invite")!(i, c);
    expect((c.api.call as jest.Mock).mock.calls[0]).toEqual(["shift_quest_project_invite", "1111111111", PID, "4444444444"]);
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.inviteSent}\n${T.projectInvited("<@4444444444>")}`);
  });

  it("asks before leaving, with the leave and cancel buttons unchanged", async () => {
    const c = ctx(() => projectView({ name: "**แอป**" }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("project leave")!(i, c);
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.projectLeaveConfirm("**แอป**")}\n-# ${T.projectLeaveKeeps}`);
    expect(bodyText(sent[0])).toContain("\\*\\*แอป\\*\\*");
    expect(customIds(sent[0])).toEqual([`sq|proj_leave|${PID}`, "sq|noop"]);
    expect(accentColor(sent[0])).toBe(TONE_COLORS.warn);
  });

  it("confirms a new project with its escaped name and the invite hint", async () => {
    const c = ctx(() => PID);
    const { i, sent } = interaction("modal", { fields: fields({ name: "@everyone **x**" }) });
    await ACTION_HANDLERS.get("proj_new")!(i, c, []);
    expect((c.api.call as jest.Mock).mock.calls[0]).toEqual(["shift_quest_project_create", "1111111111", "@everyone **x**", undefined, null]);
    expectCard(sent[0]);
    const body = bodyText(sent[0]);
    expect(body).toContain(T.projectCreated("@everyone **x**"));
    expect(body).not.toContain("@everyone");
    expect(body).toContain(`-# ${T.projectInviteHint}`);
  });

  it("switches and leaves in place, with a way back to the island", async () => {
    const c = ctx(() => null);
    const pick = interaction("select", { values: [PID] });
    await ACTION_HANDLERS.get("proj_pick")!(pick.i, c, []);
    expect(pick.how).toEqual(["update"]);
    expectCard(pick.sent[0], MessageFlags.IsComponentsV2);
    expect(bodyText(pick.sent[0])).toBe(`### ${T.projectSwitched}`);
    expect(customIds(pick.sent[0])).toEqual(["sq|is_view"]);

    const leave = interaction("button");
    await ACTION_HANDLERS.get("proj_leave")!(leave.i, c, [PID]);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_project_leave", "1111111111", PID]);
    expect(bodyText(leave.sent[0])).toBe(`### ${T.projectLeft}`);
  });

  it("keeps a checklist with no items readable, without an empty picker", () => {
    const p = renderView(ownershipCard(PID, projectView({ ownership: [] }) as never));
    expect(customIds(p)).toEqual(["sq|is_view"]);
  });
});

describe("/squad cards", () => {
  const view = (over: Record<string, unknown> = {}) => ({
    id: SID,
    name: "Sprint Crew",
    target: "Ship it",
    starts_on: "2027-01-01",
    ends_on: "2027-01-14",
    days_left: 5,
    phase: "running",
    running: true,
    members_active: 3,
    milestones_gained: 2,
    members: [
      { name: "A", me: true },
      { name: "B", me: false },
      { name: "C", me: false },
    ],
    ...over,
  });

  it("is one card: dates, the target, one group number, names on one line, fine print last", () => {
    const p = renderView(squadCard(view() as never));
    expectCard(p);
    expect(bodyText(p)).toBe(
      [
        "### 👥 Sprint Crew",
        SQ.window("2027-01-01", "2027-01-14", 5),
        SQ.target("Ship it"),
        SQ.together(2),
        SQ.members(`A (${SQ.you}) · B · C`),
        `-# ${SQ.private}`,
        `-# ${SQ.withdrawHint}`,
      ].join("\n")
    );
    expect(SQ.window("2027-01-01", "2027-01-14", 5)).toContain("อีก **5** วัน");
    expect(customIds(p)).toEqual(["sq|is_view", `sq|squad_leave|${SID}`]);
    // Leaving is instant: a red button on a row of its own, away from the back button.
    const rows = (p.components[0].toJSON() as { components: { type: number; components?: { custom_id?: string; style?: number }[] }[] }).components
      .filter((x) => x.type === 1)
      .map((r) => r.components!);
    expect(rows.map((r) => r.map((b) => b.custom_id))).toEqual([["sq|is_view"], [`sq|squad_leave|${SID}`]]);
    expect(rows[1][0].style).toBe(ButtonStyle.Danger);
    expect(accentColor(p)).toBe(TONE_COLORS.season);
  });

  it("shows a forming squad as a bar toward 3 and points to the invite command", () => {
    const text = bodyText(renderView(squadCard(view({ phase: "forming", running: false, members_active: 2, milestones_gained: null }) as never)));
    expect(text).toContain("▰▰▱ **2**/3");
    expect(text).toContain(`-# ${SQ.inviteHint} · ${SQ.withdrawHint}`);
  });

  it("drops the days left and the hints once the squad has ended", () => {
    const text = bodyText(renderView(squadCard(view({ phase: "ended", running: false, milestones_gained: 4 }) as never)));
    expect(text).toContain(SQ.ended(4));
    expect(text).not.toContain("อีก");
    expect(text).not.toContain(SQ.withdrawHint);
    expect(bodyText(renderView(squadCard(view({ phase: "ended", milestones_gained: null }) as never)))).toContain(SQ.endedQuiet);
  });

  it("names each invite on its own answer row, says the rest come next, and has a way back", () => {
    const invite = (n: number) => ({ id: `${n}0000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f`, name: `S${n}`, status: "invited", starts_on: "", ends_on: "", running: false });
    const p = renderView(invitesCard([invite(1), invite(2), invite(3)] as never));
    expectCard(p);
    const body = bodyText(p);
    expect(body).toContain(`### ${SQ.invitesTitle}`);
    expect(body).toContain(SQ.inviteItem("S3"));
    expect(body).toContain(`-# ${SQ.moreInvites}`);
    expect(customIds(p)).toEqual([
      "sq|squad_rsvp|10000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f|y",
      "sq|squad_rsvp|10000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f|n",
      "sq|squad_rsvp|20000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f|y",
      "sq|squad_rsvp|20000000-1d2b-4c3d-9e8f-0a1b2c3d4e5f|n",
      "sq|is_view",
    ]);
    expect(SQ.moreInvites).not.toContain("/inbox");
    expect(viewText(p)).toContain(`${T.btnAccept}: S1`);
  });

  it("answers /squad view with the squad, the invites, or where to start", async () => {
    const running = ctx((fn) =>
      fn === "shift_quest_squad_mine" ? [{ id: SID, name: "S", status: "active", starts_on: "", ends_on: "", phase: "running", running: true }] : view()
    );
    const a = interaction("command");
    await COMMAND_HANDLERS.get("squad view")!(a.i, running);
    expect((running.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_squad_view", "1111111111", SID]);
    expect(bodyText(a.sent[0])).toContain(SQ.together(2));

    const none = interaction("command");
    await COMMAND_HANDLERS.get("squad view")!(none.i, ctx(() => []));
    expectCard(none.sent[0]);
    expect(bodyText(none.sent[0])).toBe(`### ${SQ.none}\n${SQ.noneHint}`);
    expect(customIds(none.sent[0])).toEqual(["sq|is_view"]);
  });

  it("confirms a new squad with a button to see it", async () => {
    const c = ctx(() => SID);
    const opts: Record<string, unknown> = { name: "Crew", target: "Ship" };
    const { i, sent } = interaction("command", {
      options: { getString: (n: string) => (opts[n] as string | undefined) ?? null, getInteger: () => null },
    });
    await COMMAND_HANDLERS.get("squad new")!(i, c);
    expect((c.api.call as jest.Mock).mock.calls[0]).toEqual(["shift_quest_squad_create", "1111111111", "Crew", "Ship", 14]);
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toBe(`### ${SQ.createdTitle}\n${SQ.created}\n-# ${SQ.createdFine}`);
    expect(customIds(sent[0])).toEqual([`sq|squad_view|${SID}`]);
  });

  it("confirms a squad invite, keeps the 3-day line, and links back to the squad", async () => {
    const c = ctx((fn) =>
      fn === "shift_quest_squad_mine" ? [{ id: SID, name: "S", status: "active", starts_on: "", ends_on: "", phase: "forming", running: false }] : null
    );
    const { i, sent } = interaction("command", { options: { getUser: () => ({ id: "4444444444" }) } });
    await COMMAND_HANDLERS.get("squad invite")!(i, c);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_squad_invite", "1111111111", SID, "4444444444"]);
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.inviteSent}\n${SQ.invited("<@4444444444>")}\n-# ${SQ.withdrawHint}`);
    expect(bodyText(sent[0])).toContain("3 วัน");
    expect(customIds(sent[0])).toEqual([`sq|squad_view|${SID}`]);
  });

  it("declines and leaves in place, with a way back to the island", async () => {
    const c = ctx(() => null);
    const no = interaction("button");
    await ACTION_HANDLERS.get("squad_rsvp")!(no.i, c, [SID, "n"]);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_squad_respond", "1111111111", SID, false]);
    expect(no.how).toEqual(["update"]);
    expectCard(no.sent[0], MessageFlags.IsComponentsV2);
    expect(bodyText(no.sent[0])).toBe(`### ${SQ.declined}`);
    // Like every other inbox answer: back to the inbox, or the island.
    expect(customIds(no.sent[0])).toEqual(["sq|inbox", "sq|is_view"]);

    const leave = interaction("button");
    await ACTION_HANDLERS.get("squad_leave")!(leave.i, c, [SID]);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_squad_leave", "1111111111", SID]);
    expect(bodyText(leave.sent[0])).toBe(`### ${SQ.left}\n${SQ.leftKeeps}`);
    expect(customIds(leave.sent[0])).toEqual(["sq|is_view"]);
  });
});
