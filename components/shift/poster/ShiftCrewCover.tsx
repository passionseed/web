import { SHIFT_COHORT_2 } from "@/lib/content/shift-cohort";

import { Footer, Timeline } from "./ShiftPosterCover";
import { MissionPatch } from "./MissionPatch";
import {
  ChromeWordmark,
  CohortBadge,
  INK,
  MISREG_TEXT,
  OrbitSky,
  PageMark,
  PaperSheet,
  PassionSeedMark,
  ShiftTracks,
} from "./riso";

/**
 * SHIFT[2] cover, "Mission Crew": the same dawn from orbit, but instead of a
 * finished project the hero is the crew you join. Seniors from SHIFT[0] and
 * SHIFT[1] and mentors from BAScii are sewn-on patches circling one empty
 * seat, the student's own, still waiting to be stitched on.
 */

const COHORT = SHIFT_COHORT_2;
const HORIZON_Y = 700;

/** Crew orbit centre, in px inside the inked area. */
const HUB = { x: 820, y: 430 };

const CREW = [
  { ink: INK.pink, top: "รุ่นพี่", center: "[0]", bottom: "SHIFT[0]", x: -120, y: -230, tilt: -10 },
  { ink: INK.orange, top: "รุ่นพี่", center: "[1]", bottom: "SHIFT[1]", x: 100, y: -190, tilt: 8 },
  { ink: INK.blue, top: "MENTOR", center: "BAScii", bottom: "ตัวจริง", x: 110, y: 160, tilt: -6 },
];

const PATCH = 170;
const SEAT = 230;

function Masthead() {
  return (
    <div className="flex items-center justify-between">
      <PassionSeedMark size={52} />
      <CohortBadge size={24} cohort={COHORT} />
    </div>
  );
}

function SkyTitle() {
  return (
    <div className="max-w-[580px]">
      <h1
        className="font-kodchasan text-[66px] font-bold leading-[1.28] tracking-tight"
        style={MISREG_TEXT}
      >
        7 วัน ปั้น 1
        <br />
        โปรเจกต์จริง
      </h1>
      <p
        className="mt-2 font-kodchasan text-[30px] font-semibold leading-[1.35]"
        style={{ color: INK.paper }}
      >
        มีรุ่นพี่และ mentor ตัวจริงอยู่ข้างๆ
      </p>
      <div className="-ml-[40px] mt-3">
        <ChromeWordmark size={134} name={COHORT.name} />
      </div>
      <div className="mt-6">
        <ShiftTracks size={32} />
      </div>
    </div>
  );
}

/** A dashed orbit the crew rides on, tilted like the rest of the type. */
function CrewOrbit() {
  return (
    <svg
      className="absolute"
      style={{ left: HUB.x - 230, top: HUB.y - 260 }}
      width={460}
      height={520}
      viewBox="0 0 460 520"
      aria-hidden="true"
    >
      <ellipse
        cx={230}
        cy={260}
        rx={190}
        ry={240}
        transform="rotate(-18 230 260)"
        fill="none"
        stroke={INK.paper}
        strokeOpacity={0.45}
        strokeWidth={2}
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Crew() {
  return (
    <>
      <CrewOrbit />
      <MissionPatch
        size={SEAT}
        ink={INK.paper}
        open
        top="SHIFT[2] CREW"
        bottom="ที่ว่างของเรา"
        center="YOU"
        centerSize={0.26}
        style={{ left: HUB.x - SEAT / 2, top: HUB.y - SEAT / 2 }}
      />
      {CREW.map((p) => (
        <MissionPatch
          key={p.bottom}
          size={PATCH}
          ink={p.ink}
          top={p.top}
          bottom={p.bottom}
          center={p.center}
          centerSize={p.center.length > 3 ? 0.17 : 0.28}
          style={{
            left: HUB.x + p.x - PATCH / 2,
            top: HUB.y + p.y - PATCH / 2,
            rotate: `${p.tilt}deg`,
          }}
        />
      ))}
    </>
  );
}

/** Who is actually in the room, said plainly under the timeline. */
function CrewLine() {
  return (
    <p className="text-center text-[20px]" style={{ color: `${INK.paper}b3` }}>
      ม.4–ม.6 · รุ่นพี่ SHIFT[0] และ SHIFT[1] ช่วยดูงาน · mentor จริงจาก BAScii · ใช้ AI ไม่ต้องมีพื้นฐาน
    </p>
  );
}

export function ShiftCrewCover() {
  return (
    <PaperSheet id="shift2-poster-1">
      <OrbitSky horizon={HORIZON_Y} rising={<Crew />} />
      <div className="relative flex h-full flex-col px-[62px] pb-[44px] pt-[46px]">
        <Masthead />
        <div className="mt-[34px]">
          <SkyTitle />
        </div>

        <div className="mt-auto space-y-7">
          <Timeline />
          <CrewLine />
          <Footer cohort={COHORT} />
          <div className="flex items-center justify-between">
            <PageMark page={1} total={2} />
            <span className="font-mono text-[13px] tracking-[0.3em]" style={{ color: `${INK.paper}80` }}>
              SWIPE →
            </span>
          </div>
        </div>
      </div>
    </PaperSheet>
  );
}
