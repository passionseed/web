import { Trirong } from "next/font/google";

/** Trirong, the Elemental hackathon's face, for every word on a story reel (storyReel.css --sr-serif). */
export const trirong = Trirong({
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});
