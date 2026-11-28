import { Chakra_Petch, Chonburi, Pattaya, Sriracha } from "next/font/google";

/**
 * The team name fonts (lib/hackathon/elemental/team-style.ts NAME_FONTS).
 * Trirong and its Light Italic come from ../fonts.ts (every Elemental page
 * has it). Import this only on pages that show styled names (the board, the
 * team editor, the pay and share pages). preload is off, so a browser
 * downloads a font only when a name on screen uses it, and only the Thai or
 * Latin file it needs. One weight each.
 */
const chakra = Chakra_Petch({ weight: "600", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-chakra" });
const chonburi = Chonburi({ weight: "400", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-chonburi" });
const sriracha = Sriracha({ weight: "400", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-sriracha" });
const pattaya = Pattaya({ weight: "400", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-pattaya" });

/** Put on a wrapper so StyledTeamName can use every font by its CSS variable. */
export const teamStyleFonts = [chakra, chonburi, sriracha, pattaya].map((f) => f.variable).join(" ");
