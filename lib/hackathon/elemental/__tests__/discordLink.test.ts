/** @jest-environment node */

import {
  elementalDiscordCallbackUrl,
  elementalJoinPath,
  isHackathonPath,
  parseElementalDiscordOutcome,
  tokenFromElementalJoinPath,
} from "../discordLink";
import { joinElementalGuild } from "../discordJoin";

const TOKEN = "0123456789abcdef0123456789abcdef";

describe("sign-up page paths", () => {
  it("reads the pay token only from an exact sign-up page", () => {
    expect(tokenFromElementalJoinPath(elementalJoinPath(TOKEN))).toBe(TOKEN);
    expect(tokenFromElementalJoinPath(`${elementalJoinPath(TOKEN)}?discord=joined`)).toBe(TOKEN);
    expect(tokenFromElementalJoinPath("/hackathon/join/demo")).toBeNull();
    expect(tokenFromElementalJoinPath("/shift/join/abc")).toBeNull();
  });

  it("returns to the sign-up page through the auth callback", () => {
    const url = new URL(elementalDiscordCallbackUrl(TOKEN, "http://0.0.0.0:3000"));
    expect(url.hostname).toBe("localhost");
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("next")).toBe(elementalJoinPath(TOKEN));
  });

  it("treats every /hackathon page as outside the onboard gate", () => {
    expect(isHackathonPath("/hackathon")).toBe(true);
    expect(isHackathonPath(`/hackathon/join/${TOKEN}`)).toBe(true);
    expect(isHackathonPath("/hackathons")).toBe(false);
    expect(isHackathonPath("/me")).toBe(false);
  });

  it("accepts only known outcomes from the query string", () => {
    expect(parseElementalDiscordOutcome("joined")).toBe("joined");
    expect(parseElementalDiscordOutcome("<script>")).toBeNull();
    expect(parseElementalDiscordOutcome(undefined)).toBeNull();
  });
});

describe("joinElementalGuild", () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const response = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status });

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    process.env.DISCORD_BOT_TOKEN = "test-bot";
    process.env.ELEMENTAL_DISCORD_GUILD_ID = "test-guild";
    process.env.ELEMENTAL_DISCORD_ROLE_ID = "test-role";
    delete process.env.DISCORD_SHIFT_BOT_TOKEN;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("adds a new member with the event role and their nickname", async () => {
    fetchMock
      .mockResolvedValueOnce(response(404, { message: "Unknown Member", code: 10007 }))
      .mockResolvedValueOnce(response(201));
    const result = await joinElementalGuild({ discordUserId: "u1", accessToken: "oauth", nickname: "มิว" });
    expect(result).toEqual({ ok: true, state: "joined" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://discord.com/api/v10/guilds/test-guild/members/u1");
    expect(JSON.parse(init.body)).toEqual({ access_token: "oauth", roles: ["test-role"], nick: "มิว" });
  });

  it("gives an existing member the role without their token", async () => {
    fetchMock.mockResolvedValueOnce(response(200, { roles: [] })).mockResolvedValueOnce(response(204));
    const result = await joinElementalGuild({ discordUserId: "u1", accessToken: "oauth", nickname: null });
    expect(result).toEqual({ ok: true, state: "already_member" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://discord.com/api/v10/guilds/test-guild/members/u1/roles/test-role");
  });

  it("reports not_configured without the server env vars", async () => {
    delete process.env.ELEMENTAL_DISCORD_ROLE_ID;
    const result = await joinElementalGuild({ discordUserId: "u1", accessToken: "oauth", nickname: null });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
