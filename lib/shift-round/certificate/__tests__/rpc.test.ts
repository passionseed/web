/**
 * @jest-environment node
 */
import { cleanRef, fetchCertificate, isBotUserAgent } from "../rpc";
import { FIXTURE_PUBLIC_ID, FIXTURE_SNAPSHOTS } from "../fixtures";

const ID = FIXTURE_PUBLIC_ID;
const client = (result: { data?: unknown; error?: unknown } | Error) => ({
  rpc: jest.fn(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result))),
});
const ok = (data: unknown) => ({ data: { ok: true, data, request_id: "r" }, error: null });

describe("fetchCertificate (contract 3.3)", () => {
  it("calls the public RPC with p_public_id", async () => {
    const c = client({ data: { ok: false, error: { code: "certificate_not_found" } }, error: null });
    await fetchCertificate(ID, c as never);
    expect(c.rpc).toHaveBeenCalledWith("shift_round_certificate_public", { p_public_id: ID });
  });

  it("maps a valid certificate", async () => {
    const c = client(ok({ status: "valid", tombstone: false, snapshot: FIXTURE_SNAPSHOTS.handle, render_version: 2, summary: null }));
    const res = await fetchCertificate(ID, c as never);
    expect(res.kind).toBe("valid");
  });

  it("maps revoked and drops any summary", async () => {
    const c = client(
      ok({
        status: "revoked",
        tombstone: false,
        snapshot: FIXTURE_SNAPSHOTS.handle,
        revoked_at: "2026-12-01T10:00:00+07:00",
        render_version: 3,
        summary: { title: "x", description: "y" },
      })
    );
    const res = await fetchCertificate(ID, c as never);
    expect(res.kind).toBe("revoked");
    if (res.kind === "revoked") expect(res.data.summary).toBeNull();
  });

  it("accepts Lane A's revoked shape (holder, counts, track stripped)", async () => {
    const { holder, counts, track, ...roundOnly } = FIXTURE_SNAPSHOTS.handle;
    void holder; void counts; void track;
    const c = client(ok({ status: "revoked", tombstone: false, round_number: 4, snapshot: roundOnly, revoked_at: "2026-12-01T00:00:00Z", render_version: 3, summary: null }));
    const res = await fetchCertificate(ID, c as never);
    expect(res.kind).toBe("revoked");
  });

  it("a valid certificate without the holder is an error, not a nameless valid page", async () => {
    const { holder, ...noHolder } = FIXTURE_SNAPSHOTS.handle;
    void holder;
    const c = client(ok({ status: "valid", tombstone: false, snapshot: noHolder, render_version: 1, summary: null }));
    expect((await fetchCertificate(ID, c as never)).kind).toBe("error");
  });

  it("maps tombstone", async () => {
    const c = client(ok({ status: "revoked", tombstone: true, snapshot: null, revoked_at: "2026-12-01T00:00:00Z", render_version: 4 }));
    expect((await fetchCertificate(ID, c as never)).kind).toBe("tombstone");
  });

  it("only certificate_not_found and impossible ids are not_found", async () => {
    expect((await fetchCertificate("bad-id", client(new Error("never")) as never)).kind).toBe("not_found");
    const nf = client({ data: { ok: false, error: { code: "certificate_not_found" } }, error: null });
    expect((await fetchCertificate(ID, nf as never)).kind).toBe("not_found");
  });

  it.each([
    ["PostgREST function missing", { data: null, error: { code: "PGRST202", message: "x" } }],
    ["network failure", new Error("fetch failed")],
    ["other business error", { data: { ok: false, error: { code: "unavailable" } }, error: null }],
    ["malformed envelope", { data: { hello: 1 }, error: null }],
    ["malformed snapshot", { data: { ok: true, data: { status: "valid", tombstone: false, snapshot: { v: 2 }, render_version: 1 } }, error: null }],
  ])("%s is an error, never not_found or revoked", async (_label, result) => {
    const res = await fetchCertificate(ID, client(result as never) as never);
    expect(res.kind).toBe("error");
  });
});

describe("visit helpers", () => {
  it("treats crawlers and empty UAs as bots", () => {
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0")).toBe(false);
  });

  it("passes a short raw ref through", () => {
    expect(cleanRef("share")).toBe("share");
    expect(cleanRef(["qr", "x"])).toBe("qr");
    expect(cleanRef(undefined)).toBeNull();
    expect(cleanRef("x".repeat(100))).toHaveLength(32);
  });
});
