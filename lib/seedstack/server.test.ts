/** @jest-environment node */

import { SEEDSTACK_NOTICE_VERSION } from "@/lib/seedstack/consent";
import {
  findParentLinkTarget,
  parentNoLongerNeeded,
  pollLinkRequest,
  recordParentDecision,
  storeSeedstackEvents,
  withdrawSeedstackConsent,
  type SeedstackConsent,
} from "@/lib/seedstack/server";
import { sha256Hex } from "@/lib/seedstack/tokens";

jest.mock("server-only", () => ({}));

/** One query against the fake client: which table, which write, which filters. */
interface Call {
  table: string;
  method: string;
  payload?: unknown;
  filters: unknown[][];
}

type Reply = { data: unknown; error: { message: string } | null };

const mockCalls: Call[] = [];
let mockReply: (call: Call) => Reply = () => ({ data: null, error: null });

jest.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const call: Call = { table, method: "", filters: [] };
      mockCalls.push(call);
      const chain: Record<string, unknown> = {
        then: (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(mockReply(call)).then(resolve, reject),
      };
      for (const method of ["insert", "update", "upsert", "delete"]) {
        chain[method] = (payload?: unknown) => Object.assign(call, { method, payload }) && chain;
      }
      // .select() after a write keeps the write as the method.
      chain.select = () => {
        call.method ||= "select";
        return chain;
      };
      for (const filter of ["eq", "in", "is", "not", "gt", "lt", "order", "limit", "maybeSingle"]) {
        chain[filter] = (...args: unknown[]) => {
          call.filters.push([filter, ...args]);
          return chain;
        };
      }
      return chain;
    },
  }),
}));

const TOKEN = "parent-token-".padEnd(43, "x");

beforeEach(() => {
  mockCalls.length = 0;
  mockReply = () => ({ data: null, error: null });
});

function callTo(table: string, method: string) {
  const call = mockCalls.find((c) => c.table === table && c.method === method);
  if (!call) throw new Error(`no ${method} on ${table}`);
  return call;
}

describe("recordParentDecision", () => {
  const params = { rawToken: TOKEN, parentName: "สมศรี", relationship: "แม่" };

  it("only updates a row the parent has not agreed to yet", async () => {
    mockReply = () => ({ data: [{ user_id: "u1" }], error: null });
    await expect(recordParentDecision({ ...params, agree: false })).resolves.toBe(true);

    const update = callTo("seedstack_consents", "update");
    expect(update.filters).toEqual(
      expect.arrayContaining([
        ["eq", "parent_token_hash", sha256Hex(TOKEN)],
        ["eq", "notice_version", SEEDSTACK_NOTICE_VERSION],
        ["is", "withdrawn_at", null],
        ["is", "parent_consented_at", null],
      ]),
    );
    expect(update.payload).toMatchObject({ parent_consented_at: null, parent_declined_at: expect.any(String) });
  });

  it("returns false when no row matched, e.g. the parent already agreed", async () => {
    mockReply = () => ({ data: [], error: null });
    await expect(recordParentDecision({ ...params, agree: false })).resolves.toBe(false);
  });

  it("throws on a database error", async () => {
    mockReply = () => ({ data: null, error: { message: "boom" } });
    await expect(recordParentDecision({ ...params, agree: true })).rejects.toThrow("boom");
  });
});

/** Aged 20+, agreed to the current notice: active without a parent. */
const ADULT: SeedstackConsent = {
  user_id: "u1",
  notice_version: SEEDSTACK_NOTICE_VERSION,
  student_consented_at: "2026-10-01T00:00:00Z",
  birth_date: "2000-01-01",
  parent_name: null,
  parent_relationship: null,
  parent_consented_at: null,
  parent_declined_at: null,
  withdrawn_at: null,
};
const WITHDRAWN: SeedstackConsent = { ...ADULT, withdrawn_at: "2026-10-05T00:00:00Z" };
const LIVE_TOKEN = { id: "t1", user_id: "u1", expires_at: "2099-01-01T00:00:00Z", revoked_at: null };

