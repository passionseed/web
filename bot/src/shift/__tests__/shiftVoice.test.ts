import { pickRoster, type RosterRow } from "../roster";
import { NOT_IN_VOICE, flagsChanged, roundFromRoles, toFlags, type RawVoiceState } from "../state";

const base: RawVoiceState = {
  channelId: "room",
  channelName: "ห้องกลาง",
  selfMute: false,
  selfDeaf: false,
  serverMute: false,
  serverDeaf: false,
  streaming: false,
  selfVideo: false,
};

describe("toFlags", () => {
  it("reads mic, screen share and camera", () => {
    expect(toFlags({ ...base, streaming: true, selfVideo: true }, null)).toEqual({
      channelId: "room",
      channelName: "ห้องกลาง",
      micOpen: true,
      streaming: true,
      camera: true,
    });
  });

  it("treats self mute, deafen and server mute as mic closed", () => {
    expect(toFlags({ ...base, selfMute: true }, null).micOpen).toBe(false);
    expect(toFlags({ ...base, selfDeaf: true }, null).micOpen).toBe(false);
    expect(toFlags({ ...base, serverMute: true }, null).micOpen).toBe(false);
  });

  it("counts the AFK channel and no channel as not in voice", () => {
    expect(toFlags(base, "room")).toEqual(NOT_IN_VOICE);
    expect(toFlags({ ...base, channelId: null }, null)).toEqual(NOT_IN_VOICE);
  });
});

describe("flagsChanged", () => {
  it("ignores updates that change nothing recorded", () => {
    const a = toFlags(base, null);
    // Deafen while already muted: same recorded state.
    const muted = toFlags({ ...base, selfMute: true }, null);
    const mutedDeaf = toFlags({ ...base, selfMute: true, selfDeaf: true }, null);
    expect(flagsChanged(a, { ...a, channelName: "renamed" })).toBe(false);
    expect(flagsChanged(muted, mutedDeaf)).toBe(false);
  });

  it("sees join, leave, move, mic, stream and camera", () => {
    const a = toFlags(base, null);
    expect(flagsChanged(NOT_IN_VOICE, a)).toBe(true);
    expect(flagsChanged(a, NOT_IN_VOICE)).toBe(true);
    expect(flagsChanged(a, { ...a, channelId: "other" })).toBe(true);
    expect(flagsChanged(a, { ...a, micOpen: false })).toBe(true);
    expect(flagsChanged(a, { ...a, streaming: true })).toBe(true);
    expect(flagsChanged(a, { ...a, camera: true })).toBe(true);
  });
});

describe("roundFromRoles", () => {
  const inSession = new Set(["SHIFT[3]", "SHIFT[4]"]);

  it("picks the newest round in session", () => {
    expect(roundFromRoles(["@everyone", "SHIFT[3]", "SHIFT[4]"], inSession)).toBe("SHIFT[4]");
  });

  it("ignores finished rounds and lookalike roles", () => {
    expect(roundFromRoles(["SHIFT[2]"], inSession)).toBeNull();
    expect(roundFromRoles(["SHIFT[3] mentor", "shift[3]"], inSession)).toBeNull();
  });
});

describe("pickRoster", () => {
  const row = (id: string, discord: string | null, paid: boolean, created: string): RosterRow => ({
    applicationId: id,
    cohort: "SHIFT[3]",
    discordUserId: discord,
    paid,
    createdAt: created,
  });

  it("keeps one application per Discord account, paid first, then newest", () => {
    const roster = pickRoster([
      row("unpaid-new", "d1", false, "2026-11-08"),
      row("paid-old", "d1", true, "2026-11-01"),
      row("first", "d2", false, "2026-11-01"),
      row("second", "d2", false, "2026-11-02"),
      row("no-discord", null, true, "2026-11-01"),
    ]);
    expect(Object.fromEntries([...roster].map(([d, e]) => [d, e.applicationId]))).toEqual({
      d1: "paid-old",
      d2: "second",
    });
  });
});
