/**
 * @jest-environment node
 */
import {
  createCopilotTokenAction,
  listCopilotTokensAction,
  revokeCopilotTokenAction,
} from "../actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/admin/requireAdmin", () => ({
  requireAdmin: jest.fn(async () => ({ id: "admin-1" })),
}));

const SUMMARY = {
  id: "tok-1",
  user_id: "admin-1",
  name: "boon macbook",
  last_used_at: null,
  expires_at: "2027-01-01T00:00:00.000Z",
  revoked_at: null,
  created_at: "2026-10-26T00:00:00.000Z",
};

type Result = { data: unknown; error: unknown };
const db = {
  insertResult: { data: SUMMARY, error: null } as Result,
  updateResult: { data: null, error: null } as Result,
  listResult: { data: [SUMMARY], error: null } as Result,
  selects: [] as string[],
};

jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({
        select: (cols: string) => {
          db.selects.push(cols);
          return { single: async () => db.insertResult };
        },
      }),
      update: () => ({ eq: () => ({ eq: () => ({ is: async () => db.updateResult }) }) }),
      select: (cols: string) => {
        db.selects.push(cols);
        return { eq: () => ({ order: async () => db.listResult }) };
      },
    }),
  }),
}));

beforeEach(() => {
  db.insertResult = { data: SUMMARY, error: null };
  db.updateResult = { data: null, error: null };
  db.listResult = { data: [SUMMARY], error: null };
  db.selects = [];
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe("createCopilotTokenAction", () => {
  it("returns the raw bearer once and never selects the hash", async () => {
    const result = await createCopilotTokenAction({ name: "  boon macbook  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.raw).toMatch(/^psdmlp_/);
    expect(result.data.row).toEqual(SUMMARY);
    expect(db.selects).toHaveLength(1);
    expect(db.selects[0]).not.toContain("token_hash");
    expect(db.selects[0]).not.toContain("*");
  });

  it("asks for a name instead of throwing", async () => {
    await expect(createCopilotTokenAction({ name: "   " })).resolves.toEqual({
      ok: false,
      error: expect.stringContaining("ตั้งชื่อ token"),
    });
  });

  it("reports a database failure as a result", async () => {
    db.insertResult = { data: null, error: { message: "boom" } };
    await expect(createCopilotTokenAction({ name: "x" })).resolves.toEqual({
      ok: false,
      error: expect.any(String),
    });
  });
});

describe("revokeCopilotTokenAction", () => {
  it("returns ok when the update succeeds", async () => {
    await expect(revokeCopilotTokenAction("tok-1")).resolves.toEqual({ ok: true, data: undefined });
  });

  it("returns an error instead of throwing", async () => {
    db.updateResult = { data: null, error: { message: "boom" } };
    const result = await revokeCopilotTokenAction("tok-1");
    expect(result.ok).toBe(false);
  });

  it("rejects a missing id", async () => {
    expect((await revokeCopilotTokenAction("")).ok).toBe(false);
  });
});

describe("listCopilotTokensAction", () => {
  it("selects summary columns only", async () => {
    await expect(listCopilotTokensAction()).resolves.toEqual([SUMMARY]);
    expect(db.selects[0]).not.toContain("token_hash");
  });
});
