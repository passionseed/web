import QRCode from "react-qr-code";

import { INK, MarkerHighlight, REFUND_PROMISE } from "@/components/shift/poster/riso";
import {
  formatThaiDate,
  formatThaiDateRange,
  getShiftCohort,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import type { OfferSlide, ScheduleSlide } from "@/lib/marketing/types";

import { Panel, Tag, Title } from "./SlideParts";
import type { StudioInks } from "./studioTheme";

/**
 * SHIFT slides that read the cohort record, so a date move or price change
 * is one data edit and every exported offer follows it.
 */

interface Props<S> {
  slide: S;
  inks: StudioInks;
}

function cohortOrThrow(round: number): ShiftCohort {
  const cohort = getShiftCohort(round);
  if (!cohort) throw new Error(`Unknown SHIFT round ${round}`);
  return cohort;
}

export const studioApplyUrl = (cohort: ShiftCohort) =>
  `https://passionseed.org/shift/apply?round=${cohort.round}&utm_source=ig-studio`;

export function OfferView({ slide, inks }: Props<OfferSlide>) {
  const cohort = cohortOrThrow(slide.round);
  const pair = pairPriceBaht(cohort);
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <Title inks={inks} text={slide.title} />
      <Panel inks={inks} hot className="mt-9 flex items-end justify-between">
        <p className="font-kodchasan text-[34px] font-bold leading-[1.35]">
          ต่อคน
          <br />
          ตลอด 7 วัน
        </p>
        <p className="font-kodchasan text-[128px] font-bold leading-[0.95]">{priceLabel(cohort)}</p>
      </Panel>
      {pair !== null && (
        <p className="mt-5 text-[34px]">
          <MarkerHighlight>{`มากับเพื่อน จ่ายคนละ ฿${pair}`}</MarkerHighlight>
        </p>
      )}
      <div className="mt-9 space-y-3 text-[30px] leading-[1.5]" style={{ color: inks.dim }}>
        <p className="font-kodchasan text-[42px] font-bold" style={{ color: inks.text }}>
          {formatThaiDateRange(cohort.startDate, cohort.endDate)}
        </p>
        {cohort.postponedFrom && (
          <p style={{ color: inks.kicker }}>เลื่อนจาก {formatThaiDate(cohort.postponedFrom)} เวลาเรียนเท่าเดิม</p>
        )}
        <p>
          ออนไลน์บน Discord ทุกเย็น {cohort.sessionTime} น. · ทำเดี่ยวหรือทีม {teamSizeLabel(cohort)}
        </p>
        <p>{REFUND_PROMISE}: ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ</p>
      </div>
      <div className="mt-auto flex items-end justify-between gap-8 pt-8">
        <div>
          <p className="font-mono text-[20px] uppercase tracking-[0.28em]" style={{ color: inks.accent.yellow }}>
            Deadline
          </p>
          <p
            className="mt-3 font-kodchasan text-[64px] font-bold leading-none"
            style={{ color: inks.text, textShadow: inks.headingShadow }}
          >
            {formatThaiDate(cohort.applyDeadline)}
          </p>
          <p className="mt-4 text-[28px]" style={{ color: inks.dim }}>
            รับ {cohort.seats} คน · คอมเมนต์ SHIFT รับลิงก์สมัคร
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div className="p-4" style={{ backgroundColor: INK.paper, boxShadow: `-4px 3px 0 ${INK.pink}` }}>
            <QRCode value={studioApplyUrl(cohort)} size={160} fgColor={INK.black} bgColor={INK.paper} />
          </div>
          <p className="mt-3 text-[22px]" style={{ color: inks.dim }}>
            หรือสแกนสมัคร
          </p>
        </div>
      </div>
    </>
  );
}

export function ScheduleView({ slide, inks }: Props<ScheduleSlide>) {
  const cohort = cohortOrThrow(slide.round);
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <Title inks={inks} text={slide.title} size={60} />
      <ol className="mt-8 flex-1">
        {cohort.schedule.map((day, i) => (
          <li
            key={day.date}
            className="flex items-baseline gap-6 py-[14px]"
            style={{ borderBottom: i < cohort.schedule.length - 1 ? `1px dashed ${inks.hair}` : undefined }}
          >
            <span className="w-[190px] shrink-0 font-kodchasan text-[28px] font-bold" style={{ color: inks.kicker }}>
              {formatThaiDate(day.date)}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[18px] uppercase tracking-[0.22em]" style={{ color: inks.faint }}>
                Day {day.day} · {day.label}
              </span>
              <span className="block font-kodchasan text-[32px] font-bold leading-[1.35]" style={{ color: inks.text }}>
                {day.title}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
