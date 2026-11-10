import { checkHackathonAuthRateLimit } from "./auth-rate-limit";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import type { NextRequest } from "next/server";

jest.mock("@/lib/expert-interview/rate-limiter", () => ({ checkRateLimit: jest.fn() }));
const limit = jest.mocked(checkRateLimit);
const request = (ip: string) => ({ headers: new Headers({ "x-forwarded-for": ip }) }) as NextRequest;
const allowed = { allowed: true, remaining: 2, resetAt: new Date() };

beforeEach(() => { limit.mockReset(); limit.mockResolvedValue(allowed); });

test("limits both IP and normalized email without passing raw identifiers", async () => {
  expect(await checkHackathonAuthRateLimit(request("192.0.2.1"), " USER@example.com ", "login")).toBe(true);
  const keys = limit.mock.calls.map(([key]) => key);
  expect(keys).toHaveLength(2);
  expect(keys.every((key) => /^[a-f0-9]{64}$/.test(key))).toBe(true);
  limit.mockClear();
  await checkHackathonAuthRateLimit(request("192.0.2.2"), "user@example.com", "login");
  expect(limit.mock.calls[1][0]).toBe(keys[1]);
  expect(limit.mock.calls[0][0]).not.toBe(keys[0]);
});

test("keeps a shared school IP usable for login but tight for reset emails", async () => {
  await checkHackathonAuthRateLimit(request("192.0.2.1"), "user@example.com", "login");
  const [[loginIpKey, loginIpMax], [, loginEmailMax]] = limit.mock.calls;
  expect(loginIpMax).toBeGreaterThanOrEqual(100);
  expect(loginEmailMax).toBe(10);
  limit.mockClear();
  await checkHackathonAuthRateLimit(request("192.0.2.1"), "user@example.com", "forgot-password");
  const [[resetIpKey], [, resetEmailMax]] = limit.mock.calls;
  expect(resetEmailMax).toBe(3);
  expect(resetIpKey).not.toBe(loginIpKey);
});

test("rejects if either limit is exceeded and fails closed when the limiter is down", async () => {
  limit.mockResolvedValueOnce(allowed).mockResolvedValueOnce({ ...allowed, allowed: false });
  expect(await checkHackathonAuthRateLimit(request("192.0.2.1"), "user@example.com", "login")).toBe(false);
  limit.mockRejectedValueOnce(new Error("unavailable"));
  await expect(checkHackathonAuthRateLimit(request("192.0.2.1"), "user@example.com", "login")).rejects.toThrow("unavailable");
});
