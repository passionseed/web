/** @jest-environment node */
import { after } from "next/server";

import { sendShiftParentEmail } from "@/lib/shift/parentConsentServer";
import { createAdminClient } from "@/utils/supabase/admin";

import { POST } from "./route";

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return { ...actual, after: jest.fn() };
});
jest.mock("@/lib/shift/notifyDiscord", () => ({ notifyShiftApplication: jest.fn() }));
jest.mock("@/lib/shift/parentConsentServer", () => ({
  newShiftParentLink: () => ({ token: "test-parent-token", hash: "test-parent-hash" }),
  sendShiftParentEmail: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const insert = jest.fn();

// SHIFT[3] is open on 27 Oct 2026; SHIFT[2] is over. Only Date is faked.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date("2026-10-27T05:00:00Z"),
    doNotFake: [
      "nextTick", "setImmediate", "clearImmediate", "setTimeout", "clearTimeout",
      "setInterval", "clearInterval", "queueMicrotask", "hrtime", "performance",
    ],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  (createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => ({ insert })) });
});

const application = (round?: number) => ({
  fullName: "Test Applicant",
  nickname: "Test",
  grade: "m5",
  birthDate: "2010-05-01",
  problem: "A problem that is long enough to pass the schema check",
  availability: "all_days",
  igHandle: "test_ig",
  parentEmail: "Parent@Example.invalid",
  parentContact: "test parent contact",
  consent: true,
  foundVia: "instagram",
  ...(round === undefined ? {} : { round }),
});

const post = (body: unknown) =>
  POST(new Request("https://example.invalid/api/shift/apply", { method: "POST", body: JSON.stringify(body) }));

test("saves an application for an open round and returns its personal join link", async () => {
  const res = await post(application(3));
  expect(res.status).toBe(200);
  expect((await res.json()).joinUrl).toMatch(/\/shift\/join\/[A-Za-z0-9_-]{20,64}$/);
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ cohort: "SHIFT[3]" }));
});

test.each([
  ["a finished round", 2],
  ["the legacy no-round fallback (SHIFT[1])", undefined],
])("refuses %s, since its join link would grant that round's Discord role", async (_label, round) => {
  const res = await post(application(round));
  expect(res.status).toBe(409);
  expect(insert).not.toHaveBeenCalled();
});

test("under 20: stores only the parent link's hash and emails the parent after responding", async () => {
  const res = await post(application(3));
  expect(res.status).toBe(200);
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      birth_date: "2010-05-01",
      consent_notice_version: expect.any(String),
      parent_email: "parent@example.invalid",
      parent_token_hash: "test-parent-hash",
    }),
  );
  expect(JSON.stringify(insert.mock.calls)).not.toContain("test-parent-token");

  const task = (after as jest.Mock).mock.calls.at(-1)?.[0] as () => Promise<void>;
  await task();
  expect(sendShiftParentEmail).toHaveBeenCalledWith(
    expect.objectContaining({ parent_email: "parent@example.invalid" }),
    "test-parent-token",
  );
});

test("under 20 without a parent email is refused with a field error", async () => {
  const res = await post({ ...application(3), parentEmail: "" });
  expect(res.status).toBe(422);
  expect((await res.json()).fields.parentEmail).toBeTruthy();
  expect(insert).not.toHaveBeenCalled();
});

test("20 or older: no parent link, and no parent details kept", async () => {
  const res = await post({ ...application(3), birthDate: "2005-01-01" });
  expect(res.status).toBe(200);
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({ parent_email: null, parent_contact: null, parent_token_hash: null }),
  );
});
