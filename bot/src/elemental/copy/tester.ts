import { escapeMarkdown } from "discord.js";

import { ELEMENT_LABELS } from "../../../../lib/elemental/core";
import type { ElementKey } from "../roles";
import { plot, project } from "./teams";

/**
 * /tester, /tester-edit, /checkin, the canvas note and the staff mirror.
 * Functional placeholders only: every Thai line waits for a native review
 * before the event ([TH-REVIEW]). No marketing copy. Student text appears only
 * where it belongs (the team's own reply, the team's canvas note and the
 * staff-only mirror) and never with the logger's name or mention.
 */

export type TesterField = "who" | "tried" | "quote" | "changed";

function el(element: string | null | undefined): string {
  return (element && ELEMENT_LABELS[element as ElementKey]?.th) || element || "";
}

/** Student text made inert for Discord markdown. */
function inert(text: string): string {
  return escapeMarkdown(text);
}

export const TESTER = {
  // [TH-REVIEW] slash command descriptions (max 100 characters).
  testerDescription: "บันทึกคนที่ลองใช้งานโปรเจกต์ของทีม (ใช้ในช่องของทีม)",
  editDescription: "แก้บันทึก /tester ล่าสุดของคุณ (ภายใน 10 นาที)",
  checkinDescription: "เช็กอินของทีมวันนี้ (วันละครั้งต่อทีม)",

  // [TH-REVIEW] modal titles (max 45 characters).
  modalTitle: "บันทึกผู้ทดสอบ",
  modalTitleEdit: "แก้บันทึกผู้ทดสอบ",
  // [TH-REVIEW] the line above the fields: no names, contacts or photos.
  modalNote: "ห้ามใส่ชื่อจริง ช่องทางติดต่อ หรือรูปของใคร ใช้คำกว้าง ๆ เช่น \"เพื่อนห้องข้าง ๆ\" หรือ \"น้องม.2\"",
  // [TH-REVIEW] field labels (max 45 characters each).
  labels: {
    who: "ใครลอง (คำกว้าง ๆ ไม่ใช่ชื่อ)",
    tried: "เขาลองทำอะไร",
    quote: "คำพูดสั้น ๆ ของเขา (ไม่ใส่ก็ได้)",
    changed: "ทีมเปลี่ยนอะไรหลังจากนั้น (ไม่ใส่ก็ได้)",
  } satisfies Record<TesterField, string>,
  // [TH-REVIEW] field placeholders (max 100 characters each): what to type, not marketing.
  placeholders: {
    who: "เช่น เพื่อนต่างห้อง, ผู้ปกครองของเพื่อน",
    tried: "เขาลองใช้ส่วนไหน ทำอะไรได้หรือติดตรงไหน",
    quote: "สิ่งที่เขาพูดหลังลอง",
    changed: "สิ่งที่ทีมแก้หรือจะแก้",
  } satisfies Record<TesterField, string>,
  // [TH-REVIEW] short field names used in refusals.
  fieldNames: {
    who: "ใครลอง",
    tried: "ลองทำอะไร",
    quote: "คำพูด",
    changed: "เปลี่ยนอะไร",
  } satisfies Record<TesterField, string>,

  // [TH-REVIEW] a field failed a check; the person re-opens the form with their text kept. Never echoes the text.
  pii: (field: string) =>
    `ช่อง "${field}" มีสิ่งที่ดูเหมือนช่องทางติดต่อ (อีเมล ลิงก์ เบอร์โทร หรือไอดีโซเชียล) กดปุ่มด้านล่างเพื่อแก้ ข้อความที่พิมพ์ไว้ยังอยู่`,
  missing: (field: string) => `ยังไม่ได้กรอกช่อง "${field}" กดปุ่มด้านล่างเพื่อกรอกต่อ`,
  tooLong: (field: string, max: number) => `ช่อง "${field}" ยาวเกิน ${max} ตัวอักษร กดปุ่มด้านล่างเพื่อแก้`,
  // [TH-REVIEW] the button that re-opens the form (max 80 characters).
  fixButton: "แก้แล้วส่งอีกครั้ง",
  // [TH-REVIEW] the form timed out from memory (bot restart): start again.
  draftGone: "ฟอร์มนี้หมดเวลาแล้ว ใช้ /tester อีกครั้ง",

  // [TH-REVIEW] where /tester and /checkin work.
  notTeamChannel: "ใช้คำสั่งนี้ได้เฉพาะในช่องของทีมคุณ",
  notTeamMember: "คุณไม่ได้อยู่ในทีมของช่องนี้",

  // [TH-REVIEW] the answer right after /tester: counted n of the cap, or saved but over the cap.
  counted: (n: number, cap: number) => `บันทึกแล้ว นับเป็นผู้ทดสอบ ${n}/${cap}`,
  notCounted: (cap: number) => `บันทึกแล้ว แต่ไม่นับเพิ่ม (ทีมครบ ${cap} คนแล้ว)`,
  repeated: "บันทึกเดิมนี้ส่งไปแล้ว ไม่ได้บันทึกซ้ำ",
  // [TH-REVIEW] the canvas status line under it, edited when the write finishes.
  canvasPending: "แคนวาส: กำลังเขียนโน้ตลงแคนวาสของทีม…",
  canvasWritten: "แคนวาส: เขียนโน้ตแล้ว รีโหลดบอร์ดเพื่อดู",
  canvasFailed: "แคนวาส: เขียนโน้ตไม่สำเร็จ ทีมงานจะลองใหม่ บันทึกนี้ยังนับอยู่",
  canvasNotLinked: "แคนวาส: ทีมยังไม่ได้เชื่อมแคนวาส ใช้ /canvas link แล้วโน้ตจะตามไปเอง",
  canvasRemoved: "แคนวาส: บันทึกนี้ถูกทีมงานลบแล้ว จึงไม่เขียนลงแคนวาส",
  // [TH-REVIEW] the Edit button on the /tester answer (max 80 characters).
  editButton: "แก้ (ภายใน 10 นาที)",

  // [TH-REVIEW] /tester-edit answers.
  edited: "แก้บันทึกแล้ว",
  editClosed: "แก้ได้ภายใน 10 นาทีหลังบันทึกเท่านั้น",
  notLogger: "แก้ได้เฉพาะคนที่บันทึกเอง",
  entryRemoved: "บันทึกนี้ถูกทีมงานลบแล้ว",
  entryNotFound: "ไม่พบบันทึกนี้",
  noRecent: "ไม่พบบันทึกล่าสุดของคุณ ใช้ปุ่ม \"แก้\" ใต้คำตอบของ /tester แทน",

  // [TH-REVIEW] /checkin: posted in the team channel the first time, private the second time.
  checkedIn: (slot: number | null) => (slot ? `ทีมเช็กอินวันนี้แล้ว (แปลง ${plot(slot)})` : "ทีมเช็กอินวันนี้แล้ว"),
  alreadyCheckedIn: "ทีมของคุณเช็กอินวันนี้ไปแล้ว ไม่ต้องทำซ้ำ",

  // --- The canvas note (a 'test' sticky on the team's project canvas). ---
  // [TH-REVIEW] line labels on the sticky.
  noteWho: "ใคร",
  noteTried: "ลอง",
  noteChanged: "เปลี่ยน",

  // --- The staff mirror (Host, Helper, Mentor only). Never the logger. ---
  // [TH-REVIEW] one thread per element in the mirror channel (max 100 characters).
  threadName: (element: ElementKey) => `ผู้ทดสอบ ${el(element)} (${element})`,
  mirrorHead: (slot: number | null, element: string | null, projectName: string | null) =>
    `**แปลง ${slot ? plot(slot) : "?"} · ${el(element)} · ${projectName ? project(projectName) : "-"}**`,
  mirrorCounted: "นับแล้ว",
  mirrorNotCounted: "ไม่นับ (ทีมครบโควตาแล้ว)",
  mirrorEdited: "แก้แล้ว",
  mirrorRemoved: "ทีมงานลบแล้ว",
  mirrorReviewed: "ตรวจแล้ว",
  mirrorStaffSource: "ทีมงานบันทึกแทน",
  // [TH-REVIEW] mirror buttons, handled by the staff tools (E20).
  removeButton: "ลบ",
  reviewedButton: "ตรวจแล้ว",
} as const;

