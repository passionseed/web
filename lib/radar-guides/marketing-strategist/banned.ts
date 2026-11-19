/**
 * Marketing Must-not-say list. Figures from the DB deck that are US-only,
 * unsourced or belong on Level 2 (salaries), plus claims found single-sourced
 * or risky while building Level 1 (2026-11-20). Global house rules (dashes,
 * น้องๆ, safeguarding, age terms, guarantees) are in lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const MARKETING_STRATEGIST_BANNED: readonly BannedClaim[] = [
  { pattern: /(?<![\d.])6\s*%/, reason: "BLS 6% growth (2024 to 2034) is US data and belongs on Level 2" },
  { pattern: /36,?400/, reason: "BLS yearly openings are US data" },
  { pattern: /161,?030/, reason: "BLS median wage is US data" },
  {
    pattern: /(?<![\d.])(?:75|80|87|30|58)\s*%/,
    reason: "AI-adoption and burnout shares from ContentGrip, Gartner and LinkedIn summaries: no primary Thai source",
  },
  { pattern: /70\s*%\s*\+?/, reason: "Gartner \"70%+ of teams stretched\" has no primary source in the deck" },
  { pattern: /(?<![\d.])32\s*%/, reason: "LinkedIn job-change figure has no primary source in the deck" },
  { pattern: /(?<![\d,])264(?![\d,])/, reason: "Glassdoor job-count snapshot (Apr 2026), stale and not a market size" },
  {
    pattern: /65,?750|97,?000|25,?000\s*(?:-|ถึง)\s*38,?000|31,?000\s*(?:-|ถึง)\s*97,?000/,
    reason: "JobsDB salary figures: Level 2 only, never on Level 1",
  },
  { pattern: /819,?512|3,000,000/, reason: "PayScale salary figures: Level 2 only" },
  { pattern: /168\s*%|(?<![\d.])31\s*%/, reason: "A CMO profile's company sales figures: secondary source, off topic for students" },
  { pattern: /16\s*ล้าน\s*วิว|16\s*million|5\s*ล้าน\s*ไลก์/i, reason: "Douyin view and like counts come from one source (Inside Retail)" },
  { pattern: /544|7,?441,?961/, reason: "Butterbear company revenue: money figures stay off Level 1" },
  { pattern: /(?:300|1,?500)\s*บาท/, reason: "Spend-per-bill figure has no primary source" },
  {
    pattern: /(?:ร่วมกับ|พาร์ตเนอร์|สปอนเซอร์|สนับสนุนโดย|ได้รับการสนับสนุนจาก)\s*(?:แบรนด์\s*)?(?:Butterbear|หมีเนย)/i,
    reason: "We have no tie to Butterbear: never imply a partnership or endorsement",
  },
];
