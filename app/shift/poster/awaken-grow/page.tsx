import type { Metadata } from "next";

import { AwakenGrowCarousel } from "@/components/shift/poster/AwakenGrowCarousel";

/**
 * "ตื่นรู้ vs เติบโต" organic IG carousel, 10 slides at 1080x1440.
 * Export: screenshot #awaken-grow-1 ... #awaken-grow-10.
 */

export const metadata: Metadata = {
  title: "Awakening vs growth carousel",
  robots: { index: false, follow: false },
};

export default function AwakenGrowPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <AwakenGrowCarousel />
    </div>
  );
}
