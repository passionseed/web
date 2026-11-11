/** @jest-environment node */
import { isEligible, isStaff } from "../eligibility";

describe("isStaff", () => {
  it.each([
    [["reviewer"], true],
    [["admin"], true],
    [["fulfillment"], true],
    [["student"], false],
    [[], false],
    [null, false],
  ])("%j -> %s", (roles, expected) => {
    expect(isStaff(roles as string[] | null)).toBe(expected);
  });
});

describe("isEligible (same rule as bot/src/quests/context.ts)", () => {
  const cases: Array<[string, Parameters<typeof isEligible>[0], boolean]> = [
    ["staff without any Discord role", { sessionRoles: ["admin"], studentRoleIds: ["r1"], memberRoleIds: [] }, true],
    ["staff while the pilot is closed", { sessionRoles: ["reviewer"], studentRoleIds: [], memberRoleIds: [] }, true],
    ["student holding a configured role", { sessionRoles: [], studentRoleIds: ["r1", "r2"], memberRoleIds: ["x", "r2"] }, true],
    ["student without a configured role", { sessionRoles: [], studentRoleIds: ["r1"], memberRoleIds: ["x"] }, false],
    ["anyone while no student role is configured", { sessionRoles: [], studentRoleIds: [], memberRoleIds: ["r1"] }, false],
    ["missing lists", { sessionRoles: null, studentRoleIds: null, memberRoleIds: null }, false],
  ];
  it.each(cases)("%s", (_label, input, expected) => {
    expect(isEligible(input)).toBe(expected);
  });
});

describe("fetchShiftGuildMember", () => {
  const ENV = { ...process.env };
  const fetchMock = jest.fn();
  let now = 1_000_000;

  /** A fresh module per test, so the member cache starts empty. */
  async function load() {
    jest.resetModules();
    return (await import("@/lib/shift/discordGuild")).fetchShiftGuildMember;
  }

  const json = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  beforeEach(() => {
    process.env = { ...ENV, DISCORD_SHIFT_BOT_TOKEN: "bot-token", DISCORD_SHIFT_GUILD_ID: "999999999999999999" };
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    now = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    process.env = ENV;
    jest.restoreAllMocks();
  });

  const ID = "123456789012345678";

  it("is not_configured without a token or guild, and never calls Discord", async () => {
    delete process.env.DISCORD_SHIFT_GUILD_ID;
    await expect((await load())(ID)).resolves.toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an id that is not a snowflake without calling Discord", async () => {
    await expect((await load())("../roles")).resolves.toEqual({ ok: false, reason: "error" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns roles and nick, and caches them for 60 s", async () => {
    const fetchMember = await load();
    fetchMock.mockResolvedValue(json(200, { roles: ["r1", 5, "r2"], nick: " Mint " }));
    await expect(fetchMember(ID)).resolves.toEqual({ ok: true, roles: ["r1", "r2"], nick: "Mint" });
    expect(fetchMock).toHaveBeenCalledWith(
      `https://discord.com/api/v10/guilds/999999999999999999/members/${ID}`,
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ Authorization: "Bot bot-token" }) })
    );
    now += 59_000;
    await fetchMember(ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now += 2_000;
    await fetchMember(ID);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps 404 Unknown Member to not_member (cached 15 s) and other 404s to error", async () => {
    const fetchMember = await load();
    fetchMock.mockResolvedValue(json(404, { code: 10007 }));
    await expect(fetchMember(ID)).resolves.toEqual({ ok: false, reason: "not_member" });
    now += 14_000;
    await fetchMember(ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now += 2_000;
    await fetchMember(ID);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockResolvedValue(json(404, { code: 10004 }));
    await expect(fetchMember("223456789012345678")).resolves.toEqual({ ok: false, reason: "error" });
  });

  it("maps 429 to rate_limited and a thrown fetch to error when nothing is cached", async () => {
    const fetchMember = await load();
    fetchMock.mockResolvedValueOnce(json(429, {}));
    await expect(fetchMember(ID)).resolves.toEqual({ ok: false, reason: "rate_limited" });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    await expect(fetchMember(ID)).resolves.toEqual({ ok: false, reason: "error" });
  });

  it("serves a recent answer while Discord rate limits or fails", async () => {
    const fetchMember = await load();
    fetchMock.mockResolvedValueOnce(json(200, { roles: ["r1"], nick: null }));
    await fetchMember(ID);
    now += 61_000;
    fetchMock.mockResolvedValueOnce(json(429, {}));
    await expect(fetchMember(ID)).resolves.toEqual({ ok: true, roles: ["r1"], nick: null });
    fetchMock.mockResolvedValueOnce(json(500, {}));
    await expect(fetchMember(ID)).resolves.toEqual({ ok: true, roles: ["r1"], nick: null });
    // Too old to stand in.
    now += 11 * 60_000;
    fetchMock.mockResolvedValueOnce(json(500, {}));
    await expect(fetchMember(ID)).resolves.toEqual({ ok: false, reason: "error" });
  });
});
