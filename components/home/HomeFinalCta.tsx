import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { getHomeOffer } from "@/lib/content/home-offer";
import { formatThaiDate, formatThaiDateRange, type ShiftCohort } from "@/lib/content/shift-cohort";
import { DitherCanvas } from "./DitherCanvas";
import { HomeHeading, tint } from "./homeTheme";

/** The open round in one line: seats, how to pay, and the deadline. */
function openRoundLine(cohort: ShiftCohort) {
  return `รับ ${cohort.seats} คน สมัคร 2 นาที โอนผ่านพร้อมเพย์แล้วส่งสลิปทาง LINE ปิดรับสมัคร ${formatThaiDate(cohort.applyDeadline)}`;
}

/** The closing ask, over a dithered sun coming up at the bottom edge. */
export function HomeFinalCta() {
  const offer = getHomeOffer();
  const { cohort } = offer;
  const eyebrow = cohort
    ? `${cohort.name} · ${formatThaiDateRange(cohort.startDate, cohort.endDate)}`
    : offer.name;
  return (
    <section className="relative overflow-hidden pb-48 pt-20 text-center sm:pb-64 sm:pt-28">
      <DitherCanvas scene="dawn" />
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <HomeHeading eyebrow={eyebrow} align="center">
          มีไอเดียดิบอยู่ในหัว?
          <br />
          7 วันนี้ทำให้มันเป็นของจริง
        </HomeHeading>
        <p className="mx-auto mt-6 max-w-xl" style={{ color: tint("b3") }}>
          {cohort ? openRoundLine(cohort) : offer.note}
        </p>
        <div className="mt-10">
          <ShiftApplyButton href={offer.href} location="home_final_cta">
            {offer.cta}
          </ShiftApplyButton>
        </div>
      </div>
    </section>
  );
}
