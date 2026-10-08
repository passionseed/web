import type { ReactNode } from "react";

import { formatThaiDate, pairPriceBaht } from "@/lib/content/shift-cohort";
import { SHIFT_VOICES } from "@/lib/content/shift-voices";

import { MissionPatch } from "../MissionPatch";
import { PHONE_W, PosterPhone, StickerNote } from "../PosterPhone";
import { CertPile } from "../ShiftPosterDetails";
import {
  ChromeWordmark,
  INK,
  MISREG_TEXT,
  MarkerHighlight,
  OrbitSky,
  PaperSheet,
  PassionSeedMark,
} from "../riso";
import { COHORT, DIM, INK_H, INK_W, KeywordBubble, SheetFoot, TILE_H, TILE_W } from "./RisoSlide";

/**
 * SHIFT[2] IG grid covers: one riso dawn, three posts wide, the same orbit as
 * the CampHub poster. The planet's curve runs across all three tiles.
 *
 *   A (left):   why it works, and what we changed after the first round.
 *               Camp certificates setting behind the planet.
 *   B (middle): students in their own words. The crew patches rise.
 *   C (right):  the offer, the CampHub cover recut with the phone rising.
 *
 * Post C first, then B, then A, so A lands top-left.
 */

export const TILE_LETTERS = ["a", "b", "c"] as const;
export type TileLetter = (typeof TILE_LETTERS)[number];
export const COVER_TOTALS: Record<TileLetter, number> = { a: 5, b: 5, c: 5 };

/** Horizon, in px from the top of each inked area. */
const HORIZON = 980;
const PANO_W = INK_W * TILE_LETTERS.length;

/** A tile's inked window inside the panorama. */
function Tile({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="absolute top-0 h-full" style={{ left: index * INK_W, width: INK_W }}>
      {children}
    </div>
  );
}

/** Pill for the top-right of a tile, matching CohortBadge. */
function TagPill({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 font-kodchasan text-[26px] font-semibold"
      style={{ color: INK.paper, backgroundColor: `${INK.black}59`, boxShadow: `inset 0 0 0 1.5px ${INK.paper}4d` }}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: INK.orange }} />
      {children}
    </span>
  );
}

function Masthead({ tag }: { tag: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <PassionSeedMark size={52} />
      <TagPill>{tag}</TagPill>
    </div>
  );
}

/** What sits under the horizon in every tile: the line, then the page foot. */
function Ground({ children, total }: { children: ReactNode; total: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col px-[62px] pb-[44px]" style={{ top: HORIZON + 56 }}>
      <div className="flex-1">{children}</div>
      <SheetFoot page={1} total={total} />
    </div>
  );
}

// ---- A: why it works ---------------------------------------------------

function CoverA() {
  return (
    <>
      <div className="relative px-[62px] pt-[46px]">
        <Masthead tag="Why it works" />
        <h2 className="mt-14 font-kodchasan text-[124px] font-bold leading-[1.2] tracking-tight" style={MISREG_TEXT}>
          ฟังรุ่นแรก
          <br />
          แล้วปรับ 4 อย่าง
        </h2>
        <p className="mt-6 font-kodchasan text-[44px] font-semibold leading-[1.35]" style={{ color: INK.paper }}>
          รุ่นแรกบอกอะไรเรา
          <br />
          และ {COHORT.name} ต่างจากเดิมยังไง
        </p>
      </div>
      <Ground total={COVER_TOTALS.a}>
        <p className="font-kodchasan text-[46px] font-bold leading-[1.3]" style={{ color: INK.paper }}>
          ไม่ใช่ค่ายนั่งฟัง <MarkerHighlight>ลงมือทำเอง</MarkerHighlight>
        </p>
        <p className="mt-3 text-[30px]" style={{ color: DIM }}>
          mentor ช่วยถาม ไม่คิดแทน
        </p>
      </Ground>
    </>
  );
}

// ---- B: students in their own words -----------------------------------

const CREW_HUB = { x: INK_W / 2 + 160, y: HORIZON - 40 };
const CREW = [
  { ink: INK.pink, top: "ALUMNI", center: "[0]", bottom: "SHIFT[0]", x: -260, y: -50, tilt: -10 },
  { ink: INK.orange, top: "ALUMNI", center: "[1]", bottom: "SHIFT[1]", x: -80, y: -190, tilt: 8 },
  { ink: INK.blue, top: "MENTOR", center: "BAScii", bottom: "ตัวจริง", x: 150, y: -150, tilt: -6 },
];
const PATCH = 160;
const SEAT = 210;

/** The crew from the SHIFT[2] cover, rising around the empty seat. */
function RisingCrew() {
  return (
    <>
      <MissionPatch
        size={SEAT}
        ink={INK.paper}
        open
        top="SHIFT[2] CREW"
        bottom="ที่ว่างของเรา"
        center="YOU"
        centerSize={0.26}
        style={{ left: CREW_HUB.x - SEAT / 2, top: CREW_HUB.y - SEAT / 2 }}
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
          style={{ left: CREW_HUB.x + p.x - PATCH / 2, top: CREW_HUB.y + p.y - PATCH / 2, rotate: `${p.tilt}deg` }}
        />
      ))}
    </>
  );
}

