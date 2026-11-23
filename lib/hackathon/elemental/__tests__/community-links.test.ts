import { elementalCommunityLinks } from "../community-links";

describe("elementalCommunityLinks", () => {
  it("returns the links without tracking params", () => {
    const links = elementalCommunityLinks({
      ELEMENTAL_LINE_GROUP_URL: "https://line.me/ti/g2/abc?utm_source=invitation",
      ELEMENTAL_DISCORD_URL: "https://discord.gg/xyz",
    } as NodeJS.ProcessEnv);
    expect(links).toEqual({ line: "https://line.me/ti/g2/abc", discord: "https://discord.gg/xyz" });
  });

  it("drops missing, malformed or off-site links", () => {
    expect(
      elementalCommunityLinks({
        ELEMENTAL_LINE_GROUP_URL: "http://line.me/ti/g2/abc",
        ELEMENTAL_DISCORD_URL: "https://evil.example/discord",
      } as NodeJS.ProcessEnv),
    ).toEqual({ line: null, discord: null });
    expect(elementalCommunityLinks({} as NodeJS.ProcessEnv)).toEqual({ line: null, discord: null });
  });
});
