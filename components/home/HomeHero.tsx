import Link from "next/link";

import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { ShiftSeatsRemaining } from "@/components/shift/ShiftSeatsRemaining";
import space from "@/components/shift/next/shiftNext.module.css";
import { HOME_DEMOS, HOME_DEMO_COPY, HOME_NOTES } from "@/lib/content/home";
import { getHomeOffer } from "@/lib/content/home-offer";
import {
  cohortPath,
  cohortToday,
  formatThaiDate,
  formatThaiDateRange,
  getRunningCohort,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { DemoReel } from "./DemoReel";
import { MarginNote } from "./MarginNote";
import { T, tint } from "./homeTheme";

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

/** While a round is building, say so: the next round is the one on sale. */
function LiveRoundTag({ cohort }: { cohort: ShiftCohort }) {
  const day = cohortToday(cohort);
  return (
    <Link
      href={cohortPath(cohort)}
      className={`${space.missionTag} transition-colors hover:text-white`}
    >
      <span className={space.liveDot} aria-hidden="true" />
      <span>{cohort.name}</span>
      <span className="font-bai-jamjuree text-[13px] normal-case tracking-normal">
        กำลังลุยอยู่
      </span>
      {day && (
        <span>
          Day {day.day}/{cohort.schedule.length}
        </span>
      )}
    </Link>
  );
}

function CohortFacts({ cohort }: { cohort: ShiftCohort }) {
  const { anchorPriceBaht, priceBaht, startDate, endDate, applyDeadline } =
    cohort;
  return (
    <div className="mt-5 flex flex-col gap-1.5 text-sm">
      <p className="text-base font-semibold">
        {formatThaiDateRange(startDate, endDate)} ·{" "}
        {anchorPriceBaht && (
          <s className="mr-1.5 font-normal" style={{ color: tint("73") }}>
            {baht(anchorPriceBaht)}
          </s>
        )}
        {baht(priceBaht)}
      </p>
      <p className="font-semibold" style={{ color: T.accent3 }}>
        ปิดรับสมัคร {formatThaiDate(applyDeadline)}
      </p>
      <div style={{ color: tint("b3") }}>
        <ShiftSeatsRemaining round={cohort.round} capacity={cohort.seats} />
      </div>
    </div>
  );
}

/** No round is open: say how the next one opens instead of quoting old dates. */
function NextRoundNote({ children }: { children: string }) {
  return (
    <p
      className="mt-5 max-w-md text-sm font-medium leading-relaxed"
      style={{ color: T.accent3 }}
    >
      {children}
    </p>
  );
}

/** The product itself: student apps playing, with where the clips come from. */
function HeroReel() {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold" style={{ color: T.accent1 }}>
        {HOME_DEMO_COPY.heading}
      </p>
      <DemoReel
        demos={HOME_DEMOS}
        round={HOME_DEMO_COPY.round}
        tryIt={HOME_DEMO_COPY.tryIt}
      />
      <p className="mt-2 text-xs leading-relaxed" style={{ color: tint("99") }}>
        {HOME_DEMO_COPY.lede}
      </p>
    </div>
  );
}

/**
 * Home hero: the pitch beside the thing being pitched. The right column plays
 * real student apps, so a first-time visitor sees what a week produces before
 * reading a word of argument. With no cleared clips the copy stands alone.
 */
export function HomeHero() {
  const offer = getHomeOffer();
  const running = getRunningCohort();
  const live = running && running.name !== offer.name ? running : null;
  const hasReel = HOME_DEMOS.length > 0;

  return (
    <header className="relative">
      {/* The container sets its own padding, so the hero spacing lives one level in. */}
      <div className={space.container}>
        <div
          className={`grid items-center gap-10 pb-12 pt-24 sm:pt-28 lg:min-h-[min(100svh,54rem)] lg:gap-12 lg:pb-16 ${
            hasReel ? "lg:grid-cols-2" : ""
          }`}
        >
          <div className="max-w-[40rem]">
            {live ? (
              <LiveRoundTag cohort={live} />
            ) : (
              <p className={space.missionTag}>
                <span className={space.liveDot} aria-hidden="true" />
                PassionSeed / SHIFT
              </p>
            )}
            <h1 className="home-hero-title font-kodchasan">
              เลิกสะสมใบเซอร์
              <br />
              มาสร้างของจริง<span className="whitespace-nowrap">ใน 7 วัน</span>
            </h1>
            <p className={space.lede}>
              สำหรับ ม.4-ม.6 ที่อยากมีพอร์ต TCAS รอบ 1 ที่เล่าได้จริง
              เลือกโจทย์เอง สร้างเอง ปล่อยให้คนนอกลองใช้ แล้วสรุปเป็นพอร์ต 1
              หน้า
            </p>
            {offer.cohort ? (
              <CohortFacts cohort={offer.cohort} />
            ) : (
              offer.note && <NextRoundNote>{offer.note}</NextRoundNote>
            )}
            <div className={`${space.ctaRow} !mt-6`}>
              <ShiftApplyButton href={offer.href} location="home_hero">
                {offer.cta}
              </ShiftApplyButton>
              <Link href="/shift" className={space.ghost}>
                ดูว่า 7 วันทำอะไรบ้าง
              </Link>
            </div>
            <div className="mt-6 hidden sm:block">
              <MarginNote>{HOME_NOTES.hero}</MarginNote>
            </div>
          </div>
          {hasReel && <HeroReel />}
        </div>
      </div>
    </header>
  );
}
