/**
 * Cybersecurity Must-not-say list (docs/radar-guide/cybersecurity-guide.md,
 * "Must-not-say"). Checked by guide-lint against copy, dialogue, clip scripts,
 * reel hooks and variants, OG headlines and engine data. Global house rules
 * (dashes, น้องๆ, safeguarding, age terms, guarantees) are in
 * lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const CYBERSECURITY_BANNED: readonly BannedClaim[] = [
  { pattern: /92\.7/, reason: "Not on Anthropic's page as an accuracy figure. Use 85 of 97" },
  { pattern: /(?<![\d,])516(?![\d,])|6,157|8\.4\s*%/, reason: "Superseded patch numbers. Use 5,087 and 629 as of 2 Nov 2026" },
  {
    pattern: /(?<![\d.,])14\s*(?:ตัว|จุด|bugs?)?\s*(?:ระดับ)?\s*(?:ร้ายแรง|sec-high|high)/i,
    reason: "14 high-severity belongs to an older study. Mythos in Firefox: 180 sec-high",
  },
  { pattern: /271\s*zero[\s-]?day|zero[\s-]?day\s*271/i, reason: 'Say "Mozilla บอกว่า 271 ตัวเจอด้วย Mythos Preview"' },
  { pattern: /ธปท\.?\s*สั่ง.{0,40}(?:อัปเดต|แพตช์)/, reason: "BOT convened CIOs; the release orders no update" },
  {
    pattern: /ฟิชชิง\s*เพิ่ม(?:ขึ้น)?\s*(?:สาม|3)\s*เท่า|tripled\s+phishing|phishing\s+tripled/i,
    reason: "Microsoft: phishing went from 7% to 23% of the intrusions it investigated",
  },
  { pattern: /จีน|China|Chinese/i, reason: "Attribution of the Taiwan attack is unconfirmed" },
  { pattern: /85\s*\+|85\s*บัญชีขึ้นไป/, reason: "The number is 85" },
  { pattern: /8\s*ตัวพร้อมกัน|8\s*parallel/i, reason: 'Say "สูงสุด 8"' },
  { pattern: /มือ.{0,6}(?:บัง|ปิด).{0,6}หน้า.{0,20}(?:deepfake|ดีปเฟก)|(?:deepfake|ดีปเฟก).{0,30}มือ.{0,6}(?:บัง|ปิด).{0,6}หน้า/i, reason: "The hand-over-face deepfake tip has no source" },
  { pattern: /Gartner.{0,40}50\s*%/i, reason: "Unsourced Gartner Tier 1 figure" },
  { pattern: /LinkedIn.{0,40}(?:34|222)/i, reason: "Unsourced LinkedIn figures" },
  { pattern: /88\s*%\s*ได้งาน/, reason: "Unsourced placement rate" },
  { pattern: /(?<![\d.])29\s*%/, reason: "Outdated BLS growth figure; current is 21% (2025 to 2035)" },
  { pattern: /\bABC\b/, reason: "The ABC quote came from an anti-trafficking investigator, not Thai officials" },
  { pattern: /(?<![\d.])7\s*เท่า/, reason: "Ceiling and median come from different sources" },
  { pattern: /ไม่เกิน\s*2\s*ชม|(?<![\d.])30\s*นาที/, reason: "Unverified TryHackMe time claims" },
  { pattern: /62,?500/, reason: "Not on the live JobsDB page" },
  { pattern: /(?:เฉลี่ย|เริ่มต้น)\s*35,?500/, reason: "35,500 is an all-levels median, not an average or a starting salary" },
  { pattern: /\$\s?[\d,]+[^\n]{0,12}บาท|[\d,]+\s*บาท[^\n]{0,6}\(\s*\$/, reason: "US dollar salaries stay on their own tab, never converted to baht" },
  { pattern: /(?<!\d)15\s*ส\.ค\./, reason: "No source for a 15 Aug TCTT qualifier" },
  { pattern: /Christeyns|Teckentrup|Helideck/i, reason: "Keep victim companies unnamed" },
  { pattern: /มาตรา\s*5(?!\d)/, reason: "No section number until legal review" },
  { pattern: /Aur0ra|Cursor/i, reason: "Keep the tool vendor and group out of student copy (sources sheet only)" },
];
