import { cleanIgHandle } from "./application";

/** What the applicant typed, enough for an admin to match a slip to a row. */
export interface ApplicantSummary {
  nickname: string;
  fullName?: string;
  igHandle?: string;
  parentContact?: string;
  /** Their personal /shift/join link, so the admin can find the row from the chat. */
  joinUrl?: string | null;
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
  if (applicant?.joinUrl) lines.push(`ลิงก์เข้า Discord: ${applicant.joinUrl}`);
  return lines.join("\n");
}

/**
 * The admin's reply (LINE or Discord) once the slip checks out. The same link the student
 * already has, now active: one tap signs them in with Discord and drops them
 * into the round's channels.
 */
export function joinConfirmMessage(input: { cohortName: string; nickname: string; joinUrl: string }): string {
  return [
    `ยืนยันที่นั่ง ${input.cohortName} แล้ว ยินดีต้อนรับ ${input.nickname.trim()}`,
    "กดลิงก์นี้ เข้าสู่ระบบด้วย Discord ระบบจะพาเข้าห้องของรุ่นให้เลย ไม่ต้องสมัครบัญชีใหม่",
    input.joinUrl,
  ].join("\n");
}

/**
 * The admin's kickoff message the day before a round starts: when it meets,
 * the join link to connect Discord, and three questions the student answers
 * in LINE to seed a Day 1 project idea.
 */
export function kickoffMessage(input: {
  cohortName: string;
  nickname: string;
  joinUrl: string;
  /** e.g. "พรุ่งนี้ วันพุธที่ 14 ตุลาคม"; null leaves the day out. */
  meetLabel: string | null;
  /** e.g. "19:00". */
  startTime: string;
}): string {
  const when = input.meetLabel ? `${input.meetLabel} ` : "";
  return [
    `สวัสดีครับน้อง${input.nickname.trim()} ${input.cohortName} จะเริ่ม${when}เวลา ${input.startTime}`,
    "แต่ก่อนเริ่มให้น้องลองเชื่อม Discord กับระบบของพี่ก่อน (และสำหรับใครที่ยังไม่ได้เข้า Discord ในลิงก์จะพาเข้าเอง)",
    input.joinUrl,
    "",
    "และให้ตอบ 3 คำถามนี้ส่งมาใน LINE ได้เลยนะ ใช้ในการหาไอเดียโปรเจกต์ในวันแรก",
    "1. What friction in your life? One thing in your daily life (school/people/hobby) that is annoying, inefficient, or badly designed?",
    "2. What is your interest or obsession (guitar, อาหาร)? อะไรที่ทำให้คุยเรื่องนี้ได้เป็นชั่วโมง?",
    "3. What group of people do you like to hang out with or understand well?",
  ].join("\n");
}
