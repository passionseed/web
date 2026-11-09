/** @jest-environment node */

import { instagramWebhookCheck, summarize } from "@/lib/ops/integrationHealth";
import { probeInstagramToken, probeLineWebhook } from "@/lib/ops/integrationProbes";
import { hasBearerSecret } from "@/lib/ops/opsAuth";

const now = new Date("2026-11-10T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

describe("instagramWebhookCheck", () => {
  it("passes inside 18 hours of silence and fails after", () => {
    expect(instagramWebhookCheck(hoursAgo(12.3), now)).toMatchObject({ ok: true, detail: "last event 12.3 h ago" });
    expect(instagramWebhookCheck(hoursAgo(19), now)).toMatchObject({ ok: false });
    expect(instagramWebhookCheck(null, now)).toMatchObject({ ok: false, detail: "no webhook event recorded" });
  });
});

describe("summarize", () => {
  it("is ok only when every check is", () => {
    const pass = { name: "line_webhook" as const, ok: true, detail: "" };
    const fail = { name: "instagram_token" as const, ok: false, detail: "" };
    expect(summarize([pass], now).ok).toBe(true);
    expect(summarize([pass, fail], now).ok).toBe(false);
  });
});

describe("hasBearerSecret", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("accepts any named secret and nothing else", () => {
    process.env.CRON_SECRET = "cron-secret";
    process.env.OPS_CRON_SECRET = "ops-secret";
    expect(hasBearerSecret("Bearer ops-secret", "CRON_SECRET", "OPS_CRON_SECRET")).toBe(true);
    expect(hasBearerSecret("Bearer cron-secret", "OPS_CRON_SECRET")).toBe(false);
    expect(hasBearerSecret("ops-secret", "OPS_CRON_SECRET")).toBe(false);
    expect(hasBearerSecret(null, "OPS_CRON_SECRET")).toBe(false);
  });

  it("never matches an unset or empty secret", () => {
    delete process.env.OPS_CRON_SECRET;
    expect(hasBearerSecret("Bearer ", "OPS_CRON_SECRET")).toBe(false);
    expect(hasBearerSecret("Bearer undefined", "OPS_CRON_SECRET")).toBe(false);
    process.env.OPS_CRON_SECRET = "";
    expect(hasBearerSecret("Bearer ", "OPS_CRON_SECRET")).toBe(false);
  });
});

describe("probes", () => {
  const saved = { ...process.env };
  const fetchMock = jest.fn();
  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    process.env.META_PAGE_ACCESS_TOKEN = "ig-token";
    process.env.LINE_OA_CHANNEL_ACCESS_TOKEN = "line-token";
  });
  afterAll(() => {
    process.env = { ...saved };
  });

  const json = (status: number, body: unknown) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

  it("reads an Instagram 190 as a dead token", async () => {
    fetchMock.mockResolvedValue(json(400, { error: { code: 190 } }));
    expect(await probeInstagramToken()).toMatchObject({ ok: false, detail: expect.stringContaining("error 190") });
    fetchMock.mockResolvedValue(json(200, { user_id: "1" }));
    expect(await probeInstagramToken()).toMatchObject({ ok: true });
  });

  it("never puts the token in the result", async () => {
    fetchMock.mockRejectedValue(new Error("boom ig-token"));
    const check = await probeInstagramToken();
    expect(check).toMatchObject({ ok: false, detail: "request failed" });
    expect(JSON.stringify(check)).not.toContain("ig-token");
  });

  it("passes LINE only when LINE's test reached our endpoint", async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, statusCode: 200 }));
    expect(await probeLineWebhook()).toMatchObject({ ok: true });
    fetchMock.mockResolvedValue(json(200, { success: false, statusCode: 500, reason: "ERROR_STATUS_CODE" }));
    expect(await probeLineWebhook()).toMatchObject({ ok: false, detail: "endpoint answered 500 (ERROR_STATUS_CODE)" });
    fetchMock.mockResolvedValue(json(401, {}));
    expect(await probeLineWebhook()).toMatchObject({ ok: false, detail: "channel access token rejected" });
  });

  it("fails closed when a token is missing", async () => {
    delete process.env.META_PAGE_ACCESS_TOKEN;
    delete process.env.LINE_OA_CHANNEL_ACCESS_TOKEN;
    expect((await probeInstagramToken()).ok).toBe(false);
    expect((await probeLineWebhook()).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
