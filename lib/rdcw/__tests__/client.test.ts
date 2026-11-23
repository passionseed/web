import { bangkokDay, interpretRdcw, slipReceiver } from "../client";

const ok = (over: Record<string, unknown> = {}) => ({
  valid: true,
  data: {
    transRef: "016330120000ATF01234",
    transDate: "20261123",
    transTime: "10:15:00",
    amount: 199,
    receivingBank: "006",
    receiver: { proxy: { type: "NATID", value: "x-xxxx-xxxxx-21-67" } },
    ...over,
  },
});

describe("interpretRdcw", () => {
  it("passes a valid slip to us for the right amount", () => {
    expect(interpretRdcw(ok(), 199)).toMatchObject({
      kind: "paid",
      transRef: "016330120000ATF01234",
      amount: 199,
      transTimestamp: "20261123 10:15:00",
    });
  });

  it("sends a slip dated before the sign-up to a person", () => {
    expect(interpretRdcw(ok(), 199, "image/jpeg", "20261124")).toMatchObject({ kind: "unverified" });
    expect(interpretRdcw(ok(), 199, "image/jpeg", "20261123")).toMatchObject({ kind: "paid" });
  });

  it("reads the sign-up day in Bangkok time", () => {
    expect(bangkokDay("2026-11-22T17:30:00Z")).toBe("20261123");
    expect(bangkokDay("2026-11-22T16:59:00Z")).toBe("20261122");
  });

  it("rejects the wrong amount", () => {
    expect(interpretRdcw(ok({ amount: "149.00" }), 199)).toMatchObject({ kind: "rejected", reason: "amount" });
  });

  it("rejects a slip paid to another bank or PromptPay ID", () => {
    expect(interpretRdcw(ok({ receivingBank: "014" }), 199)).toMatchObject({ kind: "rejected", reason: "receiver" });
    expect(
      interpretRdcw(ok({ receiver: { proxy: { type: "MSISDN", value: "xxx-xxx-9999" } } }), 199),
    ).toMatchObject({ kind: "rejected", reason: "receiver" });
  });

  it.each([1004, 1005, 1006])("maps %i to unreadable", (code) => {
    expect(interpretRdcw({ code, message: "Invalid payload" }, 199)).toMatchObject({
      kind: "rejected",
      reason: "unreadable",
    });
  });

  it("sends an unreadable WebP to a person instead of back to the student", () => {
    expect(interpretRdcw({ code: 1006 }, 199, "image/webp")).toMatchObject({ kind: "unverified", code: 1006 });
  });

  it.each([2002, 2003, 2004, 2006])("asks to retry on bank error %i", (code) => {
    expect(interpretRdcw({ code }, 199)).toMatchObject({ kind: "retry", code });
  });

  it.each([1000, 1003, 1007, 1008, 2001, 2005])("sends %i to a person", (code) => {
    expect(interpretRdcw({ code }, 199)).toMatchObject({ kind: "unverified", code });
  });

  it("sends an empty reply to a person", () => {
    expect(interpretRdcw(null, 199)).toMatchObject({ kind: "unverified" });
  });
});

describe("slipReceiver", () => {
  it("is us only with our bank and our visible PromptPay digits", () => {
    expect(slipReceiver(ok().data)).toBe("us");
  });

  it("is unknown when the receiver is masked, missing or unfamiliar, so a person checks", () => {
    expect(slipReceiver({ receivingBank: "006", receiver: { proxy: { value: "xxxxxxxxxxxxx" } } })).toBe("unknown");
    expect(slipReceiver({ receivingBank: "006" })).toBe("unknown");
    expect(slipReceiver({ receivingBank: "KTB", receiver: { proxy: { value: "xxx2167" } } })).toBe("unknown");
    expect(slipReceiver(undefined)).toBe("unknown");
  });

  it("sends a paid-looking slip with an unconfirmed receiver to review, never to paid", () => {
    expect(interpretRdcw(ok({ receiver: undefined }), 199)).toMatchObject({ kind: "unverified" });
  });
});
