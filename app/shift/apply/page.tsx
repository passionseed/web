import type { Metadata } from "next";
import { shiftSocialMetadata } from "@/lib/shift/socialMetadata";

import { ShiftApplyForm } from "@/components/shift/ShiftApplyForm";
import {
  ClosedRoundNotice,
  CohortQuickFacts,
  RoundSwitcher,
} from "@/components/shift/apply/ApplyGuides";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { RestoredApplyDone } from "@/components/shift/apply/RestoredApplyDone";
import { BringAFriendBanner } from "@/components/shift/apply/BringAFriend";
import {
  HALLOWEEN_PAGE_BG,
  HalloweenApplyHeader,
} from "@/components/shift/poster/pixel/halloween/HalloweenApplyHeader";
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
  getEffectiveCohort,
  getOpenCohorts,
  type ShiftCohort,
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
    ...shiftSocialMetadata(cohort, title, description, cohort.applyUrl, cohort.applyPreviewSrc),
  };
}

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** The default register header: orbit sky and chrome wordmark. */
function RisoApplyHeader({ cohort }: { cohort: ShiftCohort }) {
  return (
    <>
      <ChromeBevelFilter />
      <OrbitSky horizon="clamp(260px, 38svh, 340px)" speckle={0} />
      <ShiftTopBar
        back={{ href: cohortPath(cohort), label: `รายละเอียด ${cohort.name}`, solid: true }}
      />
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
    </>
  );
}

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
  // A round can opt into a seasonal register page (SHIFT[3]: Halloween pixel).
  const halloween = cohort.applyTheme === "halloween";

  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: halloween ? HALLOWEEN_PAGE_BG : INK.black, color: INK.paper }}
    >
      {!halloween && <RisoPageTexture />}
      <MetaPixel pagePath="/shift/apply" />

      <header className="relative overflow-hidden">
        {halloween ? (
          <>
            <ShiftTopBar
              back={{ href: cohortPath(cohort), label: `รายละเอียด ${cohort.name}`, solid: true }}
            />
            <HalloweenApplyHeader cohort={cohort} />
          </>
        ) : (
          <RisoApplyHeader cohort={cohort} />
        )}
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-10 sm:px-8">
        {isOpen ? (
          <>
            <div
              className="text-center text-sm leading-relaxed sm:text-base"
              style={{ color: paper("b3") }}
            >
              {/* No seat count here: the register page only asks, it doesn't count down. */}
              <p>
                ใช้เวลา 2 นาที ไม่ต้องล็อกอิน ·{" "}
                <span className="font-semibold" style={{ color: INK.yellow }}>
                  ปิดรับ {formatThaiDate(cohort.applyDeadline)}
                </span>
              </p>
            </div>

            <BringAFriendBanner cohort={cohort} />

            <RoundSwitcher current={cohort} open={openCohorts} />

            <div className="mt-8">
              <ShiftApplyForm
                cohort={cohort}
                source={source}
                otherRounds={openCohorts.filter((c) => c.round !== cohort.round)}
                intro={<CohortQuickFacts cohort={cohort} />}
              />
            </div>
          </>
        ) : (
          <RestoredApplyDone cohort={cohort}>
            <ClosedRoundNotice requested={cohort} open={openCohorts} />
          </RestoredApplyDone>
        )}
      </main>
    </div>
  );
}
