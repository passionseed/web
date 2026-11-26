import { Trirong } from "next/font/google";

import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PassionSeedWordmark } from "@/components/hackathon/PassionSeedWordmark";

import { EL, EL_FONT } from "../brand";
import { CHULA_PINK, Chula, EditionWord, ICON, Pixels, RegisterQr } from "../ElementalKeyPoster";
import { ELEMENTAL } from "../facts";

/**
 * Elemental Hackathon, an Instagram announcement (1080x1350): the hackathon
 * is longer (5 to 10 Dec instead of 5 to 7), the work is due Thu 10 Dec, and
 * it ends with a Demo Day at CSII, Chulalongkorn, with CSII as partner
 * (Angpao, 2026-11-26).
 *
 * Built the way the key poster (slide 1) is (Angpao, same day: "look at our
 * main poster why is it good replicate it not put text all screen with no
 * design"): one photo fills the sheet at full brightness, type sits on its
 * calm parts, and the names are top left with one line at the bottom, as there. The QR
 * code is bottom left here.
 *
 * The middle is a calendar, not pixel art (Angpao, same day: "remove the
 * pixel background but make it visualize date what day did what and what
 * day is the holliday cause 5-7 and 10 is holliday"): Fri 4 to Sat 12 Dec,
 * the days off school in red, the six days of the hackathon on one yellow
 * mark, what happens under each day, and the Demo Day on Chula's pink.
 * The photo is one slides 1 and 2 don't use. Facts come from ../facts.ts.
 */

