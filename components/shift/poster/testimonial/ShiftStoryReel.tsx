"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { Rects } from "../pixel/PixelRects";
import { PX, type Rect } from "../pixel/pixelKit";
import { cameraKeyframes, flashKeyframes, gradeKeyframes, panKeyframes } from "./reelEngine";
import {
  Flash,
  HEADLINE_SHADOW,
  Headline,
  Highlight,
  Lines,
  Offer,
  Panorama,
  PhoneBody,
  REEL_H,
  REEL_W,
  Tag,
  Top,
  cardStyle,
  timing,
  useRenderMode,
  whole,
} from "./reelParts";
import {
  BOOK,
  BOOK_COUNT,
  CERT_H,
  CERT_W,
  FACULTY,
  HAMMER_H,
  HAMMER_W,
  WALKER_H,
  WALKER_W,
  bookRects,
  certRects,
  facultyRects,
  hammerRects,
  walkerRects,
} from "./storyArt";
import {
  CRAM_STAMPS,
  HAMMER,
  PHONE_LANDINGS,
  STORY_BEAT,
  storyCues,
  storyGrade,
  storyShots,
  storyTimeline,
  within,
  type StoryTimeline,
} from "./storyReel";

/**
 * SHIFT[1] MOFU Reel, 1080x1920: why PassionSeed exists, cut to the founder's
 * voiceover. Same stage, render mode and cue sheet as the testimonial Reels;
 * adds a colour grade (rain, night, sun) that carries the story's mood.
 */

type Tl = { tl: StoryTimeline };
type Vars = CSSProperties & Record<`--${string}`, string>;

/** A kit sprite as its own small SVG, `cell` px per grid cell. */
function Sprite({ rects, w, h, cell }: { rects: Rect[]; w: number; h: number; cell: number }) {
  return (
    <svg width={w * cell} height={h * cell} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true" overflow="visible">
      <Rects rects={rects} />
    </svg>
  );
}

function Card({ start, end, top, children }: { start: number; end: number; top: number; children: ReactNode }) {
  return (
    <div
      className="reel-rise absolute inset-x-[64px] px-[48px] py-[36px] text-center"
      style={{ top, ...cardStyle, ...timing(start, end) }}
    >
      <p className="font-kodchasan text-[60px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
        {children}
      </p>
    </div>
  );
}

function Pop({ at, children, style }: { at: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="reel-pop" style={{ ...style, ...timing(at) }}>
      {children}
    </span>
  );
}

/* ---------- 1. Hook: what we hate ---------- */

function Hook({ tl }: Tl) {
  const { t, end } = tl;
  const stamps = ["ติวเพื่อสอบ", "สอบเสร็จก็ลืม", "ไร้ความหมาย"];
  return (
    <>
      <Top start={t.hate} end={end.cram}>
        <Tag>WHY WE EXIST</Tag>
        <Headline>
          <Lines text={"ทีมเราเกลียด\nสิ่งเดียวกัน"} />
        </Headline>
      </Top>
      {stamps.map((word, i) => (
        <div
          key={word}
          className="reel-slam absolute left-1/2 whitespace-nowrap px-[36px] py-[10px] font-kodchasan text-[84px] font-bold"
          style={{
            top: 600 + i * 170,
            marginLeft: [-420, -300, -330][i],
            rotate: `${[-4, 3, -2][i]}deg`,
            color: i === 2 ? PX.ink : PX.cream,
            backgroundColor: i === 2 ? PX.accentLight : PX.accentDark,
            ...timing(within(tl, "cram", CRAM_STAMPS[i]), end.cram),
          }}
        >
          {word}
        </div>
      ))}
    </>
  );
}

/* ---------- 2. What we love ---------- */

