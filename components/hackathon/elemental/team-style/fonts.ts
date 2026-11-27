import { Chakra_Petch, Charm, Chonburi, Itim, Kodchasan, Pattaya, Sriracha } from "next/font/google";

/**
 * The team name fonts (lib/hackathon/elemental/team-style.ts NAME_FONTS).
 * Import this only on pages that show styled names (the board and the pay
 * page). preload is off, so a browser downloads a font only when a name on
 * screen uses it, and only the Thai or Latin file it needs. One weight each.
 */
const chakra = Chakra_Petch({ weight: "600", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-chakra" });
const kodchasan = Kodchasan({ weight: "600", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-kodchasan" });
const itim = Itim({ weight: "400", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-itim" });
const sriracha = Sriracha({ weight: "400", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-sriracha" });
const pattaya = Pattaya({ weight: "400", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-pattaya" });
const chonburi = Chonburi({ weight: "400", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-chonburi" });
const charm = Charm({ weight: "700", subsets: ["thai", "latin"], display: "swap", preload: false, variable: "--font-ts-charm" });

/** Put on a wrapper so StyledTeamName can use every font by its CSS variable. */
export const teamStyleFonts = [chakra, kodchasan, itim, sriracha, pattaya, chonburi, charm].map((f) => f.variable).join(" ");
