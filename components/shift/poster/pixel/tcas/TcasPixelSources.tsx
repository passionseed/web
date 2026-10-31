import type { TcasPosterData, TcasReality, TcasSourceLink } from "@/lib/content/tcas70-poster";

import { PassionSeedMark } from "../../riso";
import { PIXEL_FONT } from "../PixelRects";
import { CELL, PX } from "../pixelKit";
import { SHEET_DECK, TcasSheet, notch } from "./TcasPixelScene";

/**
 * TCAS infographic sources sheet: what admitted students actually had, next
 * to the published minimum, then the exact document behind every university's
 * rows. Rendered only when the dataset carries `reality` or `sourceLinks`.
 */

const BAND = 236;

function Header({ fieldEn }: { fieldEn: string }) {
  return (
    <div className="absolute inset-x-0 top-[34px] flex flex-col items-center text-center">
      <p className="text-[22px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        TCAS70 · SOURCES
      </p>
      <h2
        className="mt-1 font-kodchasan text-[52px] font-bold leading-[1.15]"
        style={{ color: PX.ink, textShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}` }}
      >
        ขั้นต่ำไม่ใช่เส้นที่ติด
      </h2>
    </div>
  );
}

function SectionLabel({ th, en }: { th: string; en: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[12px] w-[12px] shrink-0" style={{ backgroundColor: PX.accent }} />
      <p className="font-kodchasan text-[26px] font-bold leading-none" style={{ color: PX.cream }}>
        {th}
      </p>
      <p className="text-[15px] leading-none tracking-[0.12em]" style={{ ...PIXEL_FONT, color: `${PX.cream}80` }}>
        {en}
      </p>
    </div>
  );
}

function RealityRow({ r }: { r: TcasReality }) {
  return (
    <li className="grid grid-cols-[230px_150px_minmax(0,1fr)] gap-[14px] px-[18px] py-[12px]" style={{ backgroundColor: PX.waterDeep, clipPath: notch(CELL / 2) }}>
      <div className="min-w-0">
        <p className="font-kodchasan text-[19px] font-bold leading-[1.2]" style={{ color: PX.accentLight }}>
          {r.uni}
        </p>
        <p className="mt-[2px] text-[15px] leading-[1.3]" style={{ color: PX.cream }}>
          {r.project}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[12px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: `${PX.cream}80` }}>
          MIN
        </p>
        <p className="mt-[4px] text-[16px] leading-[1.3]" style={{ color: `${PX.cream}bf` }}>
          {r.min}
        </p>
      </div>
      <div className="min-w-0">
        <p className="font-kodchasan text-[18px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
          {r.actual}
        </p>
        {r.note && (
          <p className="mt-[2px] text-[14px] leading-[1.35]" style={{ color: PX.accentLight }}>
            {r.note}
          </p>
        )}
        <p className="mt-[3px] break-all text-[12px] leading-[1.35]" style={{ color: `${PX.cream}8c` }}>
          ที่มา: {r.source}
        </p>
      </div>
    </li>
  );
}

function Links({ items }: { items: TcasSourceLink[] }) {
  return (
    <ul className="mt-3 grid grid-cols-[120px_minmax(0,1fr)] gap-x-[14px] gap-y-[6px]">
      {items.map((s) => (
        <li key={s.uni} className="contents">
          <span className="font-kodchasan text-[15px] font-bold leading-[1.35]" style={{ color: PX.accentLight }}>
            {s.uni}
          </span>
          <span className="min-w-0 break-all text-[12.5px] leading-[1.4]" style={{ color: `${PX.cream}cc` }}>
            {s.links.join("  ·  ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TcasPixelSources({ data }: { data: TcasPosterData }) {
  if (!data.reality?.length && !data.sourceLinks?.length) return null;
  return (
    <TcasSheet id={`tcas-${data.key}-sources`} band={BAND}>
      <Header fieldEn={data.fieldEn} />
      <div className="absolute inset-x-0 px-[44px]" style={{ top: (SHEET_DECK + 6) * CELL }}>
        {data.reality?.length ? (
          <section>
            <SectionLabel th="คะแนนจริงของคนที่ติด" en="What admits actually had" />
            <p className="mt-[8px] text-[15px] leading-[1.45]" style={{ color: `${PX.cream}bf` }}>
              เฉพาะที่มหาวิทยาลัยเผยแพร่เอง ตัวเลขปีที่แล้วใช้กะระยะได้ แต่ปีนี้อาจสูงกว่า
            </p>
            <ul className="mt-3 flex flex-col gap-[8px]">
              {data.reality.map((r) => (
                <RealityRow key={r.uni + r.project} r={r} />
              ))}
            </ul>
            {data.realityGap && (
              <p className="mt-[8px] text-[14px] leading-[1.45]" style={{ color: `${PX.cream}99` }}>
                {data.realityGap}
              </p>
            )}
          </section>
        ) : null}
        {data.sourceLinks?.length ? (
          <section className="mt-6">
            <SectionLabel th="ที่มาของข้อมูลในตาราง" en="Where each row came from" />
            <Links items={data.sourceLinks} />
            <p className="mt-[10px] text-[13px] leading-[1.45]" style={{ color: `${PX.cream}99` }}>
              ข้อมูล ณ {data.asOf} · เกณฑ์อาจเปลี่ยนได้ ก่อนสมัครให้เช็กระเบียบการล่าสุดที่เว็บคณะและ mytcas.com
            </p>
          </section>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-3 px-[44px] pb-[22px]" style={{ top: (BAND + 3) * CELL }}>
        <PassionSeedMark size={24} />
        <p className="text-[15px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
          passionseed.org/shift
        </p>
      </div>
    </TcasSheet>
  );
}