describe("findParentLinkTarget", () => {
  function replyWith(consent: SeedstackConsent | null) {
    mockReply = (call) =>
      call.table === "seedstack_consents" ? { data: consent, error: null } : { data: { nickname: "Ploy" }, error: null };
  }

  it("reports the parent's own decision, not the overall state", async () => {
    // Aged 20+ so the overall state is active, but the parent never answered.
    replyWith(ADULT);
    await expect(findParentLinkTarget(TOKEN)).resolves.toEqual({
      userId: "u1",
      state: "active",
      parentDecision: null,
      nickname: "Ploy",
    });
  });

  it("maps agreed and declined", async () => {
    replyWith({ ...ADULT, parent_consented_at: "2026-10-02T00:00:00Z" });
    await expect(findParentLinkTarget(TOKEN)).resolves.toMatchObject({ parentDecision: "agreed" });

    replyWith({ ...ADULT, parent_declined_at: "2026-10-02T00:00:00Z" });
    await expect(findParentLinkTarget(TOKEN)).resolves.toMatchObject({ parentDecision: "declined" });
  });

  it("returns null for an unknown link", async () => {
    replyWith(null);
    await expect(findParentLinkTarget(TOKEN)).resolves.toBeNull();
  });
});

describe("parentNoLongerNeeded", () => {
  const target = { userId: "u1", nickname: null };

  it("is true once the student is active without the parent agreeing", () => {
    expect(parentNoLongerNeeded({ ...target, state: "active", parentDecision: null })).toBe(true);
    expect(parentNoLongerNeeded({ ...target, state: "active", parentDecision: "declined" })).toBe(true);
  });

  it("is false while the parent is still needed or already agreed", () => {
    expect(parentNoLongerNeeded({ ...target, state: "active", parentDecision: "agreed" })).toBe(false);
    expect(parentNoLongerNeeded({ ...target, state: "awaiting_parent", parentDecision: null })).toBe(false);
    expect(parentNoLongerNeeded({ ...target, state: "parent_declined", parentDecision: "declined" })).toBe(false);
  });
});

describe("withdrawSeedstackConsent", () => {
  it("clears personal fields, revokes tokens, then deletes events and unconsumed link requests", async () => {
    await withdrawSeedstackConsent("u1");

    const consent = callTo("seedstack_consents", "update");
    expect(consent.filters).toEqual([["eq", "user_id", "u1"]]);
    expect(consent.payload).toEqual({
      withdrawn_at: expect.any(String),
      parent_token_hash: null,
      birth_date: null,
      parent_name: null,
      parent_relationship: null,
    });
    expect(callTo("seedstack_tokens", "update").filters).toEqual([
      ["eq", "user_id", "u1"],
      ["is", "revoked_at", null],
    ]);
    expect(callTo("seedstack_events", "delete").filters).toEqual([["eq", "user_id", "u1"]]);
    expect(callTo("seedstack_link_requests", "delete").filters).toEqual([
      ["eq", "user_id", "u1"],
      ["is", "consumed_at", null],
    ]);
  });

  it("runs consent, then tokens, then data, each only after the last finished", async () => {
    const issuedWhenSettled: Record<string, string[]> = {};
    mockReply = (call) => {
      issuedWhenSettled[call.table] = mockCalls.map((c) => c.table);
      return { data: null, error: null };
    };
    await withdrawSeedstackConsent("u1");

    expect(issuedWhenSettled.seedstack_consents).toEqual(["seedstack_consents"]);
    expect(issuedWhenSettled.seedstack_tokens).toEqual(["seedstack_consents", "seedstack_tokens"]);
    expect(mockCalls.map((c) => c.table)).toEqual([
      "seedstack_consents",
      "seedstack_tokens",
      "seedstack_events",
      "seedstack_link_requests",
    ]);
  });

  it("stops at the first failed step", async () => {
    mockReply = (call) =>
      call.table === "seedstack_consents" ? { data: null, error: { message: "nope" } } : { data: null, error: null };
    await expect(withdrawSeedstackConsent("u1")).rejects.toThrow("nope");
    expect(mockCalls.map((c) => c.table)).toEqual(["seedstack_consents"]);
  });

  it("throws if erasing fails", async () => {
    mockReply = (call) =>
      call.table === "seedstack_link_requests" ? { data: null, error: { message: "nope" } } : { data: null, error: null };
    await expect(withdrawSeedstackConsent("u1")).rejects.toThrow("nope");
  });
});

