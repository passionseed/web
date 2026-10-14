import type { Metadata } from "next";

import { ShiftFeedbackForm } from "@/components/shift/feedback/ShiftFeedbackForm";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import {
  ChromeBevelFilter,
  ChromeWordmark,
  INK,
  OrbitSky,
} from "@/components/shift/poster/riso";
import {
  SHIFT_COHORTS,
  cohortStatus,
  getShiftCohort,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { alumniSessionHint } from "@/lib/shift/feedback";

export const metadata: Metadata = {
  title: "SHIFT feedback",
  description: "แบบสอบถามหลังจบ SHIFT ใช้เวลาประมาณ 5 นาที",
  // Sent to each round's group only; not a page for search results.
  robots: { index: false, follow: false },
};

/** `?round=1` picks the round; otherwise the round that most recently ended
 *  (or is running, for a day-7 session that has not closed yet). */
function feedbackCohort(round?: string): ShiftCohort {
  const requested = round ? getShiftCohort(Number(round)) : undefined;
  if (requested) return requested;
  const started = SHIFT_COHORTS.filter((c) => {
    const status = cohortStatus(c);
    return status === "done" || status === "running";
  });
  return started.at(-1) ?? SHIFT_COHORTS[0];
}

const paper = (alpha: string) => `${INK.paper}${alpha}`;

export default async function ShiftFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const cohort = feedbackCohort((await searchParams).round);

  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <RisoPageTexture />

      <header className="relative overflow-hidden">
        <ChromeBevelFilter />
        <OrbitSky horizon="clamp(240px, 34svh, 320px)" speckle={0} />
        <ShiftTopBar />
        <div
          className="relative flex flex-col items-center justify-end pb-10 text-center"
          style={{ minHeight: "clamp(240px, 34svh, 320px)" }}
        >
          <p className="font-kodchasan text-lg font-semibold">จบแล้ว</p>
          <ChromeWordmark size="clamp(64px, 13vw, 120px)" name={cohort.name} />
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-10 sm:px-8">
        <p
          className="text-center text-sm leading-relaxed sm:text-base"
          style={{ color: paper("b3") }}
        >
          14 ข้อ ประมาณ 5 นาที ตอบตามจริงได้เลย
          <br />
          คำตอบนี้พี่ใช้ปรับ SHIFT รอบหน้า ไม่มีผลกับอะไรของเราทั้งนั้น
        </p>
        <div className="mt-8">
          <ShiftFeedbackForm cohort={cohort} sessionHint={alumniSessionHint()} />
        </div>
      </main>
    </div>
  );
}