function Love({ tl }: Tl) {
  const { t, end } = tl;
  const chips = ["คอม", "เกม", "สร้างแอปเอง"];
  return (
    <>
      <Top start={t.love} end={end.love}>
        <Tag>WHAT WE LOVE</Tag>
        <Headline>สิ่งที่เราชอบ</Headline>
        <div className="mt-8 flex gap-5">
          {chips.map((chip, i) => (
            <Pop
              key={chip}
              at={within(tl, "love", [0.2, 0.5, 0.8][i])}
              style={{ padding: "8px 30px", backgroundColor: i === 2 ? PX.accent : PX.ink, color: PX.cream }}
            >
              <span className="font-kodchasan text-[64px] font-bold">{chip}</span>
            </Pop>
          ))}
        </div>
      </Top>
    </>
  );
}

/* ---------- 3. The idol and the hammer ---------- */

const WALL = { cols: 4, rows: 3, cell: 12, gap: 8, top: 600 };

function CertWall({ tl }: Tl) {
  const { t, end } = tl;
  const impact = t.access + HAMMER.flight;
  const certW = CERT_W * WALL.cell + WALL.gap;
  const certH = CERT_H * WALL.cell + WALL.gap;
  const left = (REEL_W - WALL.cols * certW) / 2;
  const rects = certRects();
  return (
    <div
      className="reel-rise absolute"
      style={{ left, top: WALL.top, width: WALL.cols * certW, height: WALL.rows * certH, ...timing(t.idol + 0.3, end.access) }}
    >
      {Array.from({ length: WALL.cols * WALL.rows }, (_, i) => {
        const col = i % WALL.cols;
        const row = Math.floor(i / WALL.cols);
        const dx = (col - 1.5) * 260 + ((i * 37) % 60);
        const dy = 300 + row * 180 + ((i * 53) % 120);
        const vars: Vars = {
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--rot": `${((i * 71) % 180) - 90}deg`,
          ...timing(impact),
        };
        return (
          <div key={i} className="reel-shatter absolute" style={{ left: col * certW, top: row * certH, ...vars }}>
            <Sprite rects={rects} w={CERT_W} h={CERT_H} cell={WALL.cell} />
          </div>
        );
      })}
    </div>
  );
}

function Hammer({ tl }: Tl) {
  const { t } = tl;
  const cell = 14;
  const style: Vars = {
    left: REEL_W / 2 - (HAMMER_W * cell) / 2,
    top: WALL.top + 60,
    "--flight": `${HAMMER.flight}s`,
    ...timing(t.access + HAMMER.throwAt, t.access + HAMMER.flight + 0.6),
  };
  return (
    <div className="reel-hammer absolute" style={style}>
      <Sprite rects={hammerRects()} w={HAMMER_W} h={HAMMER_H} cell={cell} />
    </div>
  );
}

function Idol({ tl }: Tl) {
  const { t, end } = tl;
  return (
    <>
      <Top start={t.idol} end={end.access}>
        <Tag>OUR IDOL</Tag>
        <Headline>
          <Lines text={"ไอดอลผม\nสตีฟ จ็อบส์"} />
        </Headline>
      </Top>
      <CertWall tl={tl} />
      <Hammer tl={tl} />
      <Card start={within(tl, "access", 0.35)} end={end.access} top={1000}>
        เขาเอาเทคโนโลยี
        <br />
        ไปอยู่ในมือทุกคน
      </Card>
    </>
  );
}

function Change({ tl }: Tl) {
  const { t, end } = tl;
  return (
    <Top start={t.change} end={end.change}>
      <Tag>THE PLAN</Tag>
      <Headline>
        <Lines text={"อยากสร้างอะไร\nที่เปลี่ยนโลก"} />
      </Headline>
      <p className="mt-10 font-kodchasan text-[84px] font-bold leading-[1.3]" style={{ color: PX.ink }}>
        <Pop at={within(tl, "change", 0.55)}>
          <Highlight at={within(tl, "change", 0.55)}>จุดเริ่มคือการศึกษา</Highlight>
        </Pop>
      </p>
    </Top>
  );
}

/* ---------- 4. The scene: friends choosing "safe" ---------- */

