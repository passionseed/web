import { bangkokDay, bangkokTime } from "../../../../lib/elemental/core";

/**
 * /handin: the team's video link to its canvas Ship zone (E30).
 * Functional placeholders only: every Thai line waits for a native review
 * before the event ([TH-REVIEW]). No marketing copy. A refusal never echoes
 * what was typed; the link itself appears only in the person's own private
 * reply and on the team's canvas note.
 */

export type HandinUrlProblem = "empty" | "too_long" | "format" | "host";

/** Bangkok wall clock with seconds, for a deadline that is judged to the second. */
export function bangkokStamp(at: Date | number): string {
  const ms = typeof at === "number" ? at : at.getTime();
  // Bangkok is a whole number of hours from UTC, so the seconds are the same everywhere.
  const seconds = String(Math.floor((((ms / 1000) % 60) + 60) % 60)).padStart(2, "0");
  return `${bangkokDay(ms)} ${bangkokTime(ms)}:${seconds}`;
}

function stamp(iso: string | null | undefined): string | null {
  const ms = typeof iso === "string" ? Date.parse(iso) : NaN;
  return Number.isFinite(ms) ? bangkokStamp(ms) : null;
}

export const HANDIN = {
  // [TH-REVIEW] slash command description (max 100 characters).
  commandDescription: "ส่งลิงก์วิดีโอผลงานของทีม (YouTube, Google Drive หรือ TikTok) ในช่องของทีม",

  // [TH-REVIEW] modal title (max 45 characters), the line above the field, the field label (max 45) and placeholder (max 100).
  modalTitle: "ส่งลิงก์วิดีโอของทีม",
  modalNote:
    "วางลิงก์วิดีโอจาก YouTube, Google Drive หรือ TikTok ตั้งค่าให้คนที่มีลิงก์ดูได้ ส่งใหม่ได้ ลิงก์ใหม่จะแทนลิงก์เดิม",
  urlLabel: "ลิงก์วิดีโอ",
  urlPlaceholder: "https://youtu.be/...",

  // [TH-REVIEW] the link was refused before the database; never echoes it. The button re-opens the form with it kept.
  url: {
    empty: "ยังไม่ได้วางลิงก์ กดปุ่มด้านล่างเพื่อวางลิงก์",
    too_long: "ลิงก์ยาวเกิน 500 ตัวอักษร กดปุ่มด้านล่างเพื่อแก้",
    format: "ลิงก์นี้อ่านไม่ได้ ต้องขึ้นต้นด้วย https:// และไม่มีช่องว่าง กดปุ่มด้านล่างเพื่อแก้",
    host: "รับเฉพาะลิงก์จาก YouTube, Google Drive หรือ TikTok กดปุ่มด้านล่างเพื่อแก้",
  } satisfies Record<HandinUrlProblem, string>,
  // [TH-REVIEW] the button that re-opens the form (max 80 characters).
  fixButton: "แก้ลิงก์แล้วส่งอีกครั้ง",

  // [TH-REVIEW] where /handin works.
  notTeamChannel: "ใช้คำสั่งนี้ได้เฉพาะในช่องของทีมคุณ",
  notTeamMember: "คุณไม่ได้อยู่ในทีมของช่องนี้",

  // [TH-REVIEW] the answer after a hand-in: on time or late (kept and flagged), and a resubmission.
  received: (atIso: string | null) => `รับลิงก์วิดีโอของทีมแล้ว${stamp(atIso) ? ` (ส่งเมื่อ ${stamp(atIso)} เวลาไทย)` : ""}`,
  onTime: "ส่งทันกำหนด",
  late: (dueIso: string | null) =>
    `ส่งหลังกำหนด${stamp(dueIso) ? ` (${stamp(dueIso)} เวลาไทย)` : ""} ทีมงานยังรับไว้ แต่จะบันทึกว่าส่งช้า`,
  resubmitted: "ลิงก์นี้แทนลิงก์ที่ทีมส่งไว้ก่อนหน้า",

  // [TH-REVIEW] the canvas line under it, edited when the write finishes.
  canvasPending: "แคนวาส: กำลังเขียนโน้ตส่งงานลงช่อง Ship ของแคนวาสทีม…",
  canvasWritten: "แคนวาส: เขียนโน้ตส่งงานแล้ว รีโหลดบอร์ดเพื่อดู",
  canvasFailed: "แคนวาส: เขียนโน้ตไม่สำเร็จ ลิงก์ส่งงานบันทึกไว้แล้ว ทีมงานเห็นลิงก์นี้",
  canvasNotLinked: "แคนวาส: ทีมยังไม่ได้เชื่อมแคนวาส ใช้ /canvas link แล้วโน้ตส่งงานจะตามไปเอง",
  canvasNotLive: "แคนวาส: ทีมนี้ไม่ได้อยู่ในสถานะใช้งาน จึงไม่เขียนโน้ต ลิงก์ส่งงานบันทึกไว้แล้ว",

  // [TH-REVIEW] the 'ship' note on the canvas: a heading, the link, when, and a late flag.
  noteHead: "ส่งงาน: วิดีโอของทีม",
  noteAt: (at: string) => `ส่งเมื่อ ${at} เวลาไทย`,
  noteLate: "ส่งหลังกำหนด",
} as const;

/** The 'ship' note's text from elemental_bot_canvas_target's fields {url, at, late}. */
export function shipNoteText(fields: { url?: unknown; at?: unknown; late?: unknown }): string {
  const url = typeof fields.url === "string" ? fields.url : "";
  const at = stamp(typeof fields.at === "string" ? fields.at : null);
  return [HANDIN.noteHead, url, at ? HANDIN.noteAt(at) : null, fields.late === true ? HANDIN.noteLate : null]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

/** The line for an SQL refusal of elemental_bot_handin, or null when the error is not one. */
export function handinErrorText(code: string, detail?: string | null): string | null {
  switch (code) {
    case "not_team_channel":
      return HANDIN.notTeamChannel;
    case "not_team_member":
    case "not_member":
      return HANDIN.notTeamMember;
    case "bad_url":
      return detail === "host" ? HANDIN.url.host : HANDIN.url.format;
    default:
      return null;
  }
}
