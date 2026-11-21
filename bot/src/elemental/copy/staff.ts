import { ELEMENT_LABELS, type ElementKey } from "../../../../lib/elemental/core/index";
import { COMMON } from "./common";
import { plot } from "./teams";

/**
 * Staff tester and identity tools under /el (E20), plus the mirror's Remove
 * and Reviewed buttons. Functional placeholders only: every Thai line waits
 * for a native review before the event ([TH-REVIEW]). Every answer is
 * ephemeral and staff only. People appear only as Discord mentions (which
 * never ping here) or, for /el whois, as a registration id and position:
 * never a name, school or contact.
 */

function el(element: string | null | undefined): string {
  return (element && ELEMENT_LABELS[element as ElementKey]?.th) || element || "-";
}

export const STAFF = {
  // --- Slash command and option descriptions (max 100 characters each). ---
  // [TH-REVIEW] /el tester-add.
  testerAddDescription: "บันทึกผู้ทดสอบแทนทีม จากฟอร์มสำรอง (Host, Helper)",
  // [TH-REVIEW] /el sample.
  sampleDescription: "สุ่มบันทึกผู้ทดสอบที่ยังไม่มีใครตรวจ (Host, Helper)",
  // [TH-REVIEW] /el resync.
  resyncDescription: "ลองเขียนโน้ตลงแคนวาสใหม่ สำหรับบันทึกที่เขียนไม่สำเร็จ (เฉพาะ Host)",
  // [TH-REVIEW] /el totals.
  totalsDescription: "ยอดรวมวันนี้: ผู้ทดสอบ ทีมที่เช็กอิน และแต่ละธาตุ (เฉพาะ Host)",
  // [TH-REVIEW] /el link.
  linkDescription: "ผูกบัญชี Discord กับผู้สมัคร (รหัสหายหรือใช้ผิด) (เฉพาะ Host)",
  // [TH-REVIEW] /el canvas-link.
  canvasLinkDescription: "เชื่อมแคนวาสให้ทีมแทน ไม่ตรวจธาตุและสมาชิก (เฉพาะ Host)",
  // [TH-REVIEW] /el whois.
  whoisDescription: "ดูเลขใบสมัครและลำดับของบัญชีนี้ ไม่แสดงชื่อหรือช่องทางติดต่อ (Safety, Host)",
  // [TH-REVIEW] /el test-codes.
  testCodesDescription: "สร้างรหัสทดลองสำหรับเซิร์ฟเวอร์ซ้อมเท่านั้น (เฉพาะ Host)",
  // [TH-REVIEW] /el dryrun-cleanup.
  cleanupDescription: "ล้างการซ้อม: ยกเลิกทุกทีมและลบห้องทีม เฉพาะเซิร์ฟเวอร์ซ้อม (เฉพาะ Host)",

  // [TH-REVIEW] options.
  optSlot: "เลขแปลงของทีม (1-200)",
  optSampleN: "จำนวนบันทึกที่จะสุ่ม (1-10)",
  optElementFilter: "เฉพาะทีมธาตุนี้ (ไม่ใส่ = ทุกธาตุ)",
  optUser: "บัญชี Discord ของคนนั้น",
  optRegistration: "เลขใบสมัคร (UUID จากหน้าแอดมิน) ไม่ใส่ = ผูกเป็นบัญชีทีมงาน",
  optPosition: "ลำดับสมาชิกในใบสมัคร (1-10)",
  optUrl: "ลิงก์แคนวาส passionseed.org/whiteboard/...?focus=...",
  optCodesN: "จำนวนรหัส (1-200)",
  optConfirm: "พิมพ์ชื่อ edition ของเซิร์ฟเวอร์นี้เพื่อยืนยัน",
  /** Choice label: Thai name plus the English key staff know. */
  elementChoice: (element: ElementKey) => `${el(element)} (${ELEMENT_LABELS[element]?.en ?? element})`,

  // --- Remove and Reviewed (buttons on the mirror post) ---
  // [TH-REVIEW] the reason form (title max 45, label max 45, placeholder max 100).
  removeTitle: "ลบบันทึกผู้ทดสอบ",
  removeReasonLabel: "เหตุผล (ทีมงานเห็นเท่านั้น)",
  removeReasonPlaceholder: "เช่น ซ้ำกับบันทึกก่อนหน้า, ไม่ใช่การทดสอบจริง",
  // [TH-REVIEW] the reason holds something that looks like a contact (never echoed).
  reasonPii: "เหตุผลมีสิ่งที่ดูเหมือนช่องทางติดต่อ เขียนใหม่โดยไม่ใส่อีเมล ลิงก์ เบอร์โทร หรือไอดีโซเชียล",
  reasonTooLong: "เหตุผลยาวเกิน 200 ตัวอักษร",
  // [TH-REVIEW] after Remove: the entry no longer counts; the team's new total.
  removed: (o: { slot: number | null; total: number; cap: number; wasCounted: boolean; lit: boolean }) =>
    [
      o.wasCounted ? "ลบแล้ว บันทึกนี้ไม่นับแล้ว" : "ลบแล้ว (บันทึกนี้ไม่ได้นับอยู่ก่อน)",
      `แปลง ${o.slot ? plot(o.slot) : "?"} ตอนนี้นับได้ ${o.total}/${o.cap}${o.lit ? "" : " ตะเกียงดับ"}`,
    ].join("\n"),
  alreadyRemoved: "บันทึกนี้ถูกลบไปแล้ว",
  // [TH-REVIEW] the canvas note after Remove.
  tombstoned: "แคนวาส: เอาโน้ตออกแล้ว",
  tombstoneFailed: "แคนวาส: เอาโน้ตออกไม่สำเร็จ ใช้ /el resync เพื่อลองใหม่",
  // [TH-REVIEW] after Reviewed.
  reviewed: "ทำเครื่องหมายว่าตรวจแล้ว",
  alreadyReviewed: "บันทึกนี้ตรวจไปแล้ว",
  entryNotFound: "ไม่พบบันทึกนี้ในกิจกรรมของเซิร์ฟเวอร์นี้",
  staleButton: "ปุ่มนี้ใช้ไม่ได้แล้ว",

  // --- /el sample ---
  // [TH-REVIEW] header; each entry follows as its own message with Remove and Reviewed.
  sampleHeader: (n: number, element: ElementKey | null) => `สุ่มได้ ${n} บันทึกที่ยังไม่มีใครตรวจ${element ? ` (ธาตุ${el(element)})` : ""}`,
  sampleNone: (element: ElementKey | null) => `ไม่มีบันทึกที่ยังไม่ได้ตรวจ${element ? ` ในธาตุ${el(element)}` : ""}`,

  // --- /el tester-add ---
  // [TH-REVIEW] the form's title (max 45 characters).
  testerAddTitle: (slot: number) => `บันทึกแทนทีมแปลง ${plot(slot)}`,
  // [TH-REVIEW] a field failed a check (the text is never echoed); the button re-opens the form with it kept.
  fieldMissing: (field: string) => `ยังไม่ได้กรอกช่อง "${field}"`,
  fieldTooLong: (field: string, max: number) => `ช่อง "${field}" ยาวเกิน ${max} ตัวอักษร`,
  fieldPii: (field: string) => `ช่อง "${field}" มีสิ่งที่ดูเหมือนช่องทางติดต่อ (อีเมล ลิงก์ เบอร์โทร หรือไอดีโซเชียล)`,
  fixButton: "แก้แล้วส่งอีกครั้ง",
  // [TH-REVIEW] done: which plot it went to.
  testerAdded: (slot: number) => `บันทึกให้ทีมแปลง ${plot(slot)} แล้ว (ทีมงานบันทึกแทน)`,

  // --- /el resync ---
  // [TH-REVIEW] the result counts.
  resyncDone: (o: { written: number; tombstoned: number; failed: number; skipped: number }) =>
    [
      `แคนวาส: เขียนใหม่ ${o.written} โน้ต, เอาออก ${o.tombstoned} โน้ต, ยังไม่สำเร็จ ${o.failed}`,
      o.skipped ? `ข้าม ${o.skipped} (กำลังเขียนอยู่ หรือทีมยังไม่ได้เชื่อมแคนวาส)` : null,
      "โน้ตจะเห็นบนบอร์ดหลังรีโหลดหน้าบอร์ด",
    ]
      .filter(Boolean)
      .join("\n"),
  resyncNone: "ไม่มีโน้ตที่ค้าง ทุกบันทึกอยู่บนแคนวาสแล้ว",

  // --- /el totals ---
  // [TH-REVIEW] the numbers for today (Bangkok day).
  totalsHead: (day: string) => `ยอดรวม ${day}`,
  totalsHelped: (helped: number, today: number) => `ผู้ทดสอบที่นับแล้ว: ${helped} (วันนี้ +${today})`,
  totalsCheckedIn: (checked: number, teams: number) => `ทีมที่เช็กอินวันนี้: ${checked}/${teams}`,
  totalsTop: (element: string | null) => `ธาตุที่โตที่สุดวันนี้: ${element ? el(element) : "-"}`,
  totalsElement: (o: { element: ElementKey; level: number; delta: number; teams: number }) =>
    `${el(o.element)}: ${o.level} (วันนี้ +${o.delta}) · ${o.teams} ทีม`,

  // --- /el link ---
  // [TH-REVIEW] registration and position must come together.
  linkNeedsBoth: "ใส่ทั้งเลขใบสมัครและลำดับ หรือไม่ใส่ทั้งคู่เพื่อผูกเป็นบัญชีทีมงาน",
  linkBadRegistration: "เลขใบสมัครต้องเป็น UUID จากหน้าแอดมิน",
  // [TH-REVIEW] done.
  linked: (o: { userId: string; registrationId: string; position: number; already: boolean }) =>
    o.already
      ? `<@${o.userId}> ผูกกับใบสมัคร ${o.registrationId} ลำดับ ${o.position} อยู่แล้ว`
      : `ผูก <@${o.userId}> กับใบสมัคร ${o.registrationId} ลำดับ ${o.position} แล้ว`,
  linkedStaff: (userId: string) => `บันทึก <@${userId}> เป็นบัญชีทีมงานแล้ว (ไม่มีใบสมัคร)`,
  // [TH-REVIEW] the Paid role after a link.
  paidAdded: "ให้ role Paid แล้ว",
  paidMissing: "ยังไม่ได้ตั้ง role Paid ในการตั้งค่า ให้ role นี้เองใน Discord",
  paidFailed: "ให้ role Paid ไม่สำเร็จ ตรวจลำดับ role ของบอท แล้วให้ role นี้เองใน Discord",

  // --- /el canvas-link ---
  // [TH-REVIEW] done; the pin goes in the team's channel.
  canvasLinked: (slot: number | null) => `เชื่อมแคนวาสให้แปลง ${slot ? plot(slot) : "?"} แล้ว (ทีมงานเชื่อมแทน)`,
  canvasAlready: "แคนวาสนี้เชื่อมกับทีมนี้อยู่แล้ว",
  canvasReplaced: "แทนแคนวาสเดิมของทีมแล้ว",
  canvasNoChannel: "ทีมนี้ยังไม่มีห้อง จึงยังไม่ได้ปักหมุดลิงก์",
  pinLine: {
    pinned: "ปักหมุดลิงก์ในห้องทีมแล้ว",
    kept: "ลิงก์ปักหมุดอยู่ในห้องทีมแล้ว",
    posted: "โพสต์ลิงก์ในห้องทีมแล้ว แต่ปักหมุดไม่ได้",
    failed: "โพสต์ลิงก์ในห้องทีมไม่ได้ แต่แคนวาสเชื่อมแล้วตามปกติ",
  },

  // --- /el whois ---
  // [TH-REVIEW] registration id and position only; contacts are looked up in the admin page.
  whoisNotClaimed: (userId: string) => `<@${userId}> ยังไม่ได้ /join ในกิจกรรมของเซิร์ฟเวอร์นี้`,
  whoisStaff: (userId: string) => `<@${userId}> เป็นบัญชีทีมงาน ไม่มีใบสมัคร`,
  whoisRehearsal: (userId: string) => `<@${userId}> ใช้รหัสทดลอง ไม่มีใบสมัคร`,
  whois: (o: { userId: string; registrationId: string; position: number | null }) =>
    [
      `<@${o.userId}>`,
      `ใบสมัคร: ${o.registrationId}`,
      `ลำดับ: ${o.position ?? "-"}`,
      "ดูช่องทางติดต่อผู้ปกครองในหน้าแอดมิน",
    ].join("\n"),

  // --- /el test-codes ---
  // [TH-REVIEW] refused outside the rehearsal guild.
  rehearsalOnly: "ใช้ได้เฉพาะในเซิร์ฟเวอร์ซ้อมเท่านั้น เซิร์ฟเวอร์นี้คือกิจกรรมจริง",
  codesHead: (n: number, edition: string) => `รหัสทดลอง ${n} รหัส สำหรับ ${edition} (ใช้ได้รหัสละครั้ง กับ /join)`,
  codesNone: "ไม่ได้รหัสเลย ลองอีกครั้ง",

  // --- /el dryrun-cleanup ---
  // [TH-REVIEW] the typed confirm did not match.
  cleanupBadConfirm: (edition: string) => `พิมพ์ confirm เป็น ${edition} ให้ตรงทุกตัวเพื่อยืนยัน ยังไม่มีอะไรถูกลบ`,
  // [TH-REVIEW] done; a channel that could not be deleted is named (a mention), since a second run no longer lists it.
  cleanupDone: (o: { teams: number; deleted: number; failed: number; failedIds?: readonly string[] }) =>
    [
      `ยกเลิก ${o.teams} ทีมแล้ว (ออกจากเกาะและยอดรวม สมาชิกตั้งทีมใหม่ได้)`,
      `ลบห้องทีม ${o.deleted} ห้อง${o.failed ? `, ลบไม่สำเร็จ ${o.failed} ห้อง (ลบเองใน Discord)` : ""}`,
      o.failedIds?.length ? `ห้องที่ต้องลบเอง: ${o.failedIds.slice(0, 40).map((id) => `<#${id}>`).join(" ")}${o.failedIds.length > 40 ? " ..." : ""}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  /** Discord audit-log reasons (staff only, English is fine). */
  cleanupReason: "Elemental dry-run cleanup",
  linkReason: "Elemental /el link",
} as const;

/**
 * SQL refusals (el:<code>) of the tools in this file. A code whose DETAIL is
 * a Discord id gets the mention; the id is never logged.
 */
// [TH-REVIEW] every line below.
export const STAFF_ERRORS: Record<string, string | ((detail?: string) => string)> = {
  unknown_guild: COMMON.notSetUp,
  entry_not_found: STAFF.entryNotFound,
  team_not_found: "ไม่พบทีมที่ยังเล่นอยู่ในแปลงนี้",
  bad_n: "จำนวนไม่ถูกต้อง",
  bad_count: "จำนวนรหัสต้องอยู่ระหว่าง 1 ถึง 200",
  bad_element: "ธาตุไม่ถูกต้อง",
  bad_user: "บัญชีผู้ใช้ไม่ถูกต้อง",
  not_rehearsal: STAFF.rehearsalOnly,
  bad_confirm: "คำยืนยันไม่ตรง ยังไม่มีอะไรถูกลบ",
  wrong_edition: "เซิร์ฟเวอร์นี้ไม่ใช่กิจกรรมจริง ผูกกับใบสมัครไม่ได้ (ใช้รหัสทดลองแทน)",
  registration_not_found: "ไม่พบใบสมัครและลำดับนี้",
  wrong_event: "ใบสมัครนี้เป็นของกิจกรรมอื่น",
  not_paid: "ใบสมัครนี้ยังไม่ได้ชำระเงิน หรือถูกยกเลิก",
  already_claimed: "บัญชีนี้ผูกกับใบสมัครอื่นอยู่แล้ว",
  member_linked: (id) => (id ? `ที่นั่งนี้ผูกกับ <@${id}> อยู่แล้ว` : "ที่นั่งนี้ผูกกับบัญชีอื่นอยู่แล้ว"),
};

export function staffErrorText(code: string, detail?: string): string | null {
  const entry = STAFF_ERRORS[code];
  if (entry === undefined) return null;
  return typeof entry === "function" ? entry(detail) : entry;
}
