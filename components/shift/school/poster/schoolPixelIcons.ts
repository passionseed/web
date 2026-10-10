import {
  CHART,
  CREW,
  FLAG,
  PORTFOLIO,
  ROCKET,
  SCREEN,
  SIGNPOST,
  SPARK,
} from "@/components/shift/poster/pixel/pixelIcons";

/**
 * Extra pixel icons for the school poster set, drawn on the same palette
 * letters as pixelIcons.ts (C cream, S shade, M mid, B water, O orange,
 * L light orange, D dark orange, G plant). `.` is transparent.
 */

/** Scope lock: one target, one problem. */
export const TARGET = [
  "...OOOOO...",
  "..OCCCCCO..",
  ".OCCOOOCCO.",
  "OCCOCCCOCCO",
  "OCOCCLCCOCO",
  "OCOCLLLCOCO",
  "OCOCCLCCOCO",
  "OCCOCCCOCCO",
  ".OCCOOOCCO.",
  "..OCCCCCO..",
  "...OOOOO...",
];

/** Outside users: five people, three behind two. */
export const USERS = [
  ".C...C...C.",
  "CCC.CCC.CCC",
  "BBB.BBB.BBB",
  "BBB.BBB.BBB",
  "...C...C...",
  "..CCC.CCC..",
  "..OOO.OOO..",
  "..OOO.OOO..",
];

/** AI mentor: a friendly robot head. */
export const BOT = [
  ".....L.....",
  ".....O.....",
  ".CCCCCCCCC.",
  "CCCCCCCCCCC",
  "CCBBCCCBBCC",
  "CCBBCCCBBCC",
  "CCCCCCCCCCC",
  "CCCMMMMMCCC",
  ".CCCCCCCCC.",
  "...SSSSS...",
];

/** Story circle: two people around a small fire. */
export const CIRCLE = [
  ".C.......C.",
  "CCC.....CCC",
  "OOO..L..BBB",
  "OOO.LOL.BBB",
  "OOO.LOOLBBB",
  "...DDDDD...",
];

/** Safeguarding: a shield with a check. */
export const SHIELD = [
  "OOOOOOOOOOO",
  "OCCCCCCCCCO",
  "OCCCCCCCGCO",
  "OCCCCCCGGCO",
  "OCGCCCGGCCO",
  "OCGGCGGCCCO",
  ".OCGGGCCCO.",
  ".OCCGCCCCO.",
  "..OCCCCCO..",
  "...OCCCO...",
  "....OOO....",
];

/** Consent: a signed form. */
export const DOC = [
  "CCCCCCCCC..",
  "CMMMMMMCC..",
  "CCCCCCCCC..",
  "CMMMMMMMC..",
  "CCCCCCCCC.D",
  "CMMMMCCCCOO",
  "CCCCCCCCOO.",
  "CCOOCCCOO..",
  "COCCOCCLC..",
  "CCCCCCCCC..",
];

/** Data kept safe: a padlock. */
export const LOCK = [
  "...MMMMM...",
  "..M.....M..",
  "..M.....M..",
  "..M.....M..",
  "LLLLLLLLLLL",
  "LLLLLDLLLLL",
  "LLLLDDDLLLL",
  "LLLLLDLLLLL",
  "LLLLLDLLLLL",
  "LLLLLLLLLLL",
];

/** The school: a building with a flag. */
export const SCHOOL = [
  ".....OO....",
  ".....OOO...",
  ".....C.....",
  "....CCC....",
  "..CCCCCCC..",
  "CCCCCCCCCCC",
  "CBBCCCCCBBC",
  "CBBCCDCCBBC",
  "CCCCCDCCCCC",
  "CBBCCDCCBBC",
  "CCCCCDCCCCC",
];

export const SCHOOL_ICONS = {
  target: TARGET,
  users: USERS,
  bot: BOT,
  circle: CIRCLE,
  shield: SHIELD,
  doc: DOC,
  lock: LOCK,
  school: SCHOOL,
  spark: SPARK,
  signpost: SIGNPOST,
  flag: FLAG,
  rocket: ROCKET,
  chart: CHART,
  portfolio: PORTFOLIO,
  crew: CREW,
  screen: SCREEN,
} as const;

export type SchoolIconName = keyof typeof SCHOOL_ICONS;