const FAC = { cell: 7, left: 390, top: 640 };
const TOP_CARD = 250;
const WALK_DOOR_X = FAC.left + FACULTY.door.x * FAC.cell;

function Faculty({ tl }: Tl) {
  const { t, end } = tl;
  const walkerCell = 8;
  const baseY = FAC.top + FACULTY.h * FAC.cell - WALKER_H * walkerCell;
  return (
    <div className="reel-rise absolute inset-0" style={timing(t.safe, end.future)}>
      <div className="absolute" style={{ left: FAC.left, top: FAC.top }}>
        <Sprite rects={facultyRects()} w={FACULTY.w} h={FACULTY.h} cell={FAC.cell} />
        <p
          className="absolute left-1/2 top-[70px] -translate-x-1/2 whitespace-nowrap px-6 py-1 font-kodchasan text-[46px] font-bold"
          style={{ color: PX.cream, backgroundColor: PX.ink, border: `4px solid ${PX.cream}` }}
        >
          คณะที่เซฟ
        </p>
      </div>
      {Array.from({ length: 5 }, (_, i) => {
        const startX = -60 - i * 90;
        const vars: Vars = {
          left: startX,
          top: baseY,
          "--dx": `${WALK_DOOR_X - startX + 10}px`,
          "--dur": `${(within(tl, "safe", 0.95) - t.safe) * 0.9 + i * 0.15}s`,
          ...timing(t.safe + 0.2),
        };
        return (
          <div key={i} className="reel-walk absolute" style={vars}>
            <Sprite rects={walkerRects(i)} w={WALKER_W} h={WALKER_H} cell={walkerCell} />
          </div>
        );
      })}
    </div>
  );
}

function Books({ tl }: Tl) {
  const { t, end } = tl;
  const cell = 7;
  const bottom = FAC.top + FACULTY.h * FAC.cell;
  return (
    <div className="absolute" style={{ left: 120, top: 0 }}>
      {Array.from({ length: BOOK_COUNT }, (_, i) => (
        <div
          key={i}
          className="reel-slam absolute"
          style={{
            left: 0,
            top: bottom - (i + 1) * BOOK.h * cell,
            ...timing(t.cramming + (i / BOOK_COUNT) * (end.cramming - t.cramming), end.future),
          }}
        >
          <Sprite rects={bookRects(i)} w={BOOK.w + 2} h={BOOK.h} cell={cell} />
        </div>
      ))}
    </div>
  );
}

/** Props live inside the graded world so the rain and grey reach them. */
function FriendsWorld({ tl }: Tl) {
  return (
    <>
      <Faculty tl={tl} />
      <Books tl={tl} />
    </>
  );
}

function Friends({ tl }: Tl) {
  const { t, end } = tl;
  const stuck = ["ไม่สนุก", "ไม่กล้าซิ่ว", "ต้องทนเรียนต่อ"];
  return (
    <>
      <Card start={t.safe} end={end.safe} top={TOP_CARD}>
        ผมเห็นเพื่อนๆ เลือกคณะ
        <br />
        ที่สังคมบอกว่า
        <span style={{ color: PX.accentLight }}>เซฟ</span>
      </Card>
      <Card start={t.cramming} end={end.cramming} top={TOP_CARD}>
        อ่านสอบแทบตาย
      </Card>
      <Card start={t.stuck} end={end.stuck} top={TOP_CARD}>
        พอเข้าไปเรียน
        <br />
        {stuck.map((w, i) => (
          <Pop key={w} at={within(tl, "stuck", [0.1, 0.4, 0.7][i])}>
            {w}
            {i < 2 && " · "}
          </Pop>
        ))}
      </Card>
      <Card start={t.future} end={end.future} top={TOP_CARD}>
        ไม่ชอบงานที่จะได้
        <br />
        อนาคตไม่รู้
      </Card>
    </>
  );
}

