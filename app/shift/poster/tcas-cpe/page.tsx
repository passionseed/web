import type { Metadata } from "next";

import { TcasPosterPage } from "@/components/shift/poster/pixel/tcas/TcasPosterPage";
import { TCAS_CPE_POSTER } from "@/lib/content/tcas70-cpe";

/** TCAS70 Round 1 Computer Engineering infographic, SHIFT[1] pixel style. */

export const metadata: Metadata = {
  title: "TCAS70 วิศวะคอมฯ รอบ 1 Infographic",
  robots: { index: false, follow: false },
};

export default function TcasCpeInfographicPage() {
  return <TcasPosterPage data={TCAS_CPE_POSTER} />;
}
