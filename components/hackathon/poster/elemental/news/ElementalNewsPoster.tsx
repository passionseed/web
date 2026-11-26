import { Trirong } from "next/font/google";

import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PassionSeedWordmark } from "@/components/hackathon/PassionSeedWordmark";

import { EL, EL_FONT } from "../brand";
import { Chula, RegisterQr } from "../ElementalKeyPoster";
import { ELEMENTAL, thaiDayRange } from "../facts";

/**
 * Elemental Hackathon, an Instagram announcement (1080x1350): the hackathon
 * is longer (5 to 10 Dec instead of 5 to 7), the work is due Thu 10 Dec, and
 * it ends with a Demo Day at CSII, Chulalongkorn, with CSII as partner
 * (Angpao, 2026-11-26: "poster tell that we got collab with csii with demo
 * day and extend duration of hackathon"). Same ground as slide 2: slide 1's
 * picture under a dark veil, with grain. Facts come from ../facts.ts only.
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
const PLATE = "/hackathon/poster/elemental/plate-key-blue.png";
const VEIL = 0.82;
const QR = 148;
const HIGHLIGHT = "#ffd067";
const RULE = "1px solid rgba(243,239,230,0.28)";
/** The dates before the change (Angpao, 2026-11-19), shown struck through. */
const OLD_RANGE = "5–7 ธ.ค.";

const due = ELEMENTAL.schedule.find((s) => s.kind === "due");

export function ElementalNewsPoster({ id = "elemental-news" }: { id?: string }) {
  const demo = ELEMENTAL.demoDay;
  return (
    <div
      id={id}
      className={`${trirong.variable} relative overflow-hidden`}
      style={{ width: W, height: H, backgroundColor: EL.char, color: EL.cream, padding: PAD, boxSizing: "border-box" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATE} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0" style={{ backgroundColor: EL.char, opacity: VEIL }} />
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true" style={{ opacity: 0.16, mixBlendMode: "screen" }}>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.5" />
        </filter>
        <rect width={W} height={H} filter={`url(#${id}-grain)`} />
      </svg>

      <div className="relative" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header: the three names together, CSII in cream like the rest. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: EL_FONT.mono, fontSize: 20, color: EL.creamSoft }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={110} height={44} style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
          <span>×</span>
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/passion-seed-logo.png" alt="" width={44} height={44} />
            <PassionSeedWordmark height={24} style={{ color: EL.cream }} />
          </span>
          <span>×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/partners/csii.png" alt="CSII, Chulalongkorn School of Integrated Innovation" width={135} height={44} style={{ filter: "invert(1)", opacity: 0.92 }} />
        </div>

        <p style={{ margin: "44px 0 0", fontFamily: EL_FONT.mono, fontSize: 20, letterSpacing: "0.08em", color: HIGHLIGHT }}>
          {ELEMENTAL.edition.toUpperCase()} HACKATHON · <span style={{ fontFamily: EL_FONT.display, letterSpacing: 0, fontSize: 24 }}>อัปเดตใหม่</span>
        </p>
        <h1 style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 200, fontSize: 84, lineHeight: "100px" }}>
          ขยายเวลาเป็น {ELEMENTAL.days} วัน
          <br />
          ปิดท้ายที่<span style={{ fontWeight: 400 }}>จุฬาฯ</span>
        </h1>

        {/* The change itself: the old dates struck through, the new ones big. */}
        <div style={{ marginTop: 34, borderTop: RULE, paddingTop: 20 }}>
          <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 24, color: EL.creamSoft }}>วันแข่ง</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 26, marginTop: 4 }}>
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 44, color: EL.creamSoft, textDecoration: "line-through", textDecorationThickness: 3 }}>{OLD_RANGE}</span>
            <span style={{ fontFamily: EL_FONT.mono, fontSize: 36, color: EL.creamSoft }}>→</span>
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 104, lineHeight: "112px", color: HIGHLIGHT, letterSpacing: "-0.01em" }}>{thaiDayRange()}</span>
          </div>
          {due ? (
            <p style={{ margin: "4px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 28, lineHeight: "36px" }}>
              ส่งคลิปผลงาน {formatThaiDate(due.date)}
            </p>
          ) : null}
        </div>

        {/* The Demo Day, the news people should remember: a lit block like its stop on slide 2. */}
        <div style={{ marginTop: 34, borderTop: `3px solid ${HIGHLIGHT}`, background: "rgba(255,208,103,0.12)", padding: "20px 28px 26px" }}>
          <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 32, lineHeight: "40px", color: HIGHLIGHT }}>
            {demo.date ? `${formatThaiDate(demo.date)} · ` : ""}
            {demo.time} น.
          </p>
          <p style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 76, lineHeight: "92px", whiteSpace: "nowrap" }}>
            Demo Day @<Chula />
          </p>
          <p style={{ margin: "8px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 28, lineHeight: "38px" }}>
            ที่ CSII จุฬาลงกรณ์มหาวิทยาลัย
            <br />
            ผู้สนับสนุนและผู้เชี่ยวชาญแต่ละด้านมาชมผลงาน
          </p>
        </div>

        {/* The partner, said in words as well as in the header (Angpao, 2026-11-26: "we got collab with csii"). */}
        <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 26 }}>
          <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 34, lineHeight: "40px" }}>ร่วมกับ</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/partners/csii.png" alt="CSII, Chulalongkorn School of Integrated Innovation" width={245} height={80} style={{ filter: "invert(1)" }} />
        </div>

        {/* Foot: there is still time to sign up, next to the QR code. */}
        <div style={{ marginTop: "auto", marginRight: QR + 28 }}>
          <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 40, lineHeight: "50px" }}>
            ยังสมัครได้ถึง <span style={{ fontWeight: 400, color: HIGHLIGHT }}>{formatThaiDate(ELEMENTAL.registrationClosesOn)}</span>
          </p>
          <p style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 23, lineHeight: "30px", color: EL.creamSoft }}>
            {ELEMENTAL.gradesTh} · {ELEMENTAL.venueTh} · มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} / คน
          </p>
        </div>
        <div className="absolute" style={{ right: 0, bottom: 0, width: QR }}>
          <div style={{ background: EL.cream, padding: 8 }}>
            <RegisterQr size={QR - 16} />
          </div>
          <p className="whitespace-nowrap text-center" style={{ margin: "5px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 17, lineHeight: "22px", color: EL.cream }}>สแกนเพื่อสมัครได้เลย</p>
        </div>
      </div>
    </div>
  );
}
