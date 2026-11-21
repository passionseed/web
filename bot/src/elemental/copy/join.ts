import { ELEMENT_LABELS, type ElementKey } from "../../../../lib/elemental/core/index";

/**
 * /join and the element picker (E12). Functional placeholders only: every
 * Thai line waits for a native review before the event ([TH-REVIEW]). No
 * marketing copy, never a name, a contact or the code the person typed.
 */

function label(element: ElementKey): string {
  const l = ELEMENT_LABELS[element];
  return `${l.th} (${l.en})`;
}

export const JOIN = {
  // [TH-REVIEW] /join command description (max 100 characters).
  commandDescription: "ยืนยันตัวตนด้วยรหัสของคุณ เพื่อเข้าห้องอื่น ๆ ของกิจกรรม",
  // [TH-REVIEW] the code option's description.
  codeDescription: "รหัส 8 ตัวที่ได้จากทีมงาน เช่น ABCD-EFGH",
  // [TH-REVIEW] /el picker description (staff tool).
  pickerDescription: "โพสต์ปุ่มเลือกธาตุในห้อง start-here",

  // [TH-REVIEW] /join used outside #start-here.
  wrongChannel: (channelId: string) => `ใช้ /join ในห้อง <#${channelId}> เท่านั้น`,
  // [TH-REVIEW] the code field looks like contact info; never repeats what was typed.
  codeLooksLikeContact: "ช่อง code ดูเหมือนมีข้อมูลติดต่อ ไม่ต้องใส่ข้อมูลส่วนตัว ใส่แค่รหัส 8 ตัวจากทีมงาน",

  // [TH-REVIEW] code not found (typo, or not 8 characters).
  unknownCode: "ไม่พบรหัสนี้ ตรวจรหัส 8 ตัวอีกครั้ง ถ้ายังไม่ได้ให้แจ้งทีมงาน",
  // [TH-REVIEW] code already used by another account.
  codeUsed: "รหัสนี้ถูกใช้ไปแล้ว ถ้าไม่ใช่คุณที่ใช้ แจ้งทีมงานได้เลย",
  // [TH-REVIEW] code belongs to another edition (e.g. a rehearsal code in the real server).
  wrongEdition: "รหัสนี้ใช้กับเซิร์ฟเวอร์นี้ไม่ได้",
  // [TH-REVIEW] code belongs to another event's registration.
  wrongEvent: "รหัสนี้เป็นของกิจกรรมอื่น ใช้กับเซิร์ฟเวอร์นี้ไม่ได้",
  // [TH-REVIEW] registration is no longer paid (cancelled or pending).
  notPaid: "การลงทะเบียนของรหัสนี้ยังไม่ได้รับการยืนยัน แจ้งทีมงานได้เลย",
  // [TH-REVIEW] the registration behind the code is gone.
  registrationNotFound: "ไม่พบการลงทะเบียนของรหัสนี้ แจ้งทีมงานได้เลย",
  // [TH-REVIEW] this Discord account already joined (with another code, or staff linked it).
  alreadyClaimed: "บัญชีนี้ยืนยันตัวตนไว้แล้ว ไม่ต้องใช้รหัสอีก",

  // [TH-REVIEW] claim done and the Paid role is on.
  joined: "ยืนยันตัวตนเรียบร้อย ขั้นต่อไป: กดปุ่มเลือกธาตุของคุณในห้อง start-here",
  // [TH-REVIEW] same person ran /join again with the same code.
  joinedAgain: "คุณยืนยันตัวตนไว้แล้ว ถ้ายังไม่ได้เลือกธาตุ กดปุ่มเลือกธาตุในห้อง start-here",
  // [TH-REVIEW] appended when the member already picked an element.
  currentElement: (element: ElementKey) => `ธาตุของคุณตอนนี้: ${label(element)}`,
  // [TH-REVIEW] claim done but the bot could not add the role; staff were told.
  rolePending: "ยืนยันตัวตนเรียบร้อย แต่ตอนนี้บอทยังเปิดห้องอื่นให้ไม่ได้ ทีมงานได้รับแจ้งแล้วและจะแก้ให้เร็วที่สุด",

  // [TH-REVIEW] the public picker message in #start-here (no mentions).
  pickerPost: "เลือกธาตุของคุณ (ต้องใช้ /join ก่อน) เปลี่ยนได้จนกว่าจะอยู่ในทีม",
  // [TH-REVIEW] picker button label.
  pickerButton: (element: ElementKey) => label(element),
  // [TH-REVIEW] staff: picker posted.
  pickerPosted: (channelId: string) => `โพสต์ปุ่มเลือกธาตุแล้วใน <#${channelId}>`,
  // [TH-REVIEW] staff: no channel to post the picker in.
  pickerNoChannel: "ยังไม่ได้ตั้งห้อง start_here และใช้คำสั่งนี้ที่นี่ไม่ได้",

  // [TH-REVIEW] element picked and the role set.
  picked: (element: ElementKey) => `ธาตุของคุณตอนนี้: ${label(element)}`,
  // [TH-REVIEW] element saved but the bot could not change roles; staff were told.
  pickRolePending: (element: ElementKey) =>
    `บันทึกธาตุ ${label(element)} แล้ว แต่ตอนนี้บอทยังเปลี่ยน role ให้ไม่ได้ ทีมงานได้รับแจ้งแล้ว`,
  // [TH-REVIEW] picker click before /join.
  notClaimed: "ใช้ /join พร้อมรหัสของคุณก่อน แล้วค่อยเลือกธาตุ",
  // [TH-REVIEW] picker click while on a team (staff can change it).
  onTeam: "คุณอยู่ในทีมแล้ว เปลี่ยนธาตุเองไม่ได้ ถ้าจำเป็นให้แจ้งทีมงาน",

  // [TH-REVIEW] staff alert: Discord refused a role change (role hierarchy, 403).
  staffRoleForbidden:
    "บอทเพิ่มหรือถอด role ให้สมาชิกไม่ได้ (Discord ตอบ 403) ย้าย role ของบอทให้อยู่เหนือ Paid และ role ธาตุทั้ง 5 ใน Server Settings > Roles และให้สิทธิ์ Manage Roles",
  // [TH-REVIEW] staff alert: a role id is missing from elemental_settings.
  staffRoleMissing: (key: string) => `ยังไม่ได้ตั้ง role "${key}" ใน elemental_settings บอทจึงให้ role นี้กับสมาชิกไม่ได้`,
} as const;
