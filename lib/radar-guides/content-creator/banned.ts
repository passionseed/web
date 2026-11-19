/**
 * Content Creator Must-not-say list: figures from the older DB deck research
 * that are unsourced, superseded, foreign or too weak for Level 1, plus claims
 * found wrong or unsupported while building Level 1 (2026-11-20). Global house
 * rules (dashes, น้องๆ, safeguarding, age terms, guarantees) are in
 * lib/radar-guides/banned.ts. Reasons: docs/radar-guide/factsheets/content-creator.md.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const CONTENT_CREATOR_BANNED: readonly BannedClaim[] = [
  {
    pattern: /45,?000\s*ล้าน|4\.5\s*หมื่นล้าน|45\s*billion/i,
    reason: "Tellscore market size (2024) via a trade blog: an industry seller's estimate, not checked",
  },
  {
    pattern: /2\s*ล้านคน|2\s*million/i,
    reason: '"2 million Thais full-time creators" has no method and is implausible',
  },
  { pattern: /20\s*(?:-|ถึง)\s*30\s*%/, reason: "Tellscore growth estimate, unsourced method" },
  { pattern: /(?<![\d.])66\s*%/, reason: '"AI speeds production up to 66%" has no source' },
  { pattern: /(?<![\d.])86\s*%/, reason: "Forbes global creator AI-use figure, not Thai and not checked" },
  {
    pattern: /45[01]\s*\+?\s*(?:ตำแหน่ง|งาน)|1,?500\s*\+?\s*ตำแหน่ง/,
    reason: "Old JobsDB keyword snapshot and the deck's own openings estimate",
  },
  {
    pattern: /5,?000\s*(?:-|ถึง)\s*30,?000/,
    reason: "Influencer rate card from an agency blog (ConvertCake): a price, not a salary, and not for minors",
  },
  { pattern: /150\s*(?:-|ถึง)\s*212|ดอลลาร์/, reason: "US UGC prices, not Thai" },
  {
    pattern: /\d[\d,.]*\s*(?:k|K)?\s*บาท|บาท\s*\/\s*เดือน/,
    reason: "No pay or prices on Level 1 (salaries need a named, recent Thai source and belong on Level 2)",
  },
  {
    pattern: /15\s*ล้าน.{0,20}(?:ผู้ติดตาม|ซับ)|8\s*แสน.{0,20}(?:ผู้ติดตาม|ซับ)/,
    reason: "Follower counts from the deck (Zbing z., Farose) are undated snapshots",
  },
  { pattern: /20\s*ล้านวิว|20\s*million\s*views/i, reason: "Moo Deng clip view count is not in the AP text we read" },
  {
    pattern: /(?:ดัง|ไวรัล|รวย)(?:แน่|ชัวร์)|รวยเร็ว|ได้ล้านวิว/,
    reason: "No promise of fame, virality or money: the guide says the work is planning, not luck",
  },
  {
    pattern: /กระโดด.{0,20}บ่อ/,
    reason: "Mar 2026 Moo Deng enclosure intrusion: the motive was not confirmed (PPTV), do not say he did it for a clip",
  },
];
