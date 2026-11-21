import { ELEMENT_LABELS } from "../../../../lib/elemental/core";
import type { ElementKey } from "../roles";
import { plot, project } from "./teams";

/**
 * Staff team tools under /el (E34): unteamed, team-create, team-set-element,
 * team-rename, team-move-member, team-archive. Host only, every answer
 * ephemeral. Functional placeholders only: every Thai line waits for a native
 * review before the event ([TH-REVIEW]). People appear only as Discord
 * mentions (which never ping here), projects only by the PII-checked name.
 */

function el(element: ElementKey): string {
  return ELEMENT_LABELS[element]?.th ?? element;
}

export const OPS = {
  // --- Slash command and option descriptions (max 100 characters each). ---
  // [TH-REVIEW] /el unteamed.
  unteamedDescription: "รายชื่อคนที่ /join แล้วแต่ยังไม่มีทีม (เฉพาะ Host)",
  // [TH-REVIEW] /el team-create.
  createDescription: "ตั้งทีมให้คนที่ยังไม่มีทีม 2-5 คน ทีมเริ่มทันที (เฉพาะ Host)",
  // [TH-REVIEW] /el team-set-element.
  setElementDescription: "เปลี่ยนธาตุของทีม: ได้แปลงใหม่ ย้ายห้อง และต้องลิงก์แคนวาสใหม่ (เฉพาะ Host)",
  // [TH-REVIEW] /el team-rename.
  renameDescription: "เปลี่ยนชื่อโปรเจกต์ของทีม (เฉพาะ Host)",
  // [TH-REVIEW] /el team-move-member.
  moveDescription: "ย้ายคนหนึ่งคนไปทีมที่แปลงนี้ (เฉพาะ Host)",
  // [TH-REVIEW] /el team-archive.
  archiveDescription: "ยกเลิกทีม: ออกจากเกาะ รายชื่อ และยอดรวม ห้องถูกล็อก (เฉพาะ Host)",
  // [TH-REVIEW] option: element filter or the new element.
  optElementFilter: "เฉพาะคนที่เลือกธาตุนี้ (ไม่ใส่ = ทุกธาตุ)",
  optElement: "ธาตุของทีม",
  // [TH-REVIEW] option: the team's plot number.
  optSlot: "เลขแปลงของทีม (1-200)",
  optToSlot: "เลขแปลงของทีมที่จะย้ายไป (1-200)",
  // [TH-REVIEW] option: project name.
  optProject: "ชื่อโปรเจกต์ (3-60 ตัวอักษร ไม่ใส่ชื่อจริงหรือช่องทางติดต่อ)",
  // [TH-REVIEW] option: members as mentions.
  optMembers: "สมาชิก 2-5 คน พิมพ์ @ชื่อ เว้นวรรคระหว่างคน",
  // [TH-REVIEW] option: the person to move.
  optMember: "คนที่จะย้าย",
  /** Choice label: Thai name plus the English key staff know. */
  elementChoice: (element: ElementKey) => `${el(element)} (${ELEMENT_LABELS[element]?.en ?? element})`,

  // --- /el unteamed ---
  // [TH-REVIEW] header: how many people, how many asked for matching.
  unteamedHeader: (o: { count: number; wanting: number; element: ElementKey | null }) =>
    `ยังไม่มีทีม${o.element ? ` (ธาตุ${el(o.element)})` : ""}: ${o.count} คน, อยากให้ช่วยจับทีม ${o.wanting} คน`,
  // [TH-REVIEW] nobody left.
  unteamedNone: (element: ElementKey | null) => `ไม่มีคนที่ยังไม่มีทีม${element ? ` ในธาตุ${el(element)}` : ""}`,
  // [TH-REVIEW] one line per person: mention, picked element, matching flag.
  unteamedLine: (o: { userId: string; element: ElementKey | null; wants: boolean }) =>
    `<@${o.userId}> · ${o.element ? el(o.element) : "ยังไม่เลือกธาตุ"} · ${o.wants ? "อยากให้จับทีม" : "-"}`,
  // [TH-REVIEW] the list was cut to fit Discord.
  unteamedMore: (n: number) => `...และอีก ${n} คน ใช้ตัวเลือก element เพื่อดูทีละธาตุ`,

  // --- /el team-create ---
  // [TH-REVIEW] wrong number of members (bot check, nothing written).
  createSize: "ทีมต้องมีสมาชิก 2-5 คน ใส่เป็น @ชื่อ เว้นวรรคระหว่างคน",
  // [TH-REVIEW] a bot was listed as a member.
  noBots: "ใส่ได้เฉพาะคน ไม่ใช่บอท",
  // [TH-REVIEW] done: the team is live.
  created: (o: { slot: number; element: ElementKey; name: string; memberIds: readonly string[] }) =>
    `ตั้งทีม **${project(o.name)}** แล้ว: แปลงที่ ${plot(o.slot)} (ธาตุ${el(o.element)}) สมาชิก ${o.memberIds.map((id) => `<@${id}>`).join(" ")}`,
  createdRepeat: (slot: number) => `ทีมนี้ตั้งไว้แล้วที่แปลง ${plot(slot)}`,

  // --- /el team-set-element ---
  // [TH-REVIEW] the team already has that element.
  sameElement: (slot: number, element: ElementKey) => `แปลงที่ ${plot(slot)} เป็นธาตุ${el(element)} อยู่แล้ว ไม่มีอะไรเปลี่ยน`,
  // [TH-REVIEW] done: new slot; the canvas link was cleared.
  elementChanged: (o: { oldSlot: number; slot: number; from: ElementKey; to: ElementKey }) =>
    `ย้ายทีมจากแปลง ${plot(o.oldSlot)} (ธาตุ${el(o.from)}) ไปแปลง ${plot(o.slot)} (ธาตุ${el(o.to)}) แล้ว ลิงก์แคนวาสเดิมถูกลบ ทีมต้องลิงก์แคนวาสใหม่บนบอร์ดธาตุ${el(o.to)}`,
  // [TH-REVIEW] posted in the team's own channel after the move.
  newBoardNotice: (o: { slot: number; element: ElementKey; memberIds: readonly string[] }) =>
    [
      o.memberIds.map((id) => `<@${id}>`).join(" "),
      `ทีมของคุณย้ายไปธาตุ${el(o.element)} แปลงที่ **${plot(o.slot)}** แล้ว`,
      `สร้างแคนวาสโปรเจกต์บนบอร์ดธาตุ${el(o.element)} แล้วลิงก์ใหม่ด้วย /canvas link (ลิงก์เดิมใช้ไม่ได้แล้ว)`,
    ]
      .filter(Boolean)
      .join("\n"),

  // --- /el team-rename ---
  // [TH-REVIEW] done.
  renamed: (slot: number, name: string) => `เปลี่ยนชื่อโปรเจกต์ของแปลง ${plot(slot)} เป็น **${project(name)}** แล้ว`,
  // [TH-REVIEW] bot-side checks on the name (nothing written; the text is never echoed).
  nameLength: "ชื่อโปรเจกต์ต้องยาว 3-60 ตัวอักษร",
  namePii: "ชื่อโปรเจกต์ห้ามมีอีเมล ลิงก์ เบอร์โทร หรือไอดีโซเชียล",

  // --- /el team-move-member ---
  // [TH-REVIEW] already on that team.
  moveSame: (userId: string, slot: number) => `<@${userId}> อยู่ในทีมแปลง ${plot(slot)} อยู่แล้ว`,
  // [TH-REVIEW] done.
  moved: (o: { userId: string; fromSlot: number | null; toSlot: number }) =>
    o.fromSlot === null
      ? `ย้าย <@${o.userId}> เข้าทีมแปลง ${plot(o.toSlot)} แล้ว`
      : `ย้าย <@${o.userId}> จากแปลง ${plot(o.fromSlot)} ไปแปลง ${plot(o.toSlot)} แล้ว`,
  // [TH-REVIEW] the old team is down to one person: its channel was locked (never 1 student alone with staff).
  leftAlone: (slot: number) =>
    `แปลง ${plot(slot)} เหลือสมาชิก 1 คน บอทล็อกห้องทีมนั้นไว้ก่อน ย้ายคนที่เหลือไปทีมอื่น หรือใช้ /el team-archive`,

  // --- /el team-archive ---
  // [TH-REVIEW] confirm step (button).
  archiveConfirm: (o: { slot: number; name: string; members: number }) =>
    `ยืนยันยกเลิกทีม **${project(o.name)}** แปลงที่ ${plot(o.slot)} (${o.members} คน)? ทีมจะหายจากเกาะ รายชื่อ และยอดรวม คะแนนผู้ทดสอบไม่นับ และห้องทีมถูกล็อก ยกเลิกแล้วกู้คืนไม่ได้`,
  archiveButton: "ยกเลิกทีมนี้",
  // [TH-REVIEW] done.
  archived: (slot: number) => `ยกเลิกทีมแปลง ${plot(slot)} แล้ว ทีมออกจากเกาะ รายชื่อ และยอดรวม สมาชิกตั้งทีมใหม่ได้`,
  // [TH-REVIEW] the team was archived before.
  alreadyArchived: (slot: number) => `ทีมแปลง ${plot(slot)} ถูกยกเลิกไปแล้ว`,
  // [TH-REVIEW] the button no longer matches the team on that plot.
  archiveStale: "ปุ่มนี้ใช้ไม่ได้แล้ว ใช้ /el team-archive อีกครั้ง",

  // --- The team channel, after each change ---
  // [TH-REVIEW] channel outcome lines appended to the staff answer.
  channelDone: "ห้องทีมอัปเดตแล้ว",
  channelQueued: "ห้องทีมอยู่ในคิว จะอัปเดตในอีกสักครู่",
  channelNone: "ทีมนี้ยังไม่มีห้อง",
  channelFailed: "อัปเดตห้องทีมไม่สำเร็จ ตรวจสิทธิ์ Manage Channels และ Manage Roles ของบอท แล้วลองคำสั่งเดิมอีกครั้ง",
  channelLocked: "ห้องทีมถูกล็อกแล้ว (สมาชิกไม่เห็นห้องนี้แล้ว ทีมงานอ่านได้อย่างเดียว)",
  channelLockFailed: "ล็อกห้องทีมไม่สำเร็จ ตรวจสิทธิ์ของบอท หรือปิดห้องเองใน Discord",

  /** Discord audit-log reasons (staff only, English is fine). */
  lockReason: (slot: number) => `Elemental team plot ${plot(slot)} locked (archived or under 2 members)`,
  noticeReason: (slot: number) => `Elemental team plot ${plot(slot)} element change`,
} as const;

