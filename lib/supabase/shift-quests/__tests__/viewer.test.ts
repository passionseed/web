/** @jest-environment node */
import { QuestDbError } from "@/bot/src/quests/api";

const getUser = jest.fn();
const call = jest.fn();
const questApi = jest.fn(() => ({ call, rows: jest.fn() }));
const ensureSchema = jest.fn();
const fetchShiftGuildMember = jest.fn();

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({ auth: { getUser } })),
}));
jest.mock("@/lib/shift/discordGuild", () => ({
  fetchShiftGuildMember: (...args: unknown[]) => fetchShiftGuildMember(...args),
}));
jest.mock("../db", () => ({
  questApi: () => questApi(),
  ensureSchema: () => ensureSchema(),
}));

import { resolveIslandViewer } from "../viewer";

const ACTOR = "123456789012345678";
const HASH = "0123456789abcdef0123456789abcdef";
/** The Supabase identity's avatar as Discord sends it (an animated one), and as the island shows it. */
const IDENTITY_AVATAR = `https://cdn.discordapp.com/avatars/${ACTOR}/a_${HASH}.gif`;
const IDENTITY_SHOWN = `https://cdn.discordapp.com/avatars/${ACTOR}/a_${HASH}.png?size=64`;
/** The picture the SHIFT server shows (from the guild member lookup). */
const GUILD_AVATAR = `https://cdn.discordapp.com/guilds/111111111111111111/users/${ACTOR}/avatars/${HASH}.png?size=64`;

function discordUser(over: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    aud: "authenticated",
    email: "mint@example.com",
    app_metadata: { provider: "discord" },
    user_metadata: {},
    identities: [
      {
        id: ACTOR,
        provider: "discord",
        identity_data: { user_name: "mint#0", avatar_url: IDENTITY_AVATAR },
      },
    ],
    ...over,
  };
}

