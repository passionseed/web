import QRCode from "react-qr-code";

import { PIXEL_FONT } from "@/components/shift/poster/pixel/PixelRects";
import { CELL, PX } from "@/components/shift/poster/pixel/pixelKit";
import { MarkerHighlight, PassionSeedMark } from "@/components/shift/poster/riso";
import { SCHOOL_OFFER, SCHOOL_POSTERS, SCHOOL_POSTER_URL, baht } from "@/lib/content/shift-school";

import { Sheet } from "./SchoolPosterParts";
import { COVER, SchoolCoverScene } from "./SchoolPixelScene";

const COPY = SCHOOL_POSTERS.cover;

function Title() {
  return (
    <div className="absolute inset-x-0 top-[64px] flex flex-col items-center text-center">
      <p className="text-[30px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        {COPY.kicker}
      </p>
      <span className="mt-2 h-[4px] w-[420px]" style={{ backgroundColor: PX.ink }} />
      <h1
        className="mt-3 text-[190px] leading-[0.9]"
        style={{ ...PIXEL_FONT, color: PX.ink, textShadow: `${CELL}px ${CELL}px 0 ${PX.cloudShade}` }}
      >
        SHIFT
      </h1>
      <p className="mt-3 font-kodchasan text-[52px] font-bold leading-[1.3]" style={{ color: PX.ink }}>
        {COPY.lines[0]}
        <br />
        <span style={{ color: PX.accentDark }}>{COPY.lines[1]}</span>
      </p>
      <p className="mt-3 text-[26px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.near }}>
        {COPY.tagline}
      </p>
    </div>
  );
}

function Band() {
  return (
    <div className="absolute inset-x-0 bottom-0 px-[56px] pb-[30px]" style={{ top: (COVER.band + 5) * CELL }}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <p className="flex items-baseline gap-3">
              <span className="font-kodchasan text-[24px] font-semibold" style={{ color: PX.accentLight }}>
                {COPY.priceLabel}
              </span>
              <span className="font-kodchasan text-[56px] font-bold leading-none" style={{ color: PX.cream }}>
                {baht(SCHOOL_OFFER.priceBaht)}
              </span>
              <span className="text-[22px]" style={{ color: `${PX.cream}99` }}>
                จาก <s>{baht(SCHOOL_OFFER.regularPriceBaht)}</s>
              </span>
            </p>
            <p className="mt-2 text-[21px] leading-[1.5]" style={{ color: `${PX.cream}d9` }}>
              {COPY.facts}
            </p>
            <p className="mt-2 text-[21px] leading-[1.5]" style={{ color: `${PX.cream}d9` }}>
              {COPY.deliverables}
            </p>
            <p className="mt-3 text-[22px]">
              <MarkerHighlight>{COPY.refund}</MarkerHighlight>
            </p>
          </div>
          <div className="shrink-0 text-center">
            <div className="p-2.5" style={{ backgroundColor: PX.cream }}>
              <QRCode value={SCHOOL_POSTER_URL} size={120} fgColor={PX.ink} bgColor={PX.cream} />
            </div>
            <p className="mt-1.5 text-[14px]" style={{ color: `${PX.cream}8c` }}>
              {COPY.qr}
            </p>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <PassionSeedMark size={30} />
          <p className="text-[18px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
            {SCHOOL_POSTERS.footerUrl} · 1/{SCHOOL_POSTERS.total}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Poster 1: the whole class out on the flooded city, with price and QR. */
export function SchoolPosterCover() {
  return (
    <Sheet id="school-poster-1">
      <SchoolCoverScene />
      <Title />
      <Band />
    </Sheet>
  );
}
