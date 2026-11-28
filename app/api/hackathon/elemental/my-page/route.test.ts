/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const payTokensForEmail = jest.fn();
const sendMyPageEmail = jest.fn();
const checkRateLimit = jest.fn();
const afterQueue: (() => unknown)[] = [];

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => unknown) => afterQueue.push(fn),
}));
jest.mock("@/lib/supabase/hackathon-event-registrations", () => ({
  payTokensForEmail: (...args: unknown[]) => payTokensForEmail(...args),
}));
jest.mock("@/lib/hackathon/elemental/registration-email", () => ({
  sendMyPageEmail: (...args: unknown[]) => sendMyPageEmail(...args),
}));
jest.mock("@/lib/expert-interview/rate-limiter", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

import { POST } from "./route";

const URL = "http://localhost/api/hackathon/elemental/my-page";

async function post(payload: unknown, headers: Record<string, string> = { origin: "http://localhost" }) {
  const res = await POST(new NextRequest(URL, { method: "POST", body: JSON.stringify(payload), headers }));
  return { status: res.status, json: await res.json() };
}

const flush = async () => {
  while (afterQueue.length) await afterQueue.shift()!();
};

beforeEach(() => {
  jest.clearAllMocks();
  afterQueue.length = 0;
  checkRateLimit.mockResolvedValue({ allowed: true });
  payTokensForEmail.mockResolvedValue(["a".repeat(32)]);
  sendMyPageEmail.mockResolvedValue(undefined);
});

describe("POST /api/hackathon/elemental/my-page", () => {
  it("emails the sign-up's own page link with the team code, after answering", async () => {
    const res = await post({ email: " Mew@Example.com ", team: "0123456789ab" });
    expect(res).toEqual({ status: 200, json: { ok: true } });
    expect(sendMyPageEmail).not.toHaveBeenCalled();
    await flush();
    expect(payTokensForEmail).toHaveBeenCalledWith("elemental-2026", "mew@example.com");
    expect(sendMyPageEmail).toHaveBeenCalledWith({ to: "mew@example.com", payTokens: ["a".repeat(32)], joinCode: "0123456789ab" });
  });

  it("answers the same for an address that never signed up", async () => {
    payTokensForEmail.mockResolvedValue([]);
    expect(await post({ email: "nobody@example.com" })).toEqual({ status: 200, json: { ok: true } });
    await flush();
    expect(sendMyPageEmail).toHaveBeenCalledWith({ to: "nobody@example.com", payTokens: [], joinCode: null });
  });

  it("drops a team code that isn't one", async () => {
    await post({ email: "mew@example.com", team: "<script>" });
    await flush();
    expect(sendMyPageEmail.mock.calls[0][0].joinCode).toBeNull();
  });

  it("refuses another site, a bad address, and too many asks from one network", async () => {
    expect((await post({ email: "mew@example.com" }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ email: "not-an-email" })).status).toBe(400);
    checkRateLimit.mockResolvedValue({ allowed: false });
    expect(await post({ email: "mew@example.com" })).toEqual({ status: 429, json: { error: "rate_limited" } });
    await flush();
    expect(payTokensForEmail).not.toHaveBeenCalled();
  });
});