describe("storeSeedstackEvents", () => {
  const EVENT = {
    client_event_id: "evt_12345678",
    step: "install" as const,
    event: "done" as const,
    minutes: null,
    next: null,
    detail: null,
    live_url: null,
    client_ts: null,
  };

  /** Consent as seen by the first check, then by the re-check after the insert. */
  function replyWithConsents(first: SeedstackConsent, recheck: SeedstackConsent) {
    let consentReads = 0;
    mockReply = (call) => {
      if (call.table === "seedstack_tokens" && call.method === "select") return { data: LIVE_TOKEN, error: null };
      if (call.table === "seedstack_consents") return { data: consentReads++ ? recheck : first, error: null };
      if (call.method === "upsert") return { data: [{ client_event_id: EVENT.client_event_id }], error: null };
      return { data: null, error: null };
    };
  }

  it("stores and touches the token when consent holds", async () => {
    replyWithConsents(ADULT, ADULT);
    await expect(storeSeedstackEvents("psss_x", [EVENT])).resolves.toEqual({ ok: true, stored: 1 });
    expect(callTo("seedstack_events", "upsert").payload).toEqual([{ ...EVENT, user_id: "u1" }]);
    expect(callTo("seedstack_tokens", "update").filters).toEqual([["eq", "id", "t1"]]);
    expect(mockCalls.some((c) => c.method === "delete")).toBe(false);
  });

  it("deletes the rows it just inserted when consent was withdrawn mid-request", async () => {
    replyWithConsents(ADULT, WITHDRAWN);
    await expect(storeSeedstackEvents("psss_x", [EVENT])).resolves.toEqual({
      ok: false,
      status: 403,
      error: "consent_required",
    });
    expect(callTo("seedstack_events", "delete").filters).toEqual([
      ["eq", "user_id", "u1"],
      ["in", "client_event_id", [EVENT.client_event_id]],
    ]);
    expect(mockCalls.some((c) => c.table === "seedstack_tokens" && c.method === "update")).toBe(false);
  });

  it("writes nothing when the first check fails", async () => {
    replyWithConsents(WITHDRAWN, WITHDRAWN);
    await expect(storeSeedstackEvents("psss_x", [EVENT])).resolves.toMatchObject({ ok: false, error: "consent_required" });
    expect(mockCalls.some((c) => c.table === "seedstack_events")).toBe(false);
  });

  it("checks the token but skips the insert for an empty batch", async () => {
    replyWithConsents(ADULT, ADULT);
    await expect(storeSeedstackEvents("psss_x", [])).resolves.toEqual({ ok: true, stored: 0 });
    expect(mockCalls.some((c) => c.table === "seedstack_events")).toBe(false);
  });
});

describe("pollLinkRequest", () => {
  /** An approved request whose owner has the given consent at re-check time. */
  function replyApproved(consent: SeedstackConsent | null) {
    mockReply = (call) => {
      if (call.table === "seedstack_link_requests" && call.method === "update") return { data: { user_id: "u1" }, error: null };
      if (call.table === "seedstack_consents") return { data: consent, error: null };
      return { data: null, error: null };
    };
  }

  it("is pending while an open request exists", async () => {
    mockReply = (call) => ({ data: call.method === "select" ? { id: "r1" } : null, error: null });
    await expect(pollLinkRequest("device")).resolves.toEqual({ status: "pending" });
  });

  it("is expired when nothing is open", async () => {
    await expect(pollLinkRequest("device")).resolves.toEqual({ status: "expired" });
  });

  it("throws instead of reporting expired when the open lookup fails", async () => {
    mockReply = (call) => ({ data: null, error: call.method === "select" ? { message: "down" } : null });
    await expect(pollLinkRequest("device")).rejects.toThrow("down");
  });

  it("mints a token once the request is approved", async () => {
    replyApproved(ADULT);
    const result = await pollLinkRequest("device");
    expect(result).toEqual({ status: "approved", token: expect.stringMatching(/^psss_/) });
    expect(callTo("seedstack_tokens", "insert").payload).toMatchObject({ user_id: "u1" });
    expect(mockCalls.some((c) => c.table === "seedstack_tokens" && c.method === "update")).toBe(false);
  });

  it("revokes the fresh token and reports expired when consent was withdrawn meanwhile", async () => {
    replyApproved(WITHDRAWN);
    await expect(pollLinkRequest("device")).resolves.toEqual({ status: "expired" });

    const minted = callTo("seedstack_tokens", "insert").payload as { token_hash: string };
    const revoke = callTo("seedstack_tokens", "update");
    expect(revoke.payload).toEqual({ revoked_at: expect.any(String) });
    expect(revoke.filters).toEqual([["eq", "token_hash", minted.token_hash]]);
  });
});
