/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const claimSlipRef = jest.fn();
const recordSlip = jest.fn();
const verifySlipRdcw = jest.fn();

jest.mock("@/lib/supabase/hackathon-event-registrations", () => ({
  claimSlipRef: (...args: unknown[]) => claimSlipRef(...args),
  recordSlip: (...args: unknown[]) => recordSlip(...args),
  uploadSlip: jest.fn().mockResolvedValue(undefined),
  getRegistrationByToken: jest.fn().mockResolvedValue({
    id: "reg-1",
    status: "pending",
    amountBaht: 199,
    createdAt: "2026-11-23T03:00:00Z",
  }),
}));
jest.mock("@/lib/rdcw/client", () => ({
  rdcwConfigured: () => true,
  verifySlipRdcw: (...args: unknown[]) => verifySlipRdcw(...args),
}));
jest.mock("@/lib/slipok/client", () => ({ verifySlip: jest.fn() }));

import { POST } from "./route";

const TOKEN = "a".repeat(32);

async function upload() {
  const form = new FormData();
  form.append("slip", new File([new Uint8Array([1, 2, 3])], "slip.jpg", { type: "image/jpeg" }));
  const req = new NextRequest(`http://localhost/api/hackathon/elemental/${TOKEN}/slip`, { method: "POST", body: form });
  const res = await POST(req, { params: Promise.resolve({ token: TOKEN }) });
  return res.json();
}

const paid = { kind: "paid", transRef: "REF1", amount: 199, raw: {} };

beforeEach(() => {
  jest.clearAllMocks();
  recordSlip.mockResolvedValue("saved");
});

it("confirms a slip seen for the first time", async () => {
  verifySlipRdcw.mockResolvedValue(paid);
  claimSlipRef.mockResolvedValue("ours");
  expect(await upload()).toEqual({ result: "paid" });
  expect(claimSlipRef).toHaveBeenCalledWith("REF1", "reg-1", "hackathon:elemental-2026", "rdcw");
  expect(verifySlipRdcw.mock.calls[0][3]).toBe("2026-11-23T03:00:00Z");
});

it("rejects a slip another registration already used", async () => {
  verifySlipRdcw.mockResolvedValue(paid);
  claimSlipRef.mockResolvedValue("taken");
  expect(await upload()).toEqual({ result: "rejected", reason: "duplicate" });
  expect(recordSlip).toHaveBeenCalledWith("reg-1", expect.objectContaining({ status: "pending" }));
});

it("sends the slip to review when the reference check fails", async () => {
  verifySlipRdcw.mockResolvedValue(paid);
  claimSlipRef.mockResolvedValue("unknown");
  expect(await upload()).toEqual({ result: "review" });
});

it("claims the reference of a slip sent to review, so it can't be reused", async () => {
  verifySlipRdcw.mockResolvedValue({ kind: "unverified", transRef: "REF2", detail: "old", raw: {} });
  claimSlipRef.mockResolvedValue("ours");
  expect(await upload()).toEqual({ result: "review" });
  expect(claimSlipRef).toHaveBeenCalledWith("REF2", "reg-1", "hackathon:elemental-2026", "rdcw");
});
