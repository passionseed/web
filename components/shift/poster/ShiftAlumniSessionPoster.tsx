import QRCode from "react-qr-code";

import {
  ALUMNI_PAGE_URL,
  longThaiDate,
  sessionDetails,
  sessionSteps,
  timeRangeLabel,
  type AlumniDefaults,
  type AlumniSession,
} from "@/lib/content/shift-alumni";

import { STEP_ICONS } from "../alumni/NextSessionFeature";
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
 * Poster for the next SHIFT alumni session (1080x1350), for the LINE groups
 * and IG. Same riso print as the other SHIFT posters, and the same date,
 * steps and icons as the feature on /shift/alumni, so poster and page match.
 * Driven by the calendar: a new topic or date is a new poster, no code.
 */

export const ALUMNI_POSTER_ID = "shift-alumni-session";
const QR_URL = `${ALUMNI_PAGE_URL}?utm_source=alumni_poster`;
const HORIZON = 380;
const STEP_INKS = [INK.yellow, INK.orange, INK.pink, INK.paper, INK.yellow];

const paper = (alpha: string) => `${INK.paper}${alpha}`;

function FirstSticker() {
  return (
    <span
      className="absolute right-0 top-2 flex h-[150px] w-[150px] rotate-[10deg] items-center justify-center rounded-full text-center font-kodchasan text-[34px] font-bold leading-[1.05]"
      style={{ backgroundColor: INK.yellow, color: INK.black, boxShadow: `-6px 5px 0 ${INK.pink}` }}
    >
      ครั้ง
      <br />
      แรก
    </span>
  );
}

function PosterSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-12 space-y-5">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-7">
          <span
            className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full font-kodchasan text-[40px] font-bold"
            style={{
              backgroundColor: i === 0 ? INK.orange : INK.paper,
              color: INK.black,
              boxShadow: `-5px 4px 0 ${i === 0 ? INK.pink : INK.blue}`,
            }}
          >
            {i + 1}
          </span>
          <span className="font-kodchasan text-[50px] font-bold leading-tight" style={MISREG_TEXT}>
            {step}
          </span>
          <RisoIcon
            name={STEP_ICONS[i % STEP_ICONS.length]}
            ink={STEP_INKS[i % STEP_INKS.length]}
            size={64}
            className="ml-auto"
          />
        </li>
      ))}
    </ol>
  );
}

function ScanToRsvp() {
  return (
    <div className="mt-auto flex items-end justify-between gap-10">
      <div className="pb-2">
        <p className="text-[34px] leading-snug">
          <MarkerHighlight>สำหรับทุกคนที่จบ SHIFT แล้ว</MarkerHighlight>
        </p>
        <p className="mt-5 font-kodchasan text-[44px] font-bold leading-tight">
          สแกนแล้วกด <span style={{ color: INK.yellow }}>ไปด้วย</span>
        </p>
        <p className="mt-2 text-[28px]" style={{ color: paper("99") }}>
          passionseed.org/shift/alumni
        </p>
      </div>
      <div className="shrink-0 rounded-[14px] p-4" style={{ backgroundColor: INK.paper, boxShadow: `-6px 5px 0 ${INK.pink}` }}>
        <QRCode value={QR_URL} size={220} fgColor={INK.black} bgColor={INK.paper} />
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
  const { startTime, endTime, place } = sessionDetails(session, defaults);
  const steps = sessionSteps(session.topic);
  const time = timeRangeLabel(startTime, endTime);

  return (
    <PaperSheet id={ALUMNI_POSTER_ID}>
      <OrbitSky horizon={HORIZON} speckle={0.18} />
      <div className="relative flex h-full flex-col px-[72px] pb-[64px] pt-[56px]">
        <div className="flex items-center justify-between">
          <PassionSeedMark size={52} />
          <span className="font-kodchasan text-[26px] font-bold" style={{ color: INK.paper }}>
            SHIFT
          </span>
        </div>

        <div className="flex flex-col items-center text-center" style={{ height: HORIZON - 120, justifyContent: "flex-end" }}>
          <p className="font-kodchasan text-[40px] font-semibold" style={MISREG_TEXT}>
            จบ 7 วันแล้ว ยังสร้างต่อด้วยกัน
          </p>
          <ChromeWordmark size={150} name="ALUMNI" />
        </div>

        <div className="relative mt-16">
          <p
            className="font-kodchasan text-[124px] font-bold leading-[1.02]"
            style={{ color: INK.yellow, textShadow: `-4px 3px 0 ${INK.pink}` }}
          >
            {longThaiDate(session.date)}
          </p>
          <p className="mt-3 text-[38px]" style={{ color: paper("e6") }}>
            {time ?? "เวลาแจ้งในกลุ่ม"}
            {place && <span style={{ color: paper("99") }}> · {place}</span>}
          </p>
          {session.date === defaults.firstDate && <FirstSticker />}
        </div>

        {steps.length > 1 ? (
          <PosterSteps steps={steps} />
        ) : (
          <p className="mt-12 font-kodchasan text-[52px] font-bold leading-tight" style={MISREG_TEXT}>
            {session.topic || "ทำโปรเจกต์ต่อ แล้วอัปเดตกัน"}
          </p>
        )}

        <ScanToRsvp />
      </div>
    </PaperSheet>
  );
}
