import { islandDiscordUrl, islandViewer, MENTOR_TICKET, type IslandViewerInput } from "../islandInvite";

const base: IslandViewerInput = {
  user: { anonymous: false },
  isAdmin: false,
  member: null,
  linkedApplication: null,
  rsvp: false,
  phase: "running",
};
const member = { nickname: "Fah", cohort: "SHIFT 3", status: "confirmed" as const };
const URL = "https://discord.com/channels/1";

describe("islandViewer", () => {
  test("null user is signedOut", () => {
    expect(islandViewer({ ...base, user: null }, URL)).toEqual({ kind: "signedOut" });
  });
  test("anonymous user is signedOut even with a member record", () => {
    expect(islandViewer({ ...base, user: { anonymous: true }, member, rsvp: true }, URL)).toEqual({ kind: "signedOut" });
  });
  test("no member and no linked application is notAlumni", () => {
    expect(islandViewer(base, URL)).toEqual({ kind: "notAlumni" });
  });
  test("declined member is notAlumni", () => {
    expect(islandViewer({ ...base, member: { ...member, status: "declined" }, rsvp: true }, URL)).toEqual({ kind: "notAlumni" });
  });
  test("pending member without rsvp can rsvp", () => {
    expect(islandViewer({ ...base, member: { ...member, status: "pending" } }, URL)).toEqual({ kind: "canRsvp" });
  });
  test("linked paid application without member can rsvp", () => {
    expect(islandViewer({ ...base, linkedApplication: { nickname: "A", cohort: "C" } }, URL)).toEqual({ kind: "canRsvp" });
  });
  test("admin with no member can rsvp", () => {
    expect(islandViewer({ ...base, isAdmin: true }, URL)).toEqual({ kind: "canRsvp" });
  });
  test("member with rsvp is going with ticket and discord url", () => {
    expect(islandViewer({ ...base, member, rsvp: true }, URL)).toEqual({
      kind: "going",
      ticket: { nickname: "Fah", cohort: "SHIFT 3" },
      discordUrl: URL,
    });
  });
  test("admin with rsvp and no member is going as mentor", () => {
    expect(islandViewer({ ...base, isAdmin: true, rsvp: true }, null)).toEqual({
      kind: "going",
      ticket: MENTOR_TICKET,
      discordUrl: null,
    });
  });
  test("after: alumni without rsvp is closed", () => {
    expect(islandViewer({ ...base, member, phase: "after" }, URL)).toEqual({ kind: "closed" });
  });
  test("after: alumni with rsvp stays going", () => {
    expect(islandViewer({ ...base, member, rsvp: true, phase: "after" }, URL)).toMatchObject({
      kind: "going",
      ticket: { nickname: "Fah", cohort: "SHIFT 3" },
    });
  });
});

describe("islandDiscordUrl", () => {
  test("island env wins", () => {
    expect(
      islandDiscordUrl({
        DISCORD_SHIFT_ISLAND_CHANNEL_URL: "https://x/island",
        DISCORD_SHIFT_GUILD_ID: "9",
        DISCORD_SHIFT_INVITE_URL: "https://x/inv",
      } as NodeJS.ProcessEnv),
    ).toBe("https://x/island");
  });
  test("falls back to the guild url", () => {
    expect(
      islandDiscordUrl({ DISCORD_SHIFT_GUILD_ID: "9", DISCORD_SHIFT_INVITE_URL: "https://x/inv" } as NodeJS.ProcessEnv),
    ).toBe("https://discord.com/channels/9");
  });
  test("then the invite url, empty strings count as unset", () => {
    expect(
      islandDiscordUrl({
        DISCORD_SHIFT_ISLAND_CHANNEL_URL: "",
        DISCORD_SHIFT_GUILD_ID: "",
        DISCORD_SHIFT_INVITE_URL: "https://x/inv",
      } as NodeJS.ProcessEnv),
    ).toBe("https://x/inv");
  });
  test("all unset is null", () => {
    expect(islandDiscordUrl({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
