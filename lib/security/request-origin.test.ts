/** @jest-environment node */
import { isTrustedAdminRequest } from "./request-origin";

function request(method: string, headers: Record<string, string> = {}) {
  return new Request("https://passionseed.org/api/admin/users/roles", { method, headers });
}

describe("admin mutation origin validation", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("allows %s without origin", (method) => {
    expect(isTrustedAdminRequest(request(method))).toBe(true);
  });
  it.each(["POST", "PUT", "PATCH", "DELETE"])("requires a trusted origin for %s", (method) => {
    expect(isTrustedAdminRequest(request(method))).toBe(false);
    expect(isTrustedAdminRequest(request(method, { origin: "https://evil.invalid" }))).toBe(false);
    expect(isTrustedAdminRequest(request(method, { origin: "https://passionseed.org" }))).toBe(true);
  });
  it("uses referer only if origin is absent", () => {
    expect(isTrustedAdminRequest(request("POST", { referer: "https://passionseed.org/admin" }))).toBe(true);
    expect(isTrustedAdminRequest(request("POST", {
      origin: "null", referer: "https://passionseed.org/admin",
    }))).toBe(false);
  });
  it("rejects sibling domains, different ports, and malformed origins", () => {
    for (const origin of ["https://other.passionseed.org", "https://passionseed.org:444", "invalid"]) {
      expect(isTrustedAdminRequest(request("POST", { origin }))).toBe(false);
    }
  });
});
