import type { ReactNode } from "react";
import QRCode from "react-qr-code";

import {
  ALUMNI_PAGE_URL,
  longThaiDate,
  sessionDetails,
  sessionSteps,
  timeRangeLabel,
  type AlumniDefaults,
  type AlumniSession,
  type SessionStep,
} from "@/lib/content/shift-alumni";

import { STEP_ICONS, STEP_INKS } from "../alumni/NextSessionFeature";
import { RisoIcon } from "./RisoIcons";
import {
  ChromeWordmark,
  INK,
  MarkerHighlight,
  MISREG_TEXT,
  OrbitSky,
  PaperSheet,
  PassionSeedMark,
} from "./riso";

/**
 * Horizontal poster for the next SHIFT alumni session (1920x1080): top of
 * /shift/alumni, and the PNG for the LINE groups and Discord. Riso print like
 * the other SHIFT posters, with the same date, labelled steps and icons as
 * the page. Driven by the calendar, so a new topic or date is a new poster.
 */

export const ALUMNI_POSTER_ID = "shift-alumni-session";
export const ALUMNI_POSTER_W = 1920;
export const ALUMNI_POSTER_H = 1080;
const QR_URL = `${ALUMNI_PAGE_URL}?utm_source=alumni_poster`;
const HORIZON = 300;

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** Round sticker slapped on the date, deliberately off-axis. */
function Sticker({ children, color, className }: { children: ReactNode; color: string; className: string }) {
  return (
    <span
      className={`absolute flex items-center justify-center rounded-full text-center font-kodchasan font-bold leading-[1.02] ${className}`}
      style={{ backgroundColor: color, color: INK.black, boxShadow: `-6px 5px 0 ${INK.pink}` }}
    >
      {children}
    </span>
  );
}

function PosterStep({ step, index }: { step: SessionStep; index: number }) {
  const hot = index === 0;
  return (
    <li
      className="relative flex items-center gap-7 rounded-[18px] px-8 py-7"
      style={{
        backgroundColor: hot ? INK.orange : paper("0d"),
        color: hot ? INK.black : INK.paper,
        boxShadow: hot ? `-7px 6px 0 ${INK.pink}` : `inset 0 0 0 2px ${paper("26")}`,
      }}
    >
      <span
        className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full font-kodchasan text-[38px] font-bold"
        style={{
          backgroundColor: hot ? INK.black : INK.paper,
          color: hot ? INK.orange : INK.black,
          boxShadow: `-4px 3px 0 ${hot ? INK.yellow : INK.blue}`,
        }}
      >
        {index + 1}
      </span>
      <span className="min-w-0">
        {step.label && (
          <span
            className="inline-block rounded-[6px] px-3 py-1 font-kodchasan text-[30px] font-bold uppercase leading-tight tracking-wide"
            style={{
              backgroundColor: hot ? INK.black : STEP_INKS[index % STEP_INKS.length],
              color: hot ? INK.yellow : INK.black,
              transform: `rotate(${index % 2 === 0 ? -2.5 : 2}deg)`,
              boxShadow: `-3px 3px 0 ${INK.blue}`,
            }}
          >
            {step.label}
          </span>
        )}
        <span
          className="mt-2 block font-kodchasan text-[42px] font-bold leading-tight"
          style={hot ? undefined : MISREG_TEXT}
        >
          {step.text}
        </span>
      </span>
      <RisoIcon
        name={STEP_ICONS[index % STEP_ICONS.length]}
        ink={hot ? INK.black : STEP_INKS[index % STEP_INKS.length]}
        size={60}
        className="ml-auto"
      />
    </li>
  );
}

function WhenAndRsvp({ session, defaults }: { session: AlumniSession; defaults: AlumniDefaults }) {
  const { startTime, endTime, place } = sessionDetails(session, defaults);
  return (
    <div className="flex w-[700px] shrink-0 flex-col">
      <div className="relative">
        <p className="text-[30px] font-semibold uppercase tracking-[0.18em]" style={{ color: INK.orange }}>
          AfterSHIFT
        </p>
        <p
          className="mt-1 whitespace-nowrap font-kodchasan text-[116px] font-bold leading-[1.02]"
          style={{ color: INK.yellow, textShadow: `-5px 4px 0 ${INK.pink}` }}
        >
          {longThaiDate(session.date)}
        </p>
        <p className="mt-2 text-[40px]" style={{ color: paper("ee") }}>
          {timeRangeLabel(startTime, endTime) ?? "เวลาแจ้งในกลุ่ม"}
        </p>
        {place && (
          <p className="text-[34px]" style={{ color: paper("99") }}>
            {place}
          </p>
        )}
        {session.date === defaults.firstDate && (
          <Sticker color={INK.yellow} className="right-2 top-[175px] h-[150px] w-[150px] rotate-[12deg] text-[36px]">
            ครั้ง
            <br />
            แรก
          </Sticker>
        )}
      </div>

      <div className="mt-auto flex items-end gap-8">
        <div
          className="shrink-0 rounded-[16px] p-4"
          style={{ backgroundColor: INK.paper, boxShadow: `-6px 5px 0 ${INK.pink}` }}
        >
          <QRCode value={QR_URL} size={190} fgColor={INK.black} bgColor={INK.paper} />
        </div>
        <div className="pb-1">
          <p className="text-[28px] leading-snug">
            <MarkerHighlight>สำหรับทุกคนที่จบ SHIFT แล้ว</MarkerHighlight>
          </p>
          <p className="mt-4 whitespace-nowrap font-kodchasan text-[46px] font-bold leading-tight">
            สแกนแล้วกด <span style={{ color: INK.yellow }}>ไปด้วย</span>
          </p>
          <p className="mt-1 text-[26px]" style={{ color: paper("99") }}>
            passionseed.org/shift/alumni
          </p>
        </div>
      </div>
    </div>
  );
}

export function ShiftAlumniSessionPoster({
  session,
  defaults,
}: {
  session: AlumniSession;
  defaults: AlumniDefaults;
}) {
  const steps = sessionSteps(session.topic);

  return (
    <PaperSheet id={ALUMNI_POSTER_ID} width={ALUMNI_POSTER_W} height={ALUMNI_POSTER_H}>
      <OrbitSky horizon={HORIZON} speckle={0.18} />
      <div className="relative flex h-full flex-col px-[80px] pb-[56px] pt-[40px]">
        <div className="flex items-center justify-between">
          <PassionSeedMark size={52} />
          <p className="font-kodchasan text-[30px] font-semibold" style={MISREG_TEXT}>
            จบ 7 วันแล้ว ยังสร้างต่อด้วยกัน
          </p>
        </div>
        <div className="-mt-2 flex justify-center" style={{ height: HORIZON - 116 }}>
          <ChromeWordmark size={160} name="ALUMNI" />
        </div>

        <div className="mt-[64px] flex min-h-0 flex-1 gap-[56px]">
          <WhenAndRsvp session={session} defaults={defaults} />
          {steps.length > 1 ? (
            <ol className="flex flex-1 flex-col justify-between gap-6">
              {steps.map((step, i) => (
                <PosterStep key={`${step.label}-${step.text}`} step={step} index={i} />
              ))}
            </ol>
          ) : (
            <p className="flex-1 self-center font-kodchasan text-[64px] font-bold leading-tight" style={MISREG_TEXT}>
              {steps[0]?.text || "ทำโปรเจกต์ต่อ แล้วอัปเดตกัน"}
            </p>
          )}
        </div>
      </div>
    </PaperSheet>
  );
}
