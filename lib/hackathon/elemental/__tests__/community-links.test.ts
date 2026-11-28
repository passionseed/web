import { elementalCommunityLinks, elementalTeamUpUrl, needsTeammates } from "../community-links";

describe("elementalCommunityLinks", () => {
  it("returns the links without tracking params", () => {
    const links = elementalCommunityLinks({
      ELEMENTAL_LINE_GROUP_URL: "https://line.me/ti/g2/abc?utm_source=invitation",
      ELEMENTAL_DISCORD_URL: "https://discord.gg/xyz",
    } as unknown as NodeJS.ProcessEnv);
    expect(links).toEqual({ line: "https://line.me/ti/g2/abc", discord: "https://discord.gg/xyz" });
  });

  it("drops missing, malformed or off-site links", () => {
    expect(
      elementalCommunityLinks({
        ELEMENTAL_LINE_GROUP_URL: "http://line.me/ti/g2/abc",
        ELEMENTAL_DISCORD_URL: "https://evil.example/discord",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual({ line: null, discord: null });
    expect(elementalCommunityLinks({} as unknown as NodeJS.ProcessEnv)).toEqual({ line: null, discord: null });
  });
});

describe("elementalTeamUpUrl", () => {
  it("returns the OpenChat link without tracking params", () => {
    expect(
      elementalTeamUpUrl({
        ELEMENTAL_TEAMUP_OPENCHAT_URL: "https://line.me/ti/g2/team?utm_source=invitation&utm_medium=link_copy",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("https://line.me/ti/g2/team");
  });

  it("drops a missing or off-site link", () => {
    expect(elementalTeamUpUrl({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(elementalTeamUpUrl({ ELEMENTAL_TEAMUP_OPENCHAT_URL: "https://evil.example/x" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});

describe("needsTeammates", () => {
  const roster = (n: number) => Array.from({ length: n }, () => ({ name: "x", paid: false }));

  it("is true for someone who signed up alone", () => {
    expect(needsTeammates({ memberCount: 1, team: null }, 2)).toBe(true);
  });

  it("is false for a group on one sign-up", () => {
    expect(needsTeammates({ memberCount: 3, team: null }, 2)).toBe(false);
  });

  it("is true while a team is smaller than the minimum, false once it isn't", () => {
    expect(needsTeammates({ memberCount: 1, team: { roster: roster(1) } }, 2)).toBe(true);
    expect(needsTeammates({ memberCount: 1, team: { roster: roster(2) } }, 2)).toBe(false);
  });
});