const trirong = Trirong({
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
/** A valley under a cloudy sky. Set larger than the sheet, so the ridge sits below the calendar. */
const PHOTO = "/hackathon/poster/elemental/bg/valley-sergei-gussev-stocksnap.jpg";
const HIGHLIGHT = "#ffd067";
/** Holidays, as on a Thai wall calendar: red. Deep enough to read on the grey sky. */
const HOLIDAY = "#a8200e";
/** The dates before the change (Angpao, 2026-11-19), shown crossed out. */
const OLD_RANGE = "5–7";
/**
 * The dates this poster prints: from the first day to the Demo Day, "5–12 ธ.ค."
 * (Angpao, 2026-11-26: "change to 5-12 but 12 Demo Day have (Optional)").
 * The competing days themselves still end on ELEMENTAL.endDate, the hand-in.
 */
const LAST_DAY = ELEMENTAL.demoDay.date ?? ELEMENTAL.endDate;
const NEW_RANGE = `${Number(ELEMENTAL.startDate.slice(8))}–${formatThaiDate(LAST_DAY, false)}`;
/** "ธ.ค.", taken from the new range so the two always match. */
const MONTH = NEW_RANGE.split(" ").slice(1).join(" ");

/** Every day from the opening to the Demo Day, with what happens on it. */
function calendarDays() {
  const first = ELEMENTAL.schedule[0].date;
  const last = ELEMENTAL.demoDay.date ?? ELEMENTAL.endDate;
  const days: { iso: string; weekday: string; day: string; holiday: boolean; inRun: boolean; demo: boolean; label: string | null; times: string | null; dot: string }[] = [];
  for (let d = Number(first.slice(8)); d <= Number(last.slice(8)); d++) {
    const iso = `${first.slice(0, 8)}${String(d).padStart(2, "0")}`;
    const [weekday, day] = formatThaiDate(iso).split(" ");
    const slots = ELEMENTAL.schedule.filter((s) => s.date === iso);
    const demo = iso === ELEMENTAL.demoDay.date;
    const workshops = slots.filter((s) => s.kind === "workshop").length;
    const label = demo ? "Demo Day" : slots.some((s) => s.kind === "open") ? "เปิดงาน" : slots.some((s) => s.kind === "due") ? "ส่งผลงาน" : workshops ? `เวิร์กช็อป${workshops > 1 ? ` ×${workshops}` : ""}` : null;
    // Times as told (the hand-in's time isn't confirmed, and the Demo Day's is in the foot, so neither prints here).
    const times = demo ? null : slots.filter((s) => s.kind !== "due").map((s) => s.time.split("–")[0]).join(", ") || null;
    const dot = demo ? CHULA_PINK : slots.some((s) => s.kind === "due") ? EL.flame : workshops ? "#0f8f8a" : EL.ink;
    days.push({ iso, weekday, day, holiday: (ELEMENTAL.holidays as readonly string[]).includes(iso), inRun: iso >= ELEMENTAL.startDate && iso <= LAST_DAY, demo, label, times, dot });
  }
  return days;
}

export function ElementalNewsPoster({ id = "elemental-news" }: { id?: string }) {
  const demo = ELEMENTAL.demoDay;
  const days = calendarDays();
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: "#2a2b26" }}>
      {/* The photo, 1.08 times the sheet's height and anchored so the ridge runs below the calendar on both sides. Nothing is laid over it but the foot. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PHOTO} alt="" className="absolute max-w-none" style={{ left: -600, top: 0, width: 2160, height: 1620, filter: "saturate(0.92)" }} />

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
        {/* Under the title, only the date change, big (Angpao, 2026-11-26: "the only one needed is date change so remove everything else and make it more clear and bigger"): the old dates crossed out, an arrow, the new ones on a highlighter mark. */}
        <div className="flex items-center whitespace-nowrap" style={{ marginLeft: 4, marginTop: 22, gap: 22, fontFamily: EL_FONT.display }}>
          <Pixels rows={ICON.date} fill={{ "#": EL.ink }} cell={6} />
          <span className="relative" style={{ fontWeight: 300, fontSize: 50, lineHeight: "64px", color: EL.inkSoft }}>
            {OLD_RANGE} {MONTH}
            {/* A slanted cross-out, so it can't merge with the dash in "5–7". */}
            <span className="absolute" style={{ left: -6, right: -6, top: "50%", height: 5, background: EL.ember, transform: "rotate(-9deg)" }} />
          </span>
          <span style={{ fontWeight: 300, fontSize: 50, lineHeight: "64px", color: EL.ink }}>→</span>
          <span style={{ fontWeight: 600, fontSize: 84, lineHeight: "92px", letterSpacing: "-0.01em", background: `linear-gradient(transparent 52%, ${HIGHLIGHT} 52%, ${HIGHLIGHT} 92%, transparent 92%)`, padding: "0 10px" }}>{NEW_RANGE}</span>
        </div>

        {/* The calendar: what happens on each day, and which days are days off. */}
        <div style={{ width: 968, marginTop: 30, fontFamily: EL_FONT.display }}>
          <div className="flex items-end justify-between" style={{ marginBottom: 8, fontSize: 27, lineHeight: "36px" }}>
            <span style={{ fontWeight: 500 }}>แข่งออนไลน์ แล้วปิดท้ายด้วย Demo Day{ELEMENTAL.demoDay.optional ? " (Optional)" : ""}</span>
            <span className="flex items-center" style={{ gap: 8, fontWeight: 500, color: HOLIDAY }}>
              <span style={{ width: 16, height: 16, background: HOLIDAY }} />
              วันหยุด
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)`, borderTop: `2px solid ${EL.ink}` }}>
            {days.map((d) => (
              <div key={d.iso} className="flex flex-col items-center" style={{ paddingTop: 10 }}>
                <span style={{ fontWeight: d.holiday ? 500 : 400, fontSize: 28, lineHeight: "34px", color: d.holiday ? HOLIDAY : EL.inkSoft }}>{d.weekday}</span>
                {/* The six days of the hackathon share one yellow mark; the Demo Day stands on pink. */}
                <span
                  className="flex w-full items-center justify-center"
                  style={{
                    marginTop: 2,
                    fontWeight: d.holiday || d.demo ? 500 : 300,
                    fontSize: 78,
                    lineHeight: "92px",
                    color: d.demo ? "#ffffff" : d.holiday ? HOLIDAY : EL.ink,
                    background: d.inRun ? `linear-gradient(transparent 50%, ${HIGHLIGHT} 50%, ${HIGHLIGHT} 94%, transparent 94%)` : undefined,
                  }}
                >
                  <span style={d.demo ? { background: CHULA_PINK, padding: "0 10px" } : undefined}>{d.day}</span>
                </span>
                {d.label ? (
                  <span className="flex flex-col items-center text-center" style={{ marginTop: 10, fontWeight: 500, fontSize: 23, lineHeight: "28px", whiteSpace: "nowrap" }}>
                    <span style={{ width: 12, height: 12, background: d.dot, marginBottom: 6 }} />
                    {d.label}
                    {d.times ? <span style={{ fontWeight: 400, fontSize: 20, lineHeight: "26px", color: EL.inkSoft }}>{d.times}</span> : null}
                    {d.demo && ELEMENTAL.demoDay.optional ? <span style={{ fontWeight: 400, fontSize: 20, lineHeight: "26px", color: EL.inkSoft }}>(Optional)</span> : null}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The foot: the QR code at the bottom left, level with the last sentence (Angpao, 2026-11-26: "put the qr at buttom left same level as แข่งนานขึ้น…"), and beside it one big yellow line with a small label, then the sentence. */}
      <div className="absolute inset-x-[56px] bottom-[48px] flex items-end" style={{ gap: 24, fontFamily: EL_FONT.display, color: EL.cream }}>
        <div style={{ background: EL.cream, padding: 9, flex: "none" }}>
          <RegisterQr size={148} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="flex items-end whitespace-nowrap" style={{ gap: 14 }}>
            <span style={{ marginBottom: 14 }}>
              <Pixels rows={ICON.pin} fill={{ "#": HIGHLIGHT }} cell={6} />
            </span>
            <span style={{ fontWeight: 200, fontSize: 84, lineHeight: "92px", letterSpacing: "-0.01em", color: HIGHLIGHT }}>Demo Day</span>
            <span style={{ marginBottom: 8, fontWeight: 400, fontSize: 23, lineHeight: "31px" }}>
              <span className="block" style={{ fontWeight: 600, fontSize: 30, lineHeight: "40px" }}>
                {/* The place is the CSII building at Chula, not just Chula (Angpao, 2026-11-26). */}
                @ ตึก CSII<Chula />
              </span>
              <span className="block">
                {demo.date ? `${formatThaiDate(demo.date)} · ` : ""}
                {demo.time} น.
              </span>
              <span className="block" style={{ color: HIGHLIGHT, fontSize: 21 }}>
                {demo.whoTh}
                {demo.optional ? " (Optional)" : ""}
              </span>
            </span>
          </div>
          <div className="whitespace-nowrap" style={{ marginTop: 8, fontWeight: 500, fontSize: 38, lineHeight: "50px" }}>
            แข่งนานขึ้น แล้วไปโชว์ผลงานที่ตึก CSII จุฬา
          </div>
        </div>
      </div>

      {/* Grain over the type too, so it sits in the same film. */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
        <rect width={W} height={H} filter={`url(#${id}-grain)`} opacity="0.1" style={{ mixBlendMode: "overlay" }} />
      </svg>
    </div>
  );
}
