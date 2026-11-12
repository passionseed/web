import { IBM_Plex_Mono, Kanit } from "next/font/google";

/**
 * Dusk City type for the motion reel, loaded only on the studio route and
 * exposed as CSS variables (see KANIT and PLEX_MONO in duskCity.ts).
 */
const kanit = Kanit({
  weight: ["400", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-rr-kanit",
  display: "block",
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  weight: ["500"],
  subsets: ["latin"],
  variable: "--font-rr-mono",
  display: "block",
  preload: false,
});

export const RADAR_REEL_FONT_VARS = `${kanit.variable} ${plexMono.variable}`;
