/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { discordChannelUrl, suggestUrlOf } from "../links";

const ACTOR = "123456789012345678";
const GUILD = "444444444444444444";
const CHANNEL = "222222222222222222";
const SUGGEST_URL = `https://discord.com/channels/${GUILD}/${CHANNEL}`;

const call = jest.fn();
const api: QuestApi = { call, rows: jest.fn() } as unknown as QuestApi;

const savedGuild = process.env.DISCORD_SHIFT_GUILD_ID;
let errorLog: jest.SpyInstance;

beforeEach(() => {
  call.mockReset();
  process.env.DISCORD_SHIFT_GUILD_ID = GUILD;
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorLog.mockRestore();
  if (savedGuild === undefined) delete process.env.DISCORD_SHIFT_GUILD_ID;
  else process.env.DISCORD_SHIFT_GUILD_ID = savedGuild;
});

const logged = () => errorLog.mock.calls.flat().map(String).join("\n");

describe("discordChannelUrl", () => {
  it("links the channel in the SHIFT server", () => {
    expect(discordChannelUrl(CHANNEL)).toBe(SUGGEST_URL);
  });

  it.each([[null], [undefined], [222222222222222222], ["../x"], ["12"], ["1".repeat(26)], [""]])(
    "is null for a channel id that is not a snowflake string (%p)",
    (channel) => {
      expect(discordChannelUrl(channel)).toBeNull();
    },
  );

  it("is null when no guild is configured, or the guild is not a snowflake", () => {
    delete process.env.DISCORD_SHIFT_GUILD_ID;
    expect(discordChannelUrl(CHANNEL)).toBeNull();
    process.env.DISCORD_SHIFT_GUILD_ID = "../evil";
    expect(discordChannelUrl(CHANNEL)).toBeNull();
    process.env.DISCORD_SHIFT_GUILD_ID = "1/2";
    expect(discordChannelUrl(CHANNEL)).toBeNull();
  });
});

describe("suggestUrlOf", () => {
  it("calls shift_quest_island_links with the actor and links the suggestions channel", async () => {
    call.mockResolvedValue({ suggest_channel_id: CHANNEL });
    expect(await suggestUrlOf(api, ACTOR)).toBe(SUGGEST_URL);
    expect(call).toHaveBeenCalledWith("shift_quest_island_links", ACTOR);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("is null, quietly, when no suggestions channel is set", async () => {
    call.mockResolvedValue({ suggest_channel_id: null });
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("is null when no guild is configured, logging the code once per process", async () => {
    delete process.env.DISCORD_SHIFT_GUILD_ID;
    call.mockResolvedValue({ suggest_channel_id: CHANNEL });
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(logged()).toContain("links read failed: no_guild");
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("no_guild"))).toHaveLength(1);
  });

  it("keeps logging every other failure each time", async () => {
    call.mockResolvedValue({ suggest_channel_id: "../x" });
    await suggestUrlOf(api, ACTOR);
    await suggestUrlOf(api, ACTOR);
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("malformed"))).toHaveLength(2);
  });

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an array", [{ suggest_channel_id: CHANNEL }]],
    ["no key", {}],
    ["a bad channel id", { suggest_channel_id: "../x" }],
    ["a numeric channel id", { suggest_channel_id: 222222222222222222 }],
  ])("is null for malformed data (%s)", async (_label, raw) => {
    call.mockResolvedValue(raw);
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(logged()).toContain("links read failed: malformed");
  });

  it.each([
    ["a refusal", new QuestError("not_started"), "sq:not_started"],
    ["no grant (42501)", new QuestDbError("shift_quest_island_links", "42501"), "SQLSTATE 42501"],
    ["a dropped connection", new QuestDbError("shift_quest_island_links", "08006"), "SQLSTATE 08006"],
    ["an unexpected error", new TypeError("student text in a message"), "TypeError"],
  ])("fails soft on %s and logs only a code", async (_label, error, code) => {
    call.mockRejectedValue(error);
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(logged()).toContain(`links read failed: ${code}`);
    expect(logged()).not.toContain("student text");
    expect(logged()).not.toContain(ACTOR);
  });

  it("fails soft when the function is missing (42883) and logs it once per process", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_island_links", "42883"));
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(await suggestUrlOf(api, ACTOR)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("42883"))).toHaveLength(1);
  });
});
