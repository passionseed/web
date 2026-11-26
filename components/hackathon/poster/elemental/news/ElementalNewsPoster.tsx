import { Trirong } from "next/font/google";

import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PassionSeedWordmark } from "@/components/hackathon/PassionSeedWordmark";

import { EL, EL_FONT } from "../brand";
import { Chula, EditionWord, Fact, ICON, Pixels, RegisterQr } from "../ElementalKeyPoster";
import { ELEMENTAL, thaiDayRange } from "../facts";

/**
 * Elemental Hackathon, an Instagram announcement (1080x1350): the hackathon
 * is longer (5 to 10 Dec instead of 5 to 7), the work is due Thu 10 Dec, and
 * it ends with a Demo Day at CSII, Chulalongkorn, with CSII as partner
 * (Angpao, 2026-11-26).
 *
 * Built the way the key poster (slide 1) is, because that is why it works
 * (Angpao, same day: "look at our main poster why is it good replicate it
 * not put text all screen with no design"):
 * - one picture fills the sheet, at full brightness, with one bright object
 *   in a calm photo. Here a pink pixel sun coming up behind the ridge, with
 *   pixel clouds; pink is Chula's colour on these posters;
 * - three sizes of type only: the title on the sky, one row of small facts
 *   with pixel icons, one big yellow line on the dark foot;
 * - type sits on calm parts of the picture, never on a box;
 * - the same anchors: names top left, QR code bottom right, one line at the
 *   bottom.
 * The plate is made by scripts/render-elemental-news-plate.mjs (the pixel
 * kit the key poster uses) from a photo
 * slides 1 and 2 don't use. Facts come from ../facts.ts only.
 */

