import type { Metadata } from "next";

import { ShiftCohortCard } from "@/components/shift/ShiftCohortCard";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { INK, MISREG_TEXT, RisoPageTexture, paper } from "@/components/shift/ShiftRiso";
import {
  ChromeBevelFilter,
  ChromeWordmark,
  OrbitSky,
} from "@/components/shift/poster/riso";
import { SHIFT_COHORTS, cohortStatus } from "@/lib/content/shift-cohort";

/**
 * /shift: every SHIFT round in one place. Each card links to its own page
 * (/shift/1, /shift/2) where the full pitch and apply form live. Open rounds
 * come first, then newest first.
 */

export const metadata: Metadata = {
  title: "SHIFT | 7 วัน ปั้น 1 โปรเจกต์จริง · ทุกรุ่น",
  description:
    "SHIFT ทุกรุ่นจาก PassionSeed: 7 วัน สร้างโปรเจกต์จริงที่คนนอกได้ลองใช้ พร้อมพอร์ต 1 หน้าสำหรับ TCAS 1 เลือกรุ่นที่ว่างแล้วสมัครได้เลย",
  alternates: { canonical: "/shift" },
  openGraph: {
    title: "SHIFT | 7 วัน ปั้น 1 โปรเจกต์จริง",
    description: "เลือกรุ่น SHIFT ที่ใช่ สร้างโปรเจกต์จริงที่คนนอกได้ลองใช้ใน 7 วัน",
    url: "https://passionseed.org/shift",
    type: "website",
  },
};

/** Status flips on Bangkok dates, so re-render at least hourly. */
export const revalidate = 3600;

const HORIZON = "clamp(300px, 44svh, 400px)";

function sortedCohorts() {
  return [...SHIFT_COHORTS].sort((a, b) => {
    const openA = cohortStatus(a) === "open" ? 0 : 1;
    const openB = cohortStatus(b) === "open" ? 0 : 1;
    return openA - openB || b.round - a.round;
  });
}

export default function ShiftGalleryPage() {
  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <MetaPixel pagePath="/shift" />
      <RisoPageTexture />

      <header className="relative overflow-hidden">
        <ChromeBevelFilter />
        <OrbitSky horizon={HORIZON} speckle={0} />
        <ShiftTopBar />
        <div
          className="relative flex flex-col items-center justify-end pb-12 text-center"
          style={{ minHeight: HORIZON }}
        >
          <h1
            className="font-kodchasan text-[clamp(28px,5vw,48px)] font-bold leading-[1.3]"
            style={MISREG_TEXT}
          >
            7 วัน ปั้น 1 โปรเจกต์จริง
          </h1>
          <ChromeWordmark size="clamp(72px, 14vw, 150px)" name="SHIFT" />
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8">
        <p className="mx-auto max-w-2xl text-center text-base leading-relaxed" style={{ color: paper("b3") }}>
          ทุกรุ่นทำโปรเจกต์ของตัวเอง มีกลุ่มเพื่อนเล็กๆ คอยช่วย ปล่อยให้คนนอกลองใช้จริง
          แล้วจบด้วยพอร์ต 1 หน้าสำหรับ TCAS 1 เลือกรุ่นที่ว่างได้เลย
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {sortedCohorts().map((cohort) => (
            <ShiftCohortCard key={cohort.round} cohort={cohort} />
          ))}
        </div>
      </main>
    </div>
  );
}
