import type { Metadata } from "next";

import { CsiiDeck } from "@/components/hackathon/elemental/csii/CsiiDeck";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * The Elemental Hackathon co-host proposal for CSII. Scroll it, or print it
 * as an A4 landscape PDF. Not indexed: it's shared by link with CSII.
 */
export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon × CSII: co-host proposal`,
  description: `PassionSeed invites CSII to co-host the ${ELEMENTAL.edition} Hackathon at BAScii, 5 to 7 December 2026`,
  robots: { index: false, follow: false },
};

export default function ElementalCsiiPage() {
  return <CsiiDeck />;
}
