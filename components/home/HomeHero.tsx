import Link from "next/link";

import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { MISREG_TEXT, paper } from "@/components/shift/ShiftRiso";
import { ChromeBevelFilter, ChromeWordmark, INK, OrbitSky } from "@/components/shift/poster/riso";
import { HOME_NOTES } from "@/lib/content/home";
import { SHIFT_COHORT, formatThaiDate, formatThaiDateRange } from "@/lib/content/shift-cohort";
import { MarginNote } from "./MarginNote";

const HORIZON = "clamp(600px, 78svh, 860px)";

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

function CohortFacts() {
  const { anchorPriceBaht, priceBaht, startDate, endDate, applyDeadline } = SHIFT_COHORT;
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
    </div>
  );
}

/** Home hero: the SHIFT sky and chrome wordmark, pitched to first-time visitors. */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <ChromeBevelFilter />
      <OrbitSky horizon={HORIZON} speckle={0} />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <div
          className="flex flex-col items-center justify-center pb-10 pt-28 text-center"
          style={{ minHeight: HORIZON }}
        >
          <p
            className="font-mono text-[11px] uppercase tracking-[0.3em] sm:text-xs"
            style={{ color: paper("cc") }}
          >
            PassionSeed · {SHIFT_COHORT.seats} seats · Cohort 01
          </p>
          <h1
            className="mt-8 font-kodchasan text-[clamp(38px,6.6vw,76px)] font-bold leading-[1.3] tracking-tight"
            style={MISREG_TEXT}
          >
            เลิกสะสมใบเซอร์
            <br />
            มาสร้างของจริง<span className="whitespace-nowrap">ใน 7 วัน</span>
          </h1>
          <div className="mt-4 sm:mt-6">
            <ChromeWordmark size="clamp(76px, 15vw, 188px)" />
          </div>
        </div>

        <div className="flex flex-col items-center pb-24 pt-12 text-center sm:pt-16">
          <p className="max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: paper("b3") }}>
            สำหรับ ม.4-ม.6 ที่อยากได้พอร์ต TCAS 1 ที่เล่าได้จริง เลือกโจทย์เอง
            ปล่อยให้คนนอกใช้ เก็บจุดพังเป็นข้อมูล แล้วจบด้วย Case Study 1 หน้า
          </p>
          <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row">
            <ShiftApplyButton location="home_hero">
              จองที่นั่ง {SHIFT_COHORT.name}
            </ShiftApplyButton>
            <Link
              href="/shift"
              className="font-mono text-xs font-semibold uppercase tracking-[0.16em] underline decoration-[rgba(255,72,176,0.6)] decoration-2 underline-offset-8 transition hover:decoration-[rgba(255,72,176,1)]"
              style={{ color: INK.yellow }}
            >
              ดูว่า 7 วันทำอะไรบ้าง
            </Link>
          </div>
          <CohortFacts />
          <MarginNote className="mt-8">{HOME_NOTES.hero}</MarginNote>
        </div>
      </div>
    </section>
  );
}
