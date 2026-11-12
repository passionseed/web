/**
 * Words for the AI island news (ข่าวเกาะ): the news sheet, team cards on
 * plots and the staff controls. DRAFT COPY for the founder's Thai review.
 * No emoji, no markdown, no em dashes.
 */
export const NEWS = {
  menu: "ข่าวเกาะ",
  title: "ข่าวเกาะ",
  /** Always visible: every summary here was written by AI. */
  aiLabel: "สรุปโดย AI จากงานที่ทีมส่งบนเกาะ",
  /** Small line under a team card on a plot. */
  aiShort: "สรุปโดย AI",
  /** Both conditions: every member shows the name, and every member allows AI news (a parent's tick, or their own age). */
  optInNote: "ขึ้นข่าวเฉพาะทีมที่ทุกคนเลือกแสดงชื่อบนเกาะ และอนุญาตเรื่องข่าวเกาะที่สรุปโดย AI แล้ว",
  listLabel: "ข่าวของแต่ละทีม",
  empty: "ยังไม่มีข่าวจากทีมไหน ทีมที่ขึ้นข่าวได้จะมาที่นี่หลังสรุปรอบถัดไป",
  /** Date-neutral: the latest stored day may be yesterday's until the evening job runs. */
  noUpdate: "ยังไม่มีอัปเดตใหม่",
  /** The day a summary is for: today, or its date. */
  dayLabel: (date: string) => `ข่าวของ ${date}`,
  today: "ข่าววันนี้",
  week: "สรุปสัปดาห์นี้",
  lastWeek: "สรุปสัปดาห์ที่แล้ว",
  /** Teams with nothing new, folded into one line under the teams with news. */
  quiet: (plots: string) => `ยังไม่มีอัปเดตใหม่: ${plots}`,
  quietPlot: (slot: number) => `แปลง #${slot}`,
  plot: (slot: number, name: string) => `แปลง #${slot} · ${name}`,
  updated: (date: string) => `อัปเดต ${date}`,

  // Staff only
  hide: "ซ่อนสรุปของทีมนี้",
  hideReason: "เหตุผล (ไม่บังคับ)",
  hideConfirm: "ซ่อน",
  cancel: "ยกเลิก",
  hiddenHeading: "ซ่อนไว้",
  hiddenNote:
    "ทีมเหล่านี้ไม่ขึ้นข่าวบนเกาะ และบอทจะแก้ข่าวใน Discord ที่โพสต์ไปแล้วในสัปดาห์นี้ให้ไม่มีทีมนี้ภายในไม่กี่นาที จนกว่าจะกดแสดงอีกครั้ง",
  show: "แสดงอีกครั้ง",
  hidden: "ซ่อนแล้ว จะหายจากข่าวเกาะเมื่อหน้ารีเฟรช",
  shown: "แสดงแล้ว",
  working: "กำลังบันทึก",
} as const;
