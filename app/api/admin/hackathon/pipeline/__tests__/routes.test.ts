/** @jest-environment node */

import { NextResponse, type NextRequest } from "next/server";

import { POST as create } from "@/app/api/admin/hackathon/pipeline/route";
import { PATCH, DELETE } from "@/app/api/admin/hackathon/pipeline/[id]/route";
import { POST as importRows } from "@/app/api/admin/hackathon/pipeline/import/route";
import { requireAdmin } from "@/lib/security/route-guards";
import {
  createPipelineItem,
  deletePipelineItem,
  importPipelineItems,
  updatePipelineItem,
} from "@/lib/supabase/hackathon-pipeline";

const OWNER_IDS = process.env.HACKATHON_OWNER_USER_IDS;
afterAll(() => {
  process.env.HACKATHON_OWNER_USER_IDS = OWNER_IDS;
});

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => new Response(JSON.stringify({ error: "x" }), { status: 500 })),
}));
jest.mock("@/lib/supabase/hackathon-pipeline", () => {
  class PipelineNotSetUpError extends Error {}
  class PipelineRuleError extends Error {}
  return {
    PipelineNotSetUpError,
    PipelineRuleError,
    createPipelineItem: jest.fn(),
    deletePipelineItem: jest.fn(),
    importPipelineItems: jest.fn(),
    listPipeline: jest.fn(),
    updatePipelineItem: jest.fn(),
  };
});

const ID = "3f1c2b9e-6a1d-4c11-9f0e-2a7b8c9d0e1f";
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  delete process.env.HACKATHON_OWNER_USER_IDS;
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true, value: { userId: "admin-1" } } as never);
});

