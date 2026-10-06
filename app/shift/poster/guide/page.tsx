import type { Metadata } from "next";
import { ShiftGuideCarousel } from "@/components/shift/poster/ShiftGuideCarousel";

export const metadata: Metadata = {
  title: "SHIFT: Three questions before building, organic draft",
  robots: { index: false, follow: false },
};

export default function ShiftGuidePage() {
  return <div className="bg-neutral-950 p-10"><ShiftGuideCarousel /></div>;
}
