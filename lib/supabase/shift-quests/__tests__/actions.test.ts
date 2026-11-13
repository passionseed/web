/** @jest-environment node */
import { QuestDbError, QuestError } from "@/bot/src/quests/api";

const call = jest.fn();
const resolveIslandViewer = jest.fn();
const refresh = jest.fn();

jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({
  resolveIslandViewer: () => resolveIslandViewer(),
}));

import * as actions from "@/app/shift/island/actions";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";
import { TEXT_LIMITS } from "@/lib/supabase/shift-quests/types";

const ACTOR = "123456789012345678";
const OTHER = "876543210987654321";
const UUID = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const me = { name: "Mint", avatarUrl: null, staff: false };
const ready = { state: "ready", me, actor: ACTOR, session: { onboarded: true, roles: [], unread: 0 } };

beforeEach(() => {
  call.mockReset();
  resolveIslandViewer.mockReset().mockResolvedValue(ready);
  refresh.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

const proof = { proof: " ทำต้นแบบแล้ว ", reflection: "ได้เรียนรู้ว่า", artifactUrl: "" };

describe("each action calls exactly one function with the server-side actor", () => {
  const cases: Array<[string, () => Promise<unknown>, unknown, string, unknown[], unknown]> = [
    ["startIsland", () => actions.startIsland(), {}, "shift_quest_start", [ACTOR, "Mint", false], null],
    [
      "createProject",
      () => actions.createProject({ name: " Lamp ", route: "software", ambition: "" }),
      "p-uuid",
      "shift_quest_project_create",
      [ACTOR, "Lamp", "software", null],
      { projectId: "p-uuid" },
    ],
    [
      "respondInvite",
      () => actions.respondInvite({ projectId: UUID, accept: true }),
      null,
      "shift_quest_project_respond",
      [ACTOR, UUID, true],
      null,
    ],
    [
      "checkIn (tap)",
      () => actions.checkIn(),
      { kind: "tap", taps_today: 1, progress_id: "x" },
      "shift_quest_checkin",
      [ACTOR, null],
      { kind: "tap", tapsToday: 1 },
    ],
    [
      "checkIn (note)",
      () => actions.checkIn({ note: " a note " }),
      { kind: "note", taps_today: 1 },
      "shift_quest_checkin",
      [ACTOR, "a note"],
      { kind: "note", tapsToday: 1 },
    ],
    ["setResting", () => actions.setResting({ on: true }), { paused: 2, resumed: 0 }, "shift_quest_rest", [ACTOR, true], { paused: 2, resumed: 0 }],
    [
      "setShowName",
      () => actions.setShowName({ projectId: UUID, show: true }),
      { project_id: UUID, show_name: true, project_name_visible: false },
      "shift_quest_island_optin",
      [ACTOR, UUID, true],
      { nameVisible: false },
    ],
    [
      "submitMainQuest",
      () => actions.submitMainQuest({ milestone: 2, ...proof }),
      { instance_id: UUID, submission_id: "s", revision: 1, version: 2, created: true },
      "shift_quest_milestone_submit",
      [ACTOR, 2, "ทำต้นแบบแล้ว", "ได้เรียนรู้ว่า", null],
      { instanceId: UUID, revision: 1, created: true },
    ],
    [
      "startMainQuest",
      () => actions.startMainQuest({ milestone: 4 }),
      { instance_id: "i3", version: 1, created: true },
      "shift_quest_milestone_start",
      [ACTOR, 4],
      { instanceId: "i3", version: 1, created: true },
    ],
    [
      "resumeQuest",
      () => actions.resumeQuest({ instanceId: UUID }),
      5,
      "shift_quest_resume",
      [ACTOR, UUID],
      { version: 5 },
    ],
    [
      "chooseSideQuest",
      () => actions.chooseSideQuest({ templateId: UUID }),
      { instance_id: "i1", version: 1, created: true },
      "shift_quest_side_choose",
      [ACTOR, UUID],
      { instanceId: "i1", version: 1, created: true },
    ],
    [
      "submitSideQuest",
      () => actions.submitSideQuest({ templateId: UUID, ...proof, artifactUrl: "https://example.com/x" }),
      { instance_id: "i1", submission_id: "s", revision: 2, version: 4, created: false },
      "shift_quest_side_submit",
      [ACTOR, UUID, "ทำต้นแบบแล้ว", "ได้เรียนรู้ว่า", "https://example.com/x"],
      { instanceId: "i1", revision: 2, created: false },
    ],
    [
      "proposeQuest",
      () => actions.proposeQuest({ title: "T", goal: "G", criteria: "C", nextStep: "N", why: null }),
      "i2",
      "shift_quest_propose",
      [ACTOR, "T", null, "G", "C", "N"],
      { instanceId: "i2" },
    ],
    [
      "submitProposedQuest",
      () => actions.submitProposedQuest({ instanceId: UUID, version: 3, ...proof }),
      { submission_id: "s", revision: 1, version: 4 },
      "shift_quest_submit",
      [ACTOR, UUID, 3, "ทำต้นแบบแล้ว", "ได้เรียนรู้ว่า", null, "reviewers", null, []],
      { instanceId: UUID, revision: 1, created: false },
    ],
    [
      "askForHelp",
      () => actions.askForHelp({ summary: "ติดเรื่อง deploy", visibility: "community", instanceId: UUID }),
      "h1",
      "shift_quest_help_create",
      [ACTOR, "ติดเรื่อง deploy", "community", "student", UUID],
      { helpId: "h1" },
    ],
  ];

  it.each(cases)("%s", async (_name, run, dbResult, fn, args, data) => {
    call.mockResolvedValue(dbResult);
    await expect(run()).resolves.toEqual({ ok: true, data });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith(fn, ...args);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("validation", () => {
  const over = (n: number) => "ก".repeat(n + 1);

  it.each([
    ["project name over 80", () => actions.createProject({ name: over(TEXT_LIMITS.projectName), route: "software" })],
    ["empty project name", () => actions.createProject({ name: "   ", route: "software" })],
    ["unknown route", () => actions.createProject({ name: "A", route: "games" as never })],
    ["ambition over 500", () => actions.createProject({ name: "A", route: "other", ambition: over(TEXT_LIMITS.ambition) })],
    ["note over 300", () => actions.checkIn({ note: over(TEXT_LIMITS.note) })],
    ["milestone 0", () => actions.submitMainQuest({ milestone: 0, ...proof })],
    ["milestone 8", () => actions.submitMainQuest({ milestone: 8, ...proof })],
    ["milestone 2.5", () => actions.submitMainQuest({ milestone: 2.5, ...proof })],
    ["proof over 2000", () => actions.submitMainQuest({ milestone: 1, ...proof, proof: over(TEXT_LIMITS.proof) })],
    ["missing reflection", () => actions.submitMainQuest({ milestone: 1, ...proof, reflection: " " })],
    ["http link", () => actions.submitMainQuest({ milestone: 1, ...proof, artifactUrl: "http://example.com" })],
    ["javascript link", () => actions.submitSideQuest({ templateId: UUID, ...proof, artifactUrl: "javascript:alert(1)" })],
    ["link over 500", () => actions.submitMainQuest({ milestone: 1, ...proof, artifactUrl: `https://e.com/${over(500)}` })],
    ["template id not a uuid", () => actions.chooseSideQuest({ templateId: "m1" })],
    ["start milestone 8", () => actions.startMainQuest({ milestone: 8 })],
    ["resume id not a uuid", () => actions.resumeQuest({ instanceId: "i1" })],
    ["project id not a uuid", () => actions.respondInvite({ projectId: "1; drop", accept: true })],
    ["accept not a boolean", () => actions.respondInvite({ projectId: UUID, accept: "yes" as never })],
    ["show not a boolean", () => actions.setShowName({ projectId: UUID, show: 1 as never })],
    ["version 0", () => actions.submitProposedQuest({ instanceId: UUID, version: 0, ...proof })],
    ["title over 80", () => actions.proposeQuest({ title: over(80), goal: "G", criteria: "C", nextStep: "N" })],
    ["next step over 500", () => actions.proposeQuest({ title: "T", goal: "G", criteria: "C", nextStep: over(500) })],
    ["why over 1000", () => actions.proposeQuest({ title: "T", goal: "G", criteria: "C", nextStep: "N", why: over(1000) })],
    ["help summary over 1000", () => actions.askForHelp({ summary: over(1000), visibility: "mentors" })],
    ["help to a DM", () => actions.askForHelp({ summary: "a", visibility: "dm" as never })],
    ["help instance not a uuid", () => actions.askForHelp({ summary: "a", visibility: "mentors", instanceId: "x" })],
    ["no input at all", () => (actions.createProject as (i: unknown) => Promise<unknown>)(undefined)],
  ])("%s is invalid_input, with no database call", async (_name, run) => {
    await expect(run()).resolves.toEqual({ ok: false, code: "invalid_input", error: questErrorText("invalid_input") });
    expect(call).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("accepts text exactly at the cap", async () => {
    call.mockResolvedValue({ instance_id: UUID, revision: 1, created: true });
    const atCap = "ก".repeat(TEXT_LIMITS.proof);
    await expect(actions.submitMainQuest({ milestone: 7, proof: atCap, reflection: atCap })).resolves.toMatchObject({ ok: true });
  });

  it("adds quest 5's ownership checklist, read on the server, under the proof", async () => {
    call.mockImplementation(async (fn: string) =>
      fn === "shift_quest_ownership_get"
        ? [
            { item: "access", state: "demonstrated", mentor_held: false, updated_at: "x" },
            { item: "export", state: "not_checked", mentor_held: true, updated_at: "x" },
          ]
        : { instance_id: UUID, revision: 2, created: false }
    );
    await expect(actions.submitMainQuest({ milestone: 5, ...proof })).resolves.toMatchObject({ ok: true });
    expect(call).toHaveBeenNthCalledWith(1, "shift_quest_ownership_get", ACTOR);
    const [fn, actor, milestone, evidence] = call.mock.calls[1];
    expect([fn, actor, milestone]).toEqual(["shift_quest_milestone_submit", ACTOR, 5]);
    expect(evidence).toBe(
      "ทำต้นแบบแล้ว\n\nเช็กลิสต์ /project ownership ตอนส่ง\n✅ เข้าถึงงานได้เอง: ทำได้แล้ว\n⬜ สำรองหรือส่งออกได้: ยังไม่ได้เช็ก (งานอยู่ในบัญชีที่พี่เลี้ยงถือ)"
    );
  });

  it("refuses quest 5 rather than cut the proof when proof and checklist pass the cap", async () => {
    call.mockImplementation(async (fn: string) =>
      fn === "shift_quest_ownership_get" ? [{ item: "access", state: "demonstrated", mentor_held: false }] : null
    );
    const result = await actions.submitMainQuest({ milestone: 5, ...proof, proof: "ก".repeat(TEXT_LIMITS.proof) });
    expect(result).toMatchObject({ ok: false, code: "text_too_long" });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("reads quest 5's checklist without refreshing the page", async () => {
    call.mockResolvedValue([{ item: "team", state: "needs_help", mentor_held: false }, { item: "bogus", state: "x" }]);
    await expect(actions.loadOwnership()).resolves.toEqual({
      ok: true,
      data: [{ item: "team", state: "needs_help", mentorHeld: false }],
    });
    expect(call).toHaveBeenCalledWith("shift_quest_ownership_get", ACTOR);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("never forwards an actor the client sends", async () => {
    call.mockResolvedValue("h1");
    await actions.askForHelp({ summary: "a", visibility: "mentors", actor: OTHER } as never);
    await (actions.startIsland as (i: unknown) => Promise<unknown>)({ actor: OTHER });
    for (const args of call.mock.calls) {
      expect(args).not.toContain(OTHER);
      expect(args[1]).toBe(ACTOR);
    }
  });
});

describe("viewer gates", () => {
  it.each([
    [{ state: "signed_out" }, "signed_out", true],
    [{ state: "no_discord", accountLabel: null }, "signed_out", true],
    [{ state: "unavailable", reason: "db_error" }, "unavailable", false],
    [{ state: "not_eligible", me, reason: "no_role" }, "not_eligible", true],
    [{ state: "not_eligible", me, reason: "discord_unavailable" }, "not_eligible", true],
    [{ state: "not_started", me, actor: ACTOR }, "not_started", true],
  ])("%j refuses a quest action with %s (refreshing into the gate: %s)", async (viewer, code, refreshes) => {
    resolveIslandViewer.mockResolvedValue(viewer);
    const result = await actions.checkIn();
    expect(result).toMatchObject({ ok: false, code });
    expect(call).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(refreshes ? 1 : 0);
  });

  it("explains a Discord outage separately from a missing role", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "not_eligible", me, reason: "discord_unavailable" });
    await expect(actions.checkIn()).resolves.toEqual({
      ok: false,
      code: "not_eligible",
      error: questErrorText("discord_unavailable"),
    });
  });

  it("lets a not_started viewer start, and only start", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "not_started", me, actor: ACTOR });
    call.mockResolvedValue({});
    await expect(actions.startIsland()).resolves.toEqual({ ok: true, data: null });
    await expect(actions.createProject({ name: "A", route: "other" })).resolves.toMatchObject({ code: "not_started" });
    await expect(actions.submitMainQuest({ milestone: 1, ...proof })).resolves.toMatchObject({ code: "not_started" });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("shift_quest_start", ACTOR, "Mint", false);
  });

  it("refuses start for an ineligible viewer", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "not_eligible", me, reason: "pilot_closed" });
    await expect(actions.startIsland()).resolves.toMatchObject({ ok: false, code: "not_eligible" });
    expect(call).not.toHaveBeenCalled();
  });
});

describe("database failures", () => {
  it("maps a refusal to its Thai words, refreshing a stale board", async () => {
    call.mockRejectedValue(new QuestError("quest_locked", undefined, "shift_quest_side_choose"));
    await expect(actions.chooseSideQuest({ templateId: UUID })).resolves.toEqual({
      ok: false,
      code: "quest_locked",
      error: questErrorText("quest_locked"),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh for a refusal about the input itself", async () => {
    call.mockRejectedValue(new QuestError("too_many_open", undefined, "shift_quest_help_create"));
    await expect(actions.askForHelp({ summary: "a", visibility: "community" })).resolves.toEqual({
      ok: false,
      code: "too_many_open",
      error: questErrorText("too_many_open"),
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("maps busy to a retry line", async () => {
    call.mockRejectedValue(new QuestError("busy"));
    await expect(actions.setResting({ on: false })).resolves.toMatchObject({ ok: false, code: "busy" });
  });

  it("maps any other failure to unknown and logs only the function and SQLSTATE", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_milestone_submit", "XX000"));
    const secret = "ข้อความส่วนตัวของนักเรียน";
    await expect(actions.submitMainQuest({ milestone: 1, proof: secret, reflection: secret })).resolves.toEqual({
      ok: false,
      code: "unknown",
      error: questErrorText("unknown"),
    });
    const logged = (console.error as jest.Mock).mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("shift_quest_milestone_submit");
    expect(logged).toContain("XX000");
    expect(logged).not.toContain(secret);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not log an unexpected error's message", async () => {
    call.mockRejectedValue(new Error("student text in a message"));
    await expect(actions.askForHelp({ summary: "a", visibility: "mentors" })).resolves.toMatchObject({ code: "unknown" });
    const logged = (console.error as jest.Mock).mock.calls.flat().map(String).join("\n");
    expect(logged).not.toContain("student text");
  });
});

describe("loadCampfire", () => {
  const GUILD = "111111111111111111";
  const CHANNEL = "222222222222222222";
  const JOIN_URL = `https://discord.com/channels/${GUILD}/${CHANNEL}`;
  const fire = { channel_id: CHANNEL, guild_id: GUILD, live: true, count: 2, names: ["Mint", "‮ครูพลอย‬"] };

  it("reads names for a ready viewer, sanitised, without refreshing", async () => {
    call.mockResolvedValue(fire);
    await expect(actions.loadCampfire({ names: true })).resolves.toEqual({
      ok: true,
      data: { count: 2, names: ["Mint", "ครูพลอย"], joinUrl: JOIN_URL },
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("shift_quest_campfire", ACTOR, true);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("returns no names when not asked", async () => {
    call.mockResolvedValue(fire);
    await expect(actions.loadCampfire({ names: false })).resolves.toEqual({
      ok: true,
      data: { count: 2, names: [], joinUrl: JOIN_URL },
    });
    expect(call).toHaveBeenCalledWith("shift_quest_campfire", ACTOR, false);
  });

  it("says none when no coworking channel is set, and null, not an error, when the read fails", async () => {
    call.mockResolvedValue({ channel_id: null, guild_id: null, live: false, count: 0, names: null });
    await expect(actions.loadCampfire({ names: true })).resolves.toEqual({ ok: true, data: { none: true } });
    call.mockRejectedValue(new QuestDbError("shift_quest_campfire", "42883"));
    await expect(actions.loadCampfire({ names: true })).resolves.toEqual({ ok: true, data: null });
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    [{ state: "signed_out" }, "signed_out"],
    [{ state: "no_discord", accountLabel: null }, "signed_out"],
    [{ state: "unavailable", reason: "db_error" }, "unavailable"],
    [{ state: "not_eligible", me, reason: "no_role" }, "not_eligible"],
    [{ state: "not_started", me, actor: ACTOR }, "not_started"],
  ])("refuses %j with %s, never reading names and never refreshing", async (viewer, code) => {
    resolveIslandViewer.mockResolvedValue(viewer);
    await expect(actions.loadCampfire({ names: true })).resolves.toMatchObject({ ok: false, code });
    expect(call).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([[undefined], [{}], [{ names: "yes" }], [{ names: 1 }]])("refuses input %p as invalid_input", async (input) => {
    await expect((actions.loadCampfire as (i: unknown) => Promise<unknown>)(input)).resolves.toMatchObject({
      ok: false,
      code: "invalid_input",
    });
    expect(call).not.toHaveBeenCalled();
  });
});


describe("reflect", () => {
  it.each([undefined, null, "", "   ", " ติดเรื่องลิงก์ "])("saves private learned text with optional blocker %s", async (stuck) => {
    call.mockResolvedValue(UUID);
    await expect(actions.reflect({ learned: "  ได้ลองทดสอบกับเพื่อนแล้ว  ", stuck })).resolves.toEqual({ ok: true, data: null });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("shift_quest_progress_add", ACTOR, "บันทึกจากเกาะ", "ได้ลองทดสอบกับเพื่อนแล้ว", null, stuck?.trim() || null, null, "private", null);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    { learned: "" }, { learned: "   " }, { learned: "ก".repeat(9) },
    { learned: "ก".repeat(1001) }, { learned: "ก".repeat(10), stuck: "ก".repeat(1001) },
  ])("rejects invalid reflection before calling the database", async (input) => {
    expect(await actions.reflect(input)).toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([10, 1000])("accepts %i code points", async (length) => {
    call.mockResolvedValue(UUID);
    expect(await actions.reflect({ learned: "🌱".repeat(length) })).toEqual({ ok: true, data: null });
  });

  it.each(["signed_out", "not_eligible", "not_started", "unavailable"])("refuses %s", async (state) => {
    resolveIslandViewer.mockResolvedValue({ state });
    expect(await actions.reflect({ learned: "ก".repeat(10) })).toMatchObject({ ok: false, code: state });
    expect(call).not.toHaveBeenCalled();
  });

  it("uses the server actor even when input forges one", async () => {
    call.mockResolvedValue(UUID);
    const input = { learned: "ก".repeat(10), actor: OTHER };
    await actions.reflect(input);
    expect(call.mock.calls[0][1]).toBe(ACTOR);
  });

  it("maps no_project to the friendly Thai refusal and refreshes", async () => {
    call.mockRejectedValue(new QuestError("no_project"));
    expect(await actions.reflect({ learned: "ก".repeat(10) })).toEqual({ ok: false, code: "no_project", error: questErrorText("no_project") });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not log private text on database failure", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_progress_add", "42501"));
    expect(await actions.reflect({ learned: "PRIVATE_LEARNED_TEXT", stuck: "PRIVATE_STUCK_TEXT" })).toMatchObject({ ok: false, code: "unknown" });
    expect(JSON.stringify(jest.mocked(console.error).mock.calls)).not.toMatch(/PRIVATE_/);
    expect(refresh).not.toHaveBeenCalled();
  });
});
