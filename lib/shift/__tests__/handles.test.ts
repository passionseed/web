import { cleanHandle } from "../handles";

describe("cleanHandle", () => {
  it("trims whitespace", () => {
    expect(cleanHandle("  somkid  ")).toBe("somkid");
  });

  it("strips a leading @", () => {
    expect(cleanHandle("@somkid")).toBe("somkid");
  });

  it("returns null for empty or blank input", () => {
    expect(cleanHandle("")).toBeNull();
    expect(cleanHandle("   ")).toBeNull();
    expect(cleanHandle("@")).toBeNull();
  });

  it("returns null for non-strings", () => {
    expect(cleanHandle(undefined)).toBeNull();
    expect(cleanHandle(null)).toBeNull();
    expect(cleanHandle(42)).toBeNull();
  });
});
