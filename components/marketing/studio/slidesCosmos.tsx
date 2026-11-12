import type { CSSProperties } from "react";
import QRCode from "react-qr-code";

import { COSMOS } from "@/components/shift/next/cosmos";
import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { APPLY_KEYWORD } from "@/components/shift/poster/grid/ApplyCta";
import {
  cohortDayCount,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { SHIFT_VOICES } from "@/lib/content/shift-voices";
import type { CtaSlide, OfferSlide, QuoteSlide, ScheduleSlide } from "@/lib/marketing/types";

import { Eyebrow, Glass, GlowMark } from "./cosmosParts";
import { ACTION_LINE, Body, Rich, Tag, Title } from "./SlideParts";
import { LATIN, type StudioInks } from "./studioTheme";

/**
 * Cosmos builds of the slides whose riso look is a solid ink block (offer,
 * CTA, quote, schedule, chat bubbles). Same data, same copy slots: glass
 * panes over space, the price and the beacon in sol, the rest in aurora.
 */

const BLUR = "blur(18px) saturate(160%)";

/** Chat bubbles: mine is aurora-tinted glass, theirs is clear glass. */
export function cosmosBubble(mine: boolean, inks: StudioInks): CSSProperties {
  return mine
    ? {
        color: inks.text,
        background: `linear-gradient(180deg, ${COSMOS.aurora}3d, ${COSMOS.aurora}1a)`,
        boxShadow: `inset 0 0 0 1.5px ${COSMOS.aurora}80, inset 0 1px 0 rgba(255,255,255,0.22), 0 0 44px -16px ${COSMOS.aurora}99`,
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
      }
    : {
        color: inks.text,
        background: "linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.03))",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.14)",
        backdropFilter: BLUR,
        WebkitBackdropFilter: BLUR,
      };
}

/** A riso line icon giving off a little aurora light. */
function GlowIcon({ inks, name, size }: { inks: StudioInks; name: NonNullable<CtaSlide["icon"]>; size: number }) {
  return (
    <span className="inline-block shrink-0" style={{ filter: `drop-shadow(0 0 22px ${inks.kicker}59)` }}>
      <RisoIcon name={name} ink={inks.kicker} size={size} />
    </span>
  );
}

export function CosmosQuote({ slide, inks }: { slide: QuoteSlide; inks: StudioInks }) {
  const voice = SHIFT_VOICES[slide.voice];
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <div className="my-auto py-6">
        <p
          aria-hidden="true"
          className="h-[120px] font-medium"
          style={{
            fontFamily: LATIN,
            fontSize: 240,
            lineHeight: 0.78,
            color: inks.kicker,
            textShadow: `0 0 60px ${inks.kicker}66`,
          }}
        >
          “
        </p>
        <p className="text-[50px] font-semibold leading-[1.5]" style={{ color: inks.text, textShadow: inks.headingShadow }}>
          {voice.quote}
        </p>
        <div className="mt-9 flex items-center gap-5">
          <span className="h-[2px] w-14 shrink-0 rounded" style={{ background: `linear-gradient(90deg, ${inks.kicker}, transparent)` }} />
          <p className="text-[36px] font-bold" style={{ color: inks.text }}>
            {voice.name}{" "}
            <span className="text-[30px] font-medium" style={{ color: inks.dim }}>
              · {voice.meta}
            </span>
          </p>
        </div>
        {slide.context && (
          <div className="mt-7 max-w-[880px]">
            <Body inks={inks} text={slide.context} />
          </div>
        )}
      </div>
    </>
  );
}

