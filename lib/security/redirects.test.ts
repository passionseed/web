import { safeRedirectPath } from "./redirects";

describe("safeRedirectPath", () => {
  it.each([
    undefined, null, ["/me"], "", "https://evil.invalid", "//evil.invalid",
    "/\\evil.invalid", "/\t/evil.invalid", "/\n/evil.invalid", "/\r/evil.invalid",
    "javascript:alert(1)", " /me", "/me\u0000",
  ])("rejects unsafe destination %p", (value) => {
    expect(safeRedirectPath(value, "/me")).toBe("/me");
  });

  it.each(["/calendar?view=week#today", "/whiteboard/join/abc", "/shift/join/abc", "/map/123", "/"])(
    "preserves local destination %s", (value) => {
      expect(safeRedirectPath(value, "/me")).toBe(value);
    }
  );
});
