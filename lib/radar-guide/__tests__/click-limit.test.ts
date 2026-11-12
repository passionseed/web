import { clientKey, createClickLimiter } from "../click-limit";

describe("createClickLimiter", () => {
  it("allows up to the limit per key per minute, then resets", () => {
    let t = 0;
    const allow = createClickLimiter(3, () => t);
    expect([allow("a"), allow("a"), allow("a"), allow("a")]).toEqual([true, true, true, false]);
    expect(allow("b")).toBe(true);
    t = 60_000;
    expect(allow("a")).toBe(true);
  });
});

describe("clientKey", () => {
  it("takes the first forwarded address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientKey(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
