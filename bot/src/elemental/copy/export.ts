/**
 * /el export (E29): the judging CSV, Host only, answered ephemerally.
 * Functional placeholders only: every Thai line waits for a native review
 * before the event ([TH-REVIEW]). No names, no contacts: teams appear only by
 * slot, element and the PII-checked project name, and only inside the file.
 */
export const EXPORT_COPY = {
  // [TH-REVIEW] /el export description (max 100 characters).
  description: "ไฟล์ CSV ของทุกทีมสำหรับชีตกรรมการ: แปลง โปรเจกต์ ธาตุ ผู้ทดสอบ ลิงก์ส่งงาน (เฉพาะ Host)",
  // [TH-REVIEW] the answer above the attached file: how many teams, hand-ins and late ones.
  ready: (o: { teams: number; handins: number; late: number; edition: string }) =>
    `ไฟล์สำหรับแท็บ Teams ของชีตกรรมการ (${o.edition}): ${o.teams} ทีม, ส่งงานแล้ว ${o.handins} ทีม, ส่งช้า ${o.late} ทีม\n` +
    // [TH-REVIEW] reminder: the file is for hosts and judges only.
    "ไฟล์นี้ไม่มีชื่อหรือข้อมูลติดต่อ ใช้ในชีตที่แชร์เฉพาะ Host และกรรมการเท่านั้น",
  // [TH-REVIEW] no live team yet: nothing to export.
  empty: "ยังไม่มีทีมบนเกาะ จึงยังไม่มีอะไรให้ส่งออก",
} as const;
