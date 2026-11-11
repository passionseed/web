/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import { CAMPFIRE_NONE, campfireJoinUrl, campfireOf, campfireRead, sanitizeVoiceName, VOICE_NAME_FALLBACK } from "../campfire";

const ACTOR = "123456789012345678";
const GUILD = "111111111111111111";
const ENV_GUILD = "444444444444444444";
const CHANNEL = "222222222222222222";

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

describe("sanitizeVoiceName", () => {
  it("keeps a plain name, Thai and emoji included", () => {
    expect(sanitizeVoiceName("Mint")).toBe("Mint");
    expect(sanitizeVoiceName("มิ้นท์ 🌱")).toBe("มิ้นท์ 🌱");
  });

  it("removes bidi controls and zero-width characters", () => {
    expect(sanitizeVoiceName("\u202Eevil\u202C")).toBe("evil");
    expect(sanitizeVoiceName("a\u200Bb\u200Cc\u200Dd\u200Ee\u200Ff")).toBe("abcdef");
    expect(sanitizeVoiceName("\u2066x\u2067y\u2068z\u2069")).toBe("xyz");
    expect(sanitizeVoiceName("\uFEFFname\u202A\u202B\u202D")).toBe("name");
  });

  it("removes C0 and C1 controls and collapses whitespace", () => {
    expect(sanitizeVoiceName("a\u0000b\u0007c\u001Bd\u007Fe\u0085f\u009Fg")).toBe("abcde fg");
    expect(sanitizeVoiceName("  Mint \n\t  K  ")).toBe("Mint K");
    expect(sanitizeVoiceName("two\r\nlines")).toBe("two lines");
  });

  it("caps at 32 characters (code points) and trims what is left", () => {
    expect(sanitizeVoiceName("a".repeat(40))).toBe("a".repeat(32));
    expect(Array.from(sanitizeVoiceName("🌱".repeat(40)))).toHaveLength(32);
    expect(sanitizeVoiceName(`${"a".repeat(31)} bcd`)).toBe("a".repeat(31));
  });

  it.each([[""], ["   "], ["\u200B\u202E"], ["\u0000\u0001"], [null], [undefined], [42], [{}]])(
    "gives the fallback for %p",
    (raw) => {
      expect(sanitizeVoiceName(raw)).toBe(VOICE_NAME_FALLBACK);
    },
  );

  it("has a Thai fallback", () => {
    expect(VOICE_NAME_FALLBACK).toBe("เพื่อนใน SHIFT");
  });
});

describe("campfireJoinUrl", () => {
  it("uses the guild the bot reported when it is a snowflake", () => {
    process.env.DISCORD_SHIFT_GUILD_ID = ENV_GUILD;
    expect(campfireJoinUrl(GUILD, CHANNEL)).toBe(`https://discord.com/channels/${GUILD}/${CHANNEL}`);
  });

  it.each([[null], ["not-a-guild"], ["12"], ["1".repeat(26)]])("falls back to DISCORD_SHIFT_GUILD_ID for %p", (guild) => {
    process.env.DISCORD_SHIFT_GUILD_ID = ENV_GUILD;
    expect(campfireJoinUrl(guild, CHANNEL)).toBe(`https://discord.com/channels/${ENV_GUILD}/${CHANNEL}`);
  });

  it("is empty when no guild is known at all, or the env guild is not a snowflake", () => {
    expect(campfireJoinUrl(null, CHANNEL)).toBe("");
    process.env.DISCORD_SHIFT_GUILD_ID = "../evil";
    expect(campfireJoinUrl(null, CHANNEL)).toBe("");
  });

  it("is empty for a channel id that is not a snowflake", () => {
    expect(campfireJoinUrl(GUILD, "../x")).toBe("");
  });
});

