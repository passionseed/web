import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Client } from "discord.js";

import { MUSIC_LATE_MS, chimeEnabled, createCampfireVoice, restMusicEnabled } from "../chime";

describe("chime", () => {
  it("is on unless SHIFT_ROUND_CHIME is off", () => {
    expect(chimeEnabled({})).toBe(true);
    expect(chimeEnabled({ SHIFT_ROUND_CHIME: "on" })).toBe(true);
    expect(chimeEnabled({ SHIFT_ROUND_CHIME: " OFF " })).toBe(false);
  });

  it("rest music follows the chime switch and has its own", () => {
    expect(restMusicEnabled({})).toBe(true);
    expect(restMusicEnabled({ SHIFT_REST_MUSIC: "off" })).toBe(false);
    expect(restMusicEnabled({ SHIFT_ROUND_CHIME: "off" })).toBe(false);
  });

  it("turns down rest music it cannot start on time, or when the music is off, so the loop can tell", () => {
    const at = 1_000_000;
    const plan = { channelId: "1", startAt: at, endAt: at + 6 * 60_000, long: false, stillWanted: () => true };
    const late = createCampfireVoice({} as Client, { now: () => at + MUSIC_LATE_MS + 1 });
    expect(late.restMusic(plan)).toBe(false);
    const off = createCampfireVoice({} as Client, { music: false, now: () => at });
    expect(off.restMusic(plan)).toBe(false);
  });

  it.each(["focus", "rest", "rest-short", "rest-long"])("ships %s.ogg as Ogg Opus, so no encoder is needed", (kind) => {
    const file = path.join(__dirname, "..", "..", "..", "assets", "sounds", `${kind}.ogg`);
    expect(existsSync(file)).toBe(true);
    const head = readFileSync(file).subarray(0, 64).toString("latin1");
    expect(head.startsWith("OggS")).toBe(true);
    expect(head).toContain("OpusHead");
  });
});
