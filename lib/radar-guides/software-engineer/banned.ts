/**
 * Software engineer Must-not-say list: the superseded or unsourced figures in
 * docs/radar-guide/content-fixes/software-engineer.md and the "Claims checked
 * and dropped" table of docs/radar-guide/factsheets/software-engineer.md.
 * Global house rules (dashes, น้องๆ, safeguarding, age terms, guarantees)
 * are in lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const SOFTWARE_ENGINEER_BANNED: readonly BannedClaim[] = [
  { pattern: /(?<![\d.])15\s*%/, reason: "Superseded BLS growth (2024 to 2034). BLS now says 10% for 2025 to 2035, US only" },
  { pattern: /129,?200/, reason: "Superseded BLS openings. Now 106,100 a year, and it includes QA and testers" },
  { pattern: /2024\s*(?:-|ถึง|to)\s*2034|2567\s*(?:-|ถึง)\s*2577/, reason: "Old BLS projection period. Use 2025 to 2035" },
  { pattern: /15\s*(?:ถึง|-)\s*20\s*%/, reason: "Unsourced Thai demand growth line" },
  {
    pattern: /25,?000\s*(?:-|ถึง)\s*35,?000|40,?000\s*(?:-|ถึง)\s*70,?000|90,?000\s*(?:-|ถึง)\s*130,?000|130,?000\s*(?:-|ถึง)\s*220,?000/,
    reason: "Salary ladder with no live source (JobsDB shows location averages only)",
  },
  { pattern: /224\s*[Kk,]|Levels\.fyi/i, reason: "Levels.fyi P90 is self-reported and skewed to multinationals" },
  { pattern: /Agoda.{0,40}(?:2\.5|ล้าน)/i, reason: "One-company senior salary, self-reported" },
  { pattern: /PayScale|467,?692|39,?000/i, reason: "PayScale entry figure rests on 5 salaries, last updated 2025-06" },
  { pattern: /ARDURA/i, reason: "Consultancy blog citing unnamed data. Use TDRI (Thailand) or SignalFire (Big Tech only)" },
  {
    pattern: /(?:จ้าง|ตำแหน่ง)\s*(?:จบใหม่|junior).{0,20}(?:ลดลง|หาย).{0,10}(?:กว่าครึ่ง|50\s*%)|junior.{0,20}50\s*%|15\s*%\s*(?:→|เหลือ|to)\s*7\s*%/i,
    reason: "ARDURA's junior-hiring drop. The traceable figure is SignalFire: 7% of Big Tech hires, not a Thai number",
  },
  { pattern: /(?:ได้งาน|มีงานทำ).{0,20}(?:ครึ่งหนึ่ง|50\s*%)/, reason: "Our own estimate from a non-Thai blog, not a measured Thai rate" },
  { pattern: /800\s*(?:-|ถึง)\s*1,?000\s*ตำแหน่ง/, reason: "Not a listing count from any cited source" },
  { pattern: /5\.7\s*%|42\.5\s*%/, reason: "Misattributed: about 42% is the NY Fed rate for all recent graduates, not CS" },
  { pattern: /1\.4\s*(?:ล้าน|M|million)/i, reason: "Old code.org projection of unfilled US computing jobs" },
  { pattern: /(?<![\d.])84\s*%|(?<![\d.])46\s*%|(?<![\d.])33\s*%/, reason: "Stack Overflow 2025 figures, superseded by the 2026 survey (73%, 48%)" },
  { pattern: /30\s*นาที\s*หลัง\s*deploy/i, reason: "Invented monitoring time" },
  { pattern: /22\s*[Kk]\b|22,000\s*บาท/, reason: "From a composite person presented as real" },
  { pattern: /\$\s?149/, reason: "CS50 certificate price changes; Harvard's own CS50x certificate is free" },
  { pattern: /ผู้ใช้.{0,10}ต่อเดือน.{0,20}ViaBus|ViaBus.{0,30}ต่อเดือน/, reason: "ViaBus reports total users, not monthly users" },
  { pattern: /ViaBus.{0,40}(?:2\s*ล้าน|2,000,000)/, reason: "Old Forbes-era download figure; the current reported figure is over 10 million users" },
];
