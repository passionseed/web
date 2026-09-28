import { SHIFT_COHORT, formatThaiDate } from "@/lib/content/shift-cohort";

import { PIXEL_FONT } from "../pixel/PixelRects";
import { PX } from "../pixel/pixelKit";
import { notch } from "./GridSlideFrame";

/**
 * How to apply, the Instagram way. Commenting the keyword is the lowest-effort
 * action in the feed, and it opens a DM thread we can follow up in; the bio
 * link is the fallback for people who would rather just go.
 *
 * Keyword matching lives in lib/meta/comment-intent.ts (isShiftRequest).
 */

export const APPLY_KEYWORD = "SHIFT";

/** Warm price-card gradient, lightest where the small text sits. */
export const HOT_GRADIENT = `linear-gradient(115deg, ${PX.accentLight} 0%, ${PX.accent} 55%, #d3622a 100%)`;

/** A pixel speech bubble holding the keyword, so "comment this" reads at a glance. */
function KeywordBubble({ size }: { size: number }) {
  return (
    <span className="relative inline-block">
      <span
        className="inline-block px-6 pb-2 pt-3 leading-none tracking-[0.06em]"
        style={{ ...PIXEL_FONT, fontSize: size, backgroundColor: PX.cream, color: PX.ink, clipPath: notch(8) }}
      >
        {APPLY_KEYWORD}
      </span>
      <span
        className="absolute left-7 top-full h-[14px] w-[14px]"
        style={{ backgroundColor: PX.cream, clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        aria-hidden="true"
      />
    </span>
  );
}

/** The full panel: keyword, what happens next, and the fallback. */
export function ApplyCtaPanel() {
  return (
    <div className="px-10 py-10" style={{ background: HOT_GRADIENT, clipPath: notch(12), color: PX.ink }}>
      <p className="text-[24px] tracking-[0.14em]" style={PIXEL_FONT}>
        HOW TO APPLY
      </p>
      <div className="mt-4 flex items-center gap-6">
        <p className="font-kodchasan text-[64px] font-bold leading-none">คอมเมนต์</p>
        <KeywordBubble size={80} />
      </div>
      <p className="mt-7 font-kodchasan text-[40px] font-bold leading-[1.35]">เดี๋ยวพี่ส่งลิงก์สมัครให้ทาง DM</p>
      <p className="mt-2 text-[28px] font-semibold leading-[1.45]" style={{ opacity: 0.8 }}>
        หรือกดลิงก์ในไบโอ · กรอก 2 นาที · ปิดรับ {formatThaiDate(SHIFT_COHORT.applyDeadline)}
      </p>
    </div>
  );
}

/** One line for slides that end on something else. */
export function ApplyCtaLine() {
  return (
    <div className="flex items-center gap-5">
      <p className="font-kodchasan text-[40px] font-bold" style={{ color: PX.cream }}>
        คอมเมนต์
      </p>
      <KeywordBubble size={44} />
      <p className="font-kodchasan text-[32px] font-bold" style={{ color: PX.accentLight }}>
        รับลิงก์สมัครทาง DM
      </p>
    </div>
  );
}
