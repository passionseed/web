import { SHIFT_PAYMENT, formatThaiDateRange, type ShiftCohort } from "@/lib/content/shift-cohort";
import { escapeHtml } from "@/lib/trials/parent-email";

/**
 * The email a parent gets when an applicant under 20 applies. It only says
 * who applied for what and links to /shift/parent/{token}, where the full
 * notice and the consent form live. Polite parent register (ค่ะ).
 */

type EmailCohort = Pick<ShiftCohort, "name" | "startDate" | "endDate" | "sessionTime" | "priceBaht">;

export function buildShiftParentEmail(input: {
  nickname: string;
  fullName: string;
  cohort: EmailCohort;
  url: string;
}): { subject: string; html: string } {
  const { cohort } = input;
  const who = `${escapeHtml(input.fullName)} (${escapeHtml(input.nickname)})`;
  const dates = formatThaiDateRange(cohort.startDate, cohort.endDate);
  const price =
    cohort.priceBaht > 0 ? `ค่าเข้าร่วม ฿${cohort.priceBaht.toLocaleString("en-US")}` : "ไม่มีค่าใช้จ่าย";
  const href = escapeHtml(input.url);

  return {
    subject: `ขอความยินยอมจากผู้ปกครอง: ${input.nickname} สมัคร ${cohort.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#17324d;max-width:560px">
        <p>สวัสดีค่ะ</p>
        <p>${who} สมัครเข้าร่วม <strong>${escapeHtml(cohort.name)}</strong> ของ PassionSeed
        วันที่ ${escapeHtml(dates)} เวลา ${escapeHtml(cohort.sessionTime)} น. ทางออนไลน์ ${price}</p>
        <p>ผู้สมัครอายุยังไม่ถึง 20 ปี กฎหมาย PDPA จึงกำหนดให้ผู้ปกครองยินยอมด้วย
        กดลิงก์ด้านล่างเพื่ออ่านรายละเอียด แล้วพิมพ์ชื่อเพื่อยืนยัน ใช้เวลาประมาณ 2 นาทีค่ะ</p>
        <p style="margin:24px 0">
          <a href="${href}" style="background:#17324d;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">อ่านรายละเอียดและยืนยัน</a>
        </p>
        <p style="font-size:13px;color:#4a6378">ลิงก์นี้เป็นของผู้ปกครองเท่านั้น กรุณาอย่าส่งต่อ
        ถ้าไม่ใช่ผู้ปกครองของ ${escapeHtml(input.nickname)} ไม่ต้องทำอะไรค่ะ
        สงสัยอะไร ทัก LINE ${escapeHtml(SHIFT_PAYMENT.lineId)}</p>
        <p style="font-size:13px;color:#4a6378;word-break:break-all">${href}</p>
      </div>
    `,
  };
}