function Hopeless({ tl }: Tl) {
  const { t, end } = tl;
  return (
    <p
      className="reel-fade-slow absolute inset-x-0 top-[820px] text-center font-kodchasan text-[80px] font-bold"
      style={{ color: `${PX.cream}dd`, ...timing(t.hopeless + 0.2, end.hopeless) }}
    >
      หมดหวัง
    </p>
  );
}

/* ---------- 5. The turn ---------- */

function Mission({ tl }: Tl) {
  const { t, end } = tl;
  return (
    <Top start={t.mission} end={end.mission}>
      <Tag>OUR MISSION</Tag>
      <Headline size={100}>
        <Lines text={"ให้เด็กเลือกชีวิตตัวเอง"} />
        <span className="mt-2 inline-block">
          <Highlight at={within(tl, "mission", 0.45)}>ด้วยความมั่นใจ</Highlight>
        </span>
      </Headline>
      <p className="mt-6 font-kodchasan text-[64px] font-bold" style={{ color: PX.near }}>
        ไม่ใช่
        <span className="reel-strike ml-3" style={timing(within(tl, "mission", 0.85))}>
          ความกังวล
        </span>
      </p>
    </Top>
  );
}

function Journey({ tl }: Tl) {
  const { t, end } = tl;
  return (
    <>
      <Top start={t.journey} end={end.journey}>
        <Tag>WHAT WE DID</Tag>
        <Headline>
          <Lines text={"จัดค่าย\nจัดงานแข่ง"} />
        </Headline>
      </Top>
      <div
        className="reel-rise absolute inset-x-[64px] top-[640px] flex flex-col items-center px-[40px] py-[36px]"
        style={{ ...cardStyle, ...timing(t.journey + 0.2, end.journey) }}
      >
        <p className="font-kodchasan text-[150px] font-bold leading-none" style={{ color: PX.accentLight }}>
          <style>{"@keyframes reel-count-1000{to{--reel-n:1000}}"}</style>
          <span
            className="reel-count"
            style={{ animation: `reel-count-1000 1.2s cubic-bezier(0.2, 0.7, 0.3, 1) ${t.journey + 0.2}s both` }}
          />
          +
        </p>
        <p className="mt-2 font-kodchasan text-[52px] font-bold" style={{ color: PX.cream }}>
          น้องใน community
        </p>
      </div>
    </>
  );
}

function Antidote({ tl }: Tl) {
  const { t, end } = tl;
  const pillars: [typeof t.choose, string][] = [
    [t.choose, "เลือกด้วยตัวเองได้"],
    [t.able, "มีความสามารถจริง"],
    [t.friends, "เจอเพื่อนที่เข้าใจกัน"],
  ];
  return (
    <>
      <Top start={t.antidote} end={end.friends}>
        <Tag>WHAT WE FOUND</Tag>
        <Headline>
          <span className="block whitespace-nowrap">ยาแก้</span>
          <span className="block whitespace-nowrap" style={{ color: PX.accentDark }}>
            ความหมดหวัง
          </span>
        </Headline>
      </Top>
      {pillars.map(([at, text], i) => (
        <div
          key={text}
          className="reel-rise absolute inset-x-[64px] flex items-center gap-8 px-[44px] py-[28px]"
          style={{ top: 620 + i * 190, ...cardStyle, ...timing(at, end.friends) }}
        >
          <span className="font-kodchasan text-[72px] font-bold" style={{ color: PX.accentLight }}>
            0{i + 1}
          </span>
          <span className="font-kodchasan text-[60px] font-bold" style={{ color: PX.cream }}>
            {text}
          </span>
        </div>
      ))}
    </>
  );
}

/* ---------- 6. Proof and offer ---------- */

const SHIPPED = [
  { title: "Magnified Lens", shots: ["/shift/testimonial/lens-zoom.png"], bezel: false },
  { title: "TradBid", shots: ["/shift/testimonial/tradbid.png"], bezel: true },
  { title: "ปฏิทิน กสพท70", shots: ["/shift/testimonial/kaspt70-countdown.png"], bezel: true },
];