function session(over: Record<string, unknown> = {}, settings: Record<string, unknown> = {}) {
  return {
    member_id: "m1",
    onboarded: true,
    roles: [],
    current_project_id: null,
    unread: 2,
    prefs: null,
    settings: {
      student_role_ids: ["student-role"],
      awards: false,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      ...settings,
    },
    ...over,
  };
}

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: discordUser() }, error: null });
  call.mockReset().mockResolvedValue(session());
  questApi.mockClear();
  ensureSchema.mockReset().mockResolvedValue(undefined);
  fetchShiftGuildMember.mockReset().mockResolvedValue({ ok: true, roles: ["student-role"], nick: null });
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("resolveIslandViewer", () => {
  it("is ready for an onboarded student holding a student role", async () => {
    const viewer = await resolveIslandViewer();
    expect(viewer).toEqual({
      state: "ready",
      me: { name: "mint", avatarUrl: IDENTITY_SHOWN, staff: false },
      actor: ACTOR,
      userId: "user-1",
      session: expect.objectContaining({ onboarded: true, unread: 2 }),
    });
    // A NULL display name: rendering never writes.
    expect(call).toHaveBeenCalledWith("shift_quest_session", ACTOR, null);
    expect(fetchShiftGuildMember).toHaveBeenCalledWith(ACTOR);
  });

  it("uses the server nickname as the name when Discord has one", async () => {
    fetchShiftGuildMember.mockResolvedValue({ ok: true, roles: ["student-role"], nick: "Mint ม.5" });
    const viewer = await resolveIslandViewer();
    expect(viewer.state === "ready" && viewer.me.name).toBe("Mint ม.5");
  });

  describe("the viewer's picture", () => {
    it("prefers the picture the SHIFT server shows", async () => {
      fetchShiftGuildMember.mockResolvedValue({ ok: true, roles: ["student-role"], nick: null, avatar: GUILD_AVATAR });
      const viewer = await resolveIslandViewer();
      expect(viewer.state === "ready" && viewer.me.avatarUrl).toBe(GUILD_AVATAR);
    });

    it("falls back to the Supabase identity's avatar, as a 64px still PNG", async () => {
      fetchShiftGuildMember.mockResolvedValue({ ok: true, roles: ["student-role"], nick: null, avatar: null });
      const viewer = await resolveIslandViewer();
      expect(viewer.state === "ready" && viewer.me.avatarUrl).toBe(IDENTITY_SHOWN);
    });

    it.each([
      ["another host", "https://evil.example/avatars/123456789012345678/0123456789abcdef0123456789abcdef.png"],
      ["plain http", `http://cdn.discordapp.com/avatars/${ACTOR}/${HASH}.png`],
      ["a path outside the avatars", `https://cdn.discordapp.com/attachments/1/2/${HASH}.png`],
      ["nothing", undefined],
    ])("has no picture when the identity's avatar is %s and the server has none", async (_label, avatarUrl) => {
      getUser.mockResolvedValue({
        data: { user: discordUser({ identities: [{ id: ACTOR, provider: "discord", identity_data: { user_name: "mint#0", avatar_url: avatarUrl } }] }) },
        error: null,
      });
      const viewer = await resolveIslandViewer();
      expect(viewer.state === "ready" && viewer.me.avatarUrl).toBeNull();
    });
  });

  it("is not_started for an eligible student who has not started", async () => {
    call.mockResolvedValue(session({ onboarded: false, member_id: null }));
    await expect(resolveIslandViewer()).resolves.toEqual({
      state: "not_started",
      me: expect.objectContaining({ name: "mint" }),
      actor: ACTOR,
      userId: "user-1",
    });
  });

  it("carries the Supabase user id from getUser(), never from Discord", async () => {
    getUser.mockResolvedValue({ data: { user: discordUser({ id: "7c9e6679-7425-40de-944b-e07fc1f90ae7" }) }, error: null });
    const viewer = await resolveIslandViewer();
    expect(viewer.state === "ready" && viewer.userId).toBe("7c9e6679-7425-40de-944b-e07fc1f90ae7");
  });

  describe("signed out", () => {
    it("when getUser errors (auth outage)", async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: new Error("auth down") });
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "signed_out" });
    });

    it("when getUser throws", async () => {
      getUser.mockRejectedValue(new Error("network"));
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "signed_out" });
    });

    it("when there is no user", async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null });
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "signed_out" });
    });

    it("for an anonymous user", async () => {
      getUser.mockResolvedValue({
        data: { user: { id: "anon", aud: "authenticated", is_anonymous: true, app_metadata: { provider: "anonymous" }, identities: [] } },
        error: null,
      });
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "signed_out" });
      expect(questApi).not.toHaveBeenCalled();
    });
  });

  it("is no_discord for a Google account without Discord, before touching the database", async () => {
    getUser.mockResolvedValue({
      data: { user: discordUser({ identities: [{ id: "g1", provider: "google", identity_data: {} }] }) },
      error: null,
    });
    await expect(resolveIslandViewer()).resolves.toEqual({ state: "no_discord", accountLabel: "mint@example.com" });
    expect(questApi).not.toHaveBeenCalled();
  });

  describe("unavailable", () => {
    it("not_configured when the database URL is missing or wrong", async () => {
      questApi.mockImplementationOnce(() => {
        throw new Error("shift_quest_db_not_configured");
      });
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "unavailable", reason: "not_configured" });
    });

    it("schema_outdated when the board migration is missing", async () => {
      ensureSchema.mockRejectedValue(new Error("shift_quest_schema_outdated"));
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "unavailable", reason: "schema_outdated" });
    });

    it("db_error when the schema check or the session call fails", async () => {
      ensureSchema.mockRejectedValueOnce(new QuestDbError("shift_quest_schema_version", "08006"));
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "unavailable", reason: "db_error" });
      call.mockRejectedValueOnce(new QuestDbError("shift_quest_session", "57014"));
      await expect(resolveIslandViewer()).resolves.toEqual({ state: "unavailable", reason: "db_error" });
    });
  });

  describe("staff", () => {
    it("are still refused when they are not in the SHIFT server", async () => {
      call.mockResolvedValue(session({ roles: ["reviewer"] }, { student_role_ids: [] }));
      fetchShiftGuildMember.mockResolvedValue({ ok: false, reason: "not_member" });
      await expect(resolveIslandViewer()).resolves.toMatchObject({ state: "not_eligible", reason: "not_in_guild" });
      expect(fetchShiftGuildMember).toHaveBeenCalledWith(ACTOR);
    });

    it("fail closed when Discord cannot be asked", async () => {
      call.mockResolvedValue(session({ roles: ["admin"] }));
      fetchShiftGuildMember.mockResolvedValue({ ok: false, reason: "error" });
      await expect(resolveIslandViewer()).resolves.toMatchObject({
        state: "not_eligible",
        reason: "discord_unavailable",
      });
    });

    it("in the server need no student role", async () => {
      call.mockResolvedValue(session({ roles: ["reviewer"] }));
      fetchShiftGuildMember.mockResolvedValue({ ok: true, roles: ["staff-only"], nick: "Coach" });
      await expect(resolveIslandViewer()).resolves.toMatchObject({ state: "ready", me: { staff: true, name: "Coach" } });
    });

    it("in the server are let in while the pilot is closed", async () => {
      call.mockResolvedValue(session({ roles: ["fulfillment"] }, { student_role_ids: [] }));
      fetchShiftGuildMember.mockResolvedValue({ ok: true, roles: [], nick: null });
      await expect(resolveIslandViewer()).resolves.toMatchObject({ state: "ready", me: { staff: true, name: "mint" } });
    });
  });

  it("is pilot_closed with no student roles configured, without asking Discord", async () => {
    call.mockResolvedValue(session({}, { student_role_ids: [] }));
    await expect(resolveIslandViewer()).resolves.toMatchObject({ state: "not_eligible", reason: "pilot_closed" });
    expect(fetchShiftGuildMember).not.toHaveBeenCalled();
  });

  it("is not_in_guild when Discord does not know the member", async () => {
    fetchShiftGuildMember.mockResolvedValue({ ok: false, reason: "not_member" });
    await expect(resolveIslandViewer()).resolves.toMatchObject({ state: "not_eligible", reason: "not_in_guild" });
  });

  it("is no_role when the member holds no student role", async () => {
    fetchShiftGuildMember.mockResolvedValue({ ok: true, roles: ["other"], nick: "Mint" });
    await expect(resolveIslandViewer()).resolves.toEqual({
      state: "not_eligible",
      me: { name: "Mint", avatarUrl: IDENTITY_SHOWN, staff: false },
      reason: "no_role",
    });
  });

  it.each(["error", "rate_limited", "not_configured"])("fails closed when Discord gives %s", async (reason) => {
    fetchShiftGuildMember.mockResolvedValue({ ok: false, reason });
    await expect(resolveIslandViewer()).resolves.toMatchObject({ state: "not_eligible", reason: "discord_unavailable" });
    const logged = (console.error as jest.Mock).mock.calls.map(([line]) => String(line)).join("\n");
    expect(logged).toContain(reason);
    expect(logged).not.toContain(ACTOR);
  });

  it("never throws, even when something unexpected breaks", async () => {
    fetchShiftGuildMember.mockRejectedValue(new TypeError("boom"));
    await expect(resolveIslandViewer()).resolves.toEqual({ state: "unavailable", reason: "db_error" });
  });

  it("never puts the actor or the user id on a state that is not not_started or ready", async () => {
    fetchShiftGuildMember.mockResolvedValue({ ok: true, roles: [], nick: null });
    const viewer = await resolveIslandViewer();
    // The viewer's own avatar URL embeds their own Discord id (ViewerCard); nothing else may.
    const { me, ...rest } = viewer as Extract<typeof viewer, { state: "not_eligible" }>;
    expect(me.avatarUrl).toBe(IDENTITY_SHOWN);
    expect(JSON.stringify({ ...rest, me: { ...me, avatarUrl: null } })).not.toContain(ACTOR);
    expect(JSON.stringify(viewer)).not.toContain("user-1");
  });
});