export interface TesterFields {
  who: string | null;
  tried: string | null;
  quote?: string | null;
  changed?: string | null;
}

/** The sticky's text: plain lines, no markdown (Excalidraw shows it as typed). */
export function noteText(fields: TesterFields): string {
  const lines = [`${TESTER.noteWho}: ${fields.who ?? ""}`, `${TESTER.noteTried}: ${fields.tried ?? ""}`];
  if (fields.quote) lines.push(`"${fields.quote}"`);
  if (fields.changed) lines.push(`${TESTER.noteChanged}: ${fields.changed}`);
  return lines.join("\n");
}

/** The entry's text as staff read it in the mirror, made inert for markdown. */
export function mirrorLines(fields: TesterFields): string[] {
  const lines = [
    `${TESTER.fieldNames.who}: ${inert(fields.who ?? "")}`,
    `${TESTER.fieldNames.tried}: ${inert(fields.tried ?? "")}`,
  ];
  if (fields.quote) lines.push(`${TESTER.fieldNames.quote}: "${inert(fields.quote)}"`);
  if (fields.changed) lines.push(`${TESTER.fieldNames.changed}: ${inert(fields.changed)}`);
  return lines;
}

/** What the person sees for an SQL refusal code, or null when it is not one of /tester's. */
export function testerErrorText(code: string): string | null {
  switch (code) {
    case "not_team_channel":
      return TESTER.notTeamChannel;
    case "not_team_member":
    case "not_member":
      return TESTER.notTeamMember;
    case "edit_closed":
      return TESTER.editClosed;
    case "not_logger":
      return TESTER.notLogger;
    case "entry_removed":
      return TESTER.entryRemoved;
    case "entry_not_found":
      return TESTER.entryNotFound;
    default:
      return null;
  }
}
