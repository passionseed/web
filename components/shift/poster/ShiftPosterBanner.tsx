import {
  POSTER_COHORT,
  pairPriceBaht,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

import { PHONE_W, PosterPhone, StickerNote } from "./PosterPhone";
import {
  ChromeWordmark,
  CohortBadge,
  INK,
  MISREG_TEXT,
  OrbitSky,
  PAPER_MARGIN,
  PaperSheet,
  MarkerHighlight,
  PassionSeedMark,
  REFUND_PROMISE,
  ShiftTracks,
} from "./riso";

/**
 * Landscape listing banner (CampHub, 1200x630). Same dawn and rising phone
 * as the cover, laid out wide: pitch on the left, project on the right,
 * dates and price on the planet below the horizon.
 */

export const BANNER_W = 1200;
export const BANNER_H = 630;

const INKED_W = BANNER_W - PAPER_MARGIN * 2;
const HORIZON_Y = 462;
const PHONE_RISE = 432;

function BannerTitle() {
  return (
    <div>
      <div className="flex items-center gap-5">
        <PassionSeedMark size={44} />
        <CohortBadge size={19} cohort={POSTER_COHORT} />
      </div>
      <h1
        className="mt-5 font-kodchasan text-[54px] font-bold leading-[1.3] tracking-tight"
        style={MISREG_TEXT}
      >
        7 วัน ปั้น 1<span className="ml-4">โปรเจกต์จริง</span>
      </h1>
      <div className="-ml-[30px] mt-1">
        <ChromeWordmark size={134} name={POSTER_COHORT.name} />
      </div>
      <div className="mt-6">
        <ShiftTracks size={27} />
      </div>
    </div>
  );
}

/** Bring-a-friend price pill, same look as the IG details page. */
function BannerFriendDeal() {
  const friend = pairPriceBaht(POSTER_COHORT);
  if (!friend) return null;
  return (
    <p
      className="whitespace-nowrap rounded-full px-3.5 py-0.5 font-kodchasan text-[20px] font-semibold"
      style={{ color: INK.paper, boxShadow: `inset 0 0 0 1.5px ${INK.pink}`, backgroundColor: `${INK.pink}26` }}
    >
      ชวนเพื่อนมา เหลือคนละ ฿{friend.toLocaleString("en-US")}
    </p>
  );
}

/** One row on the planet: when and how much on the left, deadline right. */
function BannerFacts() {
  const price = `฿${POSTER_COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div className="flex items-end justify-between gap-8">
      <div>
        <p className="font-kodchasan text-[32px] font-bold leading-[1.3]" style={MISREG_TEXT}>
          {formatThaiDateRange(POSTER_COHORT.startDate, POSTER_COHORT.endDate)}
        </p>
        <p className="text-[18px] leading-[1.6]" style={{ color: `${INK.paper}b3` }}>
          {price} · ม.4–ม.6 · Discord {POSTER_COHORT.sessionTime} น.{" "}
          <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <BannerFriendDeal />
        <p
          className="inline-flex items-center gap-3 font-kodchasan text-[22px] font-semibold"
          style={{ color: INK.yellow }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK.orange }} />
          ปิดรับสมัคร {formatThaiDate(POSTER_COHORT.applyDeadline)}
        </p>
      </div>
    </div>
  );
}

export function ShiftPosterBanner() {
  return (
    <PaperSheet id="shift-poster-banner" width={BANNER_W} height={BANNER_H}>
      <OrbitSky
        horizon={HORIZON_Y}
        rising={
          <PosterPhone style={{ left: INKED_W - 90 - PHONE_W, top: HORIZON_Y - PHONE_RISE }} />
        }
      />
      <div className="relative flex h-full flex-col justify-between px-[52px] pb-[28px] pt-[34px]">
        <BannerTitle />
        <BannerFacts />
      </div>
      <StickerNote style={{ left: 548, top: 22 }} size={27} arrowStyle={{ left: "34%", top: "80%" }} />
    </PaperSheet>
  );
}
