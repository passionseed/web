import { Trirong } from "next/font/google";
import { Fragment, type ReactNode } from "react";

import { formatThaiDate } from "@/lib/content/shift-cohort";

import { EL, EL_FONT } from "../brand";
import { AetherPixels, ELEMENT_ICON_ROWS, Pixels, type ElementIconKey } from "../element-icons";
import { Chula, RegisterQr } from "../ElementalKeyPoster";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "../facts";

/**
 * Elemental Hackathon, Instagram slide 2 (1080x1350): every fact in one
 * place, after the key visual on slide 1. Dark ground, cream type, the
 * key visual's grain, and the five elements as flat stepped pixel shapes
 * (brand.ts: "a few flat, one-colour stepped shapes"). Facts come from
 * ../facts.ts only.
 */

const trirong = Trirong({
  weight: ["200", "300", "400"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
const PAD = 64;
/** Slide 1's picture (the blue sky, the main one: Angpao, 2026-11-20) with no type, so the carousel reads as one piece. */
const PLATE = "/hackathon/poster/elemental/plate-key-blue.png";
/** How much of the dark ground covers the picture (1 hides it). */
const VEIL = 0.8;
/** The sign-up QR code's cream block, in px. */
const QR = 148;
const YEAR_TH = Number(ELEMENTAL.startDate.slice(0, 4)) + 543;

/** What each element covers, in the words students use. */
const ELEMENTS: { key: ElementIconKey; color: string; line: string }[] = [
  { key: "earth", color: EL.toxicRust, line: "ขยะและสารพิษ" },
  { key: "water", color: EL.toxicCyan, line: "น้ำเสีย สารเคมีในน้ำ" },
  { key: "air", color: EL.toxicYellow, line: "ฝุ่น PM2.5 ควันพิษ" },
  { key: "fire", color: EL.flame, line: "อัคคีภัย การเผา" },
  // The site's own line for it (components/hackathon/elemental/media.ts on main).
  { key: "aether", color: EL.aetherViolet, line: "AI โซเชียล และเทคที่ทำร้ายเราแบบไม่รู้ตัว" },
];

/** Slide 1's trophy and its yellow, so the prize reads as the same one. */
const TROPHY = ["###########", "#.#h#####.#", "#.#h#####.#", ".#.h####.#.", "...#####...", "....###....", ".....#.....", ".....#.....", "...bbbbb...", "..bbbbbbb.."];
const HIGHLIGHT = "#ffd067";
const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

const SLOT_COLOR = { open: EL.ash, workshop: EL.toxicCyan, due: EL.flame } as const;

function Trophy({ cell }: { cell: number }) {
  return (
    <svg width={11 * cell} height={10 * cell} viewBox="0 0 11 10" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      {TROPHY.flatMap((row, y) => Array.from(row).map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c === "h" ? "#ffffff" : HIGHLIGHT} />)))}
    </svg>
  );
}

const RULE = "1px solid rgba(243,239,230,0.28)";

/** A section heading: a mono number, then the display face, so the Thai reads whole. */
function Head({ n, children, aside }: { n: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontFamily: EL_FONT.mono, fontSize: 18, color: HIGHLIGHT }}>{n}</span>
      <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 30, lineHeight: "38px", color: EL.cream }}>{children}</p>
      {aside ? <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 21, color: EL.creamSoft }}>{aside}</span> : null}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontFamily: EL_FONT.mono, fontSize: 18, color: EL.creamSoft }}>[{children}]</p>;
}

/**
 * The link as printed on the slide: the short one, which redirects to the
 * permanent link. The permanent link is too long for its column.
 */
const SHORT_URL = ELEMENTAL.url.replace(/\/elemental$/, "");

