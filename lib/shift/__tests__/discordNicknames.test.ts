/** @jest-environment node */

import { fetchShiftNicknames } from "../discordGuild";

const fetchMock = jest.fn();
const originalFetch = global.fetch;
const originalEnv = { ...process.env };

const member = (nick: string | null) => new Response(JSON.stringify({ roles: [], nick, avatar: null, user: { avatar: null } }), { status: 200 });

beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
  process.env.DISCORD_BOT_TOKEN = "test-bot";
  process.env.DISCORD_SHIFT_GUILD_ID = "test-guild";
  delete process.env.DISCORD_SHIFT_BOT_TOKEN;
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
});

it("returns server nicknames for members who set one", async () => {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith("/members/100000000000000001")) return member("มิ้นท์ Mint");
    if (url.endsWith("/members/100000000000000002")) return member(null);
    return new Response(JSON.stringify({ code: 10007 }), { status: 404 });
  });
  const nicks = await fetchShiftNicknames(["100000000000000001", "100000000000000002", "100000000000000003", "not-an-id"]);
  expect([...nicks]).toEqual([["100000000000000001", "มิ้นท์ Mint"]]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("gives up on Discord after the time limit", async () => {
  fetchMock.mockImplementation(() => new Promise(() => {}));
  const started = Date.now();
  const nicks = await fetchShiftNicknames(["100000000000000009"], 50);
  expect(nicks.size).toBe(0);
  expect(Date.now() - started).toBeLessThan(1000);
});

it("asks nothing when the server is not configured", async () => {
  delete process.env.DISCORD_SHIFT_GUILD_ID;
  expect((await fetchShiftNicknames(["100000000000000001"])).size).toBe(0);
  expect(fetchMock).not.toHaveBeenCalled();
});
