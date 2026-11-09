/** @jest-environment node */

import type { NextRequest } from "next/server";

import { GET } from "@/app/api/ops/integration-health/route";
import { probeInstagramToken, probeLineWebhook } from "@/lib/ops/integrationProbes";
import { latestMetaWebhookEventAt } from "@/lib/supabase/integration-health";

jest.mock("@/lib/ops/integrationProbes", () => ({
  probeInstagramToken: jest.fn(),
  probeLineWebhook: jest.fn(),
}));
jest.mock("@/lib/supabase/integration-health", () => ({
  latestMetaWebhookEventAt: jest.fn(),
}));

const request = (authorization?: string) =>
  ({ headers: new Headers(authorization ? { authorization } : {}) }) as unknown as NextRequest;

describe("GET /api/ops/integration-health", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.OPS_CRON_SECRET = "ops-secret";
    process.env.CRON_SECRET = "cron-secret";
    jest.mocked(probeInstagramToken).mockResolvedValue({ name: "instagram_token", ok: true, detail: "valid" });
    jest.mocked(probeLineWebhook).mockResolvedValue({ name: "line_webhook", ok: true, detail: "endpoint answered 200" });
    jest.mocked(latestMetaWebhookEventAt).mockResolvedValue(new Date().toISOString());
  });
  afterAll(() => {
    process.env = { ...saved };
  });

  it("refuses CRON_SECRET and no secret", async () => {
    expect((await GET(request("Bearer cron-secret"))).status).toBe(401);
    expect((await GET(request())).status).toBe(401);
    expect(probeInstagramToken).not.toHaveBeenCalled();
  });

  it("reports every check", async () => {
    const res = await GET(request("Bearer ops-secret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.checks.map((c: { name: string }) => c.name)).toEqual([
      "instagram_token",
      "instagram_webhook",
      "line_webhook",
    ]);
  });

  it("turns a database failure into a failing check, not a 500", async () => {
    jest.mocked(latestMetaWebhookEventAt).mockRejectedValue(new Error("db down"));
    const body = await (await GET(request("Bearer ops-secret"))).json();
    expect(body.ok).toBe(false);
    expect(body.checks[1]).toEqual({ name: "instagram_webhook", ok: false, detail: "could not read webhook events" });
  });
});