/** One fact: a tag, the big value, one quiet line under it. */
function Fact({ tag, big, below, size = 40 }: { tag: string; big: ReactNode; below: ReactNode; size?: number }) {
  return (
    <div>
      <Tag>{tag}</Tag>
      <p style={{ margin: "2px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: size, lineHeight: `${size + 8}px`, whiteSpace: "nowrap" }}>{big}</p>
      <p style={{ margin: "2px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 21, lineHeight: "28px", color: EL.creamSoft, whiteSpace: "nowrap" }}>{below}</p>
    </div>
  );
}

export function ElementalInfoPoster({ id = "elemental-info" }: { id?: string }) {
  const el = (k: string) => ELEMENTAL.elements.find((e) => e.key === k);
  const days = Array.from(new Set(ELEMENTAL.schedule.map((s) => s.date)));
  return (
    <div
      id={id}
      className={`${trirong.variable} relative overflow-hidden`}
      style={{ width: W, height: H, backgroundColor: EL.char, color: EL.cream, padding: PAD, boxSizing: "border-box", display: "flex", flexDirection: "column" }}
    >
      {/* Slide 1's picture, behind a see-through dark veil so the type stays readable. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATE} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0" style={{ backgroundColor: EL.char, opacity: VEIL }} />

      {/* Grain, like the key visual's film. */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true" style={{ opacity: 0.16, mixBlendMode: "screen" }}>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.5" />
        </filter>
        <rect width={W} height={H} filter={`url(#${id}-grain)`} />
      </svg>

      <div className="relative" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: EL_FONT.mono, fontSize: 20, letterSpacing: "0.08em", color: EL.creamSoft }}>
          <span style={{ display: "flex", alignItems: "center", gap: 16, letterSpacing: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={110} height={44} style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
            <span>×</span>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/passion-seed-logo.png" alt="" width={44} height={44} />
              {/* The name as on slide 1: Libre Franklin, regular (Angpao, 2026-11-23). */}
              <span style={{ fontFamily: "var(--font-libre-franklin), sans-serif", fontWeight: 400, fontSize: 24, letterSpacing: "-0.01em", color: EL.cream }}>PassionSeed</span>
            </span>
          </span>
          <span>{ELEMENTAL.edition.toUpperCase()} HACKATHON</span>
        </div>
        <h1 style={{ margin: "14px 0 0", fontFamily: EL_FONT.display, fontWeight: 200, fontSize: 68, lineHeight: "78px" }}>รายละเอียดการแข่งขัน</h1>
        <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 26, lineHeight: "34px", color: EL.creamSoft }}>
          มือใหม่ก็ร่วมได้ ไม่ต้องมีพื้นฐานมาก่อน เราสอนให้ตั้งแต่ต้น
        </p>

        {/* Redesigned to read in one pass (Angpao, 2026-11-26: "2nd page can you redesign it to make it more digestible"): the three facts that say what it is, then four numbered blocks in reading order (prize, problems, schedule ending at the Demo Day, how to join). */}
        {/* What it is: when, where, who. The biggest type after the title. */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 36, borderTop: RULE, borderBottom: RULE, padding: "14px 0 16px" }}>
          <Fact size={50} tag="วันแข่ง" big={thaiDayRange()} below={`${YEAR_TH} · ${ELEMENTAL.longWeekend ? "หยุดยาว " : ""}${ELEMENTAL.days} วัน`} />
          <Fact size={50} tag="ที่ไหน" big="ออนไลน์" below={`${ELEMENTAL.venueTh.replace("ออนไลน์", "").trim()} อยู่ที่ไหนก็ร่วมได้`} />
          <Fact size={50} tag="ใครสมัครได้" big={ELEMENTAL.gradesTh} below="นักเรียนจากทั่วประเทศ" />
        </div>

        {/* 01 The prize: the total as on slide 1 (trophy, yellow), then a small table, cash and credit in their own columns. */}
        <div style={{ marginTop: 34 }}>
          <Head n="01">รางวัล</Head>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
              <Trophy cell={6} />
              <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 84, lineHeight: "88px", letterSpacing: "-0.01em", color: HIGHLIGHT }}>{prizeTotal()}</span>
              <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 22, lineHeight: "28px", color: EL.cream }}>
                รางวัลรวม
                <br />
                มูลค่า (บาท)
              </span>
            </div>
            <div style={{ flex: 1, fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 22, lineHeight: "30px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto auto auto", justifyContent: "start", columnGap: 36 }}>
                <span />
                <span style={{ fontSize: 18, lineHeight: "24px", color: EL.creamSoft }}>เงินสด</span>
                <span style={{ fontSize: 18, lineHeight: "24px", color: EL.creamSoft }}>เครดิต Claude</span>
                {ELEMENTAL.prizes.map((p) => (
                  <Fragment key={p.place}>
                    <span style={{ fontWeight: 400, color: HIGHLIGHT }}>ที่ {p.place}</span>
                    <span>{p.cashBaht ? baht(p.cashBaht) : "–"}</span>
                    <span>{baht(p.creditBaht)}</span>
                  </Fragment>
                ))}
              </div>
              {/* The winner of each element (Angpao, 2026-11-24: "5 รางวัลสำหรับผู้ชนะแต่ละธาตุ"). */}
              <p style={{ margin: "4px 0 0", borderTop: RULE, paddingTop: 4, fontSize: 21, whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 400, color: HIGHLIGHT }}>+ {ELEMENTAL.elements.length} รางวัลสำหรับผู้ชนะแต่ละธาตุ</span> เครดิต Claude {baht(ELEMENTAL.elementPrizeCreditBaht)}
              </p>
            </div>
          </div>
        </div>

        {/* 02 The five elements. */}
        <div style={{ marginTop: 34 }}>
          <Head n="02" aside="เลือกปัญหาไหนก็ได้ในธาตุนั้น">
            โจทย์ 5 ธาตุ
          </Head>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr) 1.55fr", columnGap: 18 }}>
            {ELEMENTS.map(({ key, color, line }) => (
              <div key={key}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {key === "aether" ? <AetherPixels rows={ELEMENT_ICON_ROWS[key]} size={40} id={`${id}-aether`} /> : <Pixels rows={ELEMENT_ICON_ROWS[key]} color={color} size={40} />}
                  <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 30, lineHeight: "38px", whiteSpace: "nowrap" }}>{el(key)?.th}</p>
                </div>
                <p style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 20, lineHeight: "27px", color: EL.creamSoft }}>{line}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 03 The schedule as one timeline, ending at the Demo Day (Angpao, 2026-11-26), which gets its own lit stop. */}
        <div style={{ marginTop: 34 }}>
          <Head
            n="03"
            aside={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 18, background: SLOT_COLOR.workshop }} />
                เวิร์กช็อปสด
              </span>
            }
          >
            กำหนดการ
          </Head>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 1fr 1.5fr", columnGap: 14 }}>
            {days.map((d) => (
              <div key={d} style={{ borderTop: `2px solid ${EL.cream}`, paddingTop: 8 }}>
                <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 24, lineHeight: "32px" }}>{formatThaiDate(d)}</p>
                {ELEMENTAL.schedule
                  .filter((s) => s.date === d)
                  .map((s) => (
                    <div key={s.time + s.th} style={{ marginTop: 6, paddingLeft: 10, borderLeft: `4px solid ${SLOT_COLOR[s.kind]}` }}>
                      <p style={{ margin: 0, fontFamily: EL_FONT.mono, fontSize: 17, color: SLOT_COLOR[s.kind] }}>{s.time}</p>
                      <p style={{ margin: "1px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 20, lineHeight: "26px" }}>{s.th.replace(/^เวิร์กช็อป: /, "")}</p>
                    </div>
                  ))}
              </div>
            ))}
            <div style={{ borderTop: `2px solid ${HIGHLIGHT}`, background: "rgba(255,208,103,0.12)", padding: "8px 12px 12px" }}>
              <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 24, lineHeight: "32px", color: HIGHLIGHT }}>
                {ELEMENTAL.demoDay.date ? formatThaiDate(ELEMENTAL.demoDay.date) : "ปิดท้าย"}
              </p>
              <p style={{ margin: "4px 0 0", fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 32, lineHeight: "40px", whiteSpace: "nowrap" }}>
                Demo Day @<Chula />
              </p>
              <p style={{ margin: "4px 0 0", fontFamily: EL_FONT.mono, fontSize: 17, color: HIGHLIGHT }}>CSII · {ELEMENTAL.demoDay.time}</p>
              <p style={{ margin: "2px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 20, lineHeight: "26px" }}>ผู้สนับสนุนและผู้เชี่ยวชาญแต่ละด้านมาชมผลงาน</p>
            </div>
          </div>
        </div>

        {/* 04 How to join, next to the QR code. */}
        <div style={{ marginTop: "auto", marginRight: QR + 28 }}>
          <Head n="04">สมัคร</Head>
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", columnGap: 24, borderTop: RULE, paddingTop: 10 }}>
            <Fact size={34} tag="ทีม" big={`${ELEMENTAL.teamMin}–${ELEMENTAL.teamMax} คน`} below="มาคนเดียวได้ เราหาทีมให้" />
            <Fact size={34} tag="ค่าสมัคร" big={`฿${ELEMENTAL.groupPriceBaht} / คน`} below={`มากับเพื่อน · คนเดียว ฿${ELEMENTAL.priceBaht}`} />
            <Fact size={34} tag="ปิดรับสมัคร" big={formatThaiDate(ELEMENTAL.registrationClosesOn, false)} below={SHORT_URL} />
          </div>
        </div>
        <div className="absolute" style={{ right: 0, bottom: 0, width: QR }}>
          <div style={{ background: EL.cream, padding: 8 }}>
            <RegisterQr size={QR - 16} />
          </div>
          {/* The line sits under the cream block, not in it (Angpao, 2026-11-23). */}
          <p className="whitespace-nowrap text-center" style={{ margin: "5px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 17, lineHeight: "22px", color: EL.cream }}>สแกนเพื่อสมัครได้เลย</p>
        </div>
      </div>
    </div>
  );
}
