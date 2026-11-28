import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * The Elemental buddy pass. Someone who signs up alone and pays the solo
 * price (฿199) gets one pass for one friend, who pays ฿99. The pair pays
 * exactly what a team of two does (199 + 99 = 2 x 149), so nobody loses.
 *
 * The joke: the friend "owes" the sender a snack for the ฿50 they saved. The
 * sender picks the snack, it rides along in the link (?owe=boba), and nothing
 * checks or collects it.
 *
 * Shared by the pages and the API route, so both apply the same rules. The
 * database enforces one use per pass (a partial unique index).
 */

/** Pass codes: 12 hex characters, made by the database. */
export const BUDDY_PASS_CODE_RE = /^[0-9a-f]{12}$/;

/** What the friend owes back. Keys go in the URL; labels are shown. */
export const BUDDY_OWE_KEYS = ["boba", "mookata", "mala", "kaprao"] as const;
export type BuddyOwe = (typeof BUDDY_OWE_KEYS)[number];

export const BUDDY_OWE: Record<BuddyOwe, { th: string; unit: string }> = {
  boba: { th: "ชานมไข่มุก", unit: "1 แก้ว" },
  mookata: { th: "หมูกระทะ", unit: "1 มื้อ" },
  mala: { th: "หม่าล่า", unit: "10 ไม้" },
  kaprao: { th: "กะเพราไข่ดาว", unit: "1 จาน" },
};
export const DEFAULT_BUDDY_OWE: BuddyOwe = "boba";

/** ?owe= from a link: a known key, or the default for anything else. */
export function parseBuddyOwe(raw: string | null | undefined): BuddyOwe {
  return (BUDDY_OWE_KEYS as readonly string[]).includes(raw ?? "") ? (raw as BuddyOwe) : DEFAULT_BUDDY_OWE;
}

/** "ชานมไข่มุก 1 แก้ว" */
export function buddyOweLabel(owe: BuddyOwe): string {
  const o = BUDDY_OWE[owe];
  return `${o.th} ${o.unit}`;
}

/** The registration that holds a pass, as the rules need it. */
export type BuddyPassSender = {
  status: "pending" | "review" | "paid" | "cancelled";
  memberCount: number;
  amountBaht: number;
  teamId: string | null;
  /** Set when this registration itself was made with someone else's pass. */
  fromRegistrationId: string | null;
};

/**
 * Whether a registration comes with a pass at all: one person, no team, at
 * the full solo price, not made with a pass itself. Paid or not.
 */
export function holdsBuddyPass(s: BuddyPassSender): boolean {
  return (
    s.memberCount === 1 &&
    s.teamId === null &&
    s.fromRegistrationId === null &&
    s.amountBaht === ELEMENTAL.priceBaht
  );
}

/**
 * What a pass link does right now.
 * - available: paid sender, nobody holds the pass
 * - locked: the sender hasn't paid yet (pending, review), so it can't be used
 * - used: a friend's sign-up that isn't cancelled already holds it
 * - invalid: no such pass, a cancelled sender, or a sign-up without a pass
 */
export type BuddyPassState = "available" | "locked" | "used" | "invalid";

export function buddyPassState(sender: BuddyPassSender | null, claimed: boolean): BuddyPassState {
  if (!sender || sender.status === "cancelled" || !holdsBuddyPass(sender)) return "invalid";
  if (sender.status !== "paid") return "locked";
  return claimed ? "used" : "available";
}

/**
 * The friend can't be the sender with a second form. There is no login, so
 * this only catches the obvious case: the same email or phone.
 */
export function isSameContact(
  a: { contactEmail: string; contactPhone: string },
  b: { contactEmail: string; contactPhone: string },
): boolean {
  const phone = (p: string) => p.replace(/[\s-]/g, "").replace(/^\+66/, "0");
  return (
    a.contactEmail.trim().toLowerCase() === b.contactEmail.trim().toLowerCase() ||
    phone(a.contactPhone) === phone(b.contactPhone)
  );
}

/** The link the sender shares. */
export function buddyPassUrl(origin: string, code: string, owe: BuddyOwe): string {
  return `${origin}/hackathon/join?pass=${code}&owe=${owe}`;
}

/** The prefilled message for LINE and the share sheet. */
export function buddyPassMessage(url: string, owe: BuddyOwe): string {
  return (
    `เราจ่ายค่าสมัคร ${ELEMENTAL.edition} Hackathon คนเดียวไปแล้ว เลยได้บัตรเพื่อนมา 1 ใบ ` +
    `ให้แกเลย จ่ายแค่ ฿${ELEMENTAL.buddyPriceBaht} ส่วนที่ลดไป ฿${ELEMENTAL.groupPriceBaht - ELEMENTAL.buddyPriceBaht} ` +
    `ขอเป็น${buddyOweLabel(owe)} ตอนเจอกันพอ สมัครที่นี่: ${url}`
  );
}
