import Link from "next/link";

import { ShiftSeatsRemaining } from "@/components/shift/ShiftSeatsRemaining";
import { MISREG_TEXT, paper } from "@/components/shift/ShiftRiso";
import { ChromeBevelFilter, ChromeWordmark, INK, OrbitSky } from "@/components/shift/poster/riso";
import { HOME_NOTES, HOME_SHIFT_NEXT } from "@/lib/content/home";
import { leadCta, type HomeLead } from "@/lib/content/home-lead";
import {
  cohortPath,
  cohortToday,
  formatThaiDate,
  formatThaiDateRange,
  getRunningCohort,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { MIN_BUILDERS, NEXT_ROUND_NAME } from "@/lib/content/shift-next";
import { HomeHackathonHero } from "./HomeHackathonHero";
import { LeadButton } from "./LeadButton";
import { MarginNote } from "./MarginNote";

const HORIZON = "clamp(600px, 78svh, 860px)";

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

/** While a round is building, say so: the next round is the one on sale. */
function LiveRoundStrip({ cohort }: { cohort: ShiftCohort }) {
  const day = cohortToday(cohort);
  return (
    <Link
      href={cohortPath(cohort)}
      className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-full bg-[rgba(10,10,20,0.45)] px-4 py-1.5 text-xs font-semibold backdrop-blur-sm transition hover:bg-[rgba(10,10,20,0.6)] sm:text-sm"
      style={{ color: INK.paper, boxShadow: `inset 0 0 0 1.5px ${INK.blue}` }}
    >
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping"
          style={{ backgroundColor: INK.blue }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: INK.blue }} />
      </span>
      <span className="font-mono tracking-[0.12em]">{cohort.name}</span>
      กำลังลุยอยู่
      {day && (
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] sm:text-xs" style={{ color: paper("b3") }}>
          Day {day.day}/{cohort.schedule.length}
          <span className="hidden sm:inline"> · {day.label}</span>
        </span>
      )}
    </Link>
  );
}

function CohortFacts({ cohort }: { cohort: ShiftCohort }) {
  const { anchorPriceBaht, priceBaht, startDate, endDate, applyDeadline } = cohort;
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <p className="font-kodchasan text-lg font-semibold sm:text-xl" style={MISREG_TEXT}>
        {formatThaiDateRange(startDate, endDate)} ·{" "}
        {anchorPriceBaht && (
          <s className="mr-1.5 text-base font-normal" style={{ color: paper("73") }}>
            {baht(anchorPriceBaht)}
          </s>
        )}
        {baht(priceBaht)}
      </p>
      <p className="text-sm font-semibold sm:text-base" style={{ color: INK.yellow }}>
        ปิดรับสมัคร {formatThaiDate(applyDeadline)}
      </p>
      <div style={{ color: paper("b3") }}>
        <ShiftSeatsRemaining round={cohort.round} capacity={cohort.seats} />
      </div>
    </div>
  );
}

/** No round on sale: say so, and offer the free sign-up for the next one. */
function NextRoundFacts() {
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <p className="font-kodchasan text-lg font-semibold sm:text-xl" style={MISREG_TEXT}>
        {HOME_SHIFT_NEXT.status}
      </p>
      <p className="text-sm sm:text-base" style={{ color: paper("b3") }}>
        {HOME_SHIFT_NEXT.howItOpens.replace("{min}", String(MIN_BUILDERS))} · {HOME_SHIFT_NEXT.free}
      </p>
    </div>
  );
}

/**
 * Home hero, pointed at the lead (lib/content/home-lead.ts). The hackathon
 * gets its own scene; SHIFT keeps the sky and chrome wordmark.
 */
export function HomeHero({ lead }: { lead: HomeLead }) {
  const cta = leadCta(lead, "home");
  if (lead.kind === "hackathon") return <HomeHackathonHero cta={cta} />;

  const cohort = lead.kind === "shift" ? lead.cohort : null;
  const running = getRunningCohort();

  return (
    <section className="relative overflow-hidden">
      <ChromeBevelFilter />
      <OrbitSky horizon={HORIZON} speckle={0} />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <div
          className="flex flex-col items-center justify-center pb-10 pt-28 text-center"
          style={{ minHeight: HORIZON }}
        >
          {running && running.round !== cohort?.round && (
            <LiveRoundStrip cohort={running} />
          )}
          <h1
            className="mt-6 font-kodchasan text-[clamp(38px,6.6vw,76px)] font-bold leading-[1.3] tracking-tight"
            style={MISREG_TEXT}
          >
            เลิกสะสมใบเซอร์
            <br />
            มาสร้างของจริง<span className="whitespace-nowrap">ใน 7 วัน</span>
          </h1>
          <div className="mt-4 sm:mt-6">
            <ChromeWordmark size="clamp(76px, 15vw, 188px)" name={cohort?.name ?? NEXT_ROUND_NAME} />
          </div>
        </div>

        <div className="flex flex-col items-center pb-24 pt-12 text-center sm:pt-16">
          <p className="max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: paper("b3") }}>
            สำหรับ ม.4-ม.6 ที่อยากได้พอร์ต TCAS 1 ที่เล่าได้จริง เลือกโจทย์เอง
            ปล่อยให้คนนอกใช้ เก็บจุดพังเป็นข้อมูล แล้วจบด้วยพอร์ต 1 หน้า
          </p>
          <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row">
            <LeadButton cta={cta} location="home_hero" />
            <Link href="/shift" className="site-ghost">
              ดูว่า 7 วันทำอะไรบ้าง
            </Link>
          </div>
          {cohort ? <CohortFacts cohort={cohort} /> : <NextRoundFacts />}
          <MarginNote className="mt-8">{HOME_NOTES.hero}</MarginNote>
        </div>
      </div>
    </section>
  );
}
