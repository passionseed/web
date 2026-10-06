import type { Metadata } from "next";
import { shiftSocialMetadata } from "@/lib/shift/socialMetadata";

import { ShiftApplyForm } from "@/components/shift/ShiftApplyForm";
import { ShiftSeatsRemaining } from "@/components/shift/ShiftSeatsRemaining";
import {
  ClosedRoundNotice,
  ReadDetailsInline,
  RoundSwitcher,
} from "@/components/shift/apply/ApplyGuides";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import {
  ChromeBevelFilter,
  ChromeWordmark,
  INK,
  OrbitSky,
} from "@/components/shift/poster/riso";
import {
  cohortPath,
  cohortStatus,
  formatThaiDate,
  formatThaiDateRange,
  getEffectiveCohort,
  getOpenCohorts,
} from "@/lib/content/shift-cohort";

interface ApplySearchParams {
  round?: string;
  utm_source?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ApplySearchParams>;
}): Promise<Metadata> {
  const cohort = getEffectiveCohort((await searchParams).round);
  const title = `สมัคร ${cohort.name} | PassionSeed`;
  const description = `สมัคร ${cohort.name} ใช้เวลา 2 นาที ไม่ต้องล็อกอิน`;
  return {
    title,
    description,
    alternates: { canonical: cohort.applyUrl },
    ...shiftSocialMetadata(cohort, title, description, cohort.applyUrl),
  };
}

const paper = (alpha: string) => `${INK.paper}${alpha}`;

export default async function ShiftApplyPage({
  searchParams,
}: {
  searchParams: Promise<ApplySearchParams>;
}) {
  const { round, utm_source: source } = await searchParams;
  // `?round=2` picks the round; missing or unknown means the next open one.
  const cohort = getEffectiveCohort(round);
  const openCohorts = getOpenCohorts();
  const isOpen = cohortStatus(cohort) === "open";

  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <RisoPageTexture />
      <MetaPixel pagePath="/shift/apply" />

      <header className="relative overflow-hidden">
        <ChromeBevelFilter />
        <OrbitSky horizon="clamp(260px, 38svh, 340px)" speckle={0} />
        <ShiftTopBar back={{ href: cohortPath(cohort), label: cohort.name }} />
        <div
          className="relative flex flex-col items-center justify-end pb-10 text-center"
          style={{ minHeight: "clamp(260px, 38svh, 340px)" }}
        >
          <p
            className="font-kodchasan text-lg font-semibold"
            style={{ color: INK.paper }}
          >
            สมัคร
          </p>
          <ChromeWordmark size="clamp(64px, 13vw, 120px)" name={cohort.name} />
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-10 sm:px-8">
        {isOpen ? (
          <>
            <div
              className="text-center text-sm leading-relaxed sm:text-base"
              style={{ color: paper("b3") }}
            >
              <p>
                {formatThaiDateRange(cohort.startDate, cohort.endDate)} ·{" "}
                {cohort.sessionTime} น. · ออนไลน์บน Discord
              </p>
              <div className="mt-1" style={{ color: INK.paper }}>
                <ShiftSeatsRemaining round={cohort.round} capacity={cohort.seats} />
              </div>
              <p className="mt-1">
                ใช้เวลา 2 นาที ไม่ต้องล็อกอิน ·{" "}
                <span className="font-semibold" style={{ color: INK.yellow }}>
                  ปิดรับ {formatThaiDate(cohort.applyDeadline)}
                </span>
                <ReadDetailsInline cohort={cohort} />
              </p>
            </div>

            <RoundSwitcher current={cohort} open={openCohorts} />

            <div className="mt-8">
              <ShiftApplyForm
                cohort={cohort}
                source={source}
                otherRounds={openCohorts.filter((c) => c.round !== cohort.round)}
              />
            </div>
          </>
        ) : (
          <ClosedRoundNotice requested={cohort} open={openCohorts} />
        )}
      </main>
    </div>
  );
}
