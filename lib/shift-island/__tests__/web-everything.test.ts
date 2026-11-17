import type { QuestApi } from "@/bot/src/quests/api";

import {
  MAX_CONTRIBUTORS,
  SHARE_DRAFTS_PER_DAY,
  TEAM_SIDE_SLUGS,
  WEB_EVERYTHING_SCHEMA,
  WEB_KEY_PREFIX,
  webEverythingAvailable,
} from "../web-everything";

function api(version: () => Promise<unknown>): QuestApi {
  return {
    call: jest.fn(() => version()) as QuestApi["call"],
    rows: jest.fn() as QuestApi["rows"],
  };
}

describe("the website-does-everything gate", () => {
  it("matches the database (20261118100000)", () => {
    expect(WEB_EVERYTHING_SCHEMA).toBe(17);
    expect(MAX_CONTRIBUTORS).toBe(8);
    expect(SHARE_DRAFTS_PER_DAY).toBe(5);
    expect(TEAM_SIDE_SLUGS).toEqual(["side-help-a-builder", "side-improve-community"]);
    expect(WEB_KEY_PREFIX).toEqual({ recognize: "web-recog:", award: "web-award:", reverse: "web-rev:" });
  });

  it("is open from schema 17", async () => {
    await expect(webEverythingAvailable(api(async () => 16))).resolves.toBe(true);
    await expect(webEverythingAvailable(api(async () => "17"))).resolves.toBe(true);
  });

  it("stays shut below 16 or when the version cannot be read", async () => {
    await expect(webEverythingAvailable(api(async () => 15))).resolves.toBe(false);
    await expect(webEverythingAvailable(api(async () => {
      throw new Error("down");
    }))).resolves.toBe(false);
  });

  it("reads the version once per api", async () => {
    const one = api(async () => 16);
    await webEverythingAvailable(one);
    await webEverythingAvailable(one);
    expect(one.call).toHaveBeenCalledTimes(1);
    expect(one.call).toHaveBeenCalledWith("shift_quest_schema_version");
  });
});