/**
 * SQL refusals (el:<code>) to what staff see. A code whose DETAIL is a
 * Discord id gets the mention; the id is never logged.
 */
// [TH-REVIEW] every line below.
export const OPS_ERRORS: Record<string, string | ((detail?: string) => string)> = {
  team_not_found: "ไม่พบทีมที่ยังใช้งานอยู่ในแปลงนี้",
  team_full: "ทีมนี้ครบ 5 คนแล้ว",
  island_full: "เกาะเต็มแล้ว ไม่มีแปลงว่าง",
  team_size: OPS.createSize,
  bad_project_name: OPS.nameLength,
  pii: OPS.namePii,
  bad_element: "ธาตุไม่ถูกต้อง",
  bad_user: "ไอดีผู้ใช้ไม่ถูกต้อง",
  not_claimed: (id) => (id ? `<@${id}> ยังไม่ได้ใช้ /join` : "คนนี้ยังไม่ได้ใช้ /join"),
  invitee_not_claimed: (id) => (id ? `<@${id}> ยังไม่ได้ใช้ /join` : "บางคนยังไม่ได้ใช้ /join"),
  invitee_teamed: (id) => (id ? `<@${id}> อยู่ในทีมอื่นแล้ว ใช้ /el team-move-member แทน` : "บางคนอยู่ในทีมอื่นแล้ว"),
  team_archived: "ทีมนี้ถูกยกเลิกแล้ว",
  staff_member: (id) =>
    id
      ? `<@${id}> เป็นทีมงาน (Host, Helper, Mentor, Judge หรือ Safety) อยู่ในทีมนักเรียนไม่ได้`
      : "ทีมงาน (Host, Helper, Mentor, Judge หรือ Safety) อยู่ในทีมนักเรียนไม่ได้",
  roles_unavailable: "ตรวจบทบาทใน Discord ไม่สำเร็จ ยังไม่ได้เปลี่ยนอะไร ลองคำสั่งเดิมอีกครั้ง",
};

export function opsErrorText(code: string, detail?: string): string | null {
  const entry = OPS_ERRORS[code];
  if (entry === undefined) return null;
  return typeof entry === "function" ? entry(detail) : entry;
}
