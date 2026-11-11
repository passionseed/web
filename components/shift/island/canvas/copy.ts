/**
 * Words for the SHIFT canvas link and the quest card composer. DRAFT COPY for
 * the founder's Thai review (AGENTS.md: several models check Thai copy). Rules:
 * no emoji (zone emoji come from SHIFT_CARDS so they match the whiteboard), no
 * em dashes, no markdown, never talk down, never say "pivot". Checked by
 * canvas/__tests__/copy.test.ts with lintText.
 */
import { CARD_LIMITS } from "@/lib/shift-island/quest-canvas";

export const LINK_SHEET = {
  title: "เชื่อมแคนวาส",
  description: "เห็นเฉพาะแคนวาสที่คุณเป็นเจ้าของหรืออยู่ในทีม",
  loading: "กำลังหาแคนวาสของคุณ",
  failed: "โหลดรายการแคนวาสไม่ได้ตอนนี้",
  retry: "ลองอีกครั้ง",
  empty: "ยังไม่มีแคนวาสที่คุณเป็นเจ้าของหรืออยู่ในทีม สร้างแคนวาสโปรเจกต์บนไวท์บอร์ดก่อน",
  openWhiteboard: "เปิดไวท์บอร์ด",
  meta: (board: string, date: string | null, notes: number) =>
    date ? `บอร์ด ${board} · แก้ล่าสุด ${date} · โน้ต ${notes} ใบ` : `บอร์ด ${board} · โน้ต ${notes} ใบ`,
  owner: "เจ้าของ",
  team: "ทีม",
  linked: "เชื่อมอยู่",
  link: "เชื่อมแคนวาสนี้",
  linking: "กำลังเชื่อม",
  unlink: "เลิกเชื่อม",
  unlinking: "กำลังเลิกเชื่อม",
  linkedToast: "เชื่อมแคนวาสแล้ว เควสต์จะดึงโน้ตจากแคนวาสนี้",
  unlinkedToast: "เลิกเชื่อมแล้ว",
  fine: "เพื่อนในทีมเควสต์จะเห็นโน้ตเมื่ออยู่ในทีมของแคนวาสด้วย",
  failedAction: "ทำไม่สำเร็จ ลองอีกครั้ง",
};

export const COMPOSER = {
  heading: "การ์ดเควสต์",
  pick: `เลือกโน้ตที่จะส่ง (สูงสุด ${CARD_LIMITS.notes} ใบ)`,
  picked: (n: number) => `เลือกแล้ว ${n}/${CARD_LIMITS.notes}`,
  full: `ครบ ${CARD_LIMITS.notes} ใบแล้ว เอาใบไหนออกก่อนถึงจะเลือกใบใหม่ได้`,
  noNotes: "ช่องของเควสต์นี้ในแคนวาสยังไม่มีโน้ต เขียนโน้ตในแคนวาสก่อน แล้วกลับมาเลือกได้เลย",
  version: (v: number) => `v${v}`,
  why: (why: string) => `เปลี่ยนเพราะ ${why}`,
  editedSince: (v: number) => `แก้หลัง v${v}`,
  outsider: "โน้ตจากคนนอกทีม ส่งเป็นของคุณไม่ได้",
  privacy: "อย่าใส่ชื่อจริง เบอร์โทร หรือช่องทางติดต่อของคนที่ลองงานคุณ",
  pii: "โน้ตนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน แก้ในแคนวาสก่อนส่งดีกว่า",
  piiLine: "ข้อความนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน ลบออกก่อนส่งดีกว่า",
  rereading: "กำลังอ่านแคนวาสใหม่ รอสักครู่แล้วค่อยส่ง",
  lineFallback: "เควสต์นี้สอนอะไรคุณบ้าง",
  linePlaceholder: "ตอบสั้นๆ หนึ่งบรรทัด (ไม่บังคับ)",
  linkLabel: "ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)",
  linkError: "ลิงก์ต้องขึ้นต้นด้วย https:// และยาวไม่เกิน 500 ตัวอักษร",
  submit: "ส่งให้พี่เลี้ยงดู",
  resubmit: "ส่งฉบับใหม่",
  sending: "กำลังส่ง",
  back: "กลับ",
  writeInstead: "เขียนเองแทน",
  sent: "ส่งแล้ว พี่เลี้ยงจะดูใน Discord แล้วแจ้งผลในกล่องข้อความของบอท",
  failed: "ส่งไม่สำเร็จ ลองอีกครั้ง",
};

export const PREVIEW = {
  heading: "หน้าตาที่พี่เลี้ยงจะเห็น",
  meter: (n: number) => `${n}/${CARD_LIMITS.evidence}`,
  cut: "บางโน้ตยาวเกิน จะถูกตัดท้าย",
  frozen: "ส่งแล้วการ์ดนี้จะไม่เปลี่ยน ถึงจะแก้โน้ตในแคนวาสทีหลัง",
  empty: "ติ๊กโน้ตอย่างน้อย 1 ใบ แล้วการ์ดจะขึ้นตรงนี้",
  /** The exact stored text, folded. */
  raw: "ดูข้อความที่พี่เลี้ยงจะได้",
};

/** "12 พ.ย." in Bangkok time, or null for no time. */
export function shortDate(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return null;
  try {
    return new Date(ms).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
  } catch {
    return null;
  }
}
