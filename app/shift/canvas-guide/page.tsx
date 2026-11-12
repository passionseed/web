import type { Metadata } from "next";

import { ShiftCanvasGuide } from "@/components/shift/canvas-guide/ShiftCanvasGuide";

export const metadata: Metadata = {
  title: "คู่มือแคนวาส SHIFT | PassionSeed",
  description: "วิธีใช้แคนวาสโปรเจกต์ SHIFT สำหรับนักเรียน เมนเทอร์ และแอดมิน",
  robots: { index: false, follow: false },
};

/** /shift/canvas-guide: how to use SHIFT project canvases. Open to anyone, so students can read it before signing in. */
export default function ShiftCanvasGuidePage() {
  return (
    <main className="dusk-theme dark min-h-screen bg-[var(--dusk-space-950)] bg-[radial-gradient(120%_50%_at_50%_0%,#2a0d45_0%,transparent_60%)] px-4 py-10 font-bai-jamjuree leading-relaxed text-white sm:px-8 sm:py-14">
      <ShiftCanvasGuide />
    </main>
  );
}
