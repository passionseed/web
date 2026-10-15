/**
 * @jest-environment node
 */
import { FIXTURE_PUBLIC_ID, FIXTURE_SNAPSHOTS } from "@/lib/shift-round/certificate/fixtures";
import type { CertificateLookup } from "@/lib/shift-round/certificate/types";

const mockFetch = jest.fn<Promise<CertificateLookup>, [string]>();
const mockRender = jest.fn();

jest.mock("@/lib/shift-round/certificate/rpc", () => ({
  fetchCertificate: (id: string) => mockFetch(id),
}));
jest.mock("@/lib/shift-round/certificate/render", () => ({
  renderCertificatePng: (...args: unknown[]) => mockRender(...args),
}));

import { GET } from "../[publicId]/image/[format]/route";

const ID = FIXTURE_PUBLIC_ID;
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function call(format: string, query = "") {
  const url = `https://www.passionseed.org/c/${ID}/image/${format}${query}`;
  return GET(new Request(url), { params: Promise.resolve({ publicId: ID, format }) });
}

const valid = (renderVersion = 3): CertificateLookup => ({
  kind: "valid",
  publicId: ID,
  snapshot: FIXTURE_SNAPSHOTS.handle,
  data: { status: "valid", tombstone: false, snapshot: FIXTURE_SNAPSHOTS.handle, render_version: renderVersion, summary: null },
});

beforeEach(() => {
  mockFetch.mockReset();
  mockRender.mockReset();
  mockRender.mockResolvedValue(PNG_BYTES);
});

describe("/c/[publicId]/image/[format]", () => {
  it("redirects a missing v to the current render_version", async () => {
    mockFetch.mockResolvedValue(valid(3));
    const res = await call("story");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`https://www.passionseed.org/c/${ID}/image/story?v=3`);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("redirects an old v to the current one", async () => {
    mockFetch.mockResolvedValue(valid(4));
    const res = await call("square", "?v=3");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("v=4");
  });

  it("serves the PNG with a short cache header when v matches", async () => {
    mockFetch.mockResolvedValue(valid(3));
    const res = await call("square", "?v=3");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300, stale-while-revalidate=60");
    expect(Buffer.from(await res.arrayBuffer()).equals(new Uint8Array(PNG_BYTES))).toBe(true);
    expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({ publicId: ID, holder: "ต้น" }), "square");
  });

  it.each([
    ["revoked", { kind: "revoked", publicId: ID, snapshot: FIXTURE_SNAPSHOTS.handle, data: { status: "revoked", tombstone: false, snapshot: FIXTURE_SNAPSHOTS.handle, revoked_at: "2026-12-01T00:00:00Z", render_version: 5 } }],
    ["tombstone", { kind: "tombstone", publicId: ID, data: { status: "revoked", tombstone: true, snapshot: null, render_version: 6 } }],
  ])("returns 410 JSON for %s (the app hides share)", async (_label, lookup) => {
    mockFetch.mockResolvedValue(lookup as CertificateLookup);
    const res = await call("story", "?v=5");
    expect(res.status).toBe(410);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown certificates and unknown formats", async () => {
    mockFetch.mockResolvedValue({ kind: "not_found", publicId: ID });
    expect((await call("story", "?v=1")).status).toBe(404);
    expect((await call("banner", "?v=1")).status).toBe(404);
  });

  it("returns 503 (not 404/410) when the lookup fails", async () => {
    mockFetch.mockResolvedValue({ kind: "error", publicId: ID, reason: "rpc:500" });
    const res = await call("story", "?v=1");
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 503 without caching when rendering throws", async () => {
    mockFetch.mockResolvedValue(valid(3));
    mockRender.mockRejectedValue(new Error("font"));
    const res = await call("story", "?v=3");
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
