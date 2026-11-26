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
 * day and extend duration of hackathon").
 *
 * Its own photo at full brightness, not dimmed (Angpao, same day: "use new
 * background and don't dim the bg make it work"): dark type sits on the
 * light sky, and everything below the horizon sits on solid cards and a
 * solid band, so the photo never has to be darkened. Layout choices follow a
 * cognitive-science review of the first draft (cogsci-design-review skill).
 * Facts come from ../facts.ts only.
 */

const trirong = Trirong({
  weight: ["200", "300", "400", "500"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
const PAD = 64;
/** A valley under a cloudy sky, not used on slides 1 and 2. */
const PHOTO = "/hackathon/poster/elemental/bg/valley-sergei-gussev-stocksnap.jpg";
const QR = 156;
const HIGHLIGHT = "#ffd067";
/** The dates before the change (Angpao, 2026-11-19), shown crossed out. */
const OLD_RANGE = "5–7 ธ.ค.";
/** The link as printed on slide 2: the short one, which redirects. */
const SHORT_URL = ELEMENTAL.url.replace(/\/elemental$/, "");
/** Where the ticket's stub ends, in px from its left edge. */
const STUB = 236;
/** The radius of the ticket's two notches. */
const NOTCH = 16;

const due = ELEMENTAL.schedule.find((s) => s.kind === "due");

export function ElementalNewsPoster({ id = "elemental-news" }: { id?: string }) {
  const demo = ELEMENTAL.demoDay;
  // "ส. 12 ธ.ค." split into the weekday, the day and the month for the ticket stub.
  const [demoWeekday, demoDay, demoMonth] = demo.date ? formatThaiDate(demo.date).split(" ") : [];
  const notchMask = `radial-gradient(circle ${NOTCH}px at ${STUB}px 0, transparent ${NOTCH - 0.5}px, #000 ${NOTCH}px), radial-gradient(circle ${NOTCH}px at ${STUB}px 100%, transparent ${NOTCH - 0.5}px, #000 ${NOTCH}px)`;
  return (
    <div
      id={id}
      className={`${trirong.variable} relative overflow-hidden`}
      style={{ width: W, height: H, backgroundColor: "#d9dcd8", color: EL.ink, padding: PAD, boxSizing: "border-box" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PHOTO} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" style={{ objectFit: "cover", objectPosition: "72% 30%" }} />
      {/* Grain, like the key visual's film. Light, so the photo stays bright. */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true" style={{ opacity: 0.12, mixBlendMode: "overlay" }}>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.5" />
        </filter>
        <rect width={W} height={H} filter={`url(#${id}-grain)`} />
      </svg>

      <div className="relative" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header: the three names, dark on the sky as on slide 1. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: EL_FONT.mono, fontSize: 20, color: EL.inkSoft }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={110} height={44} style={{ filter: "brightness(0)", opacity: 0.85 }} />
          <span>×</span>
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/passion-seed-logo.png" alt="" width={44} height={44} />
            <PassionSeedWordmark height={24} style={{ color: EL.ink }} />
          </span>
          <span>×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/partners/csii.png" alt="CSII, Chulalongkorn School of Integrated Innovation" width={135} height={44} style={{ opacity: 0.88 }} />
        </div>

        {/* The event's name, big enough to place the post in the feed, and what kind of post it is. */}
        <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: EL_FONT.display, fontStyle: "italic", fontWeight: 300, fontSize: 50, lineHeight: "58px" }}>{ELEMENTAL.edition} Hackathon</span>
          <span style={{ fontFamily: EL_FONT.display, fontWeight: 500, fontSize: 24, lineHeight: "32px", background: EL.ink, color: HIGHLIGHT, padding: "2px 14px" }}>อัปเดตใหม่</span>
        </div>
        <h1 style={{ margin: "10px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 76, lineHeight: "92px", letterSpacing: "-0.005em" }}>
          แข่งนานขึ้นเป็น {ELEMENTAL.days} วัน
          <br />
          แล้วไปโชว์ผลงานที่<span style={{ fontWeight: 500 }}>จุฬาฯ</span>
        </h1>

        {/* The change itself: online, the old dates crossed out, the new ones on a highlighter mark. */}
        <div style={{ marginTop: 26 }}>
          <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 26, lineHeight: "32px" }}>แข่งออนไลน์ทาง Discord</p>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 2 }}>
            <span className="relative" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 44, lineHeight: "56px", color: EL.inkSoft }}>
              {OLD_RANGE}
              {/* A slanted cross-out, so it can't merge with the dash in "5–7". */}
              <span className="absolute" style={{ left: -4, right: -4, top: "52%", height: 4, background: EL.ember, transform: "rotate(-12deg)" }} />
            </span>
            <span style={{ fontFamily: EL_FONT.mono, fontSize: 36, color: EL.inkSoft }}>→</span>
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 108, lineHeight: "112px", letterSpacing: "-0.01em", background: `linear-gradient(transparent 52%, ${HIGHLIGHT} 52%, ${HIGHLIGHT} 90%, transparent 90%)`, padding: "0 10px" }}>
              {thaiDayRange()}
            </span>
          </div>
          {due ? (
            <p style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 28, lineHeight: "36px" }}>
              ส่งคลิปผลงาน <span style={{ fontWeight: 500 }}>{formatThaiDate(due.date)} {due.time} น.</span>
            </p>
          ) : null}
        </div>

        {/* The Demo Day as a ticket: the day big on the stub, so its date is as easy to see as its name. Solid cream, so the photo under it needs no dimming. */}
        <div style={{ marginTop: 56, display: "flex", background: EL.cream, maskImage: notchMask, WebkitMaskImage: notchMask, maskComposite: "intersect", WebkitMaskComposite: "source-in", boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}>
          <div style={{ width: STUB, flex: "none", background: HIGHLIGHT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "18px 0", borderRight: `3px dashed ${EL.ink}` }}>
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 30, lineHeight: "34px" }}>{demoWeekday ?? "ปิดท้าย"}</span>
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 112, lineHeight: "112px" }}>{demoDay ?? ""}</span>
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 30, lineHeight: "34px" }}>{demoMonth ?? ""}</span>
          </div>
          <div style={{ flex: 1, padding: "20px 28px 22px" }}>
            <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 24, lineHeight: "30px", color: EL.inkSoft }}>ปิดท้ายแบบออนไซต์</p>
            <p style={{ margin: "2px 0 0", fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 64, lineHeight: "80px", whiteSpace: "nowrap" }}>
              Demo Day @<Chula />
            </p>
            <p style={{ margin: "2px 0 0", fontFamily: EL_FONT.display, fontWeight: 500, fontSize: 30, lineHeight: "38px" }}>{demo.time} น. · CSII</p>
            <p style={{ margin: "4px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 24, lineHeight: "32px" }}>ผู้สนับสนุนและผู้เชี่ยวชาญแต่ละด้านมาชมผลงาน</p>
          </div>
        </div>

        {/* The partnership in words, as its own group (the review: the logo alone read as a venue credit). */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 20, background: "#ffffff", padding: "14px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.14)" }}>
          <span style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 28, lineHeight: "34px", whiteSpace: "nowrap" }}>จับมือกับ</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/partners/csii.png" alt="CSII, Chulalongkorn School of Integrated Innovation" width={153} height={50} />
          <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 21, lineHeight: "27px" }}>
            Chulalongkorn School of Integrated Innovation
            <br />
            จุฬาลงกรณ์มหาวิทยาลัย
          </span>
        </div>
      </div>

      {/* Foot: a solid band like slide 1's, with the deadline in the accent and a way to sign up from the same phone. */}
      <div className="absolute" style={{ left: 0, right: 0, bottom: 0, height: 214, background: EL.char, color: EL.cream, padding: `26px ${PAD}px 0`, boxSizing: "border-box" }}>
        <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 44, lineHeight: "54px" }}>
          ยังสมัครได้ถึง <span style={{ fontWeight: 500, color: HIGHLIGHT }}>{formatThaiDate(ELEMENTAL.registrationClosesOn)}</span>
        </p>
        <p style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 24, lineHeight: "32px" }}>
          สมัครที่ <span style={{ fontWeight: 400, color: HIGHLIGHT }}>{SHORT_URL}</span>
        </p>
        <p style={{ margin: "4px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 21, lineHeight: "28px", color: EL.creamSoft }}>
          {ELEMENTAL.gradesTh} · มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} / คน · คนเดียว ฿{ELEMENTAL.priceBaht}
        </p>
        <div className="absolute" style={{ right: PAD, top: 22, width: QR }}>
          <div style={{ background: EL.cream, padding: 8 }}>
            <RegisterQr size={QR - 16} />
          </div>
        </div>
      </div>
    </div>
  );
}
