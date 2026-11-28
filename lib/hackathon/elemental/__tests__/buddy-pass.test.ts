import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import {
  BUDDY_OWE_KEYS,
  buddyOweLabel,
  buddyPassMessage,
  buddyPassState,
  buddyPassUrl,
  holdsBuddyPass,
  isSameContact,
  parseBuddyOwe,
  type BuddyPassSender,
} from "../buddy-pass";

const paidSolo: BuddyPassSender = {
  status: "paid",
  memberCount: 1,
  amountBaht: 199,
  fromRegistrationId: null,
};

describe("buddy pass price", () => {
  it("makes a solo payer plus one friend cost exactly a team of two", () => {
    expect(ELEMENTAL.buddyPriceBaht).toBe(99);
    expect(ELEMENTAL.priceBaht + ELEMENTAL.buddyPriceBaht).toBe(2 * ELEMENTAL.groupPriceBaht);
  });
});

describe("holdsBuddyPass", () => {
  it("is only for one person at the full solo price", () => {
    expect(holdsBuddyPass(paidSolo)).toBe(true);
    expect(holdsBuddyPass({ ...paidSolo, amountBaht: 149 })).toBe(false);
    expect(holdsBuddyPass({ ...paidSolo, memberCount: 2, amountBaht: 298 })).toBe(false);
  });

  it("is never on a sign-up that itself came from a pass (no chains)", () => {
    expect(holdsBuddyPass({ ...paidSolo, amountBaht: 99, fromRegistrationId: "r0" })).toBe(false);
    expect(holdsBuddyPass({ ...paidSolo, fromRegistrationId: "r0" })).toBe(false);
  });
});

describe("buddyPassState", () => {
  it("is available once the sender has paid and nobody holds it", () => {
    expect(buddyPassState(paidSolo, false)).toBe("available");
  });

  it("stays locked while the sender hasn't paid", () => {
    expect(buddyPassState({ ...paidSolo, status: "pending" }, false)).toBe("locked");
    expect(buddyPassState({ ...paidSolo, status: "review" }, false)).toBe("locked");
  });

  it("is used once a friend's sign-up holds it", () => {
    expect(buddyPassState(paidSolo, true)).toBe("used");
  });

  it("is invalid for no sender, a cancelled sender, or a sign-up without a pass", () => {
    expect(buddyPassState(null, false)).toBe("invalid");
    expect(buddyPassState({ ...paidSolo, status: "cancelled" }, false)).toBe("invalid");
    expect(buddyPassState({ ...paidSolo, amountBaht: 149 }, false)).toBe("invalid");
  });
});

describe("isSameContact", () => {
  const sender = { contactEmail: "a@example.com", contactPhone: "0812345678" };

  it("catches the sender using their own pass by email or phone", () => {
    expect(isSameContact(sender, { contactEmail: " A@Example.com ", contactPhone: "0899999999" })).toBe(true);
    expect(isSameContact(sender, { contactEmail: "b@example.com", contactPhone: "+66812345678" })).toBe(true);
    expect(isSameContact(sender, { contactEmail: "b@example.com", contactPhone: "081-234-5678" })).toBe(true);
  });

  it("lets a different person through", () => {
    expect(isSameContact(sender, { contactEmail: "b@example.com", contactPhone: "0899999999" })).toBe(false);
  });
});

describe("owe options", () => {
  it("falls back to boba for unknown or missing values", () => {
    expect(parseBuddyOwe("mookata")).toBe("mookata");
    expect(parseBuddyOwe("sushi")).toBe("boba");
    expect(parseBuddyOwe("toString")).toBe("boba");
    expect(parseBuddyOwe(undefined)).toBe("boba");
  });

  it("has a label for every key", () => {
    for (const k of BUDDY_OWE_KEYS) expect(buddyOweLabel(k)).toMatch(/\S+ \d+ \S+/);
  });
});

describe("share link and message", () => {
  it("puts the code and the owe in the link", () => {
    expect(buddyPassUrl("https://passionseed.org", "0123456789ab", "mala")).toBe(
      "https://passionseed.org/hackathon/join?pass=0123456789ab&owe=mala",
    );
  });

  it("names the price, the snack and the link, with no em dash", () => {
    const url = "https://passionseed.org/hackathon/join?pass=0123456789ab&owe=boba";
    const msg = buddyPassMessage(url, "boba");
    expect(msg).toContain("฿99");
    expect(msg).toContain("ชานมไข่มุก");
    expect(msg).toContain(url);
    expect(msg).not.toContain("—");
  });
});
