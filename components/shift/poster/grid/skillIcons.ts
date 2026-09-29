import { CHART, QUESTION, SPARK } from "../pixel/pixelIcons";

/**
 * Pixel icons for the SHIFT skill cards, drawn in the same palette keys as
 * pixelIcons (C cream, O orange, L light orange, B water blue).
 */

/** Customer Discovery: a speech bubble, someone telling you their problem. */
export const CHAT = [
  ".CCCCCCCCC.",
  "CCCCCCCCCCC",
  "CCOCCOCCOCC",
  "CCCCCCCCCCC",
  ".CCCCCCCCC.",
  "..CC.......",
  ".CC........",
];

/** Tester Hunt: a magnifier, going out to find people. */
export const LENS = [
  "..CCCC....",
  ".C....C...",
  "C..LL..C..",
  "C.L....C..",
  "C......C..",
  ".C....C...",
  "..CCCCOO..",
  "......OOO.",
  ".......OOO",
  "........OO",
];

/** Zero-Code Stack: blocks stacked into something that works. */
export const BLOCKS = [
  "....LLLL....",
  "....LLLL....",
  "....LLLL....",
  "..OOOOCCCC..",
  "..OOOOCCCC..",
  "..OOOOCCCC..",
  "CCCCBBBBOOOO",
  "CCCCBBBBOOOO",
  "CCCCBBBBOOOO",
];

/**
 * Skill-card display: the icon, plus a label override where the working
 * name in the curriculum is not one we put in front of students and parents.
 */
export const SKILL_CARD_ART: Record<string, { icon: string[]; label?: string }> = {
  "Customer Discovery": { icon: CHAT },
  "Tester Hunt": { icon: LENS },
  "AI Tools (OpenCode)": { icon: SPARK },
  "Anti Meat Proxy": { icon: QUESTION, label: "Think, Don't Copy" },
  "Zero-Code Stack": { icon: BLOCKS },
  "Measure 1 Number": { icon: CHART },
};
