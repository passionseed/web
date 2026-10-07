/** @jest-environment node */

import { joinShiftGuild } from "../discordGuild";
import { isDiscordOAuthJoinError } from "../discordErrors";

const fetchMock = jest.fn();
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
let cohortNumber = 0;
let cohortName: string;

const response = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
  process.env.DISCORD_BOT_TOKEN = "test-notification-bot";
  process.env.DISCORD_SHIFT_GUILD_ID = "test-guild";
  delete process.env.DISCORD_SHIFT_BOT_TOKEN;
  delete process.env.DISCORD_SHIFT_ROLE_IDS;
  // Each case gets an uncached role lookup.
  cohortName = `SHIFT[test-${++cohortNumber}]`;
  fetchMock.mockResolvedValueOnce(response(200, [{ id: "cohort-role", name: cohortName }]));
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

const join = (accessToken: string | null = "test-oauth-token") =>
  joinShiftGuild({ discordUserId: "test-student", cohortName, accessToken });

it("adds a new student with their cohort role and bounded nickname", async () => {
  fetchMock.mockResolvedValueOnce(response(201));
  expect(await joinShiftGuild({
    discordUserId: "test-student",
    cohortName,
    accessToken: "test-oauth-token",
    nickname: "a".repeat(40),
  })).toEqual({ ok: true, state: "joined" });
  const [url, init] = fetchMock.mock.calls[1];
  expect(url).toBe("https://discord.com/api/v10/guilds/test-guild/members/test-student");
  expect(init.headers.Authorization).toBe("Bot test-notification-bot");
  expect(JSON.parse(init.body)).toEqual({
    access_token: "test-oauth-token", roles: ["cohort-role"], nick: "a".repeat(32),
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("prefers the dedicated SHIFT bot over the notification bot", async () => {
  process.env.DISCORD_SHIFT_BOT_TOKEN = "test-oauth-app-bot";
  fetchMock.mockResolvedValueOnce(response(201));
  expect((await join()).ok).toBe(true);
  for (const [, init] of fetchMock.mock.calls) {
    expect(init.headers.Authorization).toBe("Bot test-oauth-app-bot");
  }
});

it("uses the dedicated bot even when no shared bot token is configured", async () => {
  delete process.env.DISCORD_BOT_TOKEN;
  process.env.DISCORD_SHIFT_BOT_TOKEN = "test-oauth-app-bot";
  fetchMock.mockResolvedValueOnce(response(201));
  expect(await join()).toEqual({ ok: true, state: "joined" });
});

it("assigns roles separately when Discord says the student is already a member", async () => {
  fetchMock.mockResolvedValueOnce(response(204)).mockResolvedValueOnce(response(204));
  expect(await join()).toEqual({ ok: true, state: "already_member" });
  expect(fetchMock.mock.calls[2][0]).toContain("/members/test-student/roles/cohort-role");
});

it("can assign roles after invite acceptance without an OAuth token", async () => {
  fetchMock.mockResolvedValueOnce(response(204));
  expect(await join(null)).toEqual({ ok: true, state: "already_member" });
  expect(fetchMock.mock.calls[1][0]).toContain("/members/test-student/roles/cohort-role");
  expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
});

it.each([50025, 50026])("recovers OAuth error %s for a student already in the server", async (code) => {
  fetchMock
    .mockResolvedValueOnce(response(403, { message: "OAuth rejected", code }))
    .mockResolvedValueOnce(response(204));
  expect(await join()).toEqual({ ok: true, state: "already_member" });
  expect(fetchMock.mock.calls[2][0]).toContain("/members/test-student/roles/cohort-role");
});

it.each([50025, 50026])("offers invite recovery after OAuth error %s when the student is absent", async (code) => {
  fetchMock
    .mockResolvedValueOnce(response(403, { message: "OAuth rejected", code }))
    .mockResolvedValueOnce(response(404, { message: "Unknown Member", code: 10007 }));
  expect(await join()).toMatchObject({ ok: false, state: "not_member" });
});

it.each([
  [403, { message: "Missing Permissions", code: 50013 }],
  [401, { message: "Invalid authentication token", code: 50014 }],
  [403, { message: "Banned", code: 40007 }],
  [429, { message: "Rate limited", retry_after: 1 }],
  [500, { message: "Unexpected failure" }],
])("keeps non-OAuth HTTP %s failures visible without a role retry", async (status, body) => {
  fetchMock.mockResolvedValueOnce(response(status as number, body));
  expect(await join()).toMatchObject({ ok: false, state: "error" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("does not hide a bot permission error during OAuth fallback", async () => {
  fetchMock
    .mockResolvedValueOnce(response(403, { message: "OAuth rejected", code: 50025 }))
    .mockResolvedValueOnce(response(403, { message: "Missing Permissions", code: 50013 }));
  expect(await join()).toEqual({
    ok: false, state: "error", message: 'Discord 403: {"message":"Missing Permissions","code":50013}',
  });
});

it("requires a guild ID before making any Discord request", async () => {
  delete process.env.DISCORD_SHIFT_GUILD_ID;
  expect(await join()).toMatchObject({ ok: false, state: "not_configured" });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("recognizes the persisted 50025 error from the report, but rejects malformed errors", () => {
  expect(isDiscordOAuthJoinError('Discord 403: {"message": "Invalid OAuth2 access token", "code": 50025}')).toBe(true);
  expect(isDiscordOAuthJoinError("Discord 403: not JSON")).toBe(false);
  expect(isDiscordOAuthJoinError('Discord 403: null')).toBe(false);
  expect(isDiscordOAuthJoinError(null)).toBe(false);
});
