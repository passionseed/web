import type { Metadata } from "next";

import { TcasPosterPage } from "@/components/shift/poster/pixel/tcas/TcasPosterPage";
import { TCAS_BBA_POSTER } from "@/lib/content/tcas70-bba";

/** TCAS70 Round 1 Business Administration (Thai + BBA) infographic, SHIFT[1] pixel style. */

export const metadata: Metadata = {
  title: "TCAS70 บริหารธุรกิจ + BBA รอบ 1 Infographic",
  robots: { index: false, follow: false },
};

export default function TcasBbaInfographicPage() {
  return <TcasPosterPage data={TCAS_BBA_POSTER} />;
}
