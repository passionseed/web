import { countProjects, type TcasPosterData } from "@/lib/content/tcas70-poster";

import { PassionSeedMark } from "../../riso";
import { PIXEL_FONT } from "../PixelRects";
import { CELL, PX } from "../pixelKit";
import { SHEET_DECK, TcasSheet, notch } from "./TcasPixelScene";

/**
 * TCAS infographic cover: title, what is inside, and a plain warning that the
 * data can be wrong or out of date, so students check the source themselves.
 */

const BAND = 236;

function Header({ data }: { data: TcasPosterData }) {
  return (
    <div className="absolute inset-x-0 top-[40px] flex flex-col items-center text-center">
      <p className="text-[22px] leading-none tracking-[0.12em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        TCAS70 · ROUND 1 PORTFOLIO
      </p>
      <p className="mt-3 text-[18px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.near }}>
        {data.fieldEn}
      </p>
    </div>
  );
}

function Title({ data }: { data: TcasPosterData }) {
  return (
    <div className="text-center">
      <h1
        className="font-kodchasan text-[84px] font-bold leading-[1.1]"
        style={{ color: PX.cream, textShadow: `${CELL}px ${CELL}px 0 ${PX.accentDark}` }}
      >
        {data.coverTitle[0]}
        <br />
        {data.coverTitle[1]}
      </h1>
      <p className="mt-8 font-kodchasan text-[32px] font-semibold leading-[1.4]" style={{ color: PX.accentLight }}>
        สรุปเกณฑ์รับสมัคร ปีการศึกษา 2570
      </p>
      <p className="mt-2 text-[22px] leading-[1.5]" style={{ color: `${PX.cream}d9` }}>
        {data.universities.length} มหาวิทยาลัย · {countProjects(data)} โครงการ · แยกทีละโครงการ
      </p>
    </div>
  );
}

/** The universities inside, in the order the table sheets list them. */
function Lineup({ data }: { data: TcasPosterData }) {
  return (
    <ul className="mx-auto mt-14 grid w-full max-w-[860px] grid-cols-4 gap-[14px]">
      {data.universities.map((u) => (
        <li
          key={u.key}
          className="flex flex-col items-center px-3 py-[18px] text-center"
          style={{ backgroundColor: PX.waterDeep, clipPath: notch(CELL) }}
        >
          <span className="font-kodchasan text-[22px] font-bold leading-[1.15]" style={{ color: PX.cream }}>
            {u.nameTh}
          </span>
          <span className="mt-[6px] text-[12px] leading-none tracking-[0.06em]" style={{ ...PIXEL_FONT, color: PX.waterLight }}>
            {u.nameEn}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Coverage notes, e.g. which universities have no such program. */
function Notes({ notes }: { notes?: string[] }) {
  if (!notes?.length) return null;
  return (
    <div className="mx-auto mt-6 w-full max-w-[860px] text-center">
      {notes.map((n) => (
        <p key={n} className="text-[17px] leading-[1.6]" style={{ color: `${PX.cream}b3` }}>
          {n}
        </p>
      ))}
    </div>
  );
}

function Warning({ asOf }: { asOf: string }) {
  return (
    <div
      className="mx-auto mt-14 flex w-full max-w-[860px] gap-[20px] px-[28px] py-[26px]"
      style={{ backgroundColor: `${PX.accent}26`, clipPath: notch(CELL), boxShadow: `inset 0 0 0 ${CELL / 2}px ${PX.accent}` }}
    >
      <span
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center text-[34px] leading-none"
        style={{
          ...PIXEL_FONT,
          color: PX.ink,
          backgroundColor: PX.accentLight,
          boxShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.accentDark}`,
        }}
      >
        !
      </span>
      <div className="min-w-0">
        <p className="font-kodchasan text-[26px] font-bold leading-[1.3]" style={{ color: PX.accentLight }}>
          ข้อมูลนี้อาจคลาดเคลื่อน
        </p>
        <p className="mt-2 text-[19px] leading-[1.6]" style={{ color: PX.cream }}>
          เรารวบรวมจากระเบียบการของแต่ละคณะและ mytcas.com ณ {asOf} บางโครงการยังไม่ประกาศเกณฑ์ปี 70
          จึงใช้ข้อมูลปี 69 อ้างอิง (มีป้าย REF TCAS69) และเกณฑ์อาจเปลี่ยนได้ทุกเมื่อ
        </p>
        <p className="mt-2 text-[19px] font-semibold leading-[1.6]" style={{ color: PX.cream }}>
          แนะนำให้ใช้ประกอบการหาข้อมูลด้วยตัวเอง และเช็กระเบียบการฉบับล่าสุดที่เว็บคณะก่อนสมัครทุกครั้ง
        </p>
      </div>
    </div>
  );
}

function Band({ data }: { data: TcasPosterData }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-6 px-[48px] pb-[18px]"
      style={{ top: (BAND + 3) * CELL }}
    >
      <p className="text-[16px] leading-[1.5]" style={{ color: `${PX.cream}bf` }}>
        {data.scope} · ข้อมูล ณ {data.asOf}
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <PassionSeedMark size={26} />
        <p className="text-[16px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
          passionseed.org/shift
        </p>
      </div>
    </div>
  );
}

export function TcasPixelCover({ data }: { data: TcasPosterData }) {
  return (
    <TcasSheet id={`tcas-${data.key}-cover`} band={BAND}>
      <Header data={data} />
      <div
        className="absolute inset-x-0 flex flex-col justify-center px-[48px]"
        style={{ top: (SHEET_DECK + 4) * CELL, height: (BAND - SHEET_DECK - 4) * CELL }}
      >
        <Title data={data} />
        <Lineup data={data} />
        <Notes notes={data.notes} />
        <Warning asOf={data.asOf} />
      </div>
      <Band data={data} />
    </TcasSheet>
  );
}
