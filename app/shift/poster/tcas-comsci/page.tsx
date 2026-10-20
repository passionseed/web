import type { Metadata } from "next";

import { TcasPosterPage } from "@/components/shift/poster/pixel/tcas/TcasPosterPage";
import { TCAS_CS_POSTER } from "@/lib/content/tcas70-comsci";

/** TCAS70 Round 1 Computer Science infographic, SHIFT[1] pixel style. */

export const metadata: Metadata = {
  title: "TCAS70 วิทยาการคอมฯ รอบ 1 Infographic",
  robots: { index: false, follow: false },
};

export default function TcasComsciInfographicPage() {
  return <TcasPosterPage data={TCAS_CS_POSTER} />;
}
