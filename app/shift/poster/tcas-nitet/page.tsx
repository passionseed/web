import type { Metadata } from "next";

import { TcasPosterPage } from "@/components/shift/poster/pixel/tcas/TcasPosterPage";
import { TCAS_NITET_POSTER } from "@/lib/content/tcas70-nitet";

/** TCAS70 Round 1 Communication Arts infographic, SHIFT[1] pixel style. */

export const metadata: Metadata = {
  title: "TCAS70 นิเทศ รอบ 1 Infographic",
  robots: { index: false, follow: false },
};

export default function TcasNitetInfographicPage() {
  return <TcasPosterPage data={TCAS_NITET_POSTER} />;
}
