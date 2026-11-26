import { Trirong } from "next/font/google";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { EL, EL_FONT } from "../brand";
import { ELEMENTAL } from "../facts";

/**
 * Elemental Hackathon: "ask us anything" post (Linear HAC-81, Big,
 * 2026-11-26: "just let people comment their questions"). The feed post asks
 * for questions in the comments; the Story frame leaves room for Instagram's
 * question sticker, so people can ask privately too. A follow-up post answers
 * them.
 *
 * Same plate and type as the key poster (../ElementalKeyPoster.tsx, rules in
 * ../brand.ts). The one new piece: the question mark is taken over by Aether
 * pixels, the way the key title's letters are taken over by the elements.
 * It names no dates except the sign-up close, which comes from ../facts.
 */

const trirong = Trirong({
  weight: ["200", "300", "400", "500"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const FEED = { w: 1080, h: 1350 } as const;
export const STORY = { w: 1080, h: 1920 } as const;
const PLATE = "/hackathon/poster/elemental/plate-key-blue.png";

/** "ศ. 4 ธ.ค. 23:59": when sign-up closes. */
function closesLine() {
  return `${formatThaiDate(ELEMENTAL.registrationClosesOn)} ${ELEMENTAL.registrationClosesAt}`;
}

/**
 * A question mark taken over by Aether pixels: violet and lilac cells, a few
 * breaking off upwards. 9 x 15 cells. The real "?" stays in the line,
 * see-through, so the spacing doesn't move.
 */
const Q_ROWS = [
  "......l..",
  "..v......",
  "....l..v.",
  ".........",
  "..VVVVV..",
  ".VVlllVV.",
  "VV.....VV",
  ".......VV",
  "......VV.",
  "....VVV..",
  "....VV...",
  "....VV...",
  ".........",
  "....VV...",
  "....VV...",
];
const Q_FILL: Record<string, string> = {
  V: EL.aetherViolet,
  v: EL.aetherViolet,
  l: EL.aetherLilac,
};

function PixelQuestion({ cell }: { cell: number }) {
  const w = Q_ROWS[0].length;
  const h = Q_ROWS.length;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ color: "transparent" }}>?</span>
      <svg
        width={w * cell}
        height={h * cell}
        viewBox={`0 0 ${w} ${h}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "0.2em",
          transform: "translateX(-50%)",
        }}
      >
        {Q_ROWS.flatMap((row, y) =>
          Array.from(row).map((c, x) =>
            Q_FILL[c] ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={Q_FILL[c]}
                opacity={c === "V" ? 1 : 0.75}
              />
            ) : null,
          ),
        )}
      </svg>
    </span>
  );
}

/** A 9x9 pixel icon, as in the key poster's facts row. */
function Icon({
  rows,
  color,
  cell = 3,
}: {
  rows: readonly string[];
  color: string;
  cell?: number;
}) {
  return (
    <svg
      width={rows[0].length * cell}
      height={rows.length * cell}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: "block", flex: "none" }}
    >
      {rows.flatMap((row, y) =>
        Array.from(row).map((c, x) =>
          c === "#" ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
const DATE_ICON = [
  "#.......#",
  "#########",
  "#########",
  "#.......#",
  "#.#.#.#.#",
  "#.......#",
  "#.#.#.#.#",
  "#.......#",
  "#########",
];

/** The Next Decade × PassionSeed, as on the key poster. */
function Lockup() {
  return (
    <div className="flex items-center gap-[18px]" style={{ marginLeft: 4 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hackathon/HackLogo.png"
        alt={ELEMENTAL.series}
        width={125}
        height={50}
        style={{ filter: "brightness(0)", opacity: 0.85 }}
      />
      <span
        style={{ fontFamily: EL_FONT.mono, fontSize: 20, color: EL.inkSoft }}
      >
        ×
      </span>
      <span className="flex items-center gap-[10px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/passion-seed-logo.png" alt="" width={50} height={50} />
        <span
          style={{
            fontFamily: "var(--font-libre-franklin), sans-serif",
            fontWeight: 400,
            fontSize: 26,
            letterSpacing: "-0.01em",
            color: EL.ink,
          }}
        >
          PassionSeed
        </span>
      </span>
    </div>
  );
}

/** The dark foot under the cream type, as on the key poster. */
function Foot({ w, h, height }: { w: number; h: number; height: number }) {
  return (
    <svg
      className="absolute inset-0"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="el-ask-foot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f0f0d" stopOpacity="0" />
          <stop offset="0.35" stopColor="#0f0f0d" stopOpacity="0.6" />
          <stop offset="0.65" stopColor="#0f0f0d" stopOpacity="0.82" />
          <stop offset="1" stopColor="#0f0f0d" stopOpacity="0.92" />
        </linearGradient>
      </defs>
      <rect y={h - height} width={w} height={height} fill="url(#el-ask-foot)" />
    </svg>
  );
}

/** Feed post, 1080x1350: ask for questions in the comments. */
export function ElementalAskFeed({
  id = "elemental-ask-feed",
}: {
  id?: string;
}) {
  const { w, h } = FEED;
  return (
    <div
      id={id}
      className={`${trirong.variable} relative overflow-hidden`}
      style={{ width: w, height: h, backgroundColor: "#2a2b26" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PLATE}
        alt=""
        width={w}
        height={h}
        className="absolute inset-0 h-full w-full"
      />
      <Foot w={w} h={h} height={430} />

      <div
        className="absolute left-[56px] top-[46px]"
        style={{ color: EL.ink }}
      >
        <Lockup />
        <div
          className="mt-[26px]"
          style={{
            fontFamily: EL_FONT.display,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: 44,
            lineHeight: "52px",
            marginLeft: 4,
          }}
        >
          Elemental Hackathon
        </div>
        <h1
          className="m-0 mt-[4px]"
          style={{ fontFamily: EL_FONT.display, letterSpacing: "-0.01em" }}
        >
          <span
            className="block whitespace-nowrap"
            style={{ fontWeight: 200, fontSize: 132, lineHeight: "168px" }}
          >
            มีคำถาม
            <PixelQuestion cell={9.5} />
          </span>
          <span
            className="block whitespace-nowrap"
            style={{ fontWeight: 300, fontSize: 92, lineHeight: "118px" }}
          >
            คอมเมนต์มาเลย
          </span>
        </h1>
      </div>

      {/* The ask and the promise sit on the dark foot, where they read; the sky keeps only the title. */}
      <div
        className="absolute inset-x-[56px] bottom-[50px]"
        style={{ fontFamily: EL_FONT.display, color: EL.cream }}
      >
        <p
          className="m-0 border-b pb-[22px]"
          style={{
            borderColor: "rgba(243,239,230,0.4)",
            fontWeight: 400,
            fontSize: 34,
            lineHeight: "50px",
          }}
        >
          สงสัยเรื่องไหน พิมพ์ไว้ใต้โพสต์นี้
          <br />
          เรารวบรวมมาตอบในโพสต์ถัดไป
        </p>
        <div className="mt-[20px] flex items-end justify-between">
          <div>
            <div
              style={{
                fontWeight: 400,
                fontSize: 24,
                lineHeight: "32px",
                color: EL.creamSoft,
              }}
            >
              ปิดรับสมัคร
            </div>
            <div
              className="flex items-center gap-[14px] whitespace-nowrap"
              style={{ fontWeight: 300, fontSize: 54, lineHeight: "66px" }}
            >
              <Icon rows={DATE_ICON} color={EL.cream} cell={5} />
              {closesLine()}
            </div>
          </div>
          <div
            className="pb-[10px] text-right"
            style={{
              fontFamily: EL_FONT.mono,
              fontSize: 20,
              lineHeight: "28px",
              color: EL.creamSoft,
            }}
          >
            สมัครที่ลิงก์ในโปรไฟล์
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Story frame, 1080x1920: room in the sky for Instagram's question sticker.
 * `mock` draws a stand-in sticker so a reviewer can see the layout; upload
 * the frame without it and add the real sticker in the app.
 */
export function ElementalAskStory({
  id = "elemental-ask-story",
  mock = false,
}: {
  id?: string;
  mock?: boolean;
}) {
  const { w, h } = STORY;
  return (
    <div
      id={id}
      className={`${trirong.variable} relative overflow-hidden`}
      style={{ width: w, height: h, backgroundColor: "#2a2b26" }}
    >
      {/* The plate scaled to the Story's height; cropped from the left so the fire and smoke stay in frame. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PLATE}
        alt=""
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: "cover", objectPosition: "72% 50%" }}
      />
      <Foot w={w} h={h} height={760} />

      {/* Top 250px stay clear for Instagram's own bar. */}
      <div
        className="absolute left-[64px] top-[250px]"
        style={{ color: EL.ink }}
      >
        <Lockup />
        <div
          className="mt-[24px]"
          style={{
            fontFamily: EL_FONT.display,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: 46,
            lineHeight: "54px",
            marginLeft: 4,
          }}
        >
          Elemental Hackathon
        </div>
        <h1
          className="m-0"
          style={{ fontFamily: EL_FONT.display, letterSpacing: "-0.01em" }}
        >
          <span
            className="block whitespace-nowrap"
            style={{ fontWeight: 200, fontSize: 140, lineHeight: "176px" }}
          >
            มีคำถาม
            <PixelQuestion cell={10} />
          </span>
        </h1>
        <p
          className="m-0 mt-[6px]"
          style={{
            fontFamily: EL_FONT.display,
            fontWeight: 400,
            fontSize: 36,
            lineHeight: "52px",
            marginLeft: 4,
          }}
        >
          ถามในกล่องนี้ได้เลย
        </p>
      </div>

      {mock ? (
        <div
          className="absolute left-1/2 top-[690px] -translate-x-1/2 overflow-hidden"
          style={{
            width: 640,
            borderRadius: 28,
            background: "#ffffff",
            boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
          }}
        >
          <div
            className="px-[36px] pb-[26px] pt-[40px] text-center"
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
              fontSize: 36,
              lineHeight: "46px",
              color: "#111",
            }}
          >
            สงสัยอะไรเรื่อง Elemental?
          </div>
          <div
            className="mx-[28px] mb-[30px] py-[20px] text-center"
            style={{
              borderRadius: 14,
              background: "#efefef",
              fontFamily: "system-ui, sans-serif",
              fontSize: 28,
              color: "#8e8e8e",
            }}
          >
            พิมพ์อะไรก็ได้
          </div>
          <div
            className="absolute right-[14px] top-[12px]"
            style={{ fontFamily: EL_FONT.mono, fontSize: 16, color: "#b00" }}
          >
            MOCK
          </div>
        </div>
      ) : null}

      {/* Bottom 260px stay clear for the reply bar. */}
      <div
        className="absolute inset-x-[64px] bottom-[280px]"
        style={{ fontFamily: EL_FONT.display, color: EL.cream }}
      >
        <div style={{ fontWeight: 400, fontSize: 30, lineHeight: "44px" }}>
          เรารวบรวมมาตอบในโพสต์ถัดไป ไม่โชว์ชื่อคนถาม
        </div>
        <div
          className="mt-[22px] flex items-center gap-[14px] whitespace-nowrap"
          style={{ fontWeight: 300, fontSize: 46, lineHeight: "58px" }}
        >
          <Icon rows={DATE_ICON} color={EL.cream} cell={4} />
          ปิดรับสมัคร {closesLine()}
        </div>
      </div>
    </div>
  );
}
