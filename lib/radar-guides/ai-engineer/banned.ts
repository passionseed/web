/**
 * AI Engineer Must-not-say list. Superseded and unsourced figures from
 * docs/radar-guide/content-fixes/ai-engineer.md, plus claims found wrong or
 * unsupported while building Level 1 (2026-11-18). Global house rules
 * (dashes, น้องๆ, safeguarding, age terms, guarantees) are in
 * lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const AI_ENGINEER_BANNED: readonly BannedClaim[] = [
  {
    pattern: /(?<![\d,.])265(?![\d,])/,
    reason: "Superseded JobsDB keyword snapshot (Jul 2026). The market figure is TDRI 85 to 321 postings, and it belongs on Level 2",
  },
  {
    pattern: /35\s*k?\s*(?:-|ถึง)\s*50\s*k|35,?000\s*(?:-|ถึง)\s*50,?000/i,
    reason: "Unsourced junior salary blend. JobsDB says about 25,000 to 35,000 (Level 2 only)",
  },
  { pattern: /250\s*k|250,000|2\.5\s*แสน/i, reason: "Unsourced salary ceiling (KBTG, SCB DataX, Agoda, Grab claim)" },
  { pattern: /180\s*k?\s*(?:-|ถึง)\s*300\s*k|300,000/i, reason: "AI Unlock ladder: no named data source, seller of AI courses" },
  { pattern: /82\s*%/, reason: "Team estimate of graduate employment that reads like a statistic" },
  { pattern: /(?<![\d.])2\.5\s*%/, reason: "365 Data Science entry-level share is US data" },
  { pattern: /(?<![\d.])34\s*%/, reason: "Outdated BLS data scientist growth (now 35%, 2025 to 2035, US only)" },
  {
    pattern: /(?:ขาด|ต้องการ)\s*วิศวกร\s*AI.{0,20}80,?000|80,?000.{0,20}วิศวกร\s*AI/,
    reason: 'TDRI 80,000 is a gap in AI professionals, not AI engineers: say "คนสาย AI"',
  },
  { pattern: /ทุก\s*3\s*(?:-|ถึง)\s*6\s*เดือน|ทุกไตรมาส/, reason: "Tool turnover period has no source: say เปลี่ยนเร็วมาก" },
  { pattern: /(?:เร็ว|ไว)ขึ้นหลายเท่า/, reason: "Unquantified speed-up claim" },
  { pattern: /80\s*%.{0,30}(?:data|ข้อมูล)/i, reason: '"80% of the time is data prep" has no source' },
  { pattern: /hottest job|DeepMind/i, reason: "Unsourced English deck copy" },
  {
    pattern: /30\s*(?:\+|กว่า)?\s*(?:แห่ง|โรงพยาบาล|โรง)/,
    reason: "30 was Inspectra's field-study count (KMUTT 2024); the 30+ users figure is an undated job ad",
  },
  { pattern: /แม่น(?:ยำ)?\s*90|90\s*%/, reason: "Inspectra's 90% accuracy is undefined in its source" },
  {
    pattern: /(?:ชนะ|เก่งกว่า|แซง|เหนือกว่า).{0,20}(?:GPT|Gemini)/i,
    reason: "Typhoon beating GPT-4o or Gemini is a vendor blog claim",
  },
  { pattern: /Teachable\s*Machine.{0,30}ฟรี|ฟรี.{0,30}Teachable\s*Machine/i, reason: 'Google\'s FAQ says no account, not "free"' },
];
