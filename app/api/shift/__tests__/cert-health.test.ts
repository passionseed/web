/**
 * @jest-environment node
 */
import type { CertificateLookup } from "@/lib/shift-round/certificate/types";

const mockFetch = jest.fn<Promise<CertificateLookup>, [string]>();
jest.mock("@/lib/shift-round/certificate/rpc", () => ({
  fetchCertificate: (id: string) => mockFetch(id),
}));

import { GET } from "../cert-health/route";
import { checkCertificateHealth, HEALTH_MISSING_ID } from "@/lib/shift-round/certificate/health";

jest.setTimeout(30_000);

beforeEach(() => mockFetch.mockReset());

describe("/api/shift/cert-health", () => {
  it("200 {ok:true} when the real renderer works and the RPC says not found", async () => {
    mockFetch.mockResolvedValue({ kind: "not_found", publicId: HEALTH_MISSING_ID });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, renderer: true, rpc: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(mockFetch).toHaveBeenCalledWith(HEALTH_MISSING_ID);
  });

  it.each([
    ["RPC failure", { kind: "error", publicId: HEALTH_MISSING_ID, reason: "rpc:PGRST202" }],
    ["RPC finds the missing id (wrong database)", { kind: "tombstone", publicId: HEALTH_MISSING_ID, data: {} }],
  ])("503 on %s", async (_label, lookup) => {
    mockFetch.mockResolvedValue(lookup as CertificateLookup);
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });

  it("not ok when the renderer throws or returns a non-PNG", async () => {
    const fetch = jest.fn().mockResolvedValue({ kind: "not_found", publicId: HEALTH_MISSING_ID });
    const throws = await checkCertificateHealth({ fetch, render: jest.fn().mockRejectedValue(new Error("font")) });
    expect(throws).toEqual({ ok: false, renderer: false, rpc: true });
    const junk = await checkCertificateHealth({ fetch, render: jest.fn().mockResolvedValue(Buffer.from("nope")) });
    expect(junk.ok).toBe(false);
  });
});
