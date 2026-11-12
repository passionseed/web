/**
 * Global Must-not-say list: house rules and claims banned for every career.
 * Career-specific claims live in lib/radar-guides/<slug>/banned.ts.
 * Dashes and "น้องๆ" are also checked directly by guide-lint.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const GLOBAL_BANNED: readonly BannedClaim[] = [
  { pattern: /น้อง\s*ๆ/, reason: 'House rule: never "น้องๆ"' },
  { pattern: /[–—]/, reason: "House rule: no em or en dashes" },
  // Safeguarding: no private 1:1 channel between adults and students.
  {
    pattern: /แอด\s*ไลน์|แอดไลน์|ทักแชต(?:ส่วนตัว|มา)|แชตส่วนตัว|ทัก\s*inbox|LINE\s*QR|คิวอาร์ไลน์|add\s*line/i,
    reason: "Safeguarding: no private chat or LINE QR; questions go to public comments",
  },
  // Age terms: never tell a minor to sign up for an age-limited AI product.
  {
    pattern: /สมัคร\s*(?:ใช้\s*)?(?:Claude|ChatGPT|Gemini|Copilot|Grok)/i,
    reason: "Age terms: never tell a student to sign up for an age-limited AI product",
  },
  { pattern: /การันตี/, reason: "No guarantees (admission, jobs, competitions)" },
  { pattern: /ได้คะแนน\s*TCAS\s*แน่นอน|ติดแน่นอน|ได้งานแน่นอน/, reason: "No guaranteed outcomes" },
  { pattern: /ได้งาน\s*\d+\s*%|\d+\s*%\s*ได้งาน/, reason: "Unsourced placement rates" },
  { pattern: /AI\s*premium|พรีเมียม\s*AI/i, reason: "No source shows an AI salary premium" },
  { pattern: /ถูกกฎหมาย\s*100\s*%/, reason: "Unverified legality claim" },
];
