/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

import { createAdminClient } from "@/utils/supabase/admin";

import { revokeStoryProof } from "../hackathon-story-proofs";

type Row = { id: string; storage_path: string; revoked_at: string | null; revoked_by: string | null };

const ID = "11111111-1111-4111-8111-111111111111";
const PATH = "elemental-2026/reg/1-aaaaaaaaaaaa.png";

/** A tiny stand-in for the service-role client: one table, the storage bucket, and a log of what ran in which order. */
function fakeDb(rows: Row[], opts: { removeError?: unknown; onRemove?: () => void } = {}) {
  const log: string[] = [];
  const from = () => {
    const state: { patch: Partial<Row> | null; filters: [keyof Row, unknown][] } = { patch: null, filters: [] };
    const matches = () => rows.filter((r) => state.filters.every(([col, val]) => r[col] === val));
    const run = (single: boolean) => {
      if (state.patch) {
        log.push("update");
        const hit = matches();
        hit.forEach((r) => Object.assign(r, state.patch));
        return { data: hit.map((r) => ({ id: r.id })), error: null };
      }
      log.push("select");
      return { data: single ? (matches()[0] ?? null) : matches(), error: null };
    };
    const q = {
      select: () => q,
      update: (patch: Partial<Row>) => ((state.patch = patch), q),
      eq: (col: keyof Row, val: unknown) => (state.filters.push([col, val]), q),
      is: (col: keyof Row, val: unknown) => (state.filters.push([col, val]), q),
      maybeSingle: () => Promise.resolve(run(true)),
      then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => Promise.resolve(run(false)).then(ok, fail),
    };
    return q;
  };
  const storage = {
    from: () => ({
      remove: async (paths: string[]) => {
        log.push(`remove ${paths.join(",")}`);
        opts.onRemove?.();
        return { data: [], error: opts.removeError ?? null };
      },
    }),
  };
  (createAdminClient as jest.Mock).mockReturnValue({ from, storage });
  return log;
}

const live = (): Row => ({ id: ID, storage_path: PATH, revoked_at: null, revoked_by: null });

describe("revokeStoryProof: staff revoke deletes the screenshot straight away", () => {
  it("deletes the file first, then marks the row revoked (the row stays)", async () => {
    const row = live();
    const log = fakeDb([row]);
    expect(await revokeStoryProof(ID, "u1")).toBe("revoked");
    expect(log).toEqual(["select", `remove ${PATH}`, "update"]);
    expect(row.revoked_at).toEqual(expect.any(String));
    expect(row.revoked_by).toBe("admin:u1");
    expect(row.storage_path).toBe(PATH);
  });

  it("leaves the proof live when the file can't be deleted, so Revoke can be pressed again", async () => {
    const row = live();
    const log = fakeDb([row], { removeError: new Error("storage down") });
    await expect(revokeStoryProof(ID, "u1")).rejects.toThrow("storage down");
    expect(log).not.toContain("update");
    expect(row.revoked_at).toBeNull();
  });

  it("deletes a revoked proof's file again, harmlessly, without touching the row", async () => {
    const row = { ...live(), revoked_at: "2026-12-02T03:00:00Z", revoked_by: "admin:u0" };
    const log = fakeDb([row]);
    expect(await revokeStoryProof(ID, "u1")).toBe("already_revoked");
    expect(log).toEqual(["select", `remove ${PATH}`]);
    expect(row.revoked_by).toBe("admin:u0");
  });

  it("does nothing for a proof that doesn't exist", async () => {
    const log = fakeDb([]);
    expect(await revokeStoryProof(ID, "u1")).toBe("not_found");
    expect(log).toEqual(["select"]);
  });

  it("doesn't revoke a new screenshot the student uploaded in the same moment: staff check that one", async () => {
    const row = live();
    fakeDb([row], { onRemove: () => (row.storage_path = "elemental-2026/reg/2-bbbbbbbbbbbb.png") });
    expect(await revokeStoryProof(ID, "u1")).toBe("changed");
    expect(row.revoked_at).toBeNull();
  });
});
