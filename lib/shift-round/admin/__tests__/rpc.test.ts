import { listEntries, listRoles, rejectEvidence } from "../api";
import { callRpc } from "../rpc";

const client = (response: unknown) => ({ rpc: jest.fn().mockResolvedValue(response) });

describe("callRpc envelope mapping", () => {
  test("returns data and request id on ok", async () => {
    const c = client({ data: { ok: true, data: { round_id: "r1" }, request_id: "q1" }, error: null, status: 200 });
    await expect(callRpc(c, "shift_round_admin_create_round", { p_round: {} })).resolves.toEqual({
      ok: true,
      data: { round_id: "r1" },
      request_id: "q1",
    });
    expect(c.rpc).toHaveBeenCalledWith("shift_round_admin_create_round", { p_round: {} });
  });

  test("passes business errors through with code, field and retry_after", async () => {
    const c = client({
      data: { ok: false, error: { code: "invalid_field", category: "validation", field: "title_th", retry_after: null, details: {} }, request_id: "q2" },
      error: null,
    });
    const result = await callRpc(c, "x");
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "invalid_field", category: "validation", field: "title_th", request_id: "q2" }),
    });
  });

  test("missing function is unavailable, never a business error", async () => {
    const c = client({ data: null, error: { code: "PGRST202", message: "Could not find the function" }, status: 404 });
    const result = await callRpc(c, "shift_round_admin_rounds");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unavailable");
  });

  test.each([
    [{ code: "PGRST301", message: "JWT expired" }, 401, "unauthenticated"],
    [{ code: "42501", message: "permission denied" }, 403, "forbidden"],
    [{ code: "XX000", message: "boom" }, 500, "retryable"],
  ])("maps transport error %j/%i to %s", async (error, status, code) => {
    const result = await callRpc(client({ data: null, error, status }), "x");
    expect(!result.ok && result.error.code).toBe(code);
  });

  test("a thrown network error is retryable", async () => {
    const c = { rpc: jest.fn().mockRejectedValue(new Error("fetch failed")) };
    const result = await callRpc(c, "x");
    expect(!result.ok && result.error.category).toBe("retryable");
  });

  test("a non-envelope body is unavailable", async () => {
    const result = await callRpc(client({ data: [1, 2], error: null }), "x");
    expect(!result.ok && result.error.code).toBe("unavailable");
  });
});

describe("api wrappers", () => {
  test("roles come from shift_round_admin_roles", async () => {
    const c = client({ data: { ok: true, data: { roles: [{ user_id: "u", email: "a@x.org", role: "mentor", round_id: "r" }] } }, error: null });
    const result = await listRoles(c, "r");
    expect(c.rpc).toHaveBeenCalledWith("shift_round_admin_roles", { p_round_id: "r" });
    expect(result.ok && result.data[0].email).toBe("a@x.org");
  });

  test("reject sends the contract argument names", async () => {
    const c = client({ data: { ok: true, data: { missions: {}, invalidated_changes: [] } }, error: null });
    await rejectEvidence(c, "e1", "privacy", "note", 1200);
    expect(c.rpc).toHaveBeenCalledWith("shift_round_admin_reject_evidence", {
      p_evidence_id: "e1",
      p_reason_code: "privacy",
      p_note: "note",
      p_review_ms: 1200,
    });
  });

  test("entries accept either a bare list or an object with squads", async () => {
    const bare = await listEntries(client({ data: { ok: true, data: [{ id: "a" }] }, error: null }), "r");
    expect(bare.ok && bare.data.entries.map((e) => e.id)).toEqual(["a"]);
    expect(bare.ok && bare.data.squads).toEqual([]);
    const full = await listEntries(
      client({ data: { ok: true, data: { entries: [{ id: "a" }], squads: [{ id: "s" }] } }, error: null }),
      "r",
    );
    expect(full.ok && full.data.squads).toEqual([{ id: "s" }]);
  });
});
