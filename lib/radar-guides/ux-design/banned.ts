/**
 * UX/UI Designer Must-not-say list: figures from the DB deck that belong on
 * Level 2 or have weak sources, plus claims found wrong or unsupported while
 * building Level 1 (2026-11-19). Global house rules (dashes, น้องๆ,
 * safeguarding, age terms, guarantees) are in lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const UX_DESIGN_BANNED: readonly BannedClaim[] = [
  {
    pattern: /22,?000|55,?000|66,?000|75,?000|บาท\s*\/\s*เดือน/,
    reason: "Salary figures (Adecco, JobsDB, WorkVenture, a consultant blog) belong on the Level 2 deck, not Level 1",
  },
  { pattern: /71,?250|บูทแคมป์|bootcamp/i, reason: "Course prices and bootcamp sellers: no price in Level 1" },
  { pattern: /18\.5|พันล้านดอลลาร์/, reason: "Gitnux global market size is an unsourced aggregator figure" },
  {
    pattern: /(?:ฝีมือ|ผลงาน|ออกแบบโดย)\s*(?:ทีม\s*)?Mayday.{0,30}(?:1,?100|ดิจิทัล)|Mayday\s*ออกแบบ.{0,20}1,?100/,
    reason: "The 2026 BMA upgrade names Mayday as a partner, not as the designer of the new signs",
  },
  {
    pattern: /4,?000\s*ป้าย/,
    reason: "Mayday's 2017 goal of about 4,000 signs was a plan, not a result",
  },
  {
    pattern: /ไม่ใช้\s*AI.{0,30}(?:ถูกแทน|ตกงาน)|ถูกแทนที่.{0,20}แน่นอน/,
    reason: "\"Designers who don't use AI will be replaced\" is the deck's opinion with no source",
  },
  {
    pattern: /ไม่ต้องสมัคร.{0,30}Excalidraw|Excalidraw.{0,40}ไม่ต้องสมัคร/i,
    reason: "Excalidraw's README does not say no account is needed",
  },
];
