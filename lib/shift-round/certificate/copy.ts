import type { MissionKey } from "./types";

/**
 * Public certificate copy (spec 6.1 web keys, 5.9 mission/track labels).
 * Wording is a factual record of completed activities and never implies an
 * admissions endorsement (DS16).
 */
export const WEB_COPY = {
  th: {
    "web.valid": "ใบรับรองนี้ใช้ได้",
    "web.statement":
      "ใบรับรองนี้บันทึกว่า {name} ทำภารกิจครบทั้ง 6 ใน SHIFT รอบที่ {n} ({dates}) กับ Passion Seed",
    "web.disclaimer":
      "ใบรับรองนี้บันทึกกิจกรรมที่ทำครบ ไม่ได้รับรองผลลัพธ์ของโปรเจกต์หรือการรับเข้าศึกษา",
    "web.live": "สถานะปัจจุบันตรวจได้ที่หน้านี้เท่านั้น",
    "web.revoked": "ใบรับรองนี้ถูกเพิกถอนเมื่อ {date}",
    "web.tombstone": "ใบรับรองนี้ถูกเพิกถอนแล้ว",
    "web.not_found": "ไม่พบใบรับรองนี้",
    "web.error":
      "ตรวจสอบไม่ได้ในขณะนี้ ลองใหม่อีกครั้ง (ไม่ได้แปลว่าใบรับรองไม่ถูกต้อง)",
    "web.summary": "เกี่ยวกับโปรเจกต์",
    "web.issuer": "ผู้ออก",
    "web.holder": "ผู้ถือ",
    "web.dates": "ช่วงเวลา",
    "web.track": "ระดับ",
    "web.missions": "ภารกิจ",
    "web.issued_on": "ออกเมื่อ {date}",
    "web.demo": "ดูเดโม",
    "web.retry": "ลองอีกครั้ง",
    "round.tag": "SHIFT · รอบที่ {n}",
    "cert.verify_url": "ตรวจสอบได้ที่ {url}",
    "count.people_talked_to": "คุยกับคนจริง {n} คน",
    "count.testers": "ผู้ทดสอบ {n} คน",
    "count.missions": "ภารกิจ {n} จาก 6",
  },
  en: {
    "web.valid": "This certificate is valid",
    "web.statement":
      "This certificate records that {name} completed all 6 Missions of SHIFT round {n} ({dates}) with Passion Seed",
    "web.disclaimer":
      "This records completed activities. It does not certify project outcomes or imply any admissions endorsement",
    "web.live": "Current status is confirmed only on this page",
    "web.revoked": "This certificate was revoked on {date}",
    "web.tombstone": "This certificate has been revoked",
    "web.not_found": "We couldn't find this certificate",
    "web.error":
      "We can't check this right now. Please try again. (This doesn't mean the certificate is invalid.)",
    "web.summary": "About the project",
    "web.issuer": "Issuer",
    "web.holder": "Holder",
    "web.dates": "Dates",
    "web.track": "Level",
    "web.missions": "Missions",
    "web.issued_on": "Issued {date}",
    "web.demo": "View demo",
    "web.retry": "Try again",
    "round.tag": "SHIFT · Round {n}",
    "cert.verify_url": "Verify at {url}",
    "count.people_talked_to": "Talked to {n} real people",
    "count.testers": "{n} testers",
    "count.missions": "{n} of 6 Missions",
  },
} as const;

export type WebCopyKey = keyof (typeof WEB_COPY)["th"];
export type Lang = keyof typeof WEB_COPY;

export const MISSION_LABELS: Record<MissionKey, { th: string; en: string }> = {
  first_contact: { th: "ติดต่อคนแรก", en: "First contact" },
  interviews_problem: { th: "สัมภาษณ์ + โจทย์", en: "Interviews + problem" },
  mvp: { th: "สร้าง MVP", en: "Build an MVP" },
  testers: { th: "ให้คนจริงลองใช้", en: "Real people try it" },
  change: { th: "เปลี่ยนตามที่ได้ยิน", en: "Change what you heard" },
  demo_post: { th: "โพสต์เดโม", en: "Post your demo" },
};

export const TRACK_LABELS = {
  high_school: { th: "ม.ปลาย", en: "High school" },
  university: { th: "มหาวิทยาลัย", en: "University" },
} as const;

export function t(
  lang: Lang,
  key: WebCopyKey,
  params: Record<string, string | number> = {}
): string {
  return WEB_COPY[lang][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}
