import type { ReactNode } from "react";

import {
  TCAS_COLUMNS,
  type TcasPosterData,
  type TcasProject,
  type TcasUniversity,
} from "@/lib/content/tcas70-poster";

import { PassionSeedMark } from "../../riso";
import { PIXEL_FONT } from "../PixelRects";
import { CELL, PX } from "../pixelKit";
import { SHEET_DECK, TcasSheet, notch } from "./TcasPixelScene";

/**
 * TCAS infographic table sheets: one row per project, grouped under a
 * university block on the left, so a student can scan down a column and
 * compare projects. The universities are split across sheets by the
 * dataset's `sheets` so every row stays readable on an A4 page.
 */

const BAND = 236;
const UNI_W = 110;
const GAP = 6;
const COLS = TCAS_COLUMNS.map((c) => `minmax(0, ${c.fr}fr)`).join(" ");
/** Table height so the rows share the whole deck instead of leaving a gap. */
const TABLE_H = (BAND - SHEET_DECK - 14) * CELL - 60;

function Header({ title, part, total }: { title: string; part: number; total: number }) {
  return (
    <div className="absolute inset-x-0 top-[34px] flex flex-col items-center text-center">
      <p className="text-[22px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        TCAS70 · ROUND 1 PORTFOLIO · {part}/{total}
      </p>
      <h1
        className="mt-1 font-kodchasan text-[52px] font-bold leading-[1.15]"
        style={{ color: PX.ink, textShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}` }}
      >
        {title}
      </h1>
    </div>
  );
}

function ColumnHeads() {
  return (
    <div className="flex" style={{ gap: GAP }}>
      <div className="shrink-0" style={{ width: UNI_W }} />
      <div className="grid flex-1" style={{ gridTemplateColumns: COLS, gap: GAP }}>
        {TCAS_COLUMNS.map((c) => (
          <div key={c.key} className="flex flex-col justify-end px-[4px] pb-[6px]">
            <span className="flex items-center gap-[7px]">
              <span className="h-[9px] w-[9px] shrink-0" style={{ backgroundColor: PX.accent }} />
              <span className="font-kodchasan text-[16px] font-bold leading-[1.15]" style={{ color: PX.cream }}>
                {c.th}
              </span>
            </span>
            <span
              className="ml-[16px] mt-[3px] text-[10px] leading-none tracking-[0.1em]"
              style={{ ...PIXEL_FONT, color: `${PX.cream}70` }}
            >
              {c.en}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UniversityLabel({ u }: { u: TcasUniversity }) {
  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center px-2 text-center"
      style={{ width: UNI_W, backgroundColor: PX.waterDeep, clipPath: notch(CELL) }}
    >
      <p
        className="font-kodchasan font-bold leading-[1.15]"
        style={{ color: PX.cream, fontSize: u.nameTh.length > 10 ? 16 : 19 }}
      >
        {u.nameTh}
      </p>
      <p className="mt-[6px] text-[11px] leading-none tracking-[0.04em]" style={{ ...PIXEL_FONT, color: PX.waterLight }}>
        {u.nameEn}
      </p>
      {u.refCycle && <RefTag cycle={u.refCycle} />}
    </div>
  );
}

/** Marks facts taken from an earlier cycle's announcement. */
function RefTag({ cycle }: { cycle: string }) {
  return (
    <p
      className="mt-[6px] self-start px-[5px] py-[3px] text-[10px] leading-none tracking-[0.04em]"
      style={{ ...PIXEL_FONT, color: PX.ink, backgroundColor: PX.accentLight }}
    >
      REF {cycle}
    </p>
  );
}

const isMissing = (text: string) => text.startsWith("ไม่ระบุ") || text.startsWith("ปี 70 ยังไม่");

function Cell({ children, tint }: { children: ReactNode; tint?: boolean }) {
  return (
    <div
      className="flex flex-col justify-center px-[9px] py-[6px]"
      style={{ backgroundColor: tint ? `${PX.accent}2e` : `${PX.cream}0f`, clipPath: notch(CELL / 2) }}
    >
      {children}
    </div>
  );
}

function Text({ text }: { text: string }) {
  return (
    <p className="text-[14px] font-medium leading-[1.35]" style={{ color: isMissing(text) ? `${PX.cream}80` : PX.cream }}>
      {text}
    </p>
  );
}

function ProjectRow({ p }: { p: TcasProject }) {
  return (
    <div className="grid flex-auto" style={{ gridTemplateColumns: COLS, gap: GAP }}>
      <Cell>
        <p className="font-kodchasan text-[15px] font-bold leading-[1.25]" style={{ color: PX.accentLight }}>
          {p.name}
        </p>
        <p className="mt-[3px] text-[13px] leading-[1.3]" style={{ color: `${PX.cream}bf` }}>
          {p.seats}
        </p>
        {p.refCycle && <RefTag cycle={p.refCycle} />}
      </Cell>
      <Cell>
        <Text text={p.gpax} />
      </Cell>
      <Cell tint={p.gated}>
        <Text text={p.requirement} />
      </Cell>
      <Cell>
        <Text text={p.portfolio} />
      </Cell>
      <Cell>
        <Text text={p.scoring} />
      </Cell>
      <Cell>
        <Text text={p.apply} />
        {p.applyClosed && (
          <p className="mt-[4px] text-[11px] leading-none tracking-[0.06em]" style={{ ...PIXEL_FONT, color: PX.accent }}>
            CLOSED
          </p>
        )}
      </Cell>
    </div>
  );
}

/** One university: its label on the left, its projects stacked on the right. */
function UniversityBlock({ u }: { u: TcasUniversity }) {
  return (
    <div className="flex" style={{ gap: GAP, flexGrow: u.projects.length }}>
      <UniversityLabel u={u} />
      <div className="flex flex-1 flex-col" style={{ gap: GAP }}>
        {u.projects.map((p) => (
          <ProjectRow key={p.name} p={p} />
        ))}
      </div>
    </div>
  );
}

function Band({ notes }: { notes: string[] }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-6 px-[40px] pb-[14px]"
      style={{ top: (BAND + 3) * CELL }}
    >
      <div className="min-w-0">
        {notes.map((n) => (
          <p key={n} className="text-[14px] leading-[1.5]" style={{ color: `${PX.cream}bf` }}>
            {n}
          </p>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <PassionSeedMark size={24} />
        <p className="text-[15px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
          passionseed.org/shift
        </p>
      </div>
    </div>
  );
}

export function TcasPixelOverview({ data, sheet }: { data: TcasPosterData; sheet: number }) {
  const keys = data.sheets[sheet];
  const universities = data.universities.filter((u) => keys.includes(u.key));
  const hasRef = universities.some((u) => u.refCycle || u.projects.some((p) => p.refCycle));
  const notes = [
    `ข้อมูลจากระเบียบการของแต่ละคณะ และ course.mytcas.com ณ ${data.asOf}`,
    `${data.scope} · ${data.skipped}`,
    ...(hasRef ? ["REF TCAS69 = ยังไม่ประกาศเกณฑ์ปี 70 จึงใช้ประกาศปี 69 อ้างอิง"] : []),
  ];
  return (
    <TcasSheet id={`tcas-${data.key}-${sheet + 1}`} band={BAND}>
      <Header title={data.tableTitle} part={sheet + 1} total={data.sheets.length} />
      <div className="absolute inset-x-0 px-[40px]" style={{ top: (SHEET_DECK + 6) * CELL }}>
        <p className="mb-[14px] font-kodchasan text-[21px] font-semibold leading-[1.3]" style={{ color: PX.cream }}>
          แยกทีละโครงการ
          <span style={{ color: PX.accentLight }}> · {data.gateLegend}</span>
        </p>
        <ColumnHeads />
        <div className="mt-[4px] flex flex-col" style={{ gap: GAP + 2, height: TABLE_H }}>
          {universities.map((u) => (
            <UniversityBlock key={u.key} u={u} />
          ))}
        </div>
      </div>
      <Band notes={notes} />
    </TcasSheet>
  );
}
