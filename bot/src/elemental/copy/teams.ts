import { escapeMarkdown } from "discord.js";

import { ELEMENT_LABELS } from "../../../../lib/elemental/core";
import type { ElementKey } from "../roles";

/**
 * /team create, the Accept/Decline invites and the team channel welcome.
 * Functional placeholders only: every Thai line waits for a native review
 * before the event ([TH-REVIEW]). No names: people appear only as Discord
 * mentions, projects only by the name the team typed (already PII-checked).
 */

function el(element: ElementKey): string {
  return ELEMENT_LABELS[element]?.th ?? element;
}

/** Slot as shown on the island tag and the channel name: 07, 123. */
export function plot(slot: number): string {
  return String(slot).padStart(2, "0");
}

/** A project name typed by students, made inert for Discord markdown. */
export function project(name: string): string {
  return escapeMarkdown(name);
}

export const COPY = {
  // [TH-REVIEW] slash command descriptions (Discord shows these in the picker).
  commandDescription: "ทีมของคุณในกิจกรรม Elemental",
  createDescription: "ตั้งทีม: ชื่อโปรเจกต์ ธาตุหลัก และเพื่อนร่วมทีม 1-4 คน",

  // [TH-REVIEW] the project-name form.
  modalTitle: "ตั้งทีมใหม่",
  modalTitleRetry: "แก้ชื่อโปรเจกต์",
  nameLabel: "ชื่อโปรเจกต์ (3-60 ตัวอักษร)",
  // [TH-REVIEW] placeholder inside the field: what to type, not marketing.
  namePlaceholder: "ชื่อโปรเจกต์ของทีม ไม่ใส่ชื่อจริงหรือช่องทางติดต่อ",

  // [TH-REVIEW] the create window (settings.team_create_opens_at / closes_at).
  notOpenYet: "ยังไม่เปิดให้ตั้งทีม รอประกาศจากทีมงานใน #news",
  closed: "ปิดรับการตั้งทีมแล้ว ถ้ายังไม่มีทีม ใช้ /report แจ้งทีมงาน",

  // [TH-REVIEW] the name failed a check; the person re-opens the form. Never echoes the text.
  nameLength: "ชื่อโปรเจกต์ต้องยาว 3-60 ตัวอักษร กดปุ่มด้านล่างเพื่อแก้",
  namePii: "ช่อง \"ชื่อโปรเจกต์\" ห้ามมีอีเมล ลิงก์ เบอร์โทร หรือไอดีโซเชียล กดปุ่มด้านล่างเพื่อแก้",
  retryButton: "แก้ชื่อโปรเจกต์",

  // [TH-REVIEW] the draft panel after the form: pick element and teammates.
  draft: (name: string, element: ElementKey | null, invitees: readonly string[]) =>
    [
      `โปรเจกต์: **${project(name)}**`,
      `ธาตุหลัก: ${element ? el(element) : "ยังไม่เลือก"}`,
      `เพื่อนร่วมทีม: ${invitees.length ? invitees.map((id) => `<@${id}>`).join(" ") : "ยังไม่เลือก"} (1-4 คน)`,
      "เลือกให้ครบแล้วกด \"ส่งคำชวน\" เพื่อนแต่ละคนจะได้ปุ่มตอบรับใน #start-here",
    ].join("\n"),
  elementOption: (element: ElementKey) => `${el(element)} (${ELEMENT_LABELS[element]?.en ?? element})`,
  elementPlaceholder: "เลือกธาตุหลักของทีม",
  membersPlaceholder: "เลือกเพื่อนร่วมทีม 1-4 คน",
  createButton: "ส่งคำชวน",
  draftGone: "ฟอร์มนี้หมดเวลาแล้ว เริ่มใหม่ด้วย /team create",
  needElement: "เลือกธาตุหลักก่อน",
  teamSize: "ทีมต้องมีเพื่อนร่วมทีม 1-4 คน (รวมคุณเป็น 2-5 คน)",
  noBots: "เลือกได้เฉพาะเพื่อนร่วมทีม ไม่ใช่บอท",

  // [TH-REVIEW] after the team is created (pending until one teammate accepts).
  created: (o: { name: string; invitees: readonly string[] }) =>
    `ส่งคำชวนสำหรับ **${project(o.name)}** ไปที่ #start-here แล้ว (${o.invitees
      .map((id) => `<@${id}>`)
      .join(" ")}) ทีมจะเริ่มเมื่อมีเพื่อนกดยอมรับอย่างน้อย 1 คน แล้วบอทจะเปิดห้องทีมให้`,
  invitesNotPosted: "สร้างทีมแล้ว แต่ส่งคำชวนไม่สำเร็จ แจ้งทีมงานด้วย /report",

  // [TH-REVIEW] the public invite in #start-here, one per invitee.
  invite: (o: { inviteeId: string; creatorId: string; name: string; element: ElementKey }) =>
    `<@${o.inviteeId}> <@${o.creatorId}> ชวนคุณเข้าทีม **${project(o.name)}** (ธาตุ${el(o.element)}) ตอบภายใน 24 ชั่วโมง`,
  acceptButton: "ยอมรับ",
  declineButton: "ปฏิเสธ",
  // [TH-REVIEW] the invite message after the answer (buttons removed).
  inviteAccepted: (inviteeId: string, name: string) => `<@${inviteeId}> ยอมรับคำชวนเข้าทีม **${project(name)}** แล้ว`,
  inviteDeclined: (inviteeId: string) => `<@${inviteeId}> ปฏิเสธคำชวนนี้แล้ว`,
  inviteClosed: "คำชวนนี้ปิดแล้ว",
  notYours: "ปุ่มนี้สำหรับคนที่ถูกชวนเท่านั้น",

  // [TH-REVIEW] ephemeral answers to the invitee.
  activated: (slot: number) => `ทีมเริ่มแล้ว! แปลงที่ ${plot(slot)} บอทกำลังเปิดห้องทีม อีกสักครู่จะเห็นห้องใหม่`,
  joined: (slot: number | null) => (slot ? `เข้าทีมแล้ว (แปลงที่ ${plot(slot)}) ห้องทีมจะเปิดให้คุณในอีกสักครู่` : "เข้าทีมแล้ว"),
  acceptedWaiting: "ยอมรับแล้ว รอเพื่อนอีกคนกดยอมรับ",
  declined: "ปฏิเสธคำชวนแล้ว",

  // [TH-REVIEW] the pinned welcome in the new team channel.
  welcome: (o: { slot: number; element: ElementKey; project: string; memberIds: readonly string[] }) =>
    [
      `${o.memberIds.map((id) => `<@${id}>`).join(" ")}`,
      `ยินดีต้อนรับสู่แปลงที่ **${plot(o.slot)}** (ธาตุ${el(o.element)}) โปรเจกต์ **${project(o.project)}**`,
      "1. ล็อกอิน passionseed.org ด้วย Discord แล้วลิงก์แคนวาสของทีมด้วย /canvas link",
      "2. ทุกครั้งที่ลองให้คนจริงใช้ บันทึกด้วย /tester ในห้องนี้",
      "3. ทุกวันกด /checkin ในห้องนี้",
      "โน้ตใหม่บนบอร์ดจะเห็นหลังจากรีโหลดหน้าบอร์ด",
    ].join("\n"),

  // [TH-REVIEW] a Host, Helper, Mentor, Judge or Safety member tried to make or join a team.
  staffNoTeam: "ทีมงานตั้งทีมหรือเข้าร่วมทีมนักเรียนไม่ได้ ทีมมีแค่นักเรียน",

  /** Discord audit-log reason (staff only, English is fine). */
  auditReason: (slot: number) => `Elemental team plot ${plot(slot)}`,
} as const;