function CoverB() {
  const kk = SHIFT_VOICES.kkGrandpa;
  return (
    <>
      <div className="relative px-[62px] pt-[46px]">
        <Masthead tag="จากคนที่ทำจริง" />
        <p className="mt-16 font-kodchasan text-[150px] font-bold leading-[0.6]" style={{ color: INK.orange }}>
          “
        </p>
        {/* KK's words verbatim, trimmed with an ellipsis, never reworded. */}
        <h2 className="font-kodchasan text-[84px] font-bold leading-[1.3] tracking-tight" style={MISREG_TEXT}>
          เห็นคุณตาที่บ้าน
          <br />
          สแกน QR Code ไม่เป็น
          <br />
          … ผมเลยทำแอป
          <br />
          ช่วยคนแก่
        </h2>
        <p className="mt-5 font-kodchasan text-[36px] font-semibold" style={{ color: INK.paper }}>
          {kk.name} · {kk.meta}
        </p>
      </div>
      <Ground total={COVER_TOTALS.b}>
        <p className="font-kodchasan text-[46px] font-bold leading-[1.3]" style={{ color: INK.paper }}>
          ปัญหาจริง จากคนรอบตัวจริง
        </p>
        <p className="mt-3 text-[30px]" style={{ color: DIM }}>
          ปัดฟังคนที่ทำเล่าเองว่า 7 วันนั้นเป็นยังไง
        </p>
      </Ground>
    </>
  );
}

// ---- C: the offer, the CampHub cover recut ------------------------------

const PHONE_RISE = 470;

/** Bring-a-friend price pill, same look as the other SHIFT posters. */
function CoverFriendDeal() {
  const friend = pairPriceBaht(COHORT);
  if (!friend) return null;
  return (
    <p
      className="mt-4 inline-block whitespace-nowrap rounded-full px-6 py-1.5 font-kodchasan text-[34px] font-semibold"
      style={{ color: INK.paper, boxShadow: `inset 0 0 0 2px ${INK.pink}`, backgroundColor: `${INK.pink}26` }}
    >
      มากับเพื่อน เหลือคนละ ฿{friend.toLocaleString("en-US")}
    </p>
  );
}

function CoverC() {
  return (
    <>
      <StickerNote
        style={{ left: 70, top: HORIZON - 330 }}
        size={34}
        arrowStyle={{ left: "70%" }}
        text="ต้นแบบแบบนี้ ม.5 ทำเองได้"
      />
      <div className="relative px-[62px] pt-[46px]">
        <Masthead tag="ปิดเทอมผ่านไปครึ่งนึงแล้ว" />
        <h1 className="mt-14 font-kodchasan text-[80px] font-bold leading-[1.25] tracking-tight" style={MISREG_TEXT}>
          7 วัน ปั้นต้นแบบ
          <br />
          ที่คนนอกลองใช้ได้
        </h1>
        <div className="-ml-[36px] mt-6">
          <ChromeWordmark size={120} name={COHORT.name} />
        </div>
      </div>
      <Ground total={COVER_TOTALS.c}>
        <p className="font-kodchasan text-[52px] font-bold leading-[1.25]" style={MISREG_TEXT}>
          ฿{COHORT.priceBaht.toLocaleString("en-US")} · ปิดรับ {formatThaiDate(COHORT.applyDeadline)}
        </p>
        <CoverFriendDeal />
        <div className="mt-5 flex items-center gap-5">
          <p className="font-kodchasan text-[36px] font-bold" style={{ color: INK.yellow }}>
            คอมเมนต์
          </p>
          <KeywordBubble size={38} />
          <p className="font-kodchasan text-[36px] font-bold" style={{ color: INK.yellow }}>
            รับลิงก์สมัคร
          </p>
        </div>
      </Ground>
    </>
  );
}

const COVERS: Record<TileLetter, () => ReactNode> = { a: CoverA, b: CoverB, c: CoverC };

/** Things that come up from behind the planet; the planet is drawn over them. */
function RisingLayer() {
  return (
    <>
      <Tile index={0}>
        <div className="absolute" style={{ left: 560, top: HORIZON - 190, scale: 2.4, transformOrigin: "top left" }}>
          <CertPile />
        </div>
      </Tile>
      <Tile index={1}>
        <RisingCrew />
      </Tile>
      <Tile index={2}>
        <PosterPhone style={{ left: INK_W - 45 - PHONE_W, top: HORIZON - PHONE_RISE }} showUsers={false} />
      </Tile>
    </>
  );
}

/** The three inked areas as one continuous scene. */
function PanoramaInk() {
  return (
    <div className="absolute left-0 top-0" style={{ width: PANO_W, height: INK_H }}>
      <OrbitSky horizon={HORIZON} rising={<RisingLayer />} planetWidth={PANO_W * 5} />
      {TILE_LETTERS.map((letter, i) => {
        const Cover = COVERS[letter];
        return (
          <Tile key={letter} index={i}>
            <Cover />
          </Tile>
        );
      })}
    </div>
  );
}

/** One 1080x1440 cover: the panorama seen through its sheet's inked window. */
export function RisoGridCover({ letter, id }: { letter: TileLetter; id?: string }) {
  const index = TILE_LETTERS.indexOf(letter);
  return (
    <PaperSheet id={id ?? `shift2-grid-${letter}-1`} width={TILE_W} height={TILE_H}>
      <div className="absolute top-0" style={{ left: -index * INK_W }}>
        <PanoramaInk />
      </div>
    </PaperSheet>
  );
}

/** All three covers side by side, as the profile grid will show them. */
export function RisoGridPanorama({ id }: { id?: string }) {
  return (
    <div id={id} className="flex shrink-0">
      {TILE_LETTERS.map((letter) => (
        <RisoGridCover key={letter} letter={letter} id={`${id}-${letter}`} />
      ))}
    </div>
  );
}
