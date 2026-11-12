import { createSessionToken, verifySessionToken } from "./session-token";

describe("expert interview session token", () => {
  const sessionId = "6f1c1f64-8a51-4f4b-9b1e-0c7c3f1f2a10";
  const now = Date.UTC(2026, 9, 28);

  beforeAll(() => {
    process.env.EXPERT_INTERVIEW_SESSION_SECRET = "test-secret";
  });

  it("accepts a token issued for the same session", () => {
    expect(verifySessionToken(createSessionToken(sessionId, now), sessionId, now)).toBe(true);
  });

  it("rejects a missing token, another session, or a tampered signature", () => {
    const token = createSessionToken(sessionId, now);
    expect(verifySessionToken(undefined, sessionId, now)).toBe(false);
    expect(verifySessionToken(token, "11111111-1111-4111-8111-111111111111", now)).toBe(false);
    expect(verifySessionToken(`${token.slice(0, -2)}xx`, sessionId, now)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(sessionId, now);
    expect(verifySessionToken(token, sessionId, now + 7 * 60 * 60 * 1000)).toBe(false);
  });
});
