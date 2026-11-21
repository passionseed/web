import { plot } from "./teams";

/**
 * /el badge-powerup (E31): Host only, every answer ephemeral. Functional
 * placeholders only: every Thai line waits for a native review before the
 * event ([TH-REVIEW]). Teams appear only by plot number; no names, no
 * mentions, no per-person list.
 */
export const POWERUP = {
  // [TH-REVIEW] /el badge-powerup description (max 100 characters).
  description: "ให้ป้าย Power-up กับทุกทีมที่มีคนอยู่ในห้องเสียงนี้ตอนนี้ (เฉพาะ Host)",
  // [TH-REVIEW] option: the voice or stage channel the power-up runs in.
  optVoice: "ห้องเสียงที่กำลังจัด Power-up",
  // [TH-REVIEW] option: a short label when there is more than one power-up a day.
  optSession: "ชื่อรอบ ถ้าวันเดียวมีหลายรอบ เช่น 1 หรือ 2 (a-z 0-9 - _)",

  // [TH-REVIEW] the option was not a voice or stage channel.
  notVoice: "เลือกห้องเสียง (voice หรือ stage) ของ Power-up",
  // [TH-REVIEW] the session label has characters other than a-z 0-9 - _.
  badSession: "ชื่อรอบใช้ได้เฉพาะ a-z 0-9 - _ ไม่เกิน 40 ตัว",
  // [TH-REVIEW] the bot is reconnecting, so who is in voice is not known right now.
  voiceUnknown: "บอทยังมองไม่เห็นห้องเสียงตอนนี้ ลองอีกครั้งในอีกสักครู่",
  // [TH-REVIEW] nobody (except bots) is in the voice channel.
  empty: "ยังไม่มีใครอยู่ในห้องเสียงนี้",

  // [TH-REVIEW] summary: {awarded} teams got the badge now, {already} had it for this round.
  summary: (o: { awarded: number; already: number; ref: string }) =>
    `ป้าย Power-up รอบ ${o.ref}: ให้ใหม่ ${o.awarded} ทีม, มีอยู่แล้ว ${o.already} ทีม`,
  // [TH-REVIEW] line: the plot numbers that got the badge just now.
  awardedSlots: (slots: number[]) => `แปลงที่ได้ป้ายใหม่: ${slots.map(plot).join(", ")}`,
  // [TH-REVIEW] line: people in voice who are on no live team (counted, never listed).
  notOnTeam: (n: number) => `คนในห้องที่ยังไม่มีทีม: ${n} คน (ไม่ได้ป้าย)`,
  // [TH-REVIEW] line: teams archived between the lookup and the award.
  skipped: (n: number) => `ข้าม ${n} ทีมที่ถูกยกเลิกไประหว่างนี้`,
  // [TH-REVIEW] "and N more" after a long list of plot numbers.
  more: (n: number) => `และอีก ${n}`,
} as const;
