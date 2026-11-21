import { ELEMENT_LABELS, type ElementKey } from "../../../../lib/elemental/core/index";

/**
 * Scheduled posts (E19): the opening post, the campfire call with its legend,
 * the nightly card, the staff note for a missed post, and the Host tools
 * /el post-now and /el card-override.
 *
 * Functional placeholders only: every Thai line waits for a native review
 * before the event ([TH-REVIEW]). No marketing copy, no names, no contacts.
 * Element names come from facts.ts (ELEMENT_LABELS), not from this file.
 */

function label(element: ElementKey): string {
  return ELEMENT_LABELS[element].th;
}

/** What the nightly caption shows: numbers only (elemental_bot_totals). */
export interface CaptionTotals {
  helped: number;
  helpedToday: number;
  checkedIn: number;
  teamsTotal: number;
  topElement: ElementKey | null;
  levels: Partial<Record<ElementKey, number>>;
}

export const SCHEDULE = {
  // --- Opening post (news channel, Fri 4 Dec 19:00 by default). ---
  // [TH-REVIEW] opening post: the event starts; first steps are /join, then the element picker, both in #start-here.
  opening: (startHere: string | null) =>
    [
      "Elemental เริ่มแล้ว",
      "",
      `1. ใช้ /join ตามด้วยรหัสของคุณ${startHere ? ` ในห้อง <#${startHere}>` : ""}`,
      `2. กดปุ่มเลือกธาตุของคุณ${startHere ? ` ในห้อง <#${startHere}>` : ""}`,
      "3. รวมทีมด้วย /team create",
    ].join("\n"),
  // [TH-REVIEW] alt text of the island picture.
  islandAlt: "เกาะ Elemental",

  // --- Campfire call (news channel, default 19:55 for 20:00). ---
  // [TH-REVIEW] the call: the campfire starts soon; {voice} is a link to the campfire voice channel.
  call: (voice: string | null) =>
    voice ? `กองไฟกำลังจะเริ่ม เข้ามาที่ <#${voice}> ได้เลย` : "กองไฟกำลังจะเริ่ม",
  // [TH-REVIEW] first line in the campfire chat, above the island: how many plots are on it.
  campfireHeader: (teams: number) => `เกาะคืนนี้: ${teams} ทีม (เลขแปลง · ธาตุ · โปรเจกต์ อยู่ด้านล่าง)`,
  // [TH-REVIEW] the island has no team yet.
  campfireEmpty: "เกาะคืนนี้: ยังไม่มีทีม",
  // [TH-REVIEW] the legend went as a .txt file because it is long.
  legendFile: (teams: number) => `รายชื่อแปลงทั้ง ${teams} แปลงอยู่ในไฟล์นี้ (เลขแปลง · ธาตุ · โปรเจกต์)`,
  /** The element as the legend shows it (facts.ts label). */
  legendElement: (element: ElementKey) => label(element),

  // --- Nightly card (news channel, 20:30). ---
  // [TH-REVIEW] the nightly caption: totals as text (the picture has digits only).
  caption: (t: CaptionTotals) => {
    const lines = [
      `ช่วยคนไปแล้ว ${t.helped} คน (วันนี้ +${t.helpedToday})`,
      `ทีมที่เช็กอินวันนี้ ${t.checkedIn} จาก ${t.teamsTotal} ทีม`,
      t.topElement ? `ธาตุที่โตที่สุดวันนี้: ${label(t.topElement)}` : "วันนี้ยังไม่มีธาตุไหนโต",
    ];
    const levels = (Object.keys(ELEMENT_LABELS) as ElementKey[]).map((e) => `${label(e)} ${t.levels[e] ?? 0}`);
    lines.push(`ระดับธาตุ: ${levels.join(" · ")}`);
    return lines.join("\n");
  },
  // [TH-REVIEW] alt text of the nightly card.
  cardAlt: "การ์ดประจำคืน Elemental",

  // --- Staff note: a post still unsent 15 minutes after its time. ---
  // [TH-REVIEW] staff note; {post} is the post's name below, {time} Bangkok HH:MM, {news} the news channel.
  missed: (post: string, day: string, time: string, news: string | null) =>
    `${post} ของวันที่ ${day} เวลา ${time} ยังส่งไม่สำเร็จหลังผ่านไป 15 นาที บอทยังลองส่งต่อ` +
    `${news ? ` ดูในห้อง <#${news}>` : ""} ถ้ายังไม่มี ใช้ /el post-now`,
  // [TH-REVIEW] post names in the staff note and in /el post-now's choices (max 100 characters).
  postName: {
    opening: "โพสต์เปิดงาน",
    call: "ประกาศกองไฟ",
    legend: "เกาะและรายชื่อแปลงในห้องกองไฟ",
    card: "การ์ดประจำคืน",
  },

  // --- /el post-now ---
  // [TH-REVIEW] /el post-now description (staff tool, max 100 characters).
  postNowDescription: "ส่งโพสต์ตามตารางตอนนี้เลย (เปิดงาน, ประกาศกองไฟ, รายชื่อแปลง, การ์ด)",
  // [TH-REVIEW] option description: which post.
  postNowKind: "โพสต์ไหน",
  // [TH-REVIEW] post-now done; {where} is a channel mention.
  postNowDone: (post: string, where: string) => `ส่ง${post}แล้วใน <#${where}>`,
  // [TH-REVIEW] post-now: some messages failed (Discord refused or no channel set).
  postNowFailed: (post: string) => `ส่ง${post}ไม่สำเร็จ ตรวจว่าตั้งห้องไว้ใน elemental_settings และบอทโพสต์ในห้องนั้นได้`,

  // --- /el card-override ---
  // [TH-REVIEW] /el card-override description (staff tool, max 100 characters).
  overrideDescription: "ใช้รูปที่วาดเองแทนเกาะในโพสต์เปิดงานและการ์ดของวันนั้น (ไม่ใส่รูป = ยกเลิก)",
  // [TH-REVIEW] option: the image.
  overrideImage: "รูป (png, jpg, gif, webp) ไม่ใส่ = ยกเลิกรูปที่ตั้งไว้",
  // [TH-REVIEW] option: the Bangkok day, YYYY-MM-DD.
  overrideDay: "วันที่ใช้รูปนี้ แบบ 2026-12-04 (ไม่ใส่ = วันนี้)",
  // [TH-REVIEW] override set.
  overrideSet: (day: string) => `ตั้งรูปสำหรับวันที่ ${day} แล้ว ใช้ในโพสต์เปิดงานและการ์ดของวันนั้นเท่านั้น`,
  // [TH-REVIEW] override set, but kept only as Discord's link (no staff channel to keep it in): it may expire within a day.
  overrideSetFragile: (day: string) =>
    `ตั้งรูปสำหรับวันที่ ${day} แล้ว แต่ยังไม่ได้ตั้งห้องทีมงาน (mirror) ลิงก์รูปจึงอาจหมดอายุใน 1 วัน ตั้งใหม่ในวันนั้นอีกครั้ง`,
  // [TH-REVIEW] override cleared.
  overrideCleared: "ยกเลิกรูปที่ตั้งไว้แล้ว โพสต์จะใช้ภาพเกาะตามปกติ",
  // [TH-REVIEW] the day is not YYYY-MM-DD.
  overrideBadDay: "ใส่วันที่แบบ 2026-12-04",
  // [TH-REVIEW] the file is not an image or is over 8 MB.
  overrideBadImage: "ใช้ไฟล์รูป png, jpg, gif หรือ webp ขนาดไม่เกิน 8 MB",
  // [TH-REVIEW] the image could not be downloaded or kept.
  overrideFailed: "เก็บรูปนี้ไม่สำเร็จ ลองอีกครั้ง",
  // [TH-REVIEW] the copy kept in the staff channel; {day} the day it applies to.
  overrideKept: (day: string) => `รูปที่ใช้แทนเกาะสำหรับวันที่ ${day} (ตั้งด้วย /el card-override)`,
} as const;

export type SchedulePostName = keyof typeof SCHEDULE.postName;
