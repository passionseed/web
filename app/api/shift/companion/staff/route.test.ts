/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import { requireAdmin, requireUser } from "@/lib/security/route-guards";

jest.mock("@/lib/security/route-guards", () => ({ requireAdmin: jest.fn(), requireUser: jest.fn() }));
const cohort = "10000000-0000-4000-8000-000000000001";
const roster = "10000000-0000-4000-8000-000000000002";
const rpc = jest.fn();
const createSignedUrls = jest.fn();
const storage = { from: jest.fn(() => ({ createSignedUrls })) };
const url = "https://example.invalid/api/shift/companion/staff";
const post = (body: unknown) => POST(new NextRequest(url, { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: { ok: true }, error: null });
  createSignedUrls.mockReset();
  (requireUser as jest.Mock).mockResolvedValue({ ok: true, value: { supabase: { rpc, storage } } });
  (requireAdmin as jest.Mock).mockResolvedValue({ ok: true, value: { supabase: { rpc } } });
});

test("anonymous visitors cannot read contacts or issue codes", async () => {
  (requireUser as jest.Mock).mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
  expect((await GET(new NextRequest(`${url}?cohort=${cohort}`))).status).toBe(401);
  expect((await post({ action: "issue_code", cohort_id: cohort })).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});

test("cohort mentors use the signed-in RPC for one code, without admin privileges", async () => {
  const invite = { ok: true, code: "7KFM", roster_id: roster, expires_at: "2026-11-01T00:00:00Z" };
  rpc.mockResolvedValue({ data: invite, error: null });
  const response = await post({ action: "issue_code", cohort_id: cohort });
  expect(await response.json()).toEqual(invite);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(requireAdmin).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledWith("shift_companion_action", { p_action: "issue_code", p_payload: { cohort_id: cohort } });
});

test("reissue sends only roster_id and reports database refusal for claimed or unauthorized people", async () => {
  rpc.mockResolvedValue({ data: { ok: false, error: "forbidden" }, error: null });
  expect((await post({ action: "reissue_code", roster_id: roster })).status).toBe(403);
  expect(rpc).toHaveBeenCalledWith("shift_companion_action", { p_action: "reissue_code", p_payload: { roster_id: roster } });
});

test("invalid dates, IDs, and unsolicited payloads never reach the database", async () => {
  for (const body of [
    { action: "issue_code", cohort_id: "bad" },
    { action: "reissue_code", roster_id: roster, cohort_id: cohort },
    { action: "create_cohort", name: "SHIFT", starts_on: "2026-02-30" },
    { action: "create_cohort", name: " ", starts_on: "2026-10-10" },
    { action: "claim", code: "7KFM" },
  ]) expect((await post(body)).status).toBe(400);
  expect((await GET(new NextRequest(`${url}?cohort=bad`))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

test("only admins can create cohorts and the response omits the full camp snapshot", async () => {
  (requireAdmin as jest.Mock).mockResolvedValueOnce({ ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) });
  const body = { action: "create_cohort", name: "SHIFT 2", starts_on: "2026-10-10" };
  expect((await post(body)).status).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValue({ data: { cohort: { id: cohort, name: "SHIFT 2", starts_on: "2026-10-10" }, checkins: ["private"] }, error: null });
  expect(await (await post(body)).json()).toEqual({ ok: true, cohort: { id: cohort, name: "SHIFT 2", starts_on: "2026-10-10" } });
  expect(rpc).toHaveBeenCalledWith("shift_camp_action", { p_action: "create_cohort", p_cohort_id: null, p_payload: { name: "SHIFT 2", starts_on: "2026-10-10" } });
});

test("updates use the staff-only read and private, short-lived photo URLs", async () => {
  const path = `daily/${cohort}/${roster}/photo.jpg`;
  rpc.mockResolvedValue({ data: { ok: true, today: "2026-10-02", updates: [{ id: roster, image_path: path, tried: "Built a prototype" }] }, error: null });
  createSignedUrls.mockResolvedValue({ data: [{ path, signedUrl: "https://example.invalid/private-photo" }] });
  const response = await GET(new NextRequest(`${url}?cohort=${cohort}&view=updates`));
  expect(rpc).toHaveBeenCalledWith("shift_companion_action", { p_action: "staff_today", p_payload: { cohort_id: cohort } });
  expect(storage.from).toHaveBeenCalledWith("shift-camp");
  expect(createSignedUrls).toHaveBeenCalledWith([path], 300);
  expect((await response.json()).updates[0].image_url).toBe("https://example.invalid/private-photo");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});

test("staff read refusals do not sign photos and internal database errors stay private", async () => {
  rpc.mockResolvedValueOnce({ data: { ok: false, error: "forbidden" }, error: null });
  expect((await GET(new NextRequest(`${url}?cohort=${cohort}&view=updates`))).status).toBe(403);
  expect(createSignedUrls).not.toHaveBeenCalled();
  rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "private database detail" } });
  const response = await GET(new NextRequest(url));
  expect(response.status).toBe(500);
  expect(JSON.stringify(await response.json())).not.toContain("private database detail");
});