/** The comment keyword as a bright Latin speech bubble. */
function KeywordBubble() {
  const face = "linear-gradient(180deg, #ffffff 0%, #e6ecff 60%, #cbd7ff 100%)";
  return (
    <span className="relative inline-block">
      <span
        className="inline-block rounded-[18px] px-7 pb-[14px] pt-[12px] text-[72px] font-semibold leading-none tracking-[-0.03em]"
        style={{
          fontFamily: LATIN,
          color: COSMOS.void,
          background: face,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.5), 0 0 44px -6px ${COSMOS.aurora}99`,
        }}
      >
        {APPLY_KEYWORD}
      </span>
      <span
        className="absolute left-8 top-[calc(100%-1px)] h-[18px] w-[18px]"
        style={{ background: "#cbd7ff", clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        aria-hidden="true"
      />
    </span>
  );
}

export function CosmosCta({ slide, inks }: { slide: CtaSlide; inks: StudioInks }) {
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <div className="flex flex-1 items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Title inks={inks} text={slide.title} size={88} />
        </div>
        {slide.icon && <GlowIcon inks={inks} name={slide.icon} size={200} />}
      </div>
      <Glass tone={inks.hot} className="px-11 py-10" style={{ color: inks.text }}>
        {slide.action === "comment" ? (
          <div className="flex items-center gap-7">
            <p className="text-[64px] font-bold leading-none">{ACTION_LINE.comment}</p>
            <KeywordBubble />
          </div>
        ) : slide.action === "link" ? (
          <p className="text-[42px] font-medium leading-tight tracking-[-0.01em]" style={{ fontFamily: LATIN, color: inks.kicker }}>
            {slide.link}
          </p>
        ) : (
          <p className="text-[64px] font-bold leading-none">{ACTION_LINE[slide.action]}</p>
        )}
        {slide.body && (
          <p className="mt-6 text-[36px] font-semibold leading-[1.4]">
            <Rich inks={inks} text={slide.body} accent={inks.hot} />
          </p>
        )}
      </Glass>
    </>
  );
}

/** Price as Latin numerals with a Thai baht sign (Libre Franklin has no ฿). */
function Price({ cohort }: { cohort: ShiftCohort }) {
  const style: CSSProperties = { color: COSMOS.sol, textShadow: `0 0 60px ${COSMOS.sol}4d` };
  if (cohort.priceBaht === 0) {
    return (
      <p className="text-[120px] font-bold leading-none" style={style}>
        {priceLabel(cohort)}
      </p>
    );
  }
  return (
    <p className="flex items-start leading-none" style={style}>
      <span className="mt-[14px] text-[64px] font-semibold">฿</span>
      <span className="text-[150px] font-medium tracking-[-0.045em]" style={{ fontFamily: LATIN, lineHeight: 0.86 }}>
        {cohort.priceBaht.toLocaleString("en-US")}
      </span>
    </p>
  );
}

export function CosmosOffer({
  slide,
  inks,
  cohort,
  applyUrl,
}: {
  slide: OfferSlide;
  inks: StudioInks;
  cohort: ShiftCohort;
  applyUrl: string;
}) {
  const pair = pairPriceBaht(cohort);
  const days = cohortDayCount(cohort);
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <Title inks={inks} text={slide.title} />
      <Glass tone={inks.hot} className="mt-8 px-10 pb-8 pt-7" style={{ color: inks.text }}>
        <Eyebrow color={inks.hot} size={18} rule={false}>
          {cohort.name} · {days} days
        </Eyebrow>
        <div className="mt-4 flex items-end justify-between gap-6">
          <Price cohort={cohort} />
          <p className="pb-1 text-right text-[34px] font-semibold leading-[1.35]">
            ต่อคน
            <br />
            ตลอด {days} วัน
          </p>
        </div>
        {pair !== null && (
          <p className="mt-6 text-[32px]">
            <GlowMark>{`สมัครคู่ 2 คน จ่ายคนละ ฿${pair}`}</GlowMark>
          </p>
        )}
      </Glass>
      <div className="mt-8 space-y-2 text-[30px] leading-[1.5]" style={{ color: inks.dim }}>
        <p className="text-[42px] font-semibold" style={{ color: inks.text }}>
          {formatThaiDateRange(cohort.startDate, cohort.endDate)}
        </p>
        {cohort.postponedFrom && (
          <p style={{ color: inks.kicker }}>เลื่อนจาก {formatThaiDate(cohort.postponedFrom)} เวลาเรียนเท่าเดิม</p>
        )}
        <p>
          ออนไลน์บน Discord ทุกเย็น {cohort.sessionTime} น. · ทำเดี่ยวหรือทีม {teamSizeLabel(cohort)}
        </p>
        <p>ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็ม</p>
      </div>
      <div className="mt-auto flex items-end justify-between gap-8 pt-8">
        <div>
          <Eyebrow color={inks.kicker} size={19}>
            Apply by
          </Eyebrow>
          <p className="mt-3 text-[64px] font-semibold leading-none" style={{ color: inks.text, textShadow: inks.headingShadow }}>
            {formatThaiDate(cohort.applyDeadline)}
          </p>
          <p className="mt-4 text-[28px]" style={{ color: inks.dim }}>
            รับ {cohort.seats} คน · คอมเมนต์ {APPLY_KEYWORD} รับลิงก์สมัคร
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div
            className="rounded-[22px] p-4"
            style={{ backgroundColor: COSMOS.star, boxShadow: `0 0 0 1px rgba(255,255,255,0.4), 0 0 50px -12px ${COSMOS.aurora}aa` }}
          >
            <QRCode value={applyUrl} size={156} fgColor={COSMOS.void} bgColor={COSMOS.star} />
          </div>
          <p className="mt-3 text-[22px]" style={{ color: inks.dim }}>
            หรือสแกนสมัคร
          </p>
        </div>
      </div>
    </>
  );
}

export function CosmosSchedule({ slide, inks, cohort }: { slide: ScheduleSlide; inks: StudioInks; cohort: ShiftCohort }) {
  const last = cohort.schedule.length - 1;
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <Title inks={inks} text={slide.title} size={60} />
      <div className="flex flex-1 flex-col justify-center py-6">
        <Glass className="px-9 py-3">
          <ol>
            {cohort.schedule.map((day, i) => {
              const demo = i === last;
              const tone = demo ? inks.hot : inks.kicker;
              return (
                <li
                  key={day.date}
                  className="flex items-center gap-6 py-[13px]"
                  style={{ borderBottom: i < last ? `1px solid ${inks.hair}` : undefined }}
                >
                  <span className="flex w-[176px] shrink-0 items-center gap-3 text-[28px] font-semibold" style={{ color: tone }}>
                    <span
                      className="h-[10px] w-[10px] shrink-0 rounded-full"
                      style={{ background: tone, boxShadow: `0 0 ${demo ? 14 : 8}px ${tone}` }}
                    />
                    {formatThaiDate(day.date)}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block text-[17px] font-medium uppercase tracking-[0.2em]"
                      style={{ fontFamily: LATIN, color: demo ? tone : inks.faint }}
                    >
                      Day {day.day} · {day.label}
                    </span>
                    <span className="block text-[31px] font-semibold leading-[1.35]" style={{ color: inks.text }}>
                      {day.title}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Glass>
      </div>
    </>
  );
}
