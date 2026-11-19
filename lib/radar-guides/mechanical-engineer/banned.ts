/**
 * Mechanical Engineer Must-not-say list: figures from the DB deck's research
 * that are unsourced, US-only, superseded or belong on Level 2, plus claims
 * found wrong while building Level 1 (2026-11-20). Global house rules
 * (dashes, น้องๆ, safeguarding, age terms, guarantees) are in
 * lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const MECHANICAL_ENGINEER_BANNED: readonly BannedClaim[] = [
  { pattern: /30,?500|(?<![\d,])50,?000\s*บาท|80,?000\s*\+?\s*บาท/, reason: "JobsDB salary snapshot (Jul 2026): salaries are Level 2 only" },
  { pattern: /(?:20|18),?000\s*(?:-|ถึง)\s*(?:25|26),?000/, reason: "Unsourced new-graduate salary range from the deck" },
  { pattern: /\bP(?:10|25|75|90)\b/, reason: "JobsDB percentile salary figures belong on Level 2" },
  { pattern: /(?<![\d.])9\s*%/, reason: "BLS 9% growth is US data (2024 to 2034), not Thailand" },
  { pattern: /(?<![\d,])6(?:18|00)(?![\d,])|600\s*(?:-|ถึง)\s*650/, reason: "Glassdoor job count snapshot (May 2026), unverified" },
  { pattern: /(?<![\d.])43\s*%|95\s*(?:-|ถึง)\s*99\s*%?/, reason: "AI maintenance and QC accuracy figures from a vendor blog" },
  { pattern: /(?<![\d.])40\s*%/, reason: '"40% of the time is communication" has no source' },
  {
    pattern: /(?:แอร์|เครื่องปรับอากาศ).{0,40}อันดับ\s*2|อันดับ\s*2.{0,20}(?:แอร์|เครื่องปรับอากาศ)/,
    reason: "Thailand was 2nd in older data (2022 to 2023); Thansettakij says 3rd for 2024",
  },
  {
    pattern: /(?:รถไฟไทยทำ|ตู้รถไฟ|ตู้โดยสาร).{0,40}(?:100\s*%|ทั้งคัน|ทั้งหมด)|ทำในไทยทั้งหมด|ผลิตในไทย\s*100/,
    reason: "รถไฟไทยทำ has 44.1% local content, not 100%",
  },
  { pattern: /ดีทรอยต์|Detroit/i, reason: '"Detroit of Asia" is a slogan with no source here' },
  { pattern: /ใบ\s*กว\.?/, reason: "Licence rules are nuanced (only controlled engineering work needs a COE licence); keep them off Level 1" },
  { pattern: /เบนซิน/, reason: "The eco-marathon car ran on ethanol (Thairath 2023)" },
];
