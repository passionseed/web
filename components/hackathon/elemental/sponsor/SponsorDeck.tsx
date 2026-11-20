import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "@/components/hackathon/poster/elemental/facts";

import { PixelArrow, PixelIcon, type IconName } from "./DeckArt";
import { DeckEditor } from "./DeckEditor";
import { PrintButton } from "./PrintButton";

/**
 * Elemental Hackathon sponsor deck: one scrollable page that also prints as
 * an A4 landscape PDF, one section per page.
 *
 * Order: cover, then six pages on the hackathon itself (vision and
 * mission, tracks, scale and deliverables, program, judging, why it's different,
 * about PassionSeed), then what a sponsor gets: benefits, past event, brand
 * safety, packages, contact. Angpao set this order on 2026-11-20. Headings
 * use the words Thai sponsorship proposals use, not translations.
 *
 * Sources: passionseed/company-brain on main, 2026-11-20:
 * private/hackathon-december-2026.md, private/hackathon-elemental-theme-and-rules.md,
 * private/hackathon-december-2026-rules.md, private/hackathon-december-2026-judging.md
 * and decisions/log.md. About PassionSeed: company.md, history.md, team.md and
 * numbers.md. Contact: told by Angpao, 2026-11-20. Event facts come from facts.ts. Last edition's
 * sponsors and partners: the live /hackathon page (components/hackathon/LandingPage.tsx).
 *
 * Two markers keep this honest until a person fills it in:
 * - <Fill> is a fact nobody has told us yet.
 * - <Draft> is something written down but not decided, or Claude's proposal.
 * Both print, so a PDF with gaps can't go out by accident. Remove them only
 * when a person confirms the line.
 *
 * Editing: on `next dev`, open the page with ?edit (or the button at the
 * bottom right), click any text and type, then Save. DeckEditor.tsx and
 * deck-edits.ts write the change into this file. Keep deck text as plain
 * strings and JSX text so it stays editable there.
 */

const trirong = Trirong({
  weight: ["200", "300", "400", "600"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

const DARK = "#151412";
const PAPER = "#efebe2";
/** The grey sky at the top of the key visual. */
const SKY = "#e3e6e1";
const LINE_DARK = "rgba(243,239,230,0.25)";
const LINE_LIGHT = "rgba(29,33,31,0.22)";
const YEAR_TH = Number(ELEMENTAL.startDate.slice(0, 4)) + 543;

/** A fact nobody has told us yet. Highlighted so it can't ship by accident. */
function Fill({ children }: { children: ReactNode }) {
  return (
    <mark
      data-deck-fill
      className="rounded-[2px] px-[6px] py-[1px]"
      style={{ background: EL.toxicYellow, color: EL.ink, fontFamily: EL_FONT.mono, fontSize: "min(0.72em, 16px)", letterSpacing: "0.02em", verticalAlign: "middle" }}
    >
      (fill in: {children})
    </mark>
  );
}

/** Written down but not decided yet, or Claude's proposal. */
function Draft({ children = "ร่าง" }: { children?: ReactNode }) {
  return (
    <span
      data-deck-draft
      className="ml-2 inline-block rounded-[2px] px-[5px] py-[1px] align-middle"
      style={{ background: EL.toxicCyan, color: EL.ink, fontFamily: EL_FONT.mono, fontSize: 11, letterSpacing: "0.04em", lineHeight: "16px" }}
    >
      [{children}]
    </span>
  );
}

function Tag({ n, light = false }: { n: string; light?: boolean }) {
  return (
    <p className="m-0 mb-4 text-[13px] sm:text-[14px]" style={{ fontFamily: EL_FONT.mono, color: light ? EL.inkSoft : EL.creamSoft }}>
      <span style={{ letterSpacing: "0.12em" }}>[{n}]</span>
    </p>
  );
}

function Section({ id, children, tone = "dark" }: { id: string; children: ReactNode; tone?: "dark" | "paper" }) {
  const dark = tone === "dark";
  return (
    <section
      id={id}
      className="deck-page relative flex min-h-[100svh] flex-col justify-center px-4 py-16 sm:px-12 lg:px-20"
      style={{ background: dark ? DARK : PAPER, color: dark ? EL.cream : EL.ink }}
    >
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
    </section>
  );
}

/** Thai headings get no letter spacing: it splits Thai into fragments when the PDF is copied. */
function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="m-0 max-w-[960px] text-[32px] leading-[1.3] sm:text-[46px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
      {children}
    </h2>
  );
}

function Body({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className="m-0 mt-4 max-w-[820px] text-[17px] leading-[1.75] sm:text-[19px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: light ? EL.inkSoft : EL.creamSoft }}>
      {children}
    </p>
  );
}

/** A label and its value, as one row of a two-column list. */
function Row({ label, children, light = false }: { label: ReactNode; children: ReactNode; light?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-t py-3 sm:grid-cols-[200px_1fr] sm:gap-6" style={{ borderColor: light ? LINE_LIGHT : LINE_DARK, fontFamily: EL_FONT.display }}>
      <div className="text-[15px] sm:text-[16px]" style={{ color: light ? EL.inkSoft : EL.creamSoft }}>
        {label}
      </div>
      <div className="text-[17px] font-light leading-[1.6] sm:text-[18px]">{children}</div>
    </div>
  );
}

function Stat({ big, label, light = false }: { big: ReactNode; label: ReactNode; light?: boolean }) {
  return (
    <div className="border-t pt-5" style={{ borderColor: light ? LINE_LIGHT : LINE_DARK }}>
      <div className="text-[40px] leading-[1.1] sm:text-[54px]" style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}>
        {big}
      </div>
      <div className="mt-3 text-[15px] leading-[1.6] sm:text-[16px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: light ? EL.inkSoft : EL.creamSoft }}>
        {label}
      </div>
    </div>
  );
}

/** The most a package is worth, in baht: the price bars are drawn against it. */
const BAR_MAX = 10000;

