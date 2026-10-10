/** @jest-environment node */

import { NextRequest } from "next/server";

import { POST as postEvents } from "@/app/api/seedstack/events/route";
import { POST as pollLink } from "@/app/api/seedstack/link/poll/route";
import { POST as startLink } from "@/app/api/seedstack/link/start/route";
import { GET as getStatus } from "@/app/api/seedstack/status/route";
import { checkSeedstackToken, createLinkRequest, pollLinkRequest, storeSeedstackEvents } from "@/lib/seedstack/server";

jest.mock("@/lib/seedstack/server", () => ({
  checkSeedstackToken: jest.fn(),
  storeSeedstackEvents: jest.fn(),
  createLinkRequest: jest.fn(),
  pollLinkRequest: jest.fn(),
}));

const check = checkSeedstackToken as jest.Mock;
const store = storeSeedstackEvents as jest.Mock;
const start = createLinkRequest as jest.Mock;
const poll = pollLinkRequest as jest.Mock;

const BEARER = "Bearer psss_abc123";
const EVENT = { id: "evt_12345678", step: "install", event: "done" };
const DEVICE_CODE = "d".repeat(43);

function request(path: string, init: { method?: string; auth?: string; body?: string } = {}) {
  const headers = new Headers(init.auth ? { authorization: init.auth } : {});
  return new NextRequest(`https://example.test${path}`, { method: init.method ?? "POST", headers, body: init.body });
}

