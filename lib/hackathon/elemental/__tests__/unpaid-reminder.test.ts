import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { isParentView, parentPayUrl, parentShareMessage } from "../parent-share";
import { pickUnpaidReminders, unpaidReminderContent, type ReminderRow } from "../unpaid-reminder";

const TOKEN = "0123456789abcdef0123456789abcdef";
const now = new Date("2026-11-28T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const row = (over: Partial<ReminderRow>): ReminderRow => ({
  pay_token: TOKEN,
  status: "pending",
  amount_baht: ELEMENTAL.priceBaht,
  contact_email: "demo@example.com",
  created_at: hoursAgo(30),
  ...over,
});

describe("parent link and message", () => {
  it("opens the same pay page in the parent's view", () => {
    expect(parentPayUrl("https://passionseed.org/", TOKEN)).toBe(`https://passionseed.org/hackathon/join/${TOKEN}?for=parent`);
    expect(isParentView("parent")).toBe(true);
    expect(isParentView(["parent", "x"])).toBe(true);
    expect(isParentView(undefined)).toBe(false);
    expect(isParentView("student")).toBe(false);
  });

  it("says what it is for, the sign-up's own amount and the link, with no em dash", () => {
    for (const amountBaht of [ELEMENTAL.priceBaht, ELEMENTAL.groupPriceBaht, ELEMENTAL.buddyPriceBaht]) {
      const message = parentShareMessage({ amountBaht, url: "https://passionseed.org/x" });
      expect(message).toContain(`฿${amountBaht}`);
      expect(message).toContain(ELEMENTAL.gradesTh);
      expect(message).toContain(`${ELEMENTAL.edition} Hackathon`);
      expect(message.endsWith("https://passionseed.org/x")).toBe(true);
      expect(message).not.toContain("—");
    }
  });
});

describe("pickUnpaidReminders", () => {
  it("takes pending sign-ups older than the cutoff, one per address, newest first-come order", () => {
    const rows = [
      row({ pay_token: "a".repeat(32), contact_email: "one@example.com", created_at: hoursAgo(40) }),
      row({ pay_token: "b".repeat(32), contact_email: "ONE@example.com ", created_at: hoursAgo(20) }),
      row({ pay_token: "c".repeat(32), contact_email: "two@example.com", created_at: hoursAgo(50), amount_baht: 149 }),
      row({ pay_token: "d".repeat(32), contact_email: "fresh@example.com", created_at: hoursAgo(2) }),
    ];
    expect(pickUnpaidReminders(rows, { now, olderThanHours: 12 })).toEqual([
      { to: "two@example.com", payToken: "c".repeat(32), amountBaht: 149 },
      { to: "ONE@example.com", payToken: "b".repeat(32), amountBaht: ELEMENTAL.priceBaht },
    ]);
  });

  it("skips an address that already has a paid or checking sign-up, cancelled ones and empty addresses", () => {
    const rows = [
      row({ contact_email: "paid@example.com" }),
      row({ contact_email: "paid@example.com", status: "paid" }),
      row({ contact_email: "slip@example.com" }),
      row({ contact_email: "slip@example.com", status: "review" }),
      row({ contact_email: "gone@example.com", status: "cancelled" }),
      row({ contact_email: null }),
      row({ contact_email: "not-an-address" }),
    ];
    expect(pickUnpaidReminders(rows, { now, olderThanHours: 12 })).toEqual([]);
  });

  it("leaves out sign-ups made before `since`, so a second run reaches only new ones", () => {
    const rows = [row({ contact_email: "old@example.com", created_at: hoursAgo(60) }), row({ contact_email: "new@example.com", created_at: hoursAgo(20) })];
    const since = new Date(now.getTime() - 24 * 3_600_000);
    expect(pickUnpaidReminders(rows, { now, olderThanHours: 12, since }).map((r) => r.to)).toEqual(["new@example.com"]);
  });
});

describe("unpaidReminderContent", () => {
  const email = unpaidReminderContent({ payToken: TOKEN, amountBaht: ELEMENTAL.groupPriceBaht, base: "https://passionseed.org" });

  it("links the sign-up's own pay page and the parent view, with its own amount", () => {
    expect(email.text).toContain(`https://passionseed.org/hackathon/join/${TOKEN}`);
    expect(email.text).toContain(`https://passionseed.org/hackathon/join/${TOKEN}?for=parent`);
    expect(email.html).toContain(`฿${ELEMENTAL.groupPriceBaht}`);
    expect(email.html).toContain("https://line.me/R/share?text=");
  });

  it("has no em dash in what the reader sees", () => {
    expect(`${email.subject}${email.text}`).not.toContain("—");
  });
});
