import { BLOCKS, CHAT, LENS } from "@/components/shift/poster/grid/skillIcons";
import {
  CHART,
  CREW,
  PORTFOLIO,
  QUESTION,
  ROCKET,
  SCREEN,
  SIGNPOST,
  SPARK,
  TROPHY,
} from "@/components/shift/poster/pixel/pixelIcons";
import type { RisoIconName } from "@/components/shift/poster/RisoIcons";

/**
 * Pixel sprites for every icon the round page asks for, so SHIFT[1] draws in
 * the same hand as its IG grid. Palette keys match pixelIcons (C cream,
 * O orange, L light orange, D dark orange, B water, M mid, S shade).
 */

const LOCK = [
  "...CCCCC...",
  "..CC...CC..",
  "..C.....C..",
  "..C.....C..",
  "LLLLLLLLLLL",
  "LOOOOOOOOOL",
  "LOOOODOOOOL",
  "LOOODDDOOOL",
  "LOOOODOOOOL",
  "LOOOODOOOOL",
  "LOOOOOOOOOL",
  "LLLLLLLLLLL",
];

const SEND = [
  "...........CC",
  ".........CCCC",
  ".......CCCCS.",
  ".....CCCCCSS.",
  "...CCCCCCSSS.",
  ".CCCCCCCSSSS.",
  "...CCCCSSSSS.",
  ".....OOSSSS..",
  "....OOO.SSS..",
  "...OO....S...",
  "..O..........",
];

const HAMMER = [
  "OOOOOOOOOO.",
  "OOOOOOOOOOD",
  "OOOOOOOOOO.",
  "...LCCL....",
  "....CC.....",
  "....CC.....",
  "....CC.....",
  "....CC.....",
  "....CC.....",
  "....MM.....",
  "....MM.....",
];

const BUG = [
  "C.........C",
  ".C..MMM..C.",
  "...MMMMM...",
  "CC.OOOOO.CC",
  "..OOLOLOO..",
  "CCOOOLOOOCC",
  "..OOLOLOO..",
  "CC.OOOOO.CC",
  "...OOOOO...",
  ".C..OOO..C.",
  "C.........C",
];

const BULB = [
  "..LLLLL..",
  ".LLLLLLL.",
  "LLLCLLLLL",
  "LLCLLLLLL",
  "LLLLLLLLL",
  "LLLLLLLLL",
  ".LLLLLLL.",
  "..LLOLL..",
  "...LOL...",
  "..MMMMM..",
  "..MMMMM..",
  "...MMM...",
];

const CALENDAR = [
  "..M.....M..",
  "OOMOOOOOMOO",
  "OOOOOOOOOOO",
  "CCCCCCCCCCC",
  "CSSCSSCSSCC",
  "CCCCCCCCCCC",
  "CSSCSSCOOCC",
  "CCCCCCCCCCC",
  "CSSCSSCSSCC",
  "CCCCCCCCCCC",
];

const FLASK = [
  "...CCCCC...",
  "....C.C....",
  "....C.C....",
  "....C.C....",
  "...C...C...",
  "..C.....C..",
  ".C.......C.",
  "CBBBBBBBBBC",
  "CBBLBBBBLBC",
  "CBBBBBLBBBC",
  ".CCCCCCCCC.",
];

const CODE = [
  "...C....O..C...",
  "..C.....O...C..",
  ".C.....O.....C.",
  "C......O......C",
  ".C.....O.....C.",
  "..C...O.....C..",
  "...C..O....C...",
];

const TARGET = [
  "...OOOOO...",
  ".OOOCCCOOO.",
  ".OOCCCCCOO.",
  "OOCCOOOCCOO",
  "OOCCOLOCCOO",
  "OOCCOOOCCOO",
  ".OOCCCCCOO.",
  ".OOOCCCOOO.",
  "...OOOOO...",
];

const CERT = [
  "CCCCCCCCCCCC",
  "CSSSSSSSSSSC",
  "CCCCCCCCCCCC",
  "CSSSSSSSCCCC",
  "CCCCCCCCCDDC",
  "CSSSSCCCCDDC",
  "CCCCCCCCCCCC",
];

export const PIXEL_GLYPHS: Record<RisoIconName, string[]> = {
  live: ROCKET,
  metrics: CHART,
  caseStudy: PORTFOLIO,
  lock: LOCK,
  chat: CHAT,
  hammer: HAMMER,
  send: SEND,
  bug: BUG,
  gauge: CHART,
  mic: SCREEN,
  cert: CERT,
  compass: SIGNPOST,
  trophy: TROPHY,
  people: CREW,
  rocket: ROCKET,
  bulb: BULB,
  search: LENS,
  target: TARGET,
  sparkle: SPARK,
  judge: QUESTION,
  blocks: BLOCKS,
  flask: FLASK,
  trend: CHART,
  code: CODE,
  calendar: CALENDAR,
};
