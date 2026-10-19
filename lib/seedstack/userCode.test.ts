import { formatUserCodeInput, normalizeUserCode } from "./userCode";

describe("formatUserCodeInput", () => {
  it("uppercases, strips spaces and punctuation, and inserts the dash after 4", () => {
    expect(formatUserCodeInput("ab")).toBe("AB");
    expect(formatUserCodeInput("abcd")).toBe("ABCD");
    expect(formatUserCodeInput("abcd2")).toBe("ABCD-2");
    expect(formatUserCodeInput(" abcd 2345 ")).toBe("ABCD-2345");
    expect(formatUserCodeInput("ABCD-2345-extra")).toBe("ABCD-2345");
  });

  it("round-trips with the server check", () => {
    expect(normalizeUserCode(formatUserCodeInput("wxyz 6789"))).toBe("WXYZ-6789");
    expect(normalizeUserCode(formatUserCodeInput("abc"))).toBeNull();
  });
});