async function read(response: Response) {
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const CHECK_FAILURES = [
  { status: 401, error: "invalid_token" },
  { status: 401, error: "expired_token" },
  { status: 403, error: "consent_required" },
  { status: 403, error: "parent_required" },
] as const;

describe("POST /api/seedstack/events", () => {
  const send = (auth: string | undefined, body: string) =>
    postEvents(request("/api/seedstack/events", { auth, body })).then(read);

  it.each([undefined, "garbage", "Bearer not_psss", "Basic psss_abc"])("rejects bearer %p with missing_token", async (auth) => {
    await expect(send(auth, JSON.stringify(EVENT))).resolves.toEqual({
      status: 401,
      body: { ok: false, error: "missing_token" },
    });
    expect(store).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    await expect(send(BEARER, "{nope")).resolves.toEqual({ status: 400, body: { ok: false, error: "invalid_json" } });
  });

  it("rejects an invalid batch", async () => {
    await expect(send(BEARER, JSON.stringify({ events: [] }))).resolves.toEqual({
      status: 400,
      body: { ok: false, error: "invalid_batch" },
    });
    expect(store).not.toHaveBeenCalled();
  });

  // Store checks the token before writing and again after, so either check's failure surfaces here.
  it.each(CHECK_FAILURES)("passes through $status $error", async (failure) => {
    store.mockResolvedValue({ ok: false, ...failure });
    await expect(send(BEARER, JSON.stringify(EVENT))).resolves.toEqual({
      status: failure.status,
      body: { ok: false, error: failure.error },
    });
  });

  it("stores valid events with the bearer and counts rejects", async () => {
    store.mockResolvedValue({ ok: true, stored: 1 });
    await expect(send(BEARER, JSON.stringify({ events: [EVENT, { id: "bad" }] }))).resolves.toEqual({
      status: 200,
      body: { ok: true, stored: 1, rejected: 1 },
    });
    expect(store).toHaveBeenCalledWith("psss_abc123", [expect.objectContaining({ client_event_id: EVENT.id })]);
  });

  it("still checks the token when every event was rejected", async () => {
    store.mockResolvedValue({ ok: true, stored: 0 });
    await expect(send(BEARER, JSON.stringify({ events: [{ id: "bad" }] }))).resolves.toEqual({
      status: 200,
      body: { ok: true, stored: 0, rejected: 1 },
    });
    expect(store).toHaveBeenCalledWith("psss_abc123", []);
  });

  it("answers 500 server_error when storage throws", async () => {
    store.mockRejectedValue(new Error("db down"));
    await expect(send(BEARER, JSON.stringify(EVENT))).resolves.toEqual({
      status: 500,
      body: { ok: false, error: "server_error" },
    });
  });
});

describe("GET /api/seedstack/status", () => {
  const status = (auth?: string) => getStatus(request("/api/seedstack/status", { method: "GET", auth })).then(read);

  it.each([undefined, "garbage", "Bearer not_psss"])("rejects bearer %p with missing_token", async (auth) => {
    await expect(status(auth)).resolves.toEqual({ status: 401, body: { ok: false, error: "missing_token" } });
  });

  it.each(CHECK_FAILURES)("passes through $status $error", async (failure) => {
    check.mockResolvedValue({ ok: false, ...failure });
    await expect(status(BEARER)).resolves.toEqual({ status: failure.status, body: { ok: false, error: failure.error } });
  });

  it("reports active", async () => {
    check.mockResolvedValue({ ok: true, userId: "u1", tokenId: "t1" });
    await expect(status(BEARER)).resolves.toEqual({ status: 200, body: { ok: true, status: "active" } });
    expect(check).toHaveBeenCalledWith("psss_abc123");
  });

  it("answers 500 server_error when the check throws", async () => {
    check.mockRejectedValue(new Error("db down"));
    await expect(status(BEARER)).resolves.toEqual({ status: 500, body: { ok: false, error: "server_error" } });
  });
});

describe("POST /api/seedstack/link/start", () => {
  it("returns the device code, user code and polling hints", async () => {
    start.mockResolvedValue({ deviceCode: DEVICE_CODE, userCode: "ABCD-2345", expiresAt: "x" });
    const { status, body } = await read(await startLink());
    expect(status).toBe(200);
    expect(body).toEqual({
      ok: true,
      device_code: DEVICE_CODE,
      user_code: "ABCD-2345",
      url: expect.stringMatching(/\/shift\/seedstack$/),
      interval: 3,
      expires_in: 600,
    });
  });

  it("answers 500 server_error when creation throws", async () => {
    start.mockRejectedValue(new Error("collisions"));
    await expect(startLink().then(read)).resolves.toEqual({ status: 500, body: { ok: false, error: "server_error" } });
  });
});

describe("POST /api/seedstack/link/poll", () => {
  const send = (body: string) => pollLink(request("/api/seedstack/link/poll", { body })).then(read);

  it.each(["{nope", "{}", JSON.stringify({ device_code: 42 }), JSON.stringify({ device_code: "short" }), JSON.stringify({ device_code: "x".repeat(40) + "!" })])(
    "rejects body %p with invalid_device_code",
    async (body) => {
      await expect(send(body)).resolves.toEqual({ status: 400, body: { ok: false, error: "invalid_device_code" } });
      expect(poll).not.toHaveBeenCalled();
    },
  );

  it("reports pending", async () => {
    poll.mockResolvedValue({ status: "pending" });
    await expect(send(JSON.stringify({ device_code: DEVICE_CODE }))).resolves.toEqual({
      status: 200,
      body: { ok: true, status: "pending" },
    });
    expect(poll).toHaveBeenCalledWith(DEVICE_CODE);
  });

  it("hands over the token once approved", async () => {
    poll.mockResolvedValue({ status: "approved", token: "psss_new" });
    await expect(send(JSON.stringify({ device_code: DEVICE_CODE }))).resolves.toEqual({
      status: 200,
      body: { ok: true, status: "approved", token: "psss_new" },
    });
  });

  it("answers 410 when expired", async () => {
    poll.mockResolvedValue({ status: "expired" });
    await expect(send(JSON.stringify({ device_code: DEVICE_CODE }))).resolves.toEqual({
      status: 410,
      body: { ok: false, status: "expired" },
    });
  });

  it("answers 500 server_error when polling throws", async () => {
    poll.mockRejectedValue(new Error("db down"));
    await expect(send(JSON.stringify({ device_code: DEVICE_CODE }))).resolves.toEqual({
      status: 500,
      body: { ok: false, error: "server_error" },
    });
  });
});
