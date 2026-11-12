/**
 * Words for the daily island news post in Discord (ข่าวเกาะ, digest.ts).
 * DRAFT COPY for the founder's Thai review. No em dashes; every post says
 * the summaries were written by AI.
 */
export const DIGEST = {
  title: "ข่าวเกาะวันนี้ (สรุปโดย AI)",
  weekTitle: "สรุปข่าวเกาะสัปดาห์นี้ (สรุปโดย AI)",
  /** One line per team that chose to show its name on the island. */
  line: (slot: number, name: string, summary: string) => `แปลง ${slot} ${name}: ${summary}`,
  /** When the card has no room for every team. */
  more: (n: number) => `และอีก ${n} ทีม อ่านต่อบนเว็บเกาะ`,
  fine: "สรุปจากงานที่ทีมส่งบนเกาะ เฉพาะทีมที่เลือกแสดงชื่อ · AI อาจสรุปพลาดได้ ดูงานจริงบนเกาะ",
  /** The day the post is for, in Thai (also how a restarted bot finds its own post). */
  dayLine: (day: string) => `ข่าวของ ${thaiDay(day)}`,
  /** The post after every team in it left the news (hidden by staff, consent withdrawn, name no longer shown). */
  removed: "ข่าวนี้ถูกนำออกแล้ว ดูข่าวล่าสุดบนเว็บเกาะ",
} as const;

/** "12 พ.ย. 2569" for "2026-11-12" (a Bangkok calendar day). */
function thaiDay(day: string): string {
  const date = new Date(`${day}T12:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });
}
