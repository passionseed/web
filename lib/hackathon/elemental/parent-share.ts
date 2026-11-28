import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";

/**
 * "Send to my parent to pay" (the unpaid pay page and the reminder email).
 * Most people who sign up are M.3 to M.6, so a parent often pays. The student
 * sends their own pay page with ?for=parent: the same page, the same token,
 * but it opens as "this is <nickname>'s sign-up" with the QR and the slip
 * upload and nothing else (PayView, UnpaidPay.tsx).
 *
 * The link is the page's key, exactly as the student's own link is: whoever
 * holds it can pay and see the page. That is what handing it to a parent
 * means.
 */

/** The query that opens a pay page in the parent's view. */
export const PARENT_PARAM = { key: "for", value: "parent" } as const;

export function isParentView(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === PARENT_PARAM.value;
}

/** The pay page a parent opens: `${base}/hackathon/join/<token>?for=parent`. */
export function parentPayUrl(base: string, token: string): string {
  return `${base.replace(/\/+$/, "")}/hackathon/join/${token}?${PARENT_PARAM.key}=${PARENT_PARAM.value}`;
}

export const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

/**
 * The message a student sends a parent (LINE, the share sheet, or copied).
 * The amount is the sign-up's own (฿199 alone, ฿149 in a team, ฿99 on a
 * buddy pass); event facts come from ELEMENTAL.
 */
export function parentShareMessage({ amountBaht, url }: { amountBaht: number; url: string }): string {
  return [
    // PLACEHOLDER copy (Angpao)
    `ช่วยจ่ายค่าสมัคร ${ELEMENTAL.edition} Hackathon ให้หน่อย`,
    // PLACEHOLDER copy (Angpao)
    `เป็นงานแข่งออนไลน์ของ PassionSeed สำหรับนักเรียน ${ELEMENTAL.gradesTh} หัวข้อ${ELEMENTAL.theme} ${thaiDateLine()}`,
    // PLACEHOLDER copy (Angpao)
    `ค่าสมัคร ${baht(amountBaht)} เปิดลิงก์นี้แล้วสแกน QR พร้อมเพย์ และส่งสลิปในหน้าเดียวกันได้เลย`,
    url,
  ].join("\n");
}