function Package({
  name,
  en,
  slots,
  price,
  value,
  items,
  accent,
  draft,
}: {
  name: string;
  en: string;
  slots: ReactNode;
  price: ReactNode;
  /** Cash and credit in baht, for the bar. */
  value?: { cash: number; credit: number };
  items: ReactNode[];
  accent: string;
  draft?: ReactNode;
}) {
  return (
    <div className="flex flex-col border p-5 sm:p-6" style={{ borderColor: LINE_LIGHT, background: PAPER, color: EL.ink }}>
      <span className="mb-4 block h-[6px] w-12" style={{ background: accent }} />
      <p className="m-0 text-[12px]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
        <span style={{ letterSpacing: "0.12em" }}>{en.toUpperCase()}</span>
        {draft}
      </p>
      <h3 className="m-0 mt-2 text-[23px] leading-[1.3]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
        {name}
      </h3>
      <p className="m-0 mt-1 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
        {slots}
      </p>
      <ul className="m-0 mt-4 flex-1 list-none space-y-2 p-0 text-[15px] leading-[1.55]" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden="true" className="mt-[9px] block h-[5px] w-[5px] shrink-0" style={{ background: EL.ink }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t pt-3" style={{ borderColor: LINE_LIGHT }}>
        {value ? (
          <div className="mb-2 flex h-[10px] w-full" style={{ background: "rgba(29,33,31,0.08)" }} aria-hidden="true">
            <span style={{ width: `${(value.cash / BAR_MAX) * 100}%`, background: accent }} />
            <span style={{ width: `${(value.credit / BAR_MAX) * 100}%`, background: accent, opacity: 0.4 }} />
          </div>
        ) : null}
        <p className="m-0 text-[17px] leading-[1.45]" style={{ fontFamily: EL_FONT.display }}>
          {price}
        </p>
      </div>
    </div>
  );
}

/**
 * The five elements, each the topic of one challenge. Cropped from the key
 * visual (the plate built by scripts/render-elemental-plate.mjs).
 */
const ELEMENTS: { key: "water" | "earth" | "air" | "fire" | "aether"; topic: string }[] = [
  { key: "earth", topic: "ขยะและสารพิษที่ถูกฝังกลบ หรือหายไปโดยไม่มีใครตรวจสอบ" },
  { key: "water", topic: "มลพิษในแหล่งน้ำที่คนใช้อุปโภคและทำเกษตร" },
  { key: "air", topic: "มลพิษทางอากาศใกล้ที่อยู่อาศัย" },
  { key: "fire", topic: "ไฟไหม้ในพื้นที่เก็บสารเคมีและการเผา" },
  { key: "aether", topic: "ผลกระทบที่มองไม่เห็น เช่น ข้อมูลเท็จ ร่องรอยที่ไม่มีใครบันทึก และ digital footprint" },
];

/** The Next Decade's last edition, as the live /hackathon page lists them. */
const LAST_SPONSORS = [
  { src: "/hackathon/sponsors/skinx.png", alt: "SkinX" },
  { src: "/hackathon/sponsors/garnier.png", alt: "Garnier" },
  { src: "/hackathon/sponsors/herb-guardian.png", alt: "Herb Guardian" },
  { src: "/hackathon/sponsors/zenichub.png", alt: "ZenicHub" },
  { src: "/hackathon/sponsors/onecha.png", alt: "OneCha" },
  { src: "/hackathon/sponsors/cocori.png", alt: "Cocori" },
];
const LAST_PARTNERS = [
  { src: "/hackathon/AMSA.png", alt: "AMSA Thailand" },
  { src: "/hackathon/StemLike.png", alt: "STEM Like Her" },
];

/** Participant target: at least 350 (Big, 2026-11-19, company-brain). */
const TARGET = 350;

/** Claude's draft from the concept page; nobody has decided it. */
const MISSION: [string, string][] = [
  ["ทำความเข้าใจปัญหาจริง", `ชวนนักเรียน ${TARGET} คนขึ้นไป มาศึกษาปัญหาสิ่งแวดล้อมจริงใน 5 หัวข้อ`],
  ["ลงมือแก้ให้คนจริง", "ทุกทีมพัฒนาผลงานที่ช่วยคนจริงอย่างน้อย 1 คน และทดสอบกับคนจริง"],
  ["ต่อยอดหลังการแข่งขัน", "ผลงานที่ดีที่สุดได้ต่อยอดในโครงการ Request for Winners"],
];

/** What the video shows (Angpao, 2026-11-20: teams send a video; the list is Claude's draft). */
const DELIVERABLES = ["ปัญหาและคนที่เจอปัญหา", "หลักฐานจากคนจริงอย่างน้อย 3 คน", "สาธิตผลงานที่ใช้งานได้", "แผน 4 สัปดาห์ถัดไป"];
const STRIP = [EL.toxicCyan, EL.toxicGreen, EL.flame, EL.toxicYellow];

/** Program, told by Angpao, 2026-11-20. */
type Slot = "open" | "workshop" | "deadline";
const DAYS: { day: string; events: [string, string, Slot][] }[] = [
  { day: "ศุกร์ 4 ธ.ค.", events: [["19:00 น.", "พิธีเปิดและปฐมนิเทศ", "open"]] },
  {
    day: "เสาร์ 5 ธ.ค.",
    events: [
      ["10:00–11:00 น.", "เวิร์กช็อป: การสัมภาษณ์และการหากลุ่มลูกค้าเป้าหมาย", "workshop"],
      ["19:00–20:00 น.", "เวิร์กช็อป: การพัฒนาผลงาน", "workshop"],
    ],
  },
  { day: "อาทิตย์ 6 ธ.ค.", events: [["19:00–20:00 น.", "เวิร์กช็อป: การนำเสนอผลงาน", "workshop"]] },
  { day: "จันทร์ 7 ธ.ค.", events: [["23:00 น.", "หมดเขตส่งคลิปผลงาน", "deadline"]] },
];
const SLOT_COLOR: Record<Slot, string> = { open: EL.aetherGrey, workshop: EL.toxicCyan, deadline: EL.flame };

/** Why this hackathon is different (Angpao, 2026-11-20, except Request for Winners: Big, 2026-11-19). */
const WHY: [string, string, boolean][] = [
  ["มือใหม่ก็ร่วมได้", "ไม่ต้องมีพื้นฐานมาก่อน แม้ยังไม่เคยหา insight หรือพัฒนาผลงาน เราสอนให้ตั้งแต่ต้น", false],
  ["เวิร์กช็อป 4 หัวข้อ", "การสัมภาษณ์ การหากลุ่มลูกค้า การพัฒนาเว็บ และการนำเสนอผลงาน สอนสดระหว่างการแข่งขัน", false],
  ["เรียนเองได้ และมีคนช่วยตอบ", "มีแหล่งเรียนรู้ให้ศึกษาด้วยตัวเอง และฟอรัมถาม-ตอบเมื่อติดปัญหา", false],
  ["ไม่จบที่วันประกาศผล", "ผู้ชนะได้เข้าโครงการ Request for Winners บ่มเพาะ 4 สัปดาห์ เพื่อต่อยอดผลงานเป็นธุรกิจจริง จบด้วย Demo Day", false],
];

/**
 * Judging: Claude's draft (2026-11-20). Weights from the draft on
 * private/hackathon-december-2026.md; each criterion matches a workshop, so
 * what we teach is what we score.
 */
const CRITERIA: [string, number, string, string][] = [
  ["ผลงานใช้งานได้", 35, "สาธิตในคลิปว่าใช้งานได้จริง ใช้เครื่องมืออะไรก็ได้ และมีคนอยากใช้ต่อหลังจบงาน", "การพัฒนาเว็บ"],
  ["หลักฐานจากคนจริง", 30, "สัมภาษณ์และให้คนนอกทีมอย่างน้อย 3 คนลองใช้ บอกได้ว่าเขาพูดอะไร และผลงานช่วยเขาได้จริงไหม", "การสัมภาษณ์"],
  ["เข้าใจปัญหา", 25, "บอกได้ว่าใครเจอปัญหา เจอบ่อยแค่ไหน ทำไมยังไม่มีใครแก้ และจะทำอะไรต่อใน 4 สัปดาห์ถัดไป", "การหากลุ่มลูกค้า"],
  ["การนำเสนอ", 10, "เล่าได้ชัดเจนภายในเวลาที่กำหนด", "การนำเสนอผลงาน"],
];
const CRITERIA_COLOR = [EL.flame, EL.toxicGreen, EL.toxicCyan, EL.toxicYellow];
const WHY_ICONS: IconName[] = ["stairs", "board", "bubble", "rocket"];
const MISSION_ICONS: IconName[] = ["magnifier", "person", "sprout"];

/**
 * PassionSeed's work so far. Source: company-brain branch
 * company-profile-past-events (events.md, history.md, numbers.md; Angpao,
 * 2026-11-20), not merged into main yet.
 */
const HISTORY: [string, string, string][] = [
  ["2568", "ค่าย TechSeed", "ค่ายลงมือทำโปรเจกต์ 4 รุ่น (TechSeed #2–#5)"],
  ["ก.ย. 2568", "COE PSU Open House", "ร่วมกับมหาวิทยาลัยสงขลานครินทร์ เวิร์กช็อปออนไลน์ 300 ที่นั่ง"],
  ["2568", "BizSeed", "ร่วมกับ CSII"],
  ["ก.พ.–มิ.ย. 2569", "The Next Decade ครั้งแรก", "แฮกกาธอนด้านสุขภาพ ผู้เข้าร่วม 800 คน"],
  ["ก.ย. 2569", "ค่าย SHIFT", "ค่าย 7 วัน ลงมือทำโปรเจกต์ให้คนจริงใช้"],
  ["ธ.ค. 2569", "Elemental Hackathon", "The Next Decade ครั้งที่ 2"],
];

/**
 * Projects from last edition, from the public gallery at
 * passionseed.org/hackathon/gallery (read 2026-11-20). Product names only,
 * never team or member names. One-line summaries are Claude's.
 */
const LAST_PROJECTS: [string, string][] = [
  ["FreshTrack", "ติดตามอายุอาหารในตู้เย็น ไม่ต้องทิ้งเพราะไม่แน่ใจว่ายังกินได้"],
  ["FitFiew", "ช่วยคนทำงานออกกำลังกายด้วยท่าที่ถูกต้อง ลดการบาดเจ็บ"],
  ["KOKORO", "พื้นที่รับฟังสำหรับคนที่แบกความเครียดไว้คนเดียว"],
  ["Aun Jai Wai Kao", "ลดความเหงาของผู้สูงอายุหลังเกษียณในจังหวัดนครปฐม"],
  ["Pipo Care", "ลดความเสี่ยงตาแห้งจากการใช้หน้าจอเป็นเวลานาน"],
  ["WeBloom", "รับมือภาวะหมดไฟของนักศึกษาจากวัฒนธรรม toxic productivity"],
];

/** true = draft (PR #87), not decided. */
const SAFETY: [string, string, boolean][] = [
  ["ไม่ระบุชื่อบริษัทหรือคดีใด", "สื่อของงานไม่ระบุชื่อบริษัทหรือคดีใด ผู้เข้าร่วมพัฒนาผลงานเพื่อแก้ปัญหา ไม่ใช่เพื่อกล่าวโทษผู้ใด", false],
  ["คัดเลือกผู้สนับสนุนที่สอดคล้องกับหัวข้อ", "ผู้สนับสนุนทุกรายผ่านการพิจารณาว่าสอดคล้องกับหัวข้อของงาน", true],
  ["ไม่ส่งต่อข้อมูลผู้เข้าร่วม", "ผู้สนับสนุนจะไม่ได้รับรายชื่อหรือข้อมูลติดต่อของผู้เข้าร่วม การสื่อสารทั้งหมดผ่าน PassionSeed ในช่องทางสาธารณะ", false],
  ["ดูแลความปลอดภัยของนักเรียน", "ไม่มีช่องทางสื่อสารส่วนตัวระหว่างผู้ใหญ่กับนักเรียน ขอความยินยอมจากผู้ปกครองก่อนเผยแพร่ภาพนักเรียน และผลการตัดสินเป็นของคณะกรรมการเท่านั้น", false],
];

/** The sponsor contact (told by Angpao, 2026-11-20). */
const CONTACT = {
  name: "นายเศรษฐ์ฐคุณ อมรรัตนศริ",
  role: "ผู้ร่วมก่อตั้ง PassionSeed",
  phone: "095-413-9393",
};

export function SponsorDeck() {
  const el = (k: string) => ELEMENTAL.elements.find((e) => e.key === k)!;
  return (
    <main className={`${trirong.variable} elemental-deck`}>
      <style>{PRINT_CSS}</style>

      {/* Cover */}
      <section id="cover" className="deck-page deck-cover grid min-h-[100svh] grid-cols-1 lg:grid-cols-[1.05fr_1fr]" style={{ backgroundColor: SKY, color: EL.ink }}>
        <div className="flex flex-col justify-between gap-10 px-4 py-10 sm:px-12 sm:py-12 lg:px-16">
          <div>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={110} height={44} style={{ filter: "brightness(0)", opacity: 0.85 }} />
              <span style={{ fontFamily: EL_FONT.mono, fontSize: 18, color: EL.inkSoft }}>×</span>
              <span className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/passion-seed-logo.png" alt="" width={40} height={40} />
                <span style={{ fontFamily: EL_FONT.display, fontSize: 24 }}>PassionSeed</span>
              </span>
            </div>
            <p className="m-0 mt-8 text-[15px] sm:text-[17px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
              ข้อเสนอการสนับสนุนโครงการ
            </p>
            <h1 className="m-0 mt-1" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
              <span className="block text-[60px] sm:text-[104px]" style={{ fontWeight: 200 }}>
                {ELEMENTAL.edition}
              </span>
              <span className="block text-[60px] italic sm:text-[104px]" style={{ fontWeight: 300 }}>
                Hackathon
              </span>
            </h1>
            <p className="m-0 mt-2 text-[24px] sm:text-[32px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
              ดิน · น้ำ · ลม · ไฟ · ธาตุที่ 5
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 border-t pt-5 sm:grid-cols-3" style={{ borderColor: "rgba(29,33,31,0.3)", fontFamily: EL_FONT.display }}>
            <div>
              <div className="text-[15px]" style={{ color: EL.inkSoft }}>วันจัดงาน</div>
              <div className="text-[24px] font-light sm:text-[28px]">{thaiDayRange()}</div>
              <div className="text-[15px]" style={{ color: EL.inkSoft }}>
                {YEAR_TH} · {ELEMENTAL.days} วัน
              </div>
            </div>
            <div>
              <div className="text-[15px]" style={{ color: EL.inkSoft }}>เงินรางวัลรวม</div>
              <div className="text-[24px] font-light sm:text-[28px]">{prizeTotal()} บาท</div>
            </div>
            <div>
              <div className="text-[15px]" style={{ color: EL.inkSoft }}>ผู้เข้าร่วม (เป้าหมาย)</div>
              <div className="text-[24px] font-light sm:text-[28px]">{TARGET}+ คน</div>
            </div>
          </div>
        </div>
        <div className="relative min-h-[55svh] overflow-hidden lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/elemental/sponsor/cover.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_68%]" />
        </div>
      </section>

      {/* 01 Vision and mission */}
      <Section id="vision" tone="paper">
        <Tag n="01 VISION" light />
        <H2>วิสัยทัศน์และพันธกิจ</H2>
        <p className="m-0 mt-6 max-w-[980px] text-[26px] leading-[1.5] sm:text-[34px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
          ให้นักเรียนมัธยมปลายเห็นว่า ปัญหาสิ่งแวดล้อมใกล้ตัวแก้ได้ และพวกเขาลงมือแก้ได้เอง
          <Draft>วิสัยทัศน์และพันธกิจ: Claude ร่าง</Draft>
        </p>
        <div className="mt-8 grid grid-cols-1 items-start gap-6 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {MISSION.flatMap(([title, text], i) => [
            i > 0 ? (
              <div key={`arrow-${i}`} className="hidden pt-3 sm:block">
                <PixelArrow color={EL.inkSoft} />
              </div>
            ) : null,
            <div key={title}>
              <div className="flex items-center gap-3">
                <PixelIcon name={MISSION_ICONS[i]} color={EL.ink} size={34} />
                <p className="m-0 text-[13px]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                  พันธกิจ {i + 1}
                </p>
              </div>
              <h3 className="m-0 mt-3 text-[21px] leading-[1.4]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                {title}
              </h3>
              <p className="m-0 mt-2 text-[16px] leading-[1.65]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.inkSoft }}>
                {text}
              </p>
            </div>,
          ])}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-x-10 border-b sm:grid-cols-2" style={{ borderColor: LINE_LIGHT }}>
          <Row light label="ผู้จัด">
            {ELEMENTAL.series} และ PassionSeed
          </Row>
          <Row light label="วันจัดงาน">
            {thaiDayRange()} {YEAR_TH} ({ELEMENTAL.days} วัน ช่วงวันหยุดยาว)
          </Row>
          <Row light label="ผู้เข้าร่วม">
            นักเรียน ม.4–ม.6 ทั่วประเทศ
            <Draft />
          </Row>
          <Row light label="รูปแบบ">
            ออนไลน์ ผ่าน Discord และ whiteboard ของ PassionSeed
            <Draft />
          </Row>
        </div>
      </Section>

      {/* 02 Tracks */}
      <Section id="tracks">
        <Tag n="02 TRACKS" />
        <H2>หัวข้อการแข่งขัน: 5 ธาตุ</H2>
        <Body>
          หัวข้อหลักคือ Environmental negligence: ธุรกิจที่ทำร้ายสิ่งแวดล้อมเพื่อลดต้นทุนหรือเพิ่มกำไร เราแบ่งปัญหาออกเป็น 5 ธาตุ แต่ละทีมเลือกธาตุเดียวหรือหลายธาตุก็ได้
          แล้วพัฒนาผลงานที่ช่วยคนจริงอย่างน้อย 1 คน
        </Body>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {ELEMENTS.map(({ key, topic }) => {
            const e = el(key);
            return (
              <div key={key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/hackathon/elemental/sponsor/el-${key}.webp`} alt="" className="aspect-square w-full object-cover" style={{ imageRendering: "pixelated" }} />
                <p className="m-0 mt-3 text-[22px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                  {e.th}
                  <span className="ml-2 text-[13px]" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
                    {e.en.toUpperCase()}
                  </span>
                </p>
                <p className="m-0 mt-1 text-[14px] leading-[1.55]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.creamSoft }}>
                  {topic}
                </p>
              </div>
            );
          })}
        </div>
        <p className="m-0 mt-6 text-[14px]" style={{ fontFamily: EL_FONT.display, color: EL.creamSoft }}>
          สื่อและผลงานของงานไม่ระบุชื่อบริษัทหรือคดีใด ผู้เข้าร่วมแก้ปัญหา ไม่ได้กล่าวโทษผู้ใด
        </p>
      </Section>

      {/* 03 Scale and deliverables */}
      <Section id="scale" tone="paper">
        <Tag n="03 SCALE" light />
        <H2>ขนาดโครงการและผลงานที่ได้</H2>
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <Stat light big={`${TARGET}+`} label="ผู้เข้าร่วม (เป้าหมาย)" />
            <Stat light big="5" label="หัวข้อการแข่งขัน" />
            <Stat light big={ELEMENTAL.days} label="วัน ช่วงวันหยุดยาว" />
            <Stat light big={prizeTotal()} label="บาท เงินรางวัลรวม" />
          </div>
          <div>
            <p className="m-0 text-[17px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
              ทุกทีมส่งผลงานเป็นคลิปวิดีโอ 1 คลิป ความยาวไม่เกิน 3 นาที
              <Draft>ความยาว: ร่าง</Draft>
            </p>
            <div className="mt-4 rounded-[6px] p-3" style={{ background: EL.ink }} aria-hidden="true">
              <div className="grid grid-cols-4 gap-[3px]">
                {STRIP.map((c, i) => (
                  <div key={i} className="flex aspect-[4/3] items-end p-2" style={{ background: c }}>
                    <span className="text-[13px]" style={{ fontFamily: EL_FONT.mono, color: EL.ink }}>
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges">
                  <path d="M1 0h1v1h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1z" fill={EL.cream} />
                </svg>
                <span className="block h-[3px] flex-1" style={{ background: EL.creamSoft }} />
                <span className="text-[12px]" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
                  3:00
                </span>
              </div>
            </div>
            <ol className="m-0 mt-3 grid list-none grid-cols-2 gap-x-3 gap-y-2 p-0 sm:grid-cols-4" style={{ fontFamily: EL_FONT.display }}>
              {DELIVERABLES.map((d, i) => (
                <li key={d} className="text-[15px] leading-[1.45]" style={{ fontWeight: 300 }}>
                  <span className="mr-1" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ol>
            <p className="m-0 mt-5 text-[15px] leading-[1.6]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
              ทีมละ 2–5 คน ผู้สมัครเดี่ยวจะได้รับการจับคู่เข้าทีม ค่าสมัคร {ELEMENTAL.priceBaht} บาทต่อคน หรือ {ELEMENTAL.groupPriceBaht} บาทต่อคนเมื่อสมัครพร้อมเพื่อน
            </p>
          </div>
        </div>
      </Section>

      {/* 04 Program outline */}
      <Section id="program">
        <Tag n="04 PROGRAM" />
        <H2>กำหนดการโครงการ</H2>
        <div className="mt-8 grid grid-cols-1 gap-3 lg:grid-cols-[150px_repeat(4,1fr)_170px]" style={{ fontFamily: EL_FONT.display }}>
          <div className="border-l-2 py-1 pl-3" style={{ borderColor: LINE_DARK }}>
            <p className="m-0 text-[15px]" style={{ color: EL.creamSoft }}>
              ตั้งแต่ 23 พ.ย.
            </p>
            <p className="m-0 mt-1 text-[16px] leading-[1.5]" style={{ fontWeight: 300 }}>
              เปิดรับสมัคร
              <Draft />
            </p>
          </div>
          {DAYS.map(({ day, events }) => (
            <div key={day} className="flex flex-col gap-2 border-t-2 pt-3" style={{ borderColor: EL.cream }}>
              <p className="m-0 text-[18px]" style={{ fontWeight: 400 }}>
                {day}
              </p>
              {events.map(([time, what, kind]) => (
                <div key={what} className="rounded-[3px] p-3" style={{ background: "rgba(243,239,230,0.07)", borderLeft: `4px solid ${SLOT_COLOR[kind]}` }}>
                  <p className="m-0 text-[14px]" style={{ color: SLOT_COLOR[kind] }}>
                    {time}
                  </p>
                  <p className="m-0 mt-1 text-[15px] leading-[1.5]" style={{ fontWeight: 300 }}>
                    {what}
                  </p>
                </div>
              ))}
            </div>
          ))}
          <div className="border-l-2 py-1 pl-3" style={{ borderColor: LINE_DARK }}>
            <p className="m-0 text-[15px]" style={{ color: EL.creamSoft }}>
              ศุกร์ 11 ธ.ค.
            </p>
            <p className="m-0 mt-1 text-[16px] leading-[1.5]" style={{ fontWeight: 300 }}>
              เปิดรับสมัคร Request for Winners: บ่มเพาะ 4 สัปดาห์ จบด้วย Demo Day
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-[3px] px-3 py-2 lg:col-span-3 lg:col-start-3" style={{ background: "rgba(56,201,194,0.14)" }}>
            <PixelIcon name="bubble" color={EL.toxicCyan} size={22} />
            <span className="text-[15px]" style={{ fontWeight: 300 }}>
              ตลอด 3 วัน มีแหล่งเรียนรู้ให้ศึกษาด้วยตัวเอง และฟอรัมถาม-ตอบเมื่อติดปัญหา
            </span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-5 text-[14px]" style={{ fontFamily: EL_FONT.display, color: EL.creamSoft }}>
          {(
            [
              ["workshop", "เวิร์กช็อปสด"],
              ["deadline", "กำหนดส่ง"],
              ["open", "พิธีเปิด"],
            ] as const
          ).map(([k, label]) => (
            <span key={k} className="flex items-center gap-2">
              <span className="block h-3 w-3" style={{ background: SLOT_COLOR[k] }} />
              {label}
            </span>
          ))}
        </div>
      </Section>

      {/* 05 Judging */}
      <Section id="judging" tone="paper">
        <Tag n="05 JUDGING" light />
        <H2>เกณฑ์การตัดสิน</H2>
        <p className="m-0 mt-3 max-w-[900px] text-[16px] leading-[1.65]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.inkSoft }}>
          ทุกทีมส่งคลิปวิดีโอภายในจันทร์ 7 ธ.ค. 23:00 น. แต่ละเกณฑ์ตรงกับสิ่งที่สอนในเวิร์กช็อป มือใหม่จึงรู้ว่าต้องทำอะไรเพื่อให้ได้คะแนน
          <Draft>เกณฑ์: Claude ร่าง</Draft>
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch" style={{ fontFamily: EL_FONT.display }}>
          <div className="flex items-center gap-3 rounded-[3px] border px-4 py-2 sm:w-[210px]" style={{ borderColor: LINE_LIGHT }}>
            <span className="text-[15px] leading-[1.4]">ด่านแรก: ตรงหัวข้อและส่งทันเวลา</span>
          </div>
          <div className="hidden items-center sm:flex">
            <PixelArrow color={EL.inkSoft} />
          </div>
          <div className="flex min-h-[64px] flex-1 overflow-hidden rounded-[3px]">
            {CRITERIA.map(([name, weight], i) => (
              <div key={name} className="flex flex-col justify-center px-3 py-2" style={{ width: `${weight}%`, background: CRITERIA_COLOR[i], color: EL.ink }}>
                <span className="text-[22px] leading-none" style={{ fontWeight: 300 }}>
                  {weight}%
                </span>
                <span className="mt-1 text-[13px] leading-[1.3]">{name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 border-b" style={{ borderColor: LINE_LIGHT, fontFamily: EL_FONT.display }}>
          <div className="grid grid-cols-[1fr_auto] gap-4 border-t py-3 sm:grid-cols-[230px_70px_1fr_170px]" style={{ borderColor: LINE_LIGHT }}>
            <span className="text-[17px]" style={{ fontWeight: 400 }}>ตรงหัวข้อและส่งทันเวลา</span>
            <span className="text-[15px]" style={{ color: EL.inkSoft }}>ผ่าน/ไม่ผ่าน</span>
            <span className="col-span-2 text-[15px] leading-[1.55] sm:col-span-1" style={{ fontWeight: 300 }}>
              ผลงานแก้ปัญหาใน 5 ธาตุ ไม่ระบุชื่อบริษัทหรือคดีใด ทีมที่ไม่ผ่านจะไม่ถูกให้คะแนน และได้รับแจ้งเหตุผล
            </span>
            <span className="hidden sm:block" />
          </div>
          {CRITERIA.map(([name, weight, what, workshop], i) => (
            <div key={name} className="grid grid-cols-[1fr_auto] gap-4 border-t py-3 sm:grid-cols-[230px_70px_1fr_170px]" style={{ borderColor: LINE_LIGHT }}>
              <span className="flex items-center gap-2 text-[17px]" style={{ fontWeight: 400 }}>
                <span className="block h-3 w-3 shrink-0" style={{ background: CRITERIA_COLOR[i] }} />
                {name}
              </span>
              <span className="text-[22px] leading-none" style={{ fontWeight: 300 }}>{weight}%</span>
              <span className="col-span-2 text-[15px] leading-[1.55] sm:col-span-1" style={{ fontWeight: 300 }}>{what}</span>
              <span className="col-span-2 text-[14px] sm:col-span-1" style={{ color: EL.inkSoft }}>
                เวิร์กช็อป: {workshop}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* 06 Why this hackathon */}
      <Section id="why">
        <Tag n="06 WHY US" />
        <H2>จุดเด่นของโครงการ</H2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {WHY.map(([title, text, draft], i) => (
            <div key={title} className="border-t pt-5" style={{ borderColor: LINE_DARK }}>
              <PixelIcon name={WHY_ICONS[i]} color={EL.toxicCyan} size={40} />
              <h3 className="m-0 mt-4 text-[22px] leading-[1.4]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                {title}
                {draft ? <Draft /> : null}
              </h3>
              <p className="m-0 mt-3 text-[16px] leading-[1.7]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.creamSoft }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 07 About PassionSeed */}
      <Section id="about" tone="paper">
        <Tag n="07 ABOUT US" light />
        <H2>เกี่ยวกับ PassionSeed</H2>
        <Body light>
          PassionSeed ก่อตั้งในปี 2568 จัดค่ายระยะสั้นที่นักเรียนมัธยมปลายลงมือทำโปรเจกต์จริงและนำไปใช้กับคนจริง พันธกิจของเราคือช่วยให้นักเรียนได้เลือกทางของตัวเอง
          ทำได้จริง และมีคนรอบตัวที่สนับสนุน (ตามทฤษฎี Self-Determination) เพื่อให้ใช้ชีวิตได้อย่างมีความหมาย
        </Body>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat light
            big="~800"
            label={
              <>
                นักเรียนที่เข้าค่าย Seed Camp และ TechSeed
                <Draft>ยืนยันตัวเลข</Draft>
              </>
            }
          />
          <Stat light big="800" label="ผู้เข้าร่วม The Next Decade ครั้งแรก (2569)" />
          <Stat light big="HK Tech 300" label="ผู้ร่วมก่อตั้ง Bunyasit Fang ชนะการแข่งขัน HK Tech 300 Southeast Asia Start-up Competition ปี 2567 ในฐานะ CEO ของ Portex Innovation" />
        </div>
        <ol className="relative m-0 mt-10 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 lg:grid-cols-6" style={{ fontFamily: EL_FONT.display }}>
          <span aria-hidden="true" className="absolute left-0 right-0 top-[5px] hidden h-[2px] lg:block" style={{ background: LINE_LIGHT }} />
          {HISTORY.map(([when, what, detail], i) => (
            <li key={what} className="relative">
              <span className="relative block h-3 w-3" style={{ background: i === HISTORY.length - 1 ? EL.flame : EL.ink }} />
              <p className="m-0 mt-3 text-[13px]" style={{ color: EL.inkSoft }}>
                {when}
              </p>
              <p className="m-0 mt-1 text-[17px] leading-[1.35]" style={{ fontWeight: 400 }}>
                {what}
              </p>
              <p className="m-0 mt-1 text-[14px] leading-[1.5]" style={{ fontWeight: 300, color: EL.inkSoft }}>
                {detail}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 08 Benefits */}
      <Section id="benefits">
        <Tag n="08 BENEFITS" />
        <H2>สิทธิประโยชน์ของผู้สนับสนุน</H2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat big={<Fill>reach</Fill>} label="ยอดการมองเห็นบน Instagram ของ PassionSeed ช่วงประชาสัมพันธ์" />
          <Stat big={`${TARGET}+`} label="ผู้เข้าร่วมที่เห็นโลโก้ผู้สนับสนุนตลอด 3 วัน (เป้าหมาย)" />
          <Stat big={<Fill>posts</Fill>} label="โพสต์ประชาสัมพันธ์ที่มีโลโก้ผู้สนับสนุน บน Instagram ของ PassionSeed และ The Next Decade" />
        </div>
        <div className="mt-8 border-b" style={{ borderColor: LINE_DARK }}>
          <Row label="ก่อนงาน">
            โลโก้บนโปสเตอร์ โพสต์ประชาสัมพันธ์ และหน้ารับสมัคร
            <Draft>Claude ร่าง</Draft>
          </Row>
          <Row label="ระหว่างงาน">
            โลโก้บนหัวข้อที่สนับสนุนและในช่อง Discord ของงาน กล่าวขอบคุณบนเวทีรอบชิงชนะเลิศ
          </Row>
          <Row label="หลังงาน">
            รายงานสรุปผลโครงการ: จำนวนผู้สมัคร ทีม ผลงาน และยอดการมองเห็นของโพสต์ พร้อมภาพและคลิปบรรยากาศที่ได้รับความยินยอมแล้ว
            <Draft>Claude ร่าง</Draft>
          </Row>
        </div>
      </Section>

      {/* 09 Past event */}
      <Section id="past" tone="paper">
        <Tag n="09 PAST EVENT" light />
        <H2>{ELEMENTAL.series} ครั้งที่ผ่านมา</H2>
        <p className="m-0 mt-2 text-[16px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.inkSoft }}>
          หัวข้อ Preventive &amp; Predictive Healthcare · นักเรียนมัธยมปลายและนักศึกษา · ก.พ.–มิ.ย. 2569
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat light big="800" label="ผู้เข้าร่วม" />
          <Stat light big="229" label="ทีมที่ลงทะเบียน" />
          <Stat light big="3" label="เดือนที่ทีมพัฒนาผลงาน" />
          <Stat light big="7" label="ผลงานในแกลเลอรีบน passionseed.org" />
        </div>
        <p className="m-0 mt-8 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          ตัวอย่างผลงาน
          <Draft>สรุปโดย Claude</Draft>
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3" style={{ fontFamily: EL_FONT.display }}>
          {LAST_PROJECTS.map(([name, what]) => (
            <div key={name} className="flex gap-3 rounded-[3px] p-3" style={{ background: "rgba(29,33,31,0.05)" }}>
              <PixelIcon name="sprout" color={EL.toxicGreen} size={22} />
              <div>
                <p className="m-0 text-[16px]" style={{ fontWeight: 400 }}>
                  {name}
                </p>
                <p className="m-0 mt-1 text-[14px] leading-[1.45]" style={{ fontWeight: 300, color: EL.inkSoft }}>
                  {what}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="m-0 mt-8 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          ผู้สนับสนุนและพันธมิตรครั้งที่ผ่านมา
          <Draft>ยืนยันการใช้โลโก้</Draft>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          {[...LAST_SPONSORS, ...LAST_PARTNERS].map((s) => (
            <span key={s.alt} className="inline-flex h-12 items-center rounded-[3px] bg-white px-3 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} className="h-8 w-auto object-contain" />
            </span>
          ))}
        </div>
      </Section>

      {/* 10 Brand safety */}
      <Section id="safety">
        <Tag n="10 BRAND SAFETY" />
        <H2>แนวทางดูแลแบรนด์ผู้สนับสนุน</H2>
        <Body>หัวข้อของงานเป็นเรื่องสิ่งแวดล้อม เราจึงวางแนวทางไว้ชัดเจน เพื่อให้ผู้สนับสนุนมั่นใจได้</Body>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SAFETY.map(([title, text, draft]) => (
            <div key={title} className="border-t pt-5" style={{ borderColor: LINE_DARK }}>
              <h3 className="m-0 text-[20px] leading-[1.4]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                {title}
                {draft ? <Draft /> : null}
              </h3>
              <p className="m-0 mt-3 text-[16px] leading-[1.7]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.creamSoft }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 11 Packages */}
      <Section id="packages" tone="paper">
        <Tag n="11 PACKAGES" light />
        <H2>รูปแบบการสนับสนุน</H2>
        <p className="m-0 mt-3 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          ผู้สนับสนุนแต่ละรายมีกรรมการได้ไม่เกิน 1 ใน 3 ที่นั่งในรอบชิงชนะเลิศ และไม่มีส่วนในการเปลี่ยนแปลงผลการตัดสิน
          <Draft>สิทธิประโยชน์: Claude ร่าง</Draft>
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ color: EL.ink }}>
          <Package
            name="ผู้สนับสนุนเงินรางวัล"
            en="Prize sponsor"
            slots="1 ราย"
            accent={EL.flame}
            items={[
              `ชื่อผู้สนับสนุนบนเงินรางวัลรวม ${prizeTotal()} บาท`,
              "กล่าวบนเวทีรอบชิงชนะเลิศ 60 วินาที",
              "กรรมการรอบชิงชนะเลิศ 1 ที่นั่ง",
              <>
                ทุนค่าสมัครสำหรับนักเรียน <Fill>how many</Fill> ที่นั่ง
              </>,
              "ได้รับเชิญร่วมงาน Demo Day ของโครงการ Request for Winners",
            ]}
            value={{ cash: 7000, credit: 3000 }}
            price="7,000 บาท + เครดิต Claude มูลค่า 3,000 บาท"
          />
          <Package
            name="ผู้สนับสนุนรายธาตุ"
            en="Element sponsor"
            slots="5 ราย ธาตุละ 1 ราย"
            accent={EL.toxicGreen}
            items={[
              "ชื่อผู้สนับสนุนบนหัวข้อ (ธาตุ) ที่เลือก ในโจทย์และโพสต์ของหัวข้อนั้น",
              <>
                ทุนค่าสมัครสำหรับนักเรียน <Fill>how many</Fill> ที่นั่ง
              </>,
              "ได้รับเชิญร่วมงาน Demo Day ของโครงการ Request for Winners",
            ]}
            value={{ cash: 3000, credit: 3000 }}
            price="3,000 บาท + เครดิตมูลค่า 3,000 บาท"
          />
          <Package
            name="ผู้สนับสนุนโจทย์"
            en="Challenge sponsor"
            slots={<Fill>how many</Fill>}
            accent={EL.toxicCyan}
            draft={<Draft>ยังไม่ได้ตัดสินใจ</Draft>}
            items={["ตั้งโจทย์จากปัญหาจริงขององค์กร ภายใต้หัวข้อที่เลือก", "ผู้เชี่ยวชาญขององค์กรร่วมให้ข้อมูลหรือเป็นกรรมการ", "ได้รับผลงานทุกชิ้นที่ทีมพัฒนาจากโจทย์ขององค์กร"]}
            value={{ cash: 0, credit: 3000 }}
            price={
              <>
                เครดิตมูลค่า 3,000 บาท
                <Draft>ตรวจ: ราคาแพ็กเกจที่ 3</Draft>
              </>
            }
          />
          <Package
            name="ผู้สนับสนุนสิ่งของหรือบริการ"
            en="In-kind sponsor"
            slots={<Fill>how many</Fill>}
            accent={EL.aetherGrey}
            items={["สถานที่จัดรอบชิงชนะเลิศ", "เครดิตซอฟต์แวร์หรือเครื่องมือสำหรับผู้เข้าร่วม", "ของรางวัลเพิ่มเติม"]}
            price={<Fill>what we accept</Fill>}
          />
        </div>
      </Section>

      {/* 12 Contact */}
      <Section id="contact">
        <Tag n="12 CONTACT" />
        <H2>ติดต่อสอบถาม</H2>
        <div className="mt-8 border-b" style={{ borderColor: LINE_DARK }}>
          <Row label="ผู้ประสานงาน">
            {CONTACT.name}
            <Draft>ตรวจตัวสะกด</Draft>
          </Row>
          <Row label="ตำแหน่ง">
            {CONTACT.role}
          </Row>
          <Row label="โทร">
            <a href={`tel:${CONTACT.phone.replace(/-/g, "")}`} className="underline-offset-4 hover:underline">
              {CONTACT.phone}
            </a>
          </Row>
        </div>
        <div className="deck-no-print mt-10">
          <PrintButton />
        </div>
      </Section>

      {/* Local edit mode: `next dev` only, never on the site. */}
      {process.env.NODE_ENV === "development" ? <DeckEditor /> : null}
    </main>
  );
}

/**
 * Print: one section per A4 landscape page, colours kept, nothing else of
 * the site printed.
 */
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { background: ${DARK} !important; }
  body * { visibility: hidden; }
  .elemental-deck, .elemental-deck * { visibility: visible; }
  .elemental-deck { position: absolute; inset: 0 auto auto 0; width: 297mm; }
  .elemental-deck .deck-page {
    width: 297mm; height: 210mm; min-height: 0; overflow: hidden;
    break-after: page; page-break-after: always;
    padding: 11mm 16mm; justify-content: center;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .elemental-deck .deck-cover { padding: 0; display: grid; grid-template-columns: 1.05fr 1fr; }
  .elemental-deck .deck-cover > div:first-child { padding: 11mm 14mm; }
  /* The tracks page holds the most; shorter element crops keep it on one page. */
  .elemental-deck #tracks img { aspect-ratio: 16 / 10; }
  /* Four package cards fill the page: a smaller heading keeps it on one. */
  .elemental-deck #packages h2 { font-size: 40px; }
  .elemental-deck .deck-page:last-child { break-after: auto; page-break-after: auto; }
  .elemental-deck .deck-no-print { display: none !important; }
}
`;
