/* eslint-disable @next/next/no-img-element -- export sheet: a plain img keeps the pre-rendered planet at its exact pixel box. */
import { COSMOS, starlight } from "@/components/shift/next/cosmos";

import { PassionSeedMark } from "./riso";
import { SHIFT3 } from "./shift3/facts";
import { Glass, LATIN, Lockup, cosmosBackground } from "./shift3/parts";
import { planetBox, planetSpec, planetSrc } from "./shift3/planet";
import { Sky } from "./shift3/Sky";

/**
 * SHIFT[3] save-the-date, cosmos style: the lockup, the dates big in Thai and
 * English, the seven evenings as a strip, and the SHIFT planet rising from the
 * bottom edge. Purely the date; the launch poster carries price and how to
 * join. Every fact comes from SHIFT_COHORT_3 via ./shift3/facts.
 * Export: screenshot #shift3-poster-1 (1080x1350).
 */

export const SHIFT3_DATE_POSTER_ID = "shift3-poster-1";

const W = 1080;
const H = 1350;

/** Where the feed planet sits on this poster: low and right, a rising horizon. */
const PLANET = { cx: 860, cy: 1420, scale: 1.75 };

/** The feed planet PNG, moved and scaled; its right-edge crop stays off canvas. */
function RisingPlanet() {
  const spec = planetSpec("feed");
  const box = planetBox(spec);
  const s = PLANET.scale;
  const left = PLANET.cx + (box.x - spec.cx) * s;
  const top = PLANET.cy + (box.y - spec.cy) * s;
  const [bx, by] = spec.bangkok;
  const bangkok = { x: PLANET.cx + (bx - spec.cx) * s, y: PLANET.cy + (by - spec.cy) * s };
  return (
    <>
      <img
        src={planetSrc("feed")}
        alt=""
        width={box.w * s}
        height={box.h * s}
        className="pointer-events-none absolute max-w-none"
        style={{ left, top, width: box.w * s, height: box.h * s }}
      />
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <filter id="s3date-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <circle cx={bangkok.x} cy={bangkok.y} r="18" fill={COSMOS.sol} opacity="0.85" filter="url(#s3date-glow)" />
        <circle cx={bangkok.x} cy={bangkok.y} r="6" fill={COSMOS.sol} />
      </svg>
    </>
  );
}

/** Day of month from an ISO date, e.g. "2026-11-09" to 9. */
const dayOfMonth = (iso: string) => Number(iso.split("-")[2]);

/** The round's evenings as tiles: weekday initial over the day number, Demo Day in sol. */
function EveningTiles() {
  const days = SHIFT3.cohort.schedule;
  return (
    <ol className="flex gap-[12px]">
      {days.map((d, i) => {
        const last = i === days.length - 1;
        return (
          <li
            key={d.date}
            className="flex flex-1 flex-col items-center rounded-[20px] pb-[14px] pt-[12px]"
            style={{
              background: last ? `${COSMOS.sol}1f` : "rgba(255,255,255,0.05)",
              boxShadow: last
                ? `inset 0 0 0 1.5px ${COSMOS.sol}aa, 0 0 34px -6px ${COSMOS.sol}66`
                : `inset 0 0 0 1px ${starlight("22")}`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <span className="font-medium" style={{ fontSize: 22, color: last ? COSMOS.sol : starlight("99") }}>
              {SHIFT3.weekdays[i]}
            </span>
            <span
              className="font-medium tracking-[-0.03em]"
              style={{ fontFamily: LATIN, fontSize: 50, lineHeight: 1.05, color: last ? COSMOS.sol : COSMOS.star }}
            >
              {dayOfMonth(d.date)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ShiftThreeDateCover() {
  return (
    <div
      id={SHIFT3_DATE_POSTER_ID}
      lang="th"
      className="relative h-[1350px] w-[1080px] shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={cosmosBackground(W, H)}
    >
      <Sky width={W} height={H} seed={7} band={[0, 420, W, 120]} />
      <RisingPlanet />

      <div className="relative flex h-full flex-col px-[64px] pb-[56px] pt-[48px]">
        <div className="flex items-center justify-between">
          <PassionSeedMark size={42} />
          <p
            className="font-semibold uppercase tracking-[0.24em]"
            style={{ fontFamily: LATIN, fontSize: 20, color: COSMOS.sol }}
          >
            Save the date
          </p>
        </div>

        <h1 className="-ml-[8px] mt-[70px]">
          <Lockup size={212} />
        </h1>
        <p className="mt-[34px] font-semibold" style={{ fontSize: 40, lineHeight: 1.35, color: starlight("e6") }}>
          {SHIFT3.days} เย็น ลงมือสร้างของจริง <span style={{ color: COSMOS.aurora }}>แล้วชวนคนนอกมาลองใช้</span>
        </p>

        <div className="mt-[72px]">
          <p className="whitespace-nowrap font-semibold tracking-[-0.01em]" style={{ fontSize: 116, lineHeight: 1.2 }}>
            {SHIFT3.datesWithYear}
          </p>
          <p
            className="mt-[6px] whitespace-nowrap font-medium tracking-[-0.01em]"
            style={{ fontFamily: LATIN, fontSize: 50, lineHeight: 1.2, color: COSMOS.aurora }}
          >
            {SHIFT3.datesEn}
          </p>
        </div>

        <div className="mt-[48px]">
          <EveningTiles />
          <p className="mt-[16px] font-medium" style={{ fontSize: 26, color: starlight("cc") }}>
            ไลฟ์บน Discord ทุกเย็น {SHIFT3.time} น.
            <span style={{ color: COSMOS.sol }}> · {SHIFT3.demoLabel} {SHIFT3.demoDate}</span>
          </p>
        </div>

        <div className="mt-auto">
          <Glass className="inline-flex items-center" style={{ padding: "18px 30px", borderRadius: 999 }}>
            <span
              className="whitespace-nowrap font-medium tracking-[-0.01em]"
              style={{ fontFamily: LATIN, fontSize: 36, color: COSMOS.star }}
            >
              {SHIFT3.link}
            </span>
          </Glass>
        </div>
      </div>
    </div>
  );
}
