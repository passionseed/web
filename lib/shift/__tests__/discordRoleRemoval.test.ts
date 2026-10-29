/** @jest-environment node */

import { removeShiftCohortRole } from "../discordGuild";

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
  cohortName = `SHIFT[removal-${++cohortNumber}]`;
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
});

const remove = () => removeShiftCohortRole({ discordUserId: "test-student", cohortName });

it("removes only the round's role, under its own audit reason", async () => {
  process.env.DISCORD_SHIFT_ROLE_IDS = "extra-role";
  fetchMock
    .mockResolvedValueOnce(response(200, [{ id: "cohort-role", name: cohortName }]))
    .mockResolvedValueOnce(response(204));
  expect(await remove()).toEqual({ ok: true, state: "removed" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const [url, init] = fetchMock.mock.calls[1];
  expect(url).toBe("https://discord.com/api/v10/guilds/test-guild/members/test-student/roles/cohort-role");
  expect(init.method).toBe("DELETE");
  expect(init.headers["X-Audit-Log-Reason"]).toBe("SHIFT application declined");
});

it("never creates a missing role just to remove it", async () => {
  fetchMock.mockResolvedValueOnce(response(200, [{ id: "other-role", name: "SHIFT[other]" }]));
  expect(await remove()).toEqual({ ok: true, state: "nothing_to_remove" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("treats a member who already left the server as nothing to remove", async () => {
  fetchMock
    .mockResolvedValueOnce(response(200, [{ id: "cohort-role", name: cohortName }]))
    .mockResolvedValueOnce(response(404, { message: "Unknown Member", code: 10007 }));
  expect(await remove()).toEqual({ ok: true, state: "nothing_to_remove" });
});

it("reports a permission failure instead of claiming the role is gone", async () => {
  fetchMock
    .mockResolvedValueOnce(response(200, [{ id: "cohort-role", name: cohortName }]))
    .mockResolvedValueOnce(response(403, { message: "Missing Permissions", code: 50013 }));
  expect(await remove()).toEqual(expect.objectContaining({ ok: false, state: "error" }));
});

it("skips Discord entirely when the bot is not configured", async () => {
  delete process.env.DISCORD_SHIFT_GUILD_ID;
  expect(await remove()).toEqual(expect.objectContaining({ ok: false, state: "not_configured" }));
  expect(fetchMock).not.toHaveBeenCalled();
});