describe("pipeline API", () => {
  it("refuses people who are not admins", async () => {
    jest.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as never);
    expect((await create(req({ kind: "sponsor", name: "A" }))).status).toBe(403);
    expect(createPipelineItem).not.toHaveBeenCalled();
  });

  it("validates new items before saving", async () => {
    const bad = await create(req({ kind: "vendor", name: "A" }));
    expect(bad.status).toBe(400);
    const phone = await create(req({ kind: "partner", name: "A", reach: "0812345678" }));
    expect((await phone.json()).error).toMatch(/phone/);
    expect(createPipelineItem).not.toHaveBeenCalled();

    jest.mocked(createPipelineItem).mockResolvedValue({ id: ID } as never);
    const ok = await create(req({ kind: "sponsor", name: " Acme " }));
    expect(ok.status).toBe(201);
    expect(createPipelineItem).toHaveBeenCalledWith(
      "elemental-2026",
      expect.objectContaining({ kind: "sponsor", name: "Acme", stage: "to_contact" }),
      "admin-1",
    );
  });

  it("refuses a personal phone number in any field, not only reach", async () => {
    jest.mocked(createPipelineItem).mockClear();
    const res = await create(req({ kind: "sponsor", name: "X", notes: "call 081 234 5678" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone number/);
    expect((await PATCH(req({ next_step: "ring 0812345678" }), params(ID))).status).toBe(400);
    expect((await importRows(req({ rows: [{ kind: "sponsor", name: "X", why_fit: "081-234-5678" }] }))).status).toBe(400);
    expect(createPipelineItem).not.toHaveBeenCalled();
  });

  it("stamps who saved from the signed-in admin, never from the browser", async () => {
    jest.mocked(updatePipelineItem).mockResolvedValue({ id: ID } as never);
    await PATCH(req({ touched: true, updated_by: "Kirt" }), params(ID));
    expect(updatePipelineItem).toHaveBeenLastCalledWith("elemental-2026", ID, { touched: true, updated_by: null });

    process.env.HACKATHON_OWNER_USER_IDS = JSON.stringify({ "admin-1": "Angpao" });
    await PATCH(req({ touched: true, updated_by: "Kirt" }), params(ID));
    expect(updatePipelineItem).toHaveBeenLastCalledWith("elemental-2026", ID, { touched: true, updated_by: "Angpao" });

    jest.mocked(createPipelineItem).mockResolvedValue({ id: ID } as never);
    await create(req({ kind: "sponsor", name: "A", updated_by: "Big" }));
    expect(createPipelineItem).toHaveBeenLastCalledWith(
      "elemental-2026",
      expect.objectContaining({ updated_by: "Angpao" }),
      "admin-1",
    );
  });

  it("answers 400 when a patch would leave an open conversation without a next step", async () => {
    const { PipelineRuleError } = jest.requireMock("@/lib/supabase/hackathon-pipeline");
    jest.mocked(updatePipelineItem).mockRejectedValueOnce(new PipelineRuleError("Talking needs a next step and a date"));
    const res = await PATCH(req({ next_step: null }), params(ID));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Talking needs a next step and a date");
  });

  it("checks the id and the patch on update", async () => {
    expect((await PATCH(req({ stage: "signed" }), params("not-a-uuid"))).status).toBe(404);
    expect((await PATCH(req({}), params(ID))).status).toBe(400);
    expect((await PATCH(req({ stage: "won" }), params(ID))).status).toBe(400);
    expect(updatePipelineItem).not.toHaveBeenCalled();

    jest.mocked(updatePipelineItem).mockResolvedValue(null);
    expect((await PATCH(req({ stage: "signed" }), params(ID))).status).toBe(404);
    jest.mocked(updatePipelineItem).mockResolvedValue({ id: ID, stage: "signed" } as never);
    const ok = await PATCH(req({ stage: "signed" }), params(ID));
    expect(ok.status).toBe(200);
    expect(updatePipelineItem).toHaveBeenLastCalledWith("elemental-2026", ID, { stage: "signed", updated_by: null });
  });

  it("refuses a move into yes without a next step, and into no without a reason", async () => {
    jest.mocked(updatePipelineItem).mockClear();
    const noStep = await PATCH(req({ stage: "yes" }), params(ID));
    expect(noStep.status).toBe(400);
    expect((await noStep.json()).error).toMatch(/next step and a date/);
    const noReason = await PATCH(req({ stage: "no" }), params(ID));
    expect((await noReason.json()).error).toMatch(/reason/);
    expect(updatePipelineItem).not.toHaveBeenCalled();

    jest.mocked(updatePipelineItem).mockResolvedValue({ id: ID, stage: "yes" } as never);
    const ok = await PATCH(req({ stage: "yes", next_step: "Send contract", next_step_due: "2026-11-24", updated_by: "Big" }), params(ID));
    expect(ok.status).toBe(200);
    // The browser's updated_by is ignored: no owner map is set, so it is null.
    expect(updatePipelineItem).toHaveBeenLastCalledWith("elemental-2026", ID, {
      stage: "yes",
      next_step: "Send contract",
      next_step_due: "2026-11-24",
      updated_by: null,
    });
  });

  it("refuses an owner outside the fixed list", async () => {
    expect((await PATCH(req({ owner: "a@b.co" }), params(ID))).status).toBe(400);
  });

  it("deletes by id", async () => {
    jest.mocked(deletePipelineItem).mockResolvedValue(true);
    expect((await DELETE(req(null), params(ID))).status).toBe(200);
    jest.mocked(deletePipelineItem).mockResolvedValue(false);
    expect((await DELETE(req(null), params(ID))).status).toBe(404);
  });

  it("imports only a valid list", async () => {
    expect((await importRows(req({ rows: [] }))).status).toBe(400);
    expect((await importRows(req({ rows: [{ kind: "sponsor" }] }))).status).toBe(400);
    expect(importPipelineItems).not.toHaveBeenCalled();

    jest.mocked(importPipelineItems).mockResolvedValue({ items: [{ id: ID }], skipped: 2 } as never);
    const ok = await importRows(req({ rows: [{ kind: "speaker", name: "Dr A", element: "water", owner: "Kirt" }] }));
    expect(ok.status).toBe(201);
    const body = await ok.json();
    expect(body.items).toHaveLength(1);
    expect(body.skipped).toBe(2);
  });

  it("answers 503 when the table is not set up", async () => {
    const { PipelineNotSetUpError } = jest.requireMock("@/lib/supabase/hackathon-pipeline");
    jest.mocked(createPipelineItem).mockRejectedValue(new PipelineNotSetUpError());
    const res = await create(req({ kind: "sponsor", name: "A" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Pipeline table not set up yet");
  });
});