const trirong = Trirong({
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
const PLATE = "/hackathon/poster/elemental/plate-news-valley.png";
const HIGHLIGHT = "#ffd067";
/** The dates before the change (Angpao, 2026-11-19), shown crossed out. */
const OLD_RANGE = "5–7";

const due = ELEMENTAL.schedule.find((s) => s.kind === "due");

export function ElementalNewsPoster({ id = "elemental-news" }: { id?: string }) {
  const demo = ELEMENTAL.demoDay;
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: "#2a2b26" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATE} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />

      {/* The dark foot, as on slide 1: only the bottom fades, the picture stays bright. */}
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-foot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f0f0d" stopOpacity="0" />
            <stop offset="0.32" stopColor="#0f0f0d" stopOpacity="0.58" />
            <stop offset="0.6" stopColor="#0f0f0d" stopOpacity="0.8" />
            <stop offset="1" stopColor="#0f0f0d" stopOpacity="0.92" />
          </linearGradient>
          <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect y={H - 330} width={W} height={330} fill={`url(#${id}-foot)`} />
      </svg>

      {/* Title lockup on the sky, as on slide 1. */}
      <div className="absolute left-[56px] top-[46px]" style={{ color: EL.ink }}>
        <div className="flex items-center gap-[18px]" style={{ marginLeft: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={125} height={50} style={{ filter: "brightness(0)", opacity: 0.85 }} />
          <span style={{ fontFamily: EL_FONT.mono, fontSize: 20, color: EL.inkSoft }}>×</span>
          <span className="flex items-center gap-[10px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/passion-seed-logo.png" alt="" width={50} height={50} />
            <PassionSeedWordmark height={26} style={{ color: EL.ink }} />
          </span>
          {/* What kind of post it is. */}
          <span style={{ marginLeft: 8, fontFamily: EL_FONT.display, fontWeight: 500, fontSize: 24, lineHeight: "34px", background: EL.ink, color: HIGHLIGHT, padding: "0 14px" }}>อัปเดตใหม่</span>
        </div>
        {/* The event × CSII as the title, the two sides equal: the name on two lines, the CSII logo as tall as its letters need to match, centred on it (Angpao, 2026-11-26: "use Elemental Hackathon X CSII logo at the top make it stand out", then "the CSII logo is not equal as elemental hackathon"). */}
        <div className="flex items-center" style={{ marginTop: 22, gap: 30 }}>
          {/* Set at slide 1's 124px and scaled as one piece, because the pixel letters in the name are drawn for that size. */}
          <h1 className="m-0" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em", zoom: 100 / 124 }}>
            <span className="block" style={{ fontWeight: 200, fontSize: 124 }}>
              <EditionWord />
            </span>
            <span className="block" style={{ fontWeight: 300, fontStyle: "italic", fontSize: 124 }}>
              Hackathon
            </span>
          </h1>
          <span style={{ fontFamily: EL_FONT.display, fontWeight: 200, fontSize: 76, lineHeight: "76px", color: EL.inkSoft }}>×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/partners/csii.png" alt="CSII, Chulalongkorn School of Integrated Innovation" width={368} height={120} />
        </div>
        {/* The facts as one row under the title, in ink on the sky. The date leads, with the old one crossed out. */}
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-[6px]" style={{ width: 700, marginLeft: 4, marginTop: 16, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 23, lineHeight: "32px" }}>
          <Fact icon="date" color={EL.ink}>
            <span className="relative" style={{ color: EL.inkSoft, marginRight: 10 }}>
              {OLD_RANGE}
              <span className="absolute" style={{ left: -2, right: -2, top: "48%", height: 3, background: EL.ember, transform: "rotate(-32deg)" }} />
            </span>
            <span style={{ fontWeight: 600, background: `linear-gradient(transparent 55%, ${HIGHLIGHT} 55%, ${HIGHLIGHT} 92%, transparent 92%)`, padding: "0 4px" }}>{thaiDayRange()}</span>
          </Fact>
          <Fact icon="online" color={EL.ink}>ออนไลน์</Fact>
          <Fact icon="school" color={EL.ink}>{`${ELEMENTAL.gradesTh} เท่านั้น`}</Fact>
          {due ? <Fact icon="workshop" color={EL.ink}>{`ส่งคลิป ${formatThaiDate(due.date)} ${due.time} น.`}</Fact> : null}
          <Fact icon="friends" color={EL.ink}>{`สมัครได้ถึง ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`}</Fact>
        </div>
      </div>

      {/* The foot, as slide 1's prize: one big yellow line, a small label beside it, the QR code, and one sentence. */}
      <div className="absolute inset-x-[56px] bottom-[48px]" style={{ fontFamily: EL_FONT.display, color: EL.cream }}>
        <div className="flex items-end justify-between gap-[14px]">
          <div className="flex items-end whitespace-nowrap" style={{ gap: 16 }}>
            <span style={{ marginBottom: 16 }}>
              <Pixels rows={ICON.pin} fill={{ "#": HIGHLIGHT }} cell={7} />
            </span>
            <span style={{ fontWeight: 200, fontSize: 92, lineHeight: "96px", letterSpacing: "-0.01em", color: HIGHLIGHT }}>Demo Day</span>
            <span style={{ marginBottom: 8, fontWeight: 400, fontSize: 23, lineHeight: "31px" }}>
              <span className="block" style={{ fontWeight: 600, fontSize: 30, lineHeight: "40px" }}>
                {/* The place is the CSII building at Chula, not just Chula (Angpao, 2026-11-26). */}
                @ ตึก CSII<Chula />
              </span>
              <span className="block">
                {demo.date ? `${formatThaiDate(demo.date)} · ` : ""}
                {demo.time} น.
              </span>
              <span className="block" style={{ color: HIGHLIGHT }}>{demo.whoTh}</span>
            </span>
          </div>
          <div style={{ background: EL.cream, padding: 9, flex: "none", marginBottom: 6 }}>
            <RegisterQr size={148} />
          </div>
        </div>
        <div className="whitespace-nowrap" style={{ marginTop: 12, fontWeight: 500, fontSize: 40, lineHeight: "52px" }}>
          แข่งนานขึ้นเป็น {ELEMENTAL.days} วัน แล้วไปโชว์ผลงานที่ตึก CSII จุฬา
        </div>
      </div>

      {/* Grain over the type too, so it sits in the same film. */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
        <rect width={W} height={H} filter={`url(#${id}-grain)`} opacity="0.1" style={{ mixBlendMode: "overlay" }} />
      </svg>
    </div>
  );
}