describe("campfireOf", () => {
  const live = { channel_id: CHANNEL, guild_id: GUILD, live: true, count: 3, names: ["Mint", null, "\u202Eครู\u202C"] };

  it("calls shift_quest_campfire with the actor and the names flag", async () => {
    call.mockResolvedValue({ ...live, names: null });
    await campfireOf(api, ACTOR, false);
    expect(call).toHaveBeenCalledWith("shift_quest_campfire", ACTOR, false);
    call.mockResolvedValue(live);
    await campfireOf(api, ACTOR, true);
    expect(call).toHaveBeenLastCalledWith("shift_quest_campfire", ACTOR, true);
  });

  it("returns the count, sanitised names in order and the join link when asked", async () => {
    call.mockResolvedValue(live);
    expect(await campfireOf(api, ACTOR, true)).toEqual({
      count: 3,
      names: ["Mint", VOICE_NAME_FALLBACK, "ครู"],
      joinUrl: `https://discord.com/channels/${GUILD}/${CHANNEL}`,
    });
  });

  it("never returns names unless asked, even if the database sent some", async () => {
    call.mockResolvedValue(live);
    expect(await campfireOf(api, ACTOR, false)).toEqual({
      count: 3,
      names: [],
      joinUrl: `https://discord.com/channels/${GUILD}/${CHANNEL}`,
    });
  });

  it("caps the names at 50", async () => {
    call.mockResolvedValue({ ...live, count: 60, names: Array.from({ length: 60 }, (_, i) => `n${i}`) });
    const fire = await campfireOf(api, ACTOR, true);
    expect(fire?.count).toBe(60);
    expect(fire?.names).toHaveLength(50);
  });

  it("reads as empty (count 0, no names) when the bot is not beating", async () => {
    call.mockResolvedValue({ ...live, live: false, count: 5 });
    expect(await campfireOf(api, ACTOR, true)).toEqual({
      count: 0,
      names: [],
      joinUrl: `https://discord.com/channels/${GUILD}/${CHANNEL}`,
    });
  });

  it("falls back to the env guild when the bot has not reported one", async () => {
    process.env.DISCORD_SHIFT_GUILD_ID = ENV_GUILD;
    call.mockResolvedValue({ ...live, guild_id: null });
    expect((await campfireOf(api, ACTOR, false))?.joinUrl).toBe(`https://discord.com/channels/${ENV_GUILD}/${CHANNEL}`);
  });

  it("is null, quietly, when no coworking channel is set", async () => {
    call.mockResolvedValue({ channel_id: null, guild_id: null, live: false, count: 0, names: null });
    expect(await campfireOf(api, ACTOR, true)).toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("tells no coworking channel apart from a failed read", async () => {
    call.mockResolvedValue({ channel_id: null, guild_id: null, live: false, count: 0, names: null });
    expect(await campfireRead(api, ACTOR, false)).toBe(CAMPFIRE_NONE);
    call.mockRejectedValue(new QuestDbError("shift_quest_campfire", "08006"));
    expect(await campfireRead(api, ACTOR, false)).toBeNull();
    call.mockResolvedValue({ ...live, channel_id: undefined });
    expect(await campfireRead(api, ACTOR, false)).toBeNull();
    call.mockResolvedValue(live);
    expect(await campfireRead(api, ACTOR, false)).toEqual(await campfireOf(api, ACTOR, false));
  });

  it("is null when no guild is known at all, logging a code", async () => {
    call.mockResolvedValue({ ...live, guild_id: null });
    expect(await campfireOf(api, ACTOR, false)).toBeNull();
    expect(logged()).toContain("no_guild");
  });

  it.each([
    ["a refusal", new QuestError("not_started"), "sq:not_started"],
    ["no grant (42501)", new QuestDbError("shift_quest_campfire", "42501"), "SQLSTATE 42501"],
    ["an unexpected error", new TypeError("student text in a message"), "TypeError"],
  ])("fails soft on %s and logs only a code", async (_label, error, code) => {
    call.mockRejectedValue(error);
    expect(await campfireOf(api, ACTOR, true)).toBeNull();
    expect(logged()).toContain(`campfire read failed: ${code}`);
    expect(logged()).not.toContain("student text");
  });

  it("fails soft when the function is missing (42883) and logs it once per process", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_campfire", "42883"));
    expect(await campfireOf(api, ACTOR, false)).toBeNull();
    expect(await campfireOf(api, ACTOR, false)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("42883"))).toHaveLength(1);
  });

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an array", [live]],
    ["a bad channel id", { ...live, channel_id: "../x" }],
    ["a numeric channel id", { ...live, channel_id: 222222222222222222 }],
    ["a negative count", { ...live, count: -1 }],
    ["a fractional count", { ...live, count: 1.5 }],
    ["a missing count", { ...live, count: "many" }],
  ])("is null for malformed data (%s)", async (_label, raw) => {
    call.mockResolvedValue(raw);
    expect(await campfireOf(api, ACTOR, true)).toBeNull();
    expect(logged()).toContain("malformed");
  });

  it("never returns ids or join times, whatever else the database sends", async () => {
    call.mockResolvedValue({ ...live, discord_user_id: "333333333333333333", joined_at: "2026-11-11T08:00:00Z" });
    const fire = await campfireOf(api, ACTOR, true);
    expect(Object.keys(fire ?? {}).sort()).toEqual(["count", "joinUrl", "names"]);
    const json = JSON.stringify(fire);
    expect(json).not.toContain("333333333333333333");
    expect(json).not.toContain("2026-11-11");
    expect(json).not.toContain(ACTOR);
  });
});
