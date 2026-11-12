/** @jest-environment node */

import { NextRequest } from "next/server";

import { GET } from "@/app/api/cron/shift-canvas-snapshots/route";
import { takeCanvasSnapshots } from "@/lib/supabase/shift-canvas-snapshots";

jest.mock("@/lib/supabase/shift-canvas-snapshots", () => ({ takeCanvasSnapshots: jest.fn() }));
const take = takeCanvasSnapshots as jest.Mock;

const call = (auth?: string) =>
  GET(new NextRequest("https://example.test/api/cron/shift-canvas-snapshots", { headers: auth ? { authorization: auth } : {} }));

describe("GET /api/cron/shift-canvas-snapshots", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    take.mockResolvedValue({ canvases: 4, described: 2 });
  });

  it("runs only for Vercel's cron, with the secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(take).not.toHaveBeenCalled();
    const res = await call("Bearer cron-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, canvases: 4, described: 2 });
  });
});
