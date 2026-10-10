import { buildSeedstackBoard, type BoardEvent } from "@/lib/seedstack/board";
import { SEEDSTACK_NOTICE_VERSION, seedstackConsentState } from "@/lib/seedstack/consent";
import { parseSeedstackBatch, parseSeedstackEvent } from "@/lib/seedstack/events";
import { generateDeviceCode, generateUserCode, normalizeUserCode } from "@/lib/seedstack/link";
import { extractSeedstackBearer, generateSeedstackToken, sha256Hex } from "@/lib/seedstack/tokens";

describe("parseSeedstackEvent", () => {
  const valid = { id: "evt_12345678", step: "install", event: "done", minutes: 12.6, ts: "2026-10-07T10:00:00+07:00" };

  it("keeps known fields and normalises them", () => {
    expect(parseSeedstackEvent({ ...valid, next: "  scope  ", live_url: "https://x.vercel.app" })).toEqual({
      client_event_id: "evt_12345678",
      step: "install",
      event: "done",
      minutes: 13,
      next: "scope",
      detail: null,
      live_url: "https://x.vercel.app/",
      client_ts: "2026-10-07T03:00:00.000Z",
    });
  });

  it("accepts the test step", () => {
    expect(parseSeedstackEvent({ ...valid, step: "test", event: "changed", detail: "asked 14, tested 2" })?.step).toBe("test");
  });

  it("rejects unknown steps, events and bad ids", () => {
    expect(parseSeedstackEvent({ ...valid, step: "deploy" })).toBeNull();
    expect(parseSeedstackEvent({ ...valid, event: "chat" })).toBeNull();
    expect(parseSeedstackEvent({ ...valid, id: "short" })).toBeNull();
  });

  it("drops non-http urls and clamps text", () => {
    const parsed = parseSeedstackEvent({ ...valid, live_url: "javascript:alert(1)", detail: "x".repeat(500) });
    expect(parsed?.live_url).toBeNull();
    expect(parsed?.detail).toHaveLength(280);
  });
});

describe("parseSeedstackBatch", () => {
  it("accepts a single event or a batch and counts rejects", () => {
    const one = { id: "evt_12345678", step: "scope", event: "start" };
    expect(parseSeedstackBatch(one)?.events).toHaveLength(1);
    expect(parseSeedstackBatch({ events: [one, { id: "bad" }] })).toMatchObject({ rejected: 1 });
  });

  it("rejects empty and oversized batches", () => {
    expect(parseSeedstackBatch({ events: [] })).toBeNull();
    expect(parseSeedstackBatch({ events: Array(101).fill({}) })).toBeNull();
    expect(parseSeedstackBatch(null)).toBeNull();
  });
});

describe("seedstackConsentState", () => {
  const base = {
    notice_version: SEEDSTACK_NOTICE_VERSION,
    student_consented_at: "2026-10-07T00:00:00Z",
    withdrawn_at: null,
  };

  it("is active once the student agrees to the current notice", () => {
    expect(seedstackConsentState(base)).toBe("active");
    expect(seedstackConsentState({ ...base, student_consented_at: null })).toBe("none");
    expect(seedstackConsentState({ ...base, withdrawn_at: "x" })).toBe("withdrawn");
    expect(seedstackConsentState({ ...base, notice_version: "old" })).toBe("none");
    expect(seedstackConsentState(null)).toBe("none");
  });
});

describe("tokens", () => {
  it("extracts only prefixed bearers", () => {
    const token = generateSeedstackToken();
    expect(extractSeedstackBearer(`Bearer ${token}`)).toBe(token);
    expect(extractSeedstackBearer("Bearer psdmlp_abc")).toBeNull();
    expect(extractSeedstackBearer(null)).toBeNull();
    expect(sha256Hex(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildSeedstackBoard", () => {
  const ev = (over: Partial<BoardEvent>): BoardEvent => ({
    user_id: "u1",
    step: "install",
    event: "start",
    minutes: null,
    next: null,
    detail: null,
    live_url: null,
    created_at: "2026-10-07T00:00:00Z",
    ...over,
  });

  it("tracks stuck then done per step, and keeps latest next and live url", () => {
    const [row] = buildSeedstackBoard([
      ev({ event: "done", minutes: 18, next: "scope", created_at: "2026-10-07T00:20:00Z" }),
      ev({ event: "stuck", detail: "npm: EACCES", created_at: "2026-10-07T00:05:00Z" }),
      ev({ step: "ship", event: "done", live_url: "https://a.vercel.app/", created_at: "2026-10-07T05:00:00Z" }),
    ]);
    expect(row.steps.install).toEqual({ status: "done", minutes: 18, detail: null });
    expect(row.steps.scope.status).toBe("not_started");
    expect(row.liveUrl).toBe("https://a.vercel.app/");
    expect(row.next).toBe("scope");
    expect(row.lastSeen).toBe("2026-10-07T05:00:00Z");
  });

  it("does not regress a finished step", () => {
    const [row] = buildSeedstackBoard([
      ev({ event: "done", created_at: "2026-10-07T01:00:00Z" }),
      ev({ event: "stuck", detail: "late", created_at: "2026-10-07T02:00:00Z" }),
    ]);
    expect(row.steps.install.status).toBe("done");
  });
});

describe("link codes", () => {
  it("generates readable user codes that normalise back to themselves", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateUserCode();
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(code).not.toMatch(/[01OIL]/);
      expect(normalizeUserCode(code.toLowerCase().replace("-", " "))).toBe(code);
    }
  });

  it("rejects wrong length or ambiguous characters", () => {
    expect(normalizeUserCode("ABCD-123")).toBeNull();
    expect(normalizeUserCode("ABCD-1OIL")).toBeNull();
    expect(normalizeUserCode(undefined)).toBeNull();
  });

  it("makes long url-safe device codes", () => {
    expect(generateDeviceCode()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
