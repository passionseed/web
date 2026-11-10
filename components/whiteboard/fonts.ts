import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

/**
 * The board chrome's type, loaded only on whiteboard routes and exposed as CSS
 * variables, so the rest of the site keeps its own fonts. Text drawn on the
 * canvas is untouched: Excalidraw's families and their Thai faces are set in
 * whiteboard.css.
 */
const plexThai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600"],
  subsets: ["thai", "latin"],
  variable: "--font-wb-sans",
  display: "swap",
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-wb-mono",
  display: "swap",
  preload: false,
});

/** The two families by their generated names, for a document that has none of the page's CSS (the script window). */
export const WB_FONT_FAMILY = { sans: plexThai.style.fontFamily, mono: plexMono.style.fontFamily };

/** Put on `.whiteboard-room` and on anything portalled out of it (dialogs, popovers). */
export const WB_FONT_VARS = `${plexThai.variable} ${plexMono.variable}`;
