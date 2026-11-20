import { interpretSlipOk } from "../client";

describe("interpretSlipOk", () => {
  it("passes a valid slip for the right amount", () => {
    const v = interpretSlipOk({ success: true, data: { success: true, transRef: "0100921", amount: 298 } }, 298);
    expect(v).toMatchObject({ kind: "paid", transRef: "0100921", amount: 298 });
  });

  it("rejects a valid slip for the wrong amount even if SlipOK passed it", () => {
    const v = interpretSlipOk({ success: true, data: { success: true, transRef: "x", amount: 149 } }, 298);
    expect(v).toMatchObject({ kind: "rejected", reason: "amount" });
  });

  it.each([
    [1012, "duplicate"],
    [1013, "amount"],
    [1014, "receiver"],
    [1007, "unreadable"],
    [1011, "expired"],
  ])("maps error %i to %s", (code, reason) => {
    expect(interpretSlipOk({ success: false, code, message: "x" }, 199)).toMatchObject({ kind: "rejected", reason });
  });

  it("asks to retry when the bank is slow", () => {
    expect(interpretSlipOk({ success: false, code: "1010", data: { delay: 5 } }, 199)).toMatchObject({
      kind: "retry",
      delayMinutes: 5,
    });
  });

  it("sends quota and unknown errors to a person", () => {
    expect(interpretSlipOk({ success: false, code: 1004 }, 199)).toMatchObject({ kind: "unverified", code: 1004 });
    expect(interpretSlipOk(null, 199)).toMatchObject({ kind: "unverified" });
  });
});
