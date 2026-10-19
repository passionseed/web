import QRCode from "react-qr-code";

import { PIXEL_FONT } from "@/components/shift/poster/pixel/PixelRects";
import { PX } from "@/components/shift/poster/pixel/pixelKit";
import { MarkerHighlight } from "@/components/shift/poster/riso";
import { SCHOOL_POSTERS, SCHOOL_POSTER_URL } from "@/lib/content/shift-school";

import { Card, Icon, InnerPoster, Lines, SectionLabel } from "./SchoolPosterParts";

const COPY = SCHOOL_POSTERS.schools;

function Gets() {
  return (
    <section>
      <SectionLabel en="THE SCHOOL GETS">{COPY.getsLabel}</SectionLabel>
      <ul className="mt-6 grid grid-cols-2 gap-[18px]">
        {COPY.gets.map((item) => (
          <li key={item.body}>
            <Card strong className="flex h-full items-center gap-[20px] px-[22px] py-[24px]">
              <span className="flex h-[90px] w-[84px] shrink-0 items-center justify-center">
                <Icon name={item.icon} scale={6} />
              </span>
              <p className="font-kodchasan text-[24px] font-semibold leading-[1.35]" style={{ color: PX.cream }}>
                <Lines text={item.body} />
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Does() {
  return (
    <section>
      <SectionLabel en="THE SCHOOL DOES">{COPY.doesLabel}</SectionLabel>
      <div className="mt-6 flex items-center gap-[30px]">
        <Icon name="school" scale={10} className="shrink-0" />
        <div className="min-w-0">
          <ol className="flex flex-col gap-[8px]">
            {COPY.does.map((item, i) => (
              <li key={item} className="flex items-center gap-[12px] font-kodchasan text-[26px] font-semibold" style={{ color: PX.cream }}>
                <span className="text-[20px]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <p className="mt-[14px] text-[23px]">
            <MarkerHighlight>{COPY.doesNot}</MarkerHighlight>
          </p>
          <p className="mt-[12px] text-[19px]" style={{ color: `${PX.cream}b3` }}>
            {COPY.never}
          </p>
        </div>
      </div>
    </section>
  );
}

function WhoAndContact() {
  return (
    <section className="flex items-stretch gap-[20px]">
      <Card className="min-w-0 flex-1 px-[22px] py-[18px]">
        <p className="text-[16px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          WHO WE ARE
        </p>
        <p className="mt-[10px] font-kodchasan text-[22px] font-bold leading-[1.35]" style={{ color: PX.cream }}>
          <Lines text={COPY.who} />
        </p>
        <p className="mt-[8px] text-[18px] leading-[1.5]" style={{ color: `${PX.cream}cc` }}>
          <Lines text={COPY.why} />
        </p>
        <p className="mt-[8px] whitespace-nowrap font-kodchasan text-[18px] font-semibold" style={{ color: PX.accentLight }}>
          {COPY.proof}
        </p>
      </Card>
      <Card strong className="flex shrink-0 items-center gap-[16px] px-[18px] py-[16px]">
        <div className="p-2" style={{ backgroundColor: PX.cream }}>
          <QRCode value={SCHOOL_POSTER_URL} size={112} fgColor={PX.ink} bgColor={PX.cream} />
        </div>
        <div className="w-[200px]">
          <p className="font-kodchasan text-[22px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
            <Lines text={COPY.cta} />
          </p>
          {COPY.contact.map((line) => (
            <p key={line} className="mt-[6px] text-[16px] leading-[1.3]" style={{ color: PX.waterLight }}>
              {line}
            </p>
          ))}
        </div>
      </Card>
    </section>
  );
}

/** Poster 5: what the school gets and does, who we are, and how to reach us. */
export function SchoolPosterSchools() {
  return (
    <InnerPoster id="school-poster-5" page={5} kicker={COPY.kicker} heading={COPY.heading}>
      <Gets />
      <Does />
      <WhoAndContact />
    </InnerPoster>
  );
}