function Shipped({ tl }: Tl) {
  const { t, end } = tl;
  const w = 290;
  const h = 580;
  return (
    <>
      <Top start={t.shift} end={end.shift}>
        <Tag>SHIFT · 7 DAYS</Tag>
        <Headline size={92}>
          <Lines text={"เลือกโจทย์เอง สร้างเอง\nมีคนใช้จริง"} />
        </Headline>
      </Top>
      {SHIPPED.map((app, i) => (
        <div
          key={app.title}
          className="reel-phone absolute"
          style={{
            left: REEL_W / 2 - w / 2 + (i - 1) * 320,
            top: 650 + (i === 1 ? -20 : 30),
            width: w,
            height: h,
            rotate: `${(i - 1) * 7}deg`,
            filter: `drop-shadow(10px 10px 0 ${PX.ink}66)`,
            ...timing(within(tl, "shift", PHONE_LANDINGS[i]), end.shift),
          }}
        >
          <PhoneBody shots={app.shots} bezel={app.bezel} />
          <p
            className="absolute inset-x-0 -top-[64px] text-center font-kodchasan text-[36px] font-bold"
            style={{ color: PX.ink, textShadow: HEADLINE_SHADOW }}
          >
            {app.title}
          </p>
        </div>
      ))}
    </>
  );
}

/* ---------- Weather overlays ---------- */

const RAIN_TILE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' shape-rendering='crispEdges'><g fill='%2377909e'><rect x='10' y='6' width='6' height='18'/><rect x='58' y='40' width='6' height='18'/><rect x='34' y='70' width='6' height='18'/><rect x='82' y='22' width='6' height='18'/></g></svg>\")";

function Weather({ seconds }: { seconds: number }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={whole("reel-rain", seconds)}>
        <div className="reel-rainfall absolute inset-0" style={{ backgroundImage: RAIN_TILE, backgroundSize: "96px 96px" }} />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "#0b1733", mixBlendMode: "multiply", ...whole("reel-night", seconds) }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 78% 42%, rgba(255,226,150,0.85), rgba(255,200,110,0.25) 40%, transparent 70%)",
          mixBlendMode: "screen",
          ...whole("reel-sun", seconds),
        }}
      />
    </>
  );
}

/* ---------- Stage ---------- */

export function ShiftStoryReel({ render = false, starts }: { render?: boolean; starts?: number[] | null }) {
  const [take, setTake] = useState(0);
  const tl = useMemo(() => storyTimeline(starts), [starts]);
  const cues = useMemo(() => storyCues(tl), [tl]);
  useRenderMode(render, cues);
  const { seconds } = tl;
  return (
    <div
      key={take}
      id="shift-testimonial-reel"
      className="relative shrink-0 overflow-hidden"
      style={{ width: REEL_W, height: REEL_H, backgroundColor: PX.ink }}
      onClick={render ? undefined : () => setTake((n) => n + 1)}
      title={render ? undefined : "Click to replay"}
    >
      <style>{cameraKeyframes(cues) + gradeKeyframes(storyGrade(tl), seconds)}</style>
      <div className="absolute inset-0 origin-[50%_40%]" style={whole("reel-cam", seconds)}>
        <div className="absolute inset-0" style={whole("reel-grade", seconds)}>
          <Panorama panKeyframes={panKeyframes(storyShots(tl), seconds)} seconds={seconds} />
          <FriendsWorld tl={tl} />
        </div>
        <Weather seconds={seconds} />
        <Friends tl={tl} />
        <Hook tl={tl} />
        <Love tl={tl} />
        <Idol tl={tl} />
        <Change tl={tl} />
        <Hopeless tl={tl} />
        <Mission tl={tl} />
        <Journey tl={tl} />
        <Antidote tl={tl} />
        <Shipped tl={tl} />
        <Offer start={tl.t.cta} beat={STORY_BEAT} tag="5-11 OCT · ONLINE" />
      </div>
      <Flash keyframes={flashKeyframes(cues)} seconds={seconds} />
    </div>
  );
}
