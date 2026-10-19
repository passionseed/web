import { PIXEL_FONT } from "@/components/shift/poster/pixel/PixelRects";
import { PX } from "@/components/shift/poster/pixel/pixelKit";
import { SCHOOL_POSTERS } from "@/lib/content/shift-school";

import { Card, Icon, InnerPoster, SectionLabel, Tag } from "./SchoolPosterParts";

const COPY = SCHOOL_POSTERS.arc;

/** The week as buoys on a rope: one row per stop, icon first. */
function Route() {
  return (
    <ol className="relative mt-5 flex flex-col gap-[12px]">
      <span
        aria-hidden="true"
        className="absolute bottom-[50px] left-[49px] top-[50px] w-[6px]"
        style={{ backgroundImage: `repeating-linear-gradient(180deg, ${PX.water} 0 12px, transparent 12px 18px)` }}
      />
      {COPY.steps.map((step) => (
        <li key={step.day} className="relative flex items-center gap-[22px]">
          <span
            className="flex h-[104px] w-[104px] shrink-0 items-center justify-center"
            style={{ backgroundColor: PX.waterDeep, boxShadow: `0 0 0 4px ${PX.ink}` }}
          >
            <Icon name={step.icon} scale={7} />
          </span>
          <Card className="flex min-h-[104px] min-w-0 flex-1 items-center justify-between gap-6 px-[24px] py-[12px]">
            <div className="min-w-0">
              <div className="flex items-center gap-4">
                <Tag>{step.day}</Tag>
                <p className="font-kodchasan text-[33px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
                  {step.title}
                </p>
              </div>
              <p className="mt-[8px] font-kodchasan text-[24px] font-semibold leading-[1.35]" style={{ color: `${PX.cream}e6` }}>
                {step.body}
              </p>
            </div>
            <p className="max-w-[260px] shrink-0 text-right text-[19px] leading-[1.4]" style={{ color: PX.waterLight }}>
              {step.with}
            </p>
          </Card>
        </li>
      ))}
    </ol>
  );
}

function Ship() {
  return (
    <section>
      <SectionLabel en="WHAT YOU SHIP">{COPY.shipLabel}</SectionLabel>
      <ul className="mt-5 grid grid-cols-3 gap-[20px]">
        {COPY.ship.map((item) => (
          <li key={item.title}>
            <Card strong className="flex h-full flex-col px-[22px] pb-[20px] pt-[18px]">
              <span className="flex h-[76px] items-end">
                <Icon name={item.icon} scale={5} />
              </span>
              <span className="mt-[14px] block text-[20px] leading-none tracking-[0.04em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
                {item.title}
              </span>
              <span className="mt-[8px] block font-kodchasan text-[21px] font-semibold leading-[1.35]" style={{ color: PX.cream }}>
                {item.body}
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Poster 2: the 7-day arc and the three things each student keeps. */
export function SchoolPosterArc() {
  return (
    <InnerPoster id="school-poster-2" page={2} kicker={COPY.kicker} heading={COPY.heading}>
      <section>
        <SectionLabel en="ONLINE · DISCORD">ทีละขั้น จากโจทย์ถึง Demo</SectionLabel>
        <Route />
      </section>
      <Ship />
    </InnerPoster>
  );
}
