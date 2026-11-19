/**
 * Medical Technologist Must-not-say list. Unsourced or superseded figures from
 * the DB deck (radar_fields research and cards, read 2026-11-19), claims found
 * unsupported while building Level 1 (2026-11-20), and medical-advice lines a
 * student could act on. Global house rules (dashes, น้องๆ, safeguarding, age
 * terms, guarantees) are in lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const MEDICAL_TECHNOLOGIST_BANNED: readonly BannedClaim[] = [
  { pattern: /(?<![\d,.])32\s*(?:ตำแหน่ง|ประกาศ)/, reason: "JobsDB keyword snapshot (Jul 2026): a search count, not the market" },
  { pattern: /30\s*(?:-|ถึง)\s*50\s*ตำแหน่ง/, reason: "Unsourced JobsDB range in the deck's metric details" },
  { pattern: /18,?000|18\s*k/i, reason: "Deck salary floor: blended from JobsDB and Eduzones with no single source (Level 2 only, re-verify)" },
  { pattern: /80,?000|80\s*k/i, reason: "Deck salary ceiling: an estimate, not a source figure" },
  {
    pattern: /20\s*k?\s*(?:-|ถึง)\s*28\s*k|28\s*k?\s*(?:-|ถึง)\s*40\s*k|40\s*k?\s*(?:-|ถึง)\s*55\s*k|55\s*k\+/i,
    reason: "Deck salary ladder has no named data source",
  },
  { pattern: /78\s*%/, reason: "Team estimate of graduate employment that reads like a statistic" },
  { pattern: /(?<![\d.])52\s*%/, reason: "O*NET bachelor's-degree share is US data" },
  { pattern: /61,?890|\$\s*\d/, reason: "BLS US wages: US only, and no dollar figures in Level 1" },
  { pattern: /(?<![\d.])2\s*%.{0,20}(?:โต|เติบโต)|(?:โต|เติบโต).{0,20}(?<![\d.])2\s*%/, reason: "BLS 2% growth is US only (2024 to 2034)" },
  { pattern: /5\s*(?:-|ถึง)\s*20\s*คน/, reason: "Unsourced count of medical technologists per hospital" },
  {
    pattern: /(?:ทุก\s*(?:ยูนิต|ถุง)).{0,30}NAT|NAT.{0,30}ทุก\s*(?:ยูนิต|ถุง)/,
    reason: "NAT on every donated unit is not verified (the 2012 NBC paper covers about 45% of collections)",
  },
  { pattern: /ไทย(?:(?!ไม่).){0,20}(?:พบ|เจอ)ผู้(?:ป่วย|ติดเชื้อ)นิปาห์|นิปาห์.{0,20}ระบาดในไทย/, reason: "Thailand had no Nipah case (Jan 2026)" },
  { pattern: /งดน้ำ|ดื่มน้ำ(?:เปล่า)?ก่อนเจาะ/, reason: "Fasting and water before a blood test is medical advice: follow the hospital, not the game" },
  { pattern: /ผล(?:เลือด|ตรวจ)ของเธอ|เธอ(?:ป่วย|เป็นโรค)/, reason: "Never interpret a student's own results" },
];