/**
 * SQL refusals (el:<code>) to what the person sees. A code that carries a
 * Discord id in DETAIL gets the mention; the id is never logged.
 */
// [TH-REVIEW] every line below.
export const TEAM_ERRORS: Record<string, string | ((detail?: string) => string)> = {
  team_create_closed: COPY.closed,
  bad_project_name: COPY.nameLength,
  pii: COPY.namePii,
  bad_element: COPY.needElement,
  team_size: COPY.teamSize,
  not_claimed: "ใช้ /join พร้อมรหัสของคุณก่อน แล้วค่อยตั้งทีม",
  already_teamed: "คุณอยู่ในทีมแล้ว",
  invitee_not_claimed: (id) => (id ? `<@${id}> ยังไม่ได้ใช้ /join` : "เพื่อนบางคนยังไม่ได้ใช้ /join"),
  invitee_teamed: (id) => (id ? `<@${id}> อยู่ในทีมอื่นแล้ว` : "เพื่อนบางคนอยู่ในทีมอื่นแล้ว"),
  team_not_found: COPY.inviteClosed,
  team_archived: "ทีมนี้ถูกยกเลิกแล้ว",
  invite_not_found: COPY.notYours,
  invite_closed: COPY.inviteClosed,
  invite_expired: "คำชวนนี้หมดเวลาแล้ว (24 ชั่วโมง) ขอให้เพื่อนชวนใหม่",
  team_full: "ทีมนี้ครบ 5 คนแล้ว",
  island_full: "เกาะเต็มแล้ว แจ้งทีมงานด้วย /report",
  staff_member: (id) => (id ? `<@${id}> เป็นทีมงาน อยู่ในทีมนักเรียนไม่ได้` : COPY.staffNoTeam),
  roles_unavailable: "ตรวจบทบาทใน Discord ไม่สำเร็จ ลองอีกครั้งในอีกสักครู่",
};

export function teamErrorText(code: string, detail?: string): string | null {
  const entry = TEAM_ERRORS[code];
  if (entry === undefined) return null;
  return typeof entry === "function" ? entry(detail) : entry;
}
