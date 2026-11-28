import type { ReactNode } from "react";

/**
 * Thai has no spaces, so the browser's dictionary picks the line breaks, and
 * it splits compounds (หลัก|ฐาน, ผู้|ปกครอง) or leaves one word alone on the
 * last line. These phrases always stay on one line. The wording never changes.
 */
const KEEP = [
  "ม.3 ถึง ม.6",
  "ผู้ปกครอง",
  "ขออนุญาต",
  "หลักฐาน",
  "ไม่เป็นไร",
  "ไม่ต้องใส่",
  "ด้วยมือถือ",
  "ช่วยคิดว่า...”",
  "ถ้ามี Wi-Fi",
  "ใช้ Wi-Fi",
  "ได้เลย",
  "อยากบอก",
  "แนวตั้ง",
  "คนถาม",
  "ผลตรวจ",
  "แสงธรรมชาติ",
  "พูดก็ได้",
  "ทีมงาน",
  "ค้างไว้",
  "ลิงก์นี้",
  // Safeguarding: the negation never leaves its verb, or "show the face" reads alone.
  "ไม่เห็นหน้า",
  "ที่นั่น",
  "พื้นหลัง",
  "เราขอ",
  "ได้รับแล้ว",
  "ข้อความเดิม",
  "พิงกองหนังสือ",
  "รูปและอย่างอื่น",
];

const PATTERN = new RegExp(`(${KEEP.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);

export function keep(text: string): ReactNode {
  const parts = text.split(PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  );
}
