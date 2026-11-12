import "server-only";

import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { plainName } from "@/lib/shift/parentEmail";
import { configuredParentEmailTransport, escapeHtml } from "@/lib/trials/parent-email";

/**
 * The email a parent gets when a student asks for island consent and typed
 * the parent's address. It only says which nickname asked and links to
 * /shift/island/parent/{token}, where the full notice and the form live.
 * Polite parent register (ค่ะ). The address is used for this one send and
 * never stored or logged.
 *
 * DRAFT COPY for the founder's Thai review.
 */

/** "25 พ.ย. 2569" in Bangkok time; empty for a broken date. */
export function thaiExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });
}

export function buildIslandParentEmail(input: { nickname: string; url: string; expiresAt: string }): { subject: string; html: string } {
  const nickname = plainName(input.nickname) || "นักเรียน";
  const who = escapeHtml(nickname);
  const href = escapeHtml(input.url);
  const until = thaiExpiry(input.expiresAt);

  return {
    subject: `ขอความยินยอมจากผู้ปกครอง: เกาะ SHIFT High ของ ${nickname}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#17324d;max-width:560px">
        <p>สวัสดีค่ะ</p>
        <p>${who} ทำโปรเจกต์จริงกับทีมบนเกาะ SHIFT High ของ PassionSeed
        และขอให้ผู้ปกครองช่วยกดยินยอม ก่อนที่ชื่อทีมและงานจะขึ้นให้คนอื่นเห็น ก่อนแลกของในร้าน และก่อนรับรางวัล
        ระหว่างนี้ ${who} เล่นและทำเควสต์ได้ตามปกติค่ะ</p>
        <p>กดลิงก์ด้านล่างเพื่ออ่านรายละเอียด แล้วพิมพ์ชื่อเพื่อยืนยัน ใช้เวลาประมาณ 2 นาทีค่ะ${until ? ` ลิงก์ใช้ได้ถึง ${escapeHtml(until)}` : ""}</p>
        <p style="margin:24px 0">
          <a href="${href}" style="background:#17324d;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">อ่านรายละเอียดและยืนยัน</a>
        </p>
        <p style="font-size:13px;color:#4a6378">ลิงก์นี้เป็นของผู้ปกครองเท่านั้น กรุณาอย่าส่งต่อ
        ถ้าไม่ใช่ผู้ปกครองของ ${who} ไม่ต้องทำอะไรค่ะ
        สงสัยอะไร ทัก LINE ${escapeHtml(SHIFT_PAYMENT.lineId)}</p>
        <p style="font-size:13px;color:#4a6378;word-break:break-all">${href}</p>
      </div>
    `,
  };
}

/**
 * Sends the island parent link. Best effort and never throws: false when
 * Resend is not configured or refuses, so the student copies the link to
 * LINE instead. The idempotency key comes from the token's hash, so a retry
 * of the same link never sends twice. Logs a code only, never the address.
 */
export async function sendIslandParentEmail(input: {
  to: string;
  nickname: string;
  url: string;
  expiresAt: string;
  tokenHash: string;
}): Promise<boolean> {
  try {
    const email = buildIslandParentEmail(input);
    const result = await configuredParentEmailTransport().send({
      to: input.to,
      ...email,
      idempotencyKey: `island-parent-${input.tokenHash.slice(0, 32)}`,
    });
    if (!result.ok) {
      console.error(`[shift-island] parent email not sent: ${result.code}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[shift-island] parent email failed: ${error instanceof Error ? error.name : "unknown"}`);
    return false;
  }
}
