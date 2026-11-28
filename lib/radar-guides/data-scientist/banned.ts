/**
 * Data scientist Must-not-say list. From docs/radar-guide/content-fixes/
 * data-scientist.md (figures that are wrong, outdated or unsourced on the live
 * deck) plus what the 2026-11-18 Level 1 research found. Checked by guide-lint
 * against copy, dialogue, reel text, OG headlines and engine data. Global
 * house rules live in lib/radar-guides/banned.ts.
 */
import type { BannedClaim } from "@/lib/radar-guide/guide-types";

export const DATA_SCIENTIST_BANNED: readonly BannedClaim[] = [
  // ---- content-fixes 2.1, 2.2, 2.7: superseded BLS projection and its framing
  { pattern: /(?<![\d.])34\s*%|2024\s*(?:-|ถึง)\s*2034|ภายในปี\s*2034/, reason: "Outdated BLS projection. Current: 35% for 2025 to 2035, US only" },
  { pattern: /ทั่วโลก.{0,40}(?:โต|grow)/, reason: "BLS is a US projection, never global" },
  { pattern: /AI\s*มา(?:ช่วย)?เสริม.{0,10}ไม่ใช่.{0,6}แทน/, reason: "A growth projection does not show that AI augments the job" },
  { pattern: /11\s*เท่า|อันดับ\s*4/, reason: "Based on the 2024-34 projections; not re-checked" },
  { pattern: /245,?900|328,?300|82,?500|23,?400/, reason: "Superseded BLS 2024-34 job counts" },
  { pattern: /58,?510|174,?790|4,?876|14,?566/, reason: "Superseded BLS wages (May 2025: P10 $67,240, P90 $199,130)" },
  // ---- content-fixes 2.3, 2.4: folk statistic on cleaning time
  { pattern: /(?<![\d.])80\s*%|60\s*(?:-|ถึง)\s*80\s*%/, reason: "The 80% / 60-80% cleaning-time figure is an unsourced folk statistic" },
  // ---- content-fixes 2.5, 2.6, 2.7: unsourced market and salary figures
  { pattern: /800\s*ตำแหน่ง/, reason: "No source for ~800 openings" },
  { pattern: /25,?000\s*(?:-|ถึง)\s*40,?000|45,?000\s*(?:-|ถึง)\s*80,?000|120,?000\s*(?:-|ถึง)\s*150,?000/, reason: "THB salary ladder has no dated source" },
  { pattern: /\$\s?(?:70,?000|120,?000|160,?000|200,?000|350,?000)/, reason: "USD ladder has no source and is not Thailand" },
  { pattern: /FAANG/i, reason: "No source for FAANG salary claims" },
  { pattern: /(?<![\d,])18,?000\s*บาท|114,?000|170,?000/, reason: "JobsDB P10/P90 and Glassdoor figures are no longer published or have no URL" },
  { pattern: /(?<![\d.])(?:3\s*%.{0,30}22\s*%|22\s*%.{0,30}(?<![\d.])3\s*%)/, reason: "Layoff comparison comes from a course seller (365 Data Science)" },
  { pattern: /(?<![\d.])(?:54|24)\s*%.{0,20}(?:ป\.โท|ป\.เอก|master|PhD)/i, reason: "Degree shares come from a course seller (365 Data Science)" },
  { pattern: /(?<![\d.])67\s*%/, reason: "Team estimate, not a hiring rate" },
  { pattern: /23\s*%\s*ต่อปี|ต่อปี.{0,10}23\s*%/, reason: "TDRI +23% is one year-on-year comparison, not a yearly rate" },
  { pattern: /SCB|KBTG|Agoda|Shopee|Central Group|True Digital/i, reason: "Hiring company list has no source" },
  { pattern: /Data Scientist\s*\(?ปีที่\s*3/, reason: "Composite person presented as real (realPeople card is hidden)" },
  // ---- Level 1 research, 2026-11-18
  { pattern: /(?:ปิด|closed?).{0,20}(?:ทุกโรงเรียน|ทั้งหมด\s*437|all\s*437)/i, reason: "BMA closed 352 of 437 schools on 24 Jan 2025, not all of them" },
  { pattern: /(?<![\d,])103\s*(?:แห่ง|โรงเรียน)/, reason: "103 was an earlier count on 22 Jan 2025; the 24 Jan figure is 352" },
  { pattern: /DustBoy.{0,40}(?:ทำให้|บังคับ|สั่ง).{0,30}(?:กรมควบคุมมลพิษ|คพ\.)|(?:กรมควบคุมมลพิษ|คพ\.).{0,40}เพราะ\s*DustBoy/, reason: "No source shows DustBoy caused PCD to add PM2.5 to the AQI" },
  { pattern: /แห่งแรกของโลก|ครั้งแรกของโลก|first in the world/i, reason: "The 'first in the world' claim is the project's own and unverified" },
  { pattern: /GISTDA.{0,40}(?:พยากรณ์|ล่วงหน้า|forecast)/i, reason: "No source read for a GISTDA PM2.5 forecast feature" },
  { pattern: /สมัคร\s*(?:ใช้\s*)?Kaggle/i, reason: "Level 1 first step is open government data with no account; Kaggle needs an account and age check" },
];
