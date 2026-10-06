import { cleanIgHandle } from "./application";

/** What the applicant typed, enough for an admin to match a slip to a row. */
export interface ApplicantSummary {
  nickname: string;
  fullName?: string;
  igHandle?: string;
  parentContact?: string;
}

const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

/**
 * The message an applicant pastes into LINE with their slip. Pre-filled so
 * the admin never has to ask "ชื่ออะไร รุ่นไหน" and re-type it into the sheet.
 */
export function paymentLineMessage(
  cohort: { name: string; priceBaht: number },
  applicant?: ApplicantSummary,
): string {
  const lines = [`แจ้งโอนค่าสมัคร ${cohort.name}`];
  if (applicant) {
    const nickname = applicant.nickname.trim();
    const fullName = applicant.fullName?.trim();
    const ig = applicant.igHandle ? cleanIgHandle(applicant.igHandle) : "";
    const contact = applicant.parentContact?.trim();
    lines.push(`ชื่อเล่น: ${nickname}${fullName ? ` (${fullName})` : ""}`);
    if (ig) lines.push(`IG: @${ig}`);
    if (contact) lines.push(`ติดต่อผู้ปกครอง: ${contact}`);
  }
  lines.push(`ยอดโอน: ${baht(cohort.priceBaht)}`);
  lines.push("มากับเพื่อนไหม: (ถ้ามา ใส่ชื่อเพื่อนตรงนี้)");
  lines.push("แนบสลิปไว้ด้านล่างแล้ว");
  return lines.join("\n");
}
