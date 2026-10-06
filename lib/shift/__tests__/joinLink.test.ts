import {
  isShiftJoinToken,
  newShiftJoinToken,
  shiftJoinPath,
  tokenFromShiftJoinPath,
} from "../joinLink";

describe("shift join link", () => {
  it("mints URL-safe tokens that round-trip through the path", () => {
    const token = newShiftJoinToken();
    expect(token).toHaveLength(24);
    expect(isShiftJoinToken(token)).toBe(true);
    expect(tokenFromShiftJoinPath(shiftJoinPath(token))).toBe(token);
  });

  it("mints a different token each time", () => {
    expect(newShiftJoinToken()).not.toBe(newShiftJoinToken());
  });

  it("ignores trailing query and sub-paths", () => {
    const token = "abcdefghijklmnopqrstuvwx";
    expect(tokenFromShiftJoinPath(`/shift/join/${token}?error=taken`)).toBe(token);
    expect(tokenFromShiftJoinPath(`/shift/join/${token}/extra`)).toBe(token);
  });

  it("rejects other paths and malformed tokens", () => {
    expect(tokenFromShiftJoinPath("/me")).toBeNull();
    expect(tokenFromShiftJoinPath("/shift/join/")).toBeNull();
    expect(tokenFromShiftJoinPath("/shift/join/short")).toBeNull();
    expect(tokenFromShiftJoinPath("/shift/join/has spaces in the token!!")).toBeNull();
  });
});
