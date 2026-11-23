import { interpretRdcw, rdcwSlipTime, receiverNameIsOurs, slipReceiver } from "../client";

const ok = (over: Record<string, unknown> = {}) => ({
  valid: true,
  data: {
    transRef: "016330120000ATF01234",
    transDate: "20261123",
    transTime: "10:15:00",
    amount: 199,
    receivingBank: "006",
    receiver: {
      displayName: "บริษัท แพชชั่นซี้ด จ",
      name: "PASSION S",
      proxy: { type: "NATID", value: "XXXXXXXXX2167" },
    },
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

  // ok() is paid at 2026-11-23 10:15 Bangkok = 03:15 UTC.
  it("sends a slip made before the sign-up to a person, keeping its reference", () => {
    expect(interpretRdcw(ok(), 199, "image/jpeg", "2026-11-23T03:30:00Z")).toMatchObject({
      kind: "unverified",
      transRef: "016330120000ATF01234",
    });
    expect(interpretRdcw(ok(), 199, "image/jpeg", "2026-11-22T12:00:00Z")).toMatchObject({ kind: "paid" });
  });

  it("allows two minutes of clock drift", () => {
    expect(interpretRdcw(ok(), 199, "image/jpeg", "2026-11-23T03:16:30Z")).toMatchObject({ kind: "paid" });
  });

  it("sends a slip with no readable time to a person", () => {
    expect(interpretRdcw(ok({ transTime: undefined }), 199, "image/jpeg", "2026-11-22T12:00:00Z")).toMatchObject({
      kind: "unverified",
    });
  });

  it("reads RDCW's date and time as Bangkok time", () => {
    expect(rdcwSlipTime("20261123", "10:15:00")).toBe(Date.parse("2026-11-23T03:15:00Z"));
    expect(rdcwSlipTime("20261123", "10:15")).toBe(Date.parse("2026-11-23T03:15:00Z"));
    expect(rdcwSlipTime("2026-11-23", "10:15:00")).toBeNull();
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

  it("is us for a real PromptPay slip, where RDCW leaves the receiving bank blank", () => {
    // Shape of a real ฿149 slip checked on 2026-11-23.
    expect(
      slipReceiver({
        receivingBank: "",
        receiver: {
          displayName: "บริษัท แพชชั่นซี้ด จ",
          name: "PASSION S",
          proxy: { type: "NATID", value: "XXXXXXXXX2167" },
          account: { type: "", value: "" },
        },
      }),
    ).toBe("us");
  });

  it("sends our ID digits with someone else's name to review", () => {
    expect(
      slipReceiver({
        receivingBank: "",
        receiver: { displayName: "นาย สมชาย ใจดี", name: "SOMCHAI J", proxy: { type: "NATID", value: "XXXXXXXXX2167" } },
      }),
    ).toBe("unknown");
  });

  it("is not us for a phone PromptPay or an ID that isn't 13 digits, even ending 2167", () => {
    expect(slipReceiver({ receivingBank: "", receiver: { proxy: { type: "MSISDN", value: "XXXXXX2167" } } })).toBe(
      "unknown",
    );
    expect(slipReceiver({ receivingBank: "", receiver: { proxy: { type: "NATID", value: "XX2167" } } })).toBe(
      "unknown",
    );
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

describe("receiverNameIsOurs", () => {
  it("matches the bank's truncated Thai or English name, ignoring case and spacing", () => {
    expect(receiverNameIsOurs({ displayName: "บริษัท แพชชั่นซี้ด จ" })).toBe(true);
    expect(receiverNameIsOurs({ name: "passion  s" })).toBe(true);
    expect(receiverNameIsOurs({ name: "PASSION" })).toBe(false);
    expect(receiverNameIsOurs({})).toBe(false);
  });
});
