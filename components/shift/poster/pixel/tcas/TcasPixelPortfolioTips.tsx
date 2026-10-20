import QRCode from "react-qr-code";

import type { TcasDate, TcasIcon, TcasPosterData, TcasTakeaway } from "@/lib/content/tcas70-poster";

import { PassionSeedMark } from "../../riso";
import { PIXEL_FONT, PixelIcon } from "../PixelRects";
import { CHART, CREW, ICON_PALETTE, PORTFOLIO, QUESTION, ROCKET, SCREEN, SIGNPOST, SPARK, SPROUT, TROPHY } from "../pixelIcons";
import { CELL, PX } from "../pixelKit";
import { SHEET_DECK, TcasSheet, notch } from "./TcasPixelScene";

/**
 * TCAS infographic tips sheet: what the universities have in common, turned
 * into what to put in a portfolio, then the key dates and where every fact
 * came from.
 */

const BAND = 222;
const ICONS: Record<TcasIcon, string[]> = {
  trophy: TROPHY,
  rocket: ROCKET,
  portfolio: PORTFOLIO,
  screen: SCREEN,
  crew: CREW,
  question: QUESTION,
  sprout: SPROUT,
  chart: CHART,
  spark: SPARK,
  signpost: SIGNPOST,
};

function Header({ fieldEn }: { fieldEn: string }) {
  return (
    <div className="absolute inset-x-0 top-[34px] flex flex-col items-center text-center">
      <p className="text-[22px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        TCAS70 · {fieldEn}
      </p>
      <h2
        className="mt-1 font-kodchasan text-[52px] font-bold leading-[1.15]"
        style={{ color: PX.ink, textShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}` }}
      >
        เอาไปทำพอร์ตยังไง
      </h2>
    </div>
  );
}

function SectionLabel({ th, en }: { th: string; en: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[12px] w-[12px] shrink-0" style={{ backgroundColor: PX.accent }} />
      <p className="font-kodchasan text-[28px] font-bold leading-none" style={{ color: PX.cream }}>
        {th}
      </p>
      <p className="text-[15px] leading-none tracking-[0.12em]" style={{ ...PIXEL_FONT, color: `${PX.cream}80` }}>
        {en}
      </p>
    </div>
  );
}

function Takeaways({ items }: { items: TcasTakeaway[] }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-[14px]">
      {items.map((t, i) => (
        <li
          key={t.en}
          className="flex gap-[18px] px-[20px] py-[16px]"
          style={{ backgroundColor: PX.waterDeep, clipPath: notch(CELL) }}
        >
          <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center">
            <PixelIcon grid={ICONS[t.icon]} palette={ICON_PALETTE} scale={5} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] leading-none tracking-[0.06em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
              {String(i + 1).padStart(2, "0")} {t.en}
            </span>
            <span className="mt-[6px] block font-kodchasan text-[24px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
              {t.title}
            </span>
            <span className="mt-[6px] block text-[16px] leading-[1.5]" style={{ color: `${PX.cream}d9` }}>
              {t.body}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Key dates as buoys on a rope, the same device as SHIFT[1]'s week. */
function Dates({ dates }: { dates: TcasDate[] }) {
  return (
    <div className="relative mt-6 grid" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}>
      <div
        className="absolute top-[15px] h-[6px]"
        style={{
          left: `${100 / (dates.length * 2)}%`,
          right: `${100 / (dates.length * 2)}%`,
          backgroundImage: `repeating-linear-gradient(90deg, ${PX.water} 0 12px, transparent 12px 18px)`,
        }}
      />
      {dates.map((d) => (
        <div key={d.date + d.label} className="relative flex flex-col items-center px-[6px] text-center">
          <span
            className="h-[36px] w-[36px]"
            style={{
              backgroundColor: d.done ? PX.mid : PX.accentLight,
              boxShadow: `${CELL / 2}px ${CELL / 2}px 0 ${d.done ? PX.near : PX.accentDark}`,
            }}
          />
          <p className="mt-[12px] font-kodchasan text-[17px] font-bold leading-[1.2]" style={{ color: d.done ? `${PX.cream}80` : PX.accentLight }}>
            {d.date}
          </p>
          <p className="mt-[4px] text-[13px] leading-[1.3]" style={{ color: d.done ? `${PX.cream}80` : PX.cream }}>
            {d.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function Sources({ sources, asOf }: { sources: string[]; asOf: string }) {
  return (
    <div className="mt-6 px-[16px] py-[10px]" style={{ backgroundColor: `${PX.cream}0f`, clipPath: notch(CELL / 2) }}>
      <p className="text-[12px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
        SOURCES
        <span className="ml-2 font-bai-jamjuree text-[13px] tracking-normal">ข้อมูล ณ {asOf}</span>
      </p>
      <p className="mt-[6px] text-[13px] leading-[1.5]" style={{ color: `${PX.cream}b3` }}>
        {sources.join(" · ")}
      </p>
      <p className="mt-[2px] text-[13px] leading-[1.5]" style={{ color: `${PX.cream}b3` }}>
        เกณฑ์อาจเปลี่ยนได้ ก่อนสมัครให้เช็กระเบียบการล่าสุดที่เว็บคณะและ mytcas.com
      </p>
    </div>
  );
}

function Band({ shiftUrl }: { shiftUrl: string }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-7 px-[48px] pb-[20px]"
      style={{ top: (BAND + 3) * CELL }}
    >
      <div className="min-w-0">
        <p className="text-[16px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          SHIFT · 7 DAYS
        </p>
        <p className="mt-[8px] font-kodchasan text-[28px] font-bold leading-[1.25]" style={{ color: PX.cream }}>
          7 วัน สร้างโปรเจกต์จริง พร้อมสรุป 1 หน้า
        </p>
        <p className="mt-[2px] text-[18px] leading-[1.45]" style={{ color: `${PX.cream}bf` }}>
          ใส่พอร์ตและใช้เล่าในห้องสัมภาษณ์ TCAS รอบ 1
        </p>
        <div className="mt-[10px] flex items-center gap-3">
          <PassionSeedMark size={24} />
          <p className="text-[15px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
            passionseed.org/shift
          </p>
        </div>
      </div>
      <div className="shrink-0 text-center">
        <div className="p-2" style={{ backgroundColor: PX.cream }}>
          <QRCode value={shiftUrl} size={104} fgColor={PX.ink} bgColor={PX.cream} />
        </div>
        <p className="mt-1 text-[13px]" style={{ color: `${PX.cream}8c` }}>
          สแกนดู SHIFT
        </p>
      </div>
    </div>
  );
}

export function TcasPixelPortfolioTips({ data }: { data: TcasPosterData }) {
  const shiftUrl = `https://passionseed.org/shift?utm_source=tcas-${data.key}-infographic`;
  return (
    <TcasSheet id={`tcas-${data.key}-tips`} band={BAND}>
      <Header fieldEn={data.fieldEn} />
      <div className="absolute inset-x-0 px-[48px]" style={{ top: (SHEET_DECK + 6) * CELL }}>
        <section>
          <SectionLabel th="ทุกที่อยากเห็นอะไร" en="What they all want" />
          <Takeaways items={data.takeaways} />
        </section>
        <section className="mt-7">
          <SectionLabel th="วันสำคัญ" en="Key dates" />
          <Dates dates={data.dates} />
        </section>
        <Sources sources={data.sources} asOf={data.asOf} />
      </div>
      <Band shiftUrl={shiftUrl} />
    </TcasSheet>
  );
}
