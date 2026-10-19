import { PIXEL_FONT } from "@/components/shift/poster/pixel/PixelRects";
import { CELL, PX } from "@/components/shift/poster/pixel/pixelKit";
import { MarkerHighlight } from "@/components/shift/poster/riso";
import { SCHOOL_OFFER, SCHOOL_POSTERS } from "@/lib/content/shift-school";

import { Card, Icon, InnerPoster, SectionLabel } from "./SchoolPosterParts";

const COPY = SCHOOL_POSTERS.learn;

function Modes() {
  return (
    <section>
      <SectionLabel en="AI + MENTORS + COMMUNITY">เรียนยังไง</SectionLabel>
      <ul className="mt-5 grid grid-cols-2 gap-[16px]">
        {COPY.modes.map((mode) => (
          <li key={mode.tag}>
            <Card strong className="flex h-full flex-col px-[24px] pb-[18px] pt-[16px]">
              <span className="flex h-[84px] items-end">
                <Icon name={mode.icon} scale={7} />
              </span>
              <span className="mt-[16px] min-w-0">
                <span className="block text-[17px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
                  {mode.tag}
                </span>
                <span className="mt-[10px] block font-kodchasan text-[29px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
                  {mode.title}
                </span>
                <span className="mt-[8px] block text-[20px] leading-[1.4]" style={{ color: `${PX.cream}cc` }}>
                  {mode.body}
                </span>
              </span>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="mt-[16px] flex items-center gap-[18px] px-[22px] py-[14px]">
        <Icon name="signpost" scale={5} className="shrink-0" />
        <p className="font-kodchasan text-[24px] font-semibold leading-[1.4]" style={{ color: PX.cream }}>
          {COPY.principle}
        </p>
      </Card>
    </section>
  );
}

/** The promise: a giant pixel 5, the users icon, and the free extension. */
function PromiseBlock() {
  return (
    <section>
      <SectionLabel en={COPY.promiseLabel}>{COPY.promiseTitle}</SectionLabel>
      <div className="mt-5 flex items-center gap-[36px]">
        <div className="flex shrink-0 flex-col items-center">
          <p
            className="text-[260px] leading-[0.8]"
            style={{ ...PIXEL_FONT, color: PX.accentLight, textShadow: `${CELL}px ${CELL}px 0 ${PX.accentDark}` }}
          >
            {SCHOOL_OFFER.minOutsideUsers}
          </p>
        </div>
        <div className="min-w-0">
          <Icon name="users" scale={9} />
          <p className="mt-4 font-kodchasan text-[30px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
            {COPY.promiseCaption}
          </p>
          <p className="mt-4 text-[24px]">
            <MarkerHighlight>{COPY.guarantee}</MarkerHighlight>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Poster 3: how students learn, and the five-outside-users promise. */
export function SchoolPosterLearn() {
  return (
    <InnerPoster id="school-poster-3" page={3} kicker={COPY.kicker} heading={COPY.heading}>
      <Modes />
      <PromiseBlock />
    </InnerPoster>
  );
}
