/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { deepfireOf } from "../deepfire";

const ACTOR = "123456789012345678";
const GUILD = "111111111111111111";
const ENV_GUILD = "444444444444444444";
const LOBBY = "666666666666666666";

const call = jest.fn();
const api: QuestApi = { call, rows: jest.fn() } as unknown as QuestApi;

const savedGuild = process.env.DISCORD_SHIFT_GUILD_ID;
let errorLog: jest.SpyInstance;

beforeEach(() => {
  call.mockReset();
  delete process.env.DISCORD_SHIFT_GUILD_ID;
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorLog.mockRestore();
  if (savedGuild === undefined) delete process.env.DISCORD_SHIFT_GUILD_ID;
  else process.env.DISCORD_SHIFT_GUILD_ID = savedGuild;
});

const logged = () => errorLog.mock.calls.flat().map(String).join("\n");
const LIVE = { channel_id: LOBBY, guild_id: GUILD, live: true };

describe("deepfireOf", () => {
  it("reads shift_quest_deepfire with the actor only", async () => {
    call.mockResolvedValue(LIVE);
    await deepfireOf(api, ACTOR);
    expect(call).toHaveBeenCalledWith("shift_quest_deepfire", ACTOR);
  });

  it("links the lobby in the guild the bot reported, and says the keeper is there", async () => {
    call.mockResolvedValue(LIVE);
    expect(await deepfireOf(api, ACTOR)).toEqual({ joinUrl: `https://discord.com/channels/${GUILD}/${LOBBY}`, live: true });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it.each([
    ["false", false],
    ["missing", undefined],
    ["a string", "true"],
    ["a number", 1],
  ])("is asleep (live false) when live is %s", async (_label, live) => {
    call.mockResolvedValue({ ...LIVE, live });
    expect(await deepfireOf(api, ACTOR)).toEqual({ joinUrl: `https://discord.com/channels/${GUILD}/${LOBBY}`, live: false });
  });

  it("falls back to DISCORD_SHIFT_GUILD_ID when the bot has not reported a guild (or a bad one)", async () => {
    process.env.DISCORD_SHIFT_GUILD_ID = ENV_GUILD;
    for (const guild_id of [null, "not-a-guild", 42]) {
      call.mockResolvedValue({ ...LIVE, guild_id, live: false });
      expect(await deepfireOf(api, ACTOR)).toEqual({ joinUrl: `https://discord.com/channels/${ENV_GUILD}/${LOBBY}`, live: false });
    }
  });

  it("is null, quietly, when no lobby is set", async () => {
    call.mockResolvedValue({ channel_id: null, guild_id: null, live: false });
    expect(await deepfireOf(api, ACTOR)).toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("is null when no guild is known at all, logging a code", async () => {
    call.mockResolvedValue({ ...LIVE, guild_id: null });
    expect(await deepfireOf(api, ACTOR)).toBeNull();
    expect(logged()).toContain("deep fire read failed: no_guild");
  });

  it.each([
    ["a refusal", new QuestError("not_started"), "sq:not_started"],
    ["no grant (42501)", new QuestDbError("shift_quest_deepfire", "42501"), "SQLSTATE 42501"],
    ["an unexpected error", new TypeError("student text in a message"), "TypeError"],
  ])("fails soft on %s and logs only a code", async (_label, error, code) => {
    call.mockRejectedValue(error);
    expect(await deepfireOf(api, ACTOR)).toBeNull();
    expect(logged()).toContain(`deep fire read failed: ${code}`);
    expect(logged()).not.toContain("student text");
  });

  it("fails soft when the function is missing (42883, before the migration) and logs it once per process", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_deepfire", "42883"));
    expect(await deepfireOf(api, ACTOR)).toBeNull();
    expect(await deepfireOf(api, ACTOR)).toBeNull();
    expect(await deepfireOf(api, ACTOR)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("42883"))).toHaveLength(1);
  });

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an array", [LIVE]],
    ["no channel key", { guild_id: GUILD, live: true }],
    ["a bad channel id", { ...LIVE, channel_id: "../x" }],
    ["a numeric channel id", { ...LIVE, channel_id: 666666666666666666 }],
  ])("is null for malformed data (%s)", async (_label, raw) => {
    call.mockResolvedValue(raw);
    expect(await deepfireOf(api, ACTOR)).toBeNull();
    expect(logged()).toContain("malformed");
  });

  it("never returns ids, names or times, whatever else the database sends", async () => {
    call.mockResolvedValue({ ...LIVE, owner_id: "333333333333333333", rooms: 3, beat_at: "2026-11-20T08:00:00Z", name: "Mint" });
    const fire = await deepfireOf(api, ACTOR);
    expect(Object.keys(fire ?? {}).sort()).toEqual(["joinUrl", "live"]);
    const json = JSON.stringify(fire);
    for (const secret of ["333333333333333333", "2026-11-20", "Mint", ACTOR]) expect(json).not.toContain(secret);
  });
});
