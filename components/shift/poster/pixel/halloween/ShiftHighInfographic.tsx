import { AFTERSHIFT_SUPPORT } from "@/lib/content/aftershift";
import { ALUMNI_DEFAULT_DOC, timeRangeLabel, weekdayKey, weekdayName } from "@/lib/content/shift-alumni";

import { LATIN } from "../../shift3/parts";
import { PixelIcon } from "../PixelRects";
import { HX } from "./halloweenKit";

/**
 * SHIFT High as a picture instead of a list: three rising pixel bars for what
 * the community helps with (people try it, more real users, ready for real
 * use), each with a pixel icon, then a week strip with the meet-up day lit.
 * Stage titles come from lib/content/aftershift.ts; the day and time from the
 * alumni calendar defaults in lib/content/shift-alumni.ts.
 */

/** Someone looking at the project: cream eye, pumpkin pupil. */
const EYE = [
  "...CCCCC...",
  ".CCSSSSSCC.",
  "CSSSCCCSSSC",
  "CSSCCPCCSSC",
  "CSSSCCCSSSC",
  ".CCSSSSSCC.",
  "...CCCCC...",
];

/** Three users; the new one in the middle is pumpkin. */
const USERS = [
  ".CC...PP...CC.",
  ".CC...PP...CC.",
  "CCCC.PPPP.CCCC",
  "CCCC.PPPP.CCCC",
  "CCCC.PPPP.CCCC",
];

/** Launch: cream body, pumpkin window and fins, flame exhaust. */
const ROCKET = [
  "....C....",
  "...CCC...",
  "..CCCCC..",
  "..CCPCC..",
  "..CPPPC..",
  "..CCPCC..",
  "..CCCCC..",
  ".PCCCCCP.",
  "PPCCCCCPP",
  "P..F.F..P",
  "...F.F...",
  "....F....",
];

const ICON_PALETTE = { C: HX.cream, S: HX.sky, P: HX.pumpkin, F: HX.flame };

const BARS = [
  { icon: EYE, scale: 10, height: 190, fill: "#3b2d5e", text: HX.cream },
  { icon: USERS, scale: 9, height: 260, fill: HX.hat, text: HX.cream },
  { icon: ROCKET, scale: 9, height: 330, fill: HX.pumpkin, text: HX.ink },
];

/** First two phrases of each support line, short enough to sit under a bar. */
const firstClause = (detail: string) => detail.split(" ").slice(0, 2).join(" ");

/** Stepped top corners, like the pixel buildings behind. */
const STEPPED_TOP =
  "polygon(12px 0, calc(100% - 12px) 0, calc(100% - 12px) 12px, 100% 12px, 100% 100%, 0 100%, 0 12px, 12px 12px)";

function GrowthBars() {
  return (
    <div className="flex items-end justify-between">
      {AFTERSHIFT_SUPPORT.map((stage, i) => {
        const bar = BARS[i];
        return (
          <div key={stage.title} className="flex w-[300px] flex-col items-center">
            <PixelIcon grid={bar.icon} palette={ICON_PALETTE} scale={bar.scale} className="mb-[18px]" />
            <div
              className="flex w-full flex-col px-[20px] pt-[22px]"
              style={{ height: bar.height, backgroundColor: bar.fill, clipPath: STEPPED_TOP }}
            >
              <span className="text-[38px] font-bold leading-none" style={{ fontFamily: LATIN, color: bar.text }}>
                {i + 1}
              </span>
              <span className="mt-[10px] font-kodchasan text-[27px] font-bold leading-[1.3]" style={{ color: bar.text }}>
                {stage.title}
              </span>
            </div>
            <p className="mt-[14px] h-[64px] text-center text-[21px] leading-[1.45]" style={{ color: `${HX.cream}b3` }}>
              {firstClause(stage.detail)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const WEEK = [
  { key: "mon", label: "จ" },
  { key: "tue", label: "อ" },
  { key: "wed", label: "พ" },
  { key: "thu", label: "พฤ" },
  { key: "fri", label: "ศ" },
  { key: "sat", label: "ส" },
  { key: "sun", label: "อา" },
];

/** A week of tiles with the meet-up day lit, and when and where beside it. */
function WeekStrip() {
  const { firstDate, startTime, endTime, place } = ALUMNI_DEFAULT_DOC.defaults;
  const day = weekdayKey(firstDate);
  return (
    <div className="flex items-center gap-[28px]">
      <div className="flex gap-[8px]">
        {WEEK.map((d) => {
          const on = d.key === day;
          return (
            <span
              key={d.key}
              className="flex h-[58px] w-[50px] items-center justify-center font-kodchasan text-[22px] font-bold"
              style={{ backgroundColor: on ? HX.pumpkin : HX.tile, color: on ? HX.ink : `${HX.cream}80` }}
            >
              {d.label}
            </span>
          );
        })}
      </div>
      <div>
        <p className="font-kodchasan text-[28px] font-bold leading-[1.3]" style={{ color: HX.cream }}>
          ทุก{weekdayName(firstDate)} {timeRangeLabel(startTime, endTime)}
        </p>
        <p className="text-[22px] leading-[1.4]" style={{ color: `${HX.cream}bf` }}>
          {place} · สำหรับคนที่จบ SHIFT
        </p>
      </div>
    </div>
  );
}

export function ShiftHighInfographic() {
  return (
    <div>
      <GrowthBars />
      <div className="mt-[22px]">
        <WeekStrip />
      </div>
    </div>
  );
}
