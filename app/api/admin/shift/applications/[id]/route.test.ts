/** @jest-environment node */
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/security/route-guards";
import { admitPaidStudent, isJoinable, revokeShiftDiscord, syncShiftDiscord } from "@/lib/shift/join";
import { createAdminClient } from "@/utils/supabase/admin";

import { PATCH } from "./route";

const pending: Promise<unknown>[] = [];
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return { ...actual, after: (task: () => Promise<unknown>) => pending.push(task()) };
});
jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Failed" }, { status: 500 })),
}));
jest.mock("@/lib/shift/join", () => ({
  admitPaidStudent: jest.fn(),
  isJoinable: jest.fn(),
  revokeShiftDiscord: jest.fn(),
  syncShiftDiscord: jest.fn(),
}));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const linked = {
  id: "test-application",
  cohort: "SHIFT[3]",
  status: "accepted",
  user_id: "test-user",
  discord_user_id: "test-discord",
  discord_joined_at: "2026-10-27T01:00:00.000Z",
  discord_error: null,
  paid_at: null,
};

function savedRow(row: Record<string, unknown>) {
  const query = { update: jest.fn(), eq: jest.fn(), select: jest.fn(), single: jest.fn() };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.single.mockResolvedValue({ data: row, error: null });
  (createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => query) });
  return query;
}

async function patch(body: unknown) {
  const res = await PATCH(
    new Request("https://example.invalid/api/admin/shift/applications/test-application", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "test-application" }) },
  );
  await Promise.all(pending.splice(0));
  return res;
}

beforeEach(() => {
  pending.length = 0;
  (isJoinable as unknown as jest.Mock).mockReturnValue(true);
  (requireAdmin as jest.Mock).mockResolvedValue({ ok: true, value: {} });
});

test("declining takes the round role back before answering, so the row shows it", async () => {
  savedRow({ ...linked, status: "declined" });
  (revokeShiftDiscord as jest.Mock).mockResolvedValue({ ok: true, state: "removed" });
  const res = await patch({ status: "declined" });
  expect(revokeShiftDiscord).toHaveBeenCalledWith(expect.objectContaining({ id: "test-application" }), expect.anything());
  expect((await res.json()).application).toEqual(
    expect.objectContaining({ status: "declined", discord_joined_at: null }),
  );
  expect(syncShiftDiscord).not.toHaveBeenCalled();
});

test("a failed role removal leaves the row showing them in Discord", async () => {
  savedRow({ ...linked, status: "declined" });
  (revokeShiftDiscord as jest.Mock).mockResolvedValue({ ok: false, state: "error", message: "Discord 403" });
  const res = await patch({ status: "declined" });
  expect((await res.json()).application.discord_joined_at).toBe(linked.discord_joined_at);
});

test("marking a linked applicant paid admits them to the tracker and camp", async () => {
  savedRow({ ...linked, paid_at: "2026-10-27T02:00:00.000Z" });
  await patch({ paid: true });
  expect(admitPaidStudent).toHaveBeenCalledWith(expect.objectContaining({ paid_at: "2026-10-27T02:00:00.000Z" }), expect.anything());
  expect(revokeShiftDiscord).not.toHaveBeenCalled();
});

test("un-declining gives the role back and answers with them back in Discord", async () => {
  savedRow({ ...linked, status: "accepted", discord_joined_at: null });
  (syncShiftDiscord as jest.Mock).mockResolvedValue({ ok: true, state: "already_member" });
  const res = await patch({ status: "accepted" });
  expect(syncShiftDiscord).toHaveBeenCalledWith(expect.objectContaining({ id: "test-application" }), null, expect.anything());
  expect((await res.json()).application.discord_joined_at).toEqual(expect.any(String));
  expect(admitPaidStudent).toHaveBeenCalled();
});

test("a status change never hands a closed link's role back, e.g. an unpaid row of a finished round", async () => {
  savedRow({ ...linked, cohort: "SHIFT[2]", status: "accepted", discord_joined_at: null });
  (isJoinable as unknown as jest.Mock).mockReturnValue(false);
  await patch({ status: "accepted" });
  expect(syncShiftDiscord).not.toHaveBeenCalled();
});

test("a status change for a student already in the server does not call Discord", async () => {
  savedRow({ ...linked, status: "waitlist" });
  await patch({ status: "waitlist" });
  expect(syncShiftDiscord).not.toHaveBeenCalled();
  expect(revokeShiftDiscord).not.toHaveBeenCalled();
});

test("under 20 without a parent's consent cannot be marked paid", async () => {
  const query = savedRow({
    ...linked,
    birth_date: "2010-05-01",
    consent_notice_version: "2026-10-29",
    parent_consented_at: null,
    parent_declined_at: null,
    parent_withdrawn_at: null,
  });
  const res = await patch({ paid: true });
  expect(res.status).toBe(409);
  expect((await res.json()).parentConsent).toBe("waiting");
  expect(query.update).not.toHaveBeenCalled();
  expect(admitPaidStudent).not.toHaveBeenCalled();
});

test("once the parent agrees, the applicant can be marked paid", async () => {
  const query = savedRow({
    ...linked,
    birth_date: "2010-05-01",
    consent_notice_version: "2026-10-29",
    parent_consented_at: "2026-10-28T01:00:00.000Z",
    paid_at: "2026-10-29T02:00:00.000Z",
  });
  const res = await patch({ paid: true });
  expect(res.status).toBe(200);
  expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ paid_at: expect.any(String) }));
});
