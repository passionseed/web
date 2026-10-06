import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { RisoHeading, RisoSunrise, paper } from "@/components/shift/ShiftRiso";
import { POSTER_COHORT, formatThaiDate, formatThaiDateRange } from "@/lib/content/shift-cohort";

export function HomeFinalCta() {
  const dates = formatThaiDateRange(POSTER_COHORT.startDate, POSTER_COHORT.endDate);
  return (
    <section className="relative overflow-hidden pb-64 pt-20 text-center sm:pb-72 sm:pt-28">
      <RisoSunrise />
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <RisoHeading eyebrow={`${POSTER_COHORT.name} · ${dates}`} align="center">
          มีไอเดียดิบอยู่ในหัว?
          <br />
          7 วันนี้ทำให้มันเป็นของจริง
        </RisoHeading>
        <p className="mx-auto mt-6 max-w-xl" style={{ color: paper("b3") }}>
          รับ {POSTER_COHORT.seats} คน สมัคร 2 นาที โอนผ่านพร้อมเพย์แล้วส่งสลิปทาง LINE ปิดรับสมัคร{" "}
          {formatThaiDate(POSTER_COHORT.applyDeadline)}
        </p>
        <div className="mt-10">
          <ShiftApplyButton location="home_final_cta">จองที่นั่ง {POSTER_COHORT.name}</ShiftApplyButton>
        </div>
      </div>
    </section>
  );
}
