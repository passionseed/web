/** @jest-environment node */
import { createAdminClient } from "@/utils/supabase/admin";
import {
  listAdminTrials,
  sortTrialsForReview,
  trialStudentLabel,
} from "@/lib/supabase/admin-trials";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const USER = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";

function queryMock(result: { data: unknown; error: unknown }) {
  const query: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ["select", "order", "eq", "neq", "in", "limit"]) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
}

describe("trialStudentLabel", () => {
  it("prefers the name and handle, then falls back to a short id", () => {
    expect(trialStudentLabel({ studentName: "Ploy", studentUsername: "ploy", userId: USER })).toBe(
      "Ploy (@ploy)",
    );
    expect(trialStudentLabel({ studentName: "Ploy", studentUsername: null, userId: USER })).toBe("Ploy");
    expect(trialStudentLabel({ studentName: null, studentUsername: "ploy", userId: USER })).toBe("@ploy");
    expect(trialStudentLabel({ studentName: null, studentUsername: null, userId: USER })).toBe(
      "Unknown student (0b7c6f5e)",
    );
  });
});

test("sortTrialsForReview puts pending first, then newest", () => {
  const sorted = sortTrialsForReview([
    { id: "1", status: "paid", startedAt: "2026-10-03" },
    { id: "2", status: "pending", startedAt: "2026-10-01" },
    { id: "3", status: "active", startedAt: "2026-10-05" },
    { id: "4", status: "pending", startedAt: "2026-10-02" },
  ]);
  expect(sorted.map((t) => t.id)).toEqual(["4", "2", "3", "1"]);
});

test("listAdminTrials joins names, signs slips in one batch, and never selects pay_token", async () => {
  const trials = queryMock({
    data: [
      {
        id: "t1",
        user_id: USER,
        seed_id: "s1",
        status: "pending",
        price_amount: 1490,
        started_at: "2026-10-20T00:00:00Z",
        payment_deadline: "2026-10-21T00:00:00Z",
        slip_path: "slips/t1.jpg",
        paid_at: null,
        verified_by: null,
        verified_at: null,
        admin_note: null,
        seed: [{ title: "Game design" }],
      },
    ],
    error: null,
  });
  const profiles = queryMock({ data: [{ id: USER, full_name: " Ploy ", username: "ploy" }], error: null });
  const createSignedUrls = jest.fn().mockResolvedValue({
    data: [{ path: "slips/t1.jpg", signedUrl: "https://signed.invalid/t1" }],
    error: null,
  });
  jest.mocked(createAdminClient).mockReturnValue({
    from: jest.fn((table: string) => (table === "profiles" ? profiles : trials)),
    storage: { from: jest.fn(() => ({ createSignedUrls })) },
  } as never);

  const [trial] = await listAdminTrials({ status: "pending" });

  expect(trials.select.mock.calls[0][0]).not.toMatch(/pay_token|\*/);
  expect(trials.eq).toHaveBeenCalledWith("status", "pending");
  expect(profiles.in).toHaveBeenCalledWith("id", [USER]);
  expect(createSignedUrls).toHaveBeenCalledTimes(1);
  expect(trial).toMatchObject({
    id: "t1",
    seedTitle: "Game design",
    slipUrl: "https://signed.invalid/t1",
    studentName: "Ploy",
    studentUsername: "ploy",
  });
});

test("listAdminTrials still renders when names or slips fail to load", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  const trials = queryMock({
    data: [
      {
        id: "t1",
        user_id: USER,
        seed_id: "s1",
        status: "pending",
        price_amount: 1490,
        started_at: "2026-10-20T00:00:00Z",
        payment_deadline: "2026-10-21T00:00:00Z",
        slip_path: "slips/t1.jpg",
        paid_at: null,
        verified_by: null,
        verified_at: null,
        admin_note: null,
        seed: null,
      },
    ],
    error: null,
  });
  jest.mocked(createAdminClient).mockReturnValue({
    from: jest.fn((table: string) =>
      table === "profiles" ? queryMock({ data: null, error: { message: "down" } }) : trials,
    ),
    storage: {
      from: jest.fn(() => ({
        createSignedUrls: jest.fn().mockResolvedValue({ data: null, error: { message: "down" } }),
      })),
    },
  } as never);

  const [trial] = await listAdminTrials();
  expect(trial).toMatchObject({ slipUrl: null, studentName: null, seedTitle: null });
});

test("listAdminTrials throws when the trials read fails", async () => {
  jest.mocked(createAdminClient).mockReturnValue({
    from: jest.fn(() => queryMock({ data: null, error: { message: "boom" } })),
  } as never);
  await expect(listAdminTrials()).rejects.toThrow("trial_accesses read failed");
});
