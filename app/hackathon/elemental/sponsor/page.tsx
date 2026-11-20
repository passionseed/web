import type { Metadata } from "next";

import { SponsorDeck } from "@/components/hackathon/elemental/sponsor/SponsorDeck";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * The Elemental Hackathon sponsor deck. Scroll it, or print it as an A4
 * landscape PDF. Not indexed: it's shared by link with sponsors.
 */
export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon: sponsorship`,
  description: `Sponsor the ${ELEMENTAL.edition} Hackathon by ${ELEMENTAL.series} and PassionSeed, 5 to 7 December 2026`,
  robots: { index: false, follow: false },
};

export default function ElementalSponsorPage() {
  return <SponsorDeck />;
}
