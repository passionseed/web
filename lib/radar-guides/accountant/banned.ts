/**
 * Accountant Must-not-say list: unsourced or superseded figures from the older
 * DB deck (research JSON and cards, dumped 2026-11-20), plus claims found
 * wrong or unsupported while building Level 1. Global house rules (dashes,
 * น้องๆ, safeguarding, age terms, guarantees) are in lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const ACCOUNTANT_BANNED: readonly BannedClaim[] = [
  {
    pattern: /80,?000\s*\+?\s*(?:คน|ราย)?\s*(?:นักบัญชี|ผู้สอบ)|นักบัญชี.{0,20}80,?000/,
    reason: 'Deck hook "80,000+ registered accountants" has no source attached',
  },
  { pattern: /5,?000\s*\+?\s*ตำแหน่ง/, reason: 'Deck "5,000+ openings a year" has no source' },
  { pattern: /60\s*(?:-|ถึง)\s*80\s*%/, reason: 'Deck "AI cuts data entry by 60-80%" has no source' },
  {
    pattern: /15,?000\s*(?:-|ถึง)\s*22,?000|18,?000\s*(?:-|ถึง)\s*70,?000/,
    reason: "Deck junior salary band: the JobsDB source has no figure we could verify (Level 2 only, once sourced)",
  },
  {
    pattern: /80,?000\s*(?:-|ถึง)\s*200,?000|200,?000\s*\+/,
    reason: "Deck CFO salary band: Robert Walters link is a homepage, no figure",
  },
  { pattern: /(?<![\d.])78\s*%/, reason: "Team estimate of graduate employment that reads like a statistic" },
  { pattern: /ทุกปี.{0,15}(?:กฎ|ภาษี)|(?:กฎ|ภาษี).{0,15}ทุกปี/, reason: 'Deck "tax rules change every year" has no source' },
  { pattern: /ตี\s*[23]|OT\s*หนัก/, reason: 'Deck "OT until 2 or 3 a.m." has no source' },
  {
    pattern: /15\.6|15,?600|1\.5\s*หมื่นล้าน|100\s*(?:,000)?\s*ล้าน|แสนล้าน/,
    reason: "STARK: later audit scopes and DSI damage estimates; the guide uses the Jun 2023 special audit figures only",
  },
  { pattern: /(?:ติดคุก|จำคุก|พิพากษา|ศาลตัดสิน)/, reason: "STARK: no court ruling; the SEC referrals start the criminal process" },
  { pattern: /Deloitte|ดีลอยท์|PwC|นันทวัฒน์|ชนินทร์|วนรัชต์|วนรัตน์/i, reason: "Never name people or audit firms in the STARK story" },
  { pattern: /Google\s*Sheets?.{0,20}ฟรี|ฟรี.{0,20}Google\s*Sheets?/i, reason: 'Only LibreOffice is sourced as free; do not say Google Sheets is "ฟรี"' },
  { pattern: /AI\s*(?:จะ)?(?:แทน|แย่งงาน)\s*นักบัญชี(?:ได้)?\s*(?:หมด|ทั้งหมด)/, reason: "Overclaim: no source says AI replaces accountants" },
];
