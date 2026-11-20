import { Trirong } from "next/font/google";

/** Trirong for every Elemental page (rules: ../poster/elemental/brand.ts). */
export const trirong = Trirong({
  weight: ["200", "300", "400", "600"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});
