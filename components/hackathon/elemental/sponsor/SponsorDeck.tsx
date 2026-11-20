import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "@/components/hackathon/poster/elemental/facts";

import { PrintButton } from "./PrintButton";

/**
 * Elemental Hackathon sponsor deck: one scrollable page that also prints as
 * an A4 landscape PDF, one section per page.
 *
 * Built in the order a sponsor decides: what we ask and by when (cover and
 * the one-page summary their boss reads), what they get, proof, brand
 * safety, the ways to take part, their own timeline, then the event detail
 * as an appendix, and how to pay.
 *
 * Sources: passionseed/company-brain on main, 2026-11-20:
 * private/hackathon-december-2026.md, private/hackathon-elemental-theme-and-rules.md,
 * private/hackathon-december-2026-rules.md, private/hackathon-december-2026-judging.md
 * and decisions/log.md. Event facts come from facts.ts. Last edition's
 * sponsors and partners: the live /hackathon page (components/hackathon/LandingPage.tsx).
 *
 * Two markers keep this honest until a person fills it in:
 * - <Fill> is a fact nobody has told us yet.
 * - <Draft> is something written down but not decided, or Claude's proposal.
 * Both print, so a PDF with gaps can't go out by accident. Remove them only
 * when a person confirms the line.
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

/** A fact nobody has told us yet. Highlighted so it can't ship by accident. */
function Fill({ children }: { children: ReactNode }) {
  return (
    <mark
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
      className="ml-2 inline-block rounded-[2px] px-[5px] py-[1px] align-middle"
      style={{ background: EL.toxicCyan, color: EL.ink, fontFamily: EL_FONT.mono, fontSize: 11, letterSpacing: "0.04em", lineHeight: "16px" }}
    >
      [{children}]
    </span>
  );
}

function Tag({ n, children, light = false }: { n: string; children: ReactNode; light?: boolean }) {
  return (
    <p className="m-0 mb-5 text-[13px] tracking-[0.12em] sm:text-[14px]" style={{ fontFamily: EL_FONT.mono, color: light ? EL.inkSoft : EL.creamSoft }}>
      [{n}] {children}
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

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="m-0 max-w-[960px] text-[32px] leading-[1.25] sm:text-[46px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, letterSpacing: "-0.01em" }}>
      {children}
    </h2>
  );
}

function Body({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className="m-0 mt-5 max-w-[780px] text-[17px] leading-[1.75] sm:text-[19px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: light ? EL.inkSoft : EL.creamSoft }}>
      {children}
    </p>
  );
}

/** A label and its value, as one row of a two-column list. */
function Row({ label, children, light = false }: { label: ReactNode; children: ReactNode; light?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-t py-4 sm:grid-cols-[220px_1fr] sm:gap-6" style={{ borderColor: light ? LINE_LIGHT : LINE_DARK, fontFamily: EL_FONT.display }}>
      <div className="text-[15px] sm:text-[16px]" style={{ color: light ? EL.inkSoft : EL.creamSoft }}>
        {label}
      </div>
      <div className="text-[18px] font-light leading-[1.6] sm:text-[19px]">{children}</div>
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

function Package({ name, en, slots, price, items, accent, draft }: { name: string; en: string; slots: ReactNode; price: ReactNode; items: ReactNode[]; accent: string; draft?: ReactNode }) {
  return (
    <div className="flex flex-col border p-5 sm:p-6" style={{ borderColor: LINE_LIGHT, background: "rgba(255,255,255,0.4)" }}>
      <span className="mb-4 block h-[6px] w-12" style={{ background: accent }} />
      <p className="m-0 text-[12px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
        {en.toUpperCase()}
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
      <p className="m-0 mt-5 border-t pt-3 text-[18px]" style={{ borderColor: LINE_LIGHT, fontFamily: EL_FONT.display }}>
        {price}
      </p>
    </div>
  );
}

/** Each element, cropped from the key visual (the plate built by scripts/render-elemental-plate.mjs). */
const ELEMENTS: { key: "water" | "earth" | "air" | "fire" | "aether"; harm: string }[] = [
  { key: "water", harm: "แม่น้ำที่คนใช้ดื่มและทำเกษตร" },
  { key: "earth", harm: "ดินและขยะที่ถูกฝังแล้วหายไป" },
  { key: "air", harm: "อากาศข้างบ้านคน" },
  { key: "fire", harm: "ไฟที่แหล่งเก็บสารเคมี" },
  { key: "aether", harm: "สิ่งที่มองไม่เห็น: ข้อมูล ร่องรอย และ digital footprint" },
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

export function SponsorDeck() {
  const el = (k: string) => ELEMENTAL.elements.find((e) => e.key === k)!;
  return (
    <main className={`${trirong.variable} elemental-deck`}>
      <style>{PRINT_CSS}</style>

      {/* Cover: the event and the ask */}
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
            <p className="m-0 mt-8 text-[13px] tracking-[0.14em] sm:text-[15px]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
              [SPONSORSHIP] ข้อเสนอสำหรับผู้สนับสนุน
            </p>
            <h1 className="m-0 mt-2" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
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

          <div className="border-t pt-5" style={{ borderColor: "rgba(29,33,31,0.3)", fontFamily: EL_FONT.display }}>
            <p className="m-0 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
              [THE ASK] สิ่งที่เราขอ
            </p>
            <p className="m-0 mt-2 text-[21px] font-light leading-[1.55] sm:text-[24px]">
              ร่วมสนับสนุนกองรางวัล {prizeTotal()} บาท หรือหนึ่งในห้าธาตุ เริ่มต้น <Fill>lowest price</Fill>
            </p>
            <p className="m-0 mt-1 text-[17px]" style={{ color: EL.inkSoft }}>
              งาน {thaiDayRange()} {Number(ELEMENTAL.startDate.slice(0, 4)) + 543} · ตอบรับภายใน 26 พ.ย. 2569
              <Draft />
            </p>
          </div>
        </div>
        <div className="relative min-h-[55svh] overflow-hidden lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/elemental/sponsor/cover.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_68%]" />
        </div>
      </section>

      {/* 01 The one page a sponsor forwards to their boss */}
      <Section id="summary" tone="paper">
        <Tag n="01 AT A GLANCE" light>
          สรุปในหน้าเดียว
        </Tag>
        <H2>ทั้งหมดที่ต้องรู้ เพื่อตัดสินใจ</H2>
        <div className="mt-8 border-b" style={{ borderColor: LINE_LIGHT }}>
          <Row light label="งาน">
            แฮกกาธอน 3 วัน {thaiDayRange()} {Number(ELEMENTAL.startDate.slice(0, 4)) + 543} โดย {ELEMENTAL.series} และ PassionSeed
          </Row>
          <Row light label="ผู้เข้าร่วม">
            นักเรียน ม.4–ม.6 เป้าหมาย 350 คนขึ้นไป
            <Draft>ม.4–ม.6 ร่าง</Draft>
          </Row>
          <Row light label="คนที่จะเห็นชื่อคุณ">
            <Fill>reach of the campaign</Fill>
          </Row>
          <Row light label="สิ่งที่คุณได้">ชื่อบนรางวัลหรือธาตุ ในโพสต์ โปสเตอร์ และเวทีรอบชิง พร้อมรายงานผลหลังงาน</Row>
          <Row light label="งบประมาณ">
            <Fill>package prices</Fill>
          </Row>
          <Row light label="ตอบรับภายใน">
            26 พ.ย. 2569 เพื่อให้ชื่ออยู่ในการโปรโมตสัปดาห์สุดท้าย
            <Draft />
          </Row>
          <Row light label="ติดต่อ">
            <Fill>contact person and channel</Fill>
          </Row>
        </div>
      </Section>

      {/* 02 What you get, in numbers */}
      <Section id="get">
        <Tag n="02 WHAT YOU GET">สิ่งที่คุณได้ เป็นตัวเลข</Tag>
        <H2>ชื่อของคุณอยู่ตรงไหน กี่ครั้ง และใครเห็น</H2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat big={<Fill>reach</Fill>} label="คนที่เห็นโพสต์ของ PassionSeed บน Instagram ตลอดช่วงโปรโมต" />
          <Stat big="350+" label="ผู้เข้าร่วมที่เห็นชื่อคุณตลอด 3 วัน บน Discord และเวทีรอบชิง (เป้าหมาย)" />
          <Stat big={<Fill>posts</Fill>} label="โพสต์ที่มีชื่อคุณ บน Instagram ของ PassionSeed และ The Next Decade" />
        </div>
        <div className="mt-10 border-b" style={{ borderColor: LINE_DARK }}>
          <Row label="ก่อนงาน">
            ชื่อและโลโก้ในโพสต์โปรโมต โปสเตอร์ และหน้ารับสมัคร
            <Draft>Claude ร่าง</Draft>
          </Row>
          <Row label="ระหว่างงาน">ชื่อบนรางวัลหรือธาตุของคุณ ในโจทย์ ใน Discord และบนเกาะของงาน 60 วินาทีบนเวทีรอบชิง (ผู้สนับสนุนกองรางวัล)</Row>
          <Row label="หลังงาน">
            รายงานผล: จำนวนผู้สมัคร ทีม ผลงาน และ reach ของโพสต์ที่มีชื่อคุณ คลิปไฮไลต์ที่นำไปใช้ต่อได้ เฉพาะคลิปที่นักเรียนและผู้ปกครองยินยอม
            <Draft>Claude ร่าง</Draft>
          </Row>
        </div>
      </Section>

      {/* 03 Proof */}
      <Section id="proof" tone="paper">
        <Tag n="03 PROOF" light>
          ผลงานที่ผ่านมา
        </Tag>
        <H2>{ELEMENTAL.series} ครั้งที่แล้ว</H2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat light big={<Fill>participants</Fill>} label="ผู้เข้าร่วม" />
          <Stat light big={<Fill>teams</Fill>} label="ทีมที่ส่งผลงาน" />
          <Stat light big={<Fill>sign-ups so far</Fill>} label={`ผู้สมัคร ${ELEMENTAL.edition} ถึงวันนี้`} />
        </div>
        <p className="m-0 mt-10 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          ผู้สนับสนุนครั้งที่แล้ว
          <Draft>ยืนยันการใช้โลโก้</Draft>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-5">
          {LAST_SPONSORS.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.alt} src={s.src} alt={s.alt} className="h-10 w-auto object-contain sm:h-12" />
          ))}
        </div>
        <p className="m-0 mt-8 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          พาร์ทเนอร์ครั้งที่แล้ว
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-5">
          {LAST_PARTNERS.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.alt} src={s.src} alt={s.alt} className="h-14 w-auto object-contain sm:h-16" />
          ))}
        </div>
      </Section>

      {/* 04 Brand safety */}
      <Section id="safety">
        <Tag n="04 BRAND SAFETY">ปลอดภัยต่อแบรนด์</Tag>
        <H2>คุณอยู่ฝั่งที่แก้ปัญหา</H2>
        <Body>ธีมปีนี้คือสิ่งแวดล้อม แต่ไม่มีใครถูกชี้นิ้ว นี่คือสิ่งที่เราสัญญากับผู้สนับสนุนทุกราย</Body>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["ไม่เอ่ยชื่อใคร", "ไม่มีชื่อบริษัทหรือคดีใดในสื่อของงาน ทุกทีมทำงานกับปัญหา ไม่ใช่การกล่าวหา", false],
              ["ผู้สนับสนุนยืนฝั่งเดียวกัน", "เราเลือกผู้สนับสนุนที่เข้ากับธีม ชื่อของคุณจึงไม่ไปอยู่ข้างแบรนด์ที่ขัดกับเรื่องนี้", true],
              ["ข้อมูลนักเรียนอยู่กับเรา", "ผู้สนับสนุนไม่ได้รับรายชื่อหรือช่องทางติดต่อนักเรียน ความเสี่ยงเรื่องข้อมูลส่วนบุคคลจึงไม่ตกถึงคุณ ทุกอย่างผ่าน PassionSeed ในช่องทางสาธารณะ", false],
              ["ดูแลนักเรียนเป็นอันดับแรก", "ไม่มีช่องทางส่วนตัวระหว่างผู้ใหญ่กับนักเรียน และขอความยินยอมจากผู้ปกครองก่อนนักเรียนปรากฏในสื่อ ผลตัดสินมาจากกรรมการเท่านั้น", false],
            ] as const
          ).map(([title, text, draft]) => (
            <div key={title} className="border-t pt-5" style={{ borderColor: LINE_DARK }}>
              <h3 className="m-0 text-[21px] leading-[1.35]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
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

      {/* 05 Ways to take part */}
      <Section id="packages" tone="paper">
        <Tag n="05 PACKAGES" light>
          วิธีร่วมกับเรา
        </Tag>
        <H2>4 วิธีร่วมกับเรา</H2>
        <p className="m-0 mt-3 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          ทุกแพ็กเกจ: ผู้สนับสนุน 1 รายนั่งได้ไม่เกิน 1 ใน 3 ที่นั่งกรรมการรอบชิง และเปลี่ยนผลตัดสินไม่ได้
          <Draft>แพ็กเกจ: Claude ร่าง</Draft>
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Package
            name="ผู้สนับสนุนกองรางวัล"
            en="Prize pool partner"
            slots="1 ราย"
            accent={EL.flame}
            items={[
              `ชื่อของคุณบนรางวัลรวม ${prizeTotal()} บาท`,
              "60 วินาทีบนเวทีรอบชิง",
              "1 ที่นั่งในกรรมการรอบชิง",
              <>
                ทุนที่นั่ง <Fill>how many</Fill> ที่ ให้นักเรียนที่ไม่มีค่าสมัคร
              </>,
              "เชิญร่วม Demo Day ของ Request for Winners",
            ]}
            price={<Fill>price</Fill>}
          />
          <Package
            name="เจ้าของโจทย์"
            en="Challenge partner"
            slots={<Fill>how many</Fill>}
            accent={EL.toxicCyan}
            draft={<Draft>ยังไม่ได้ตัดสินใจ</Draft>}
            items={["ตั้งโจทย์จากปัญหาจริงขององค์กรคุณ ในธาตุที่เลือก", "ผู้เชี่ยวชาญของคุณเป็นเสียงของปัญหาหรือกรรมการ", "ได้เห็นทางแก้ทุกชิ้นที่ทีมสร้างให้โจทย์ของคุณ"]}
            price={<Fill>price</Fill>}
          />
          <Package
            name="ผู้สนับสนุนธาตุ"
            en="Element partner"
            slots="5 ราย ธาตุละ 1 ราย"
            accent={EL.toxicGreen}
            items={[
              "ชื่อของคุณบนธาตุที่เลือก ในโจทย์ โพสต์ และเกาะของธาตุนั้น",
              <>
                ทุนที่นั่ง <Fill>how many</Fill> ที่ ให้นักเรียนที่ไม่มีค่าสมัคร
              </>,
              "เชิญร่วม Demo Day ของ Request for Winners",
            ]}
            price={<Fill>price, and whether Fire costs more</Fill>}
          />
          <Package
            name="ผู้สนับสนุนสิ่งของ"
            en="In-kind partner"
            slots={<Fill>how many</Fill>}
            accent={EL.aetherGrey}
            items={["สถานที่จัดรอบชิงแบบพบหน้ากัน", "เครดิตเครื่องมือหรือซอฟต์แวร์ให้ทีม", "ของรางวัลเพิ่มเติม"]}
            price={<Fill>what we accept</Fill>}
          />
        </div>
      </Section>

      {/* 06 The sponsor's own timeline */}
      <Section id="timeline">
        <Tag n="06 YOUR TIMELINE">ไทม์ไลน์ของคุณ</Tag>
        <H2>จากวันตอบรับ ถึงวันรับรายงาน</H2>
        <ol className="m-0 mt-10 list-none border-b p-0" style={{ borderColor: LINE_DARK, fontFamily: EL_FONT.display }}>
          {(
            [
              ["ภายใน 26 พ.ย.", "ตอบรับและส่งโลโก้", true],
              ["ถึง 4 ธ.ค.", "ชื่อของคุณในโพสต์โปรโมตทุกวันจนถึงวันงาน", true],
              ["ศุกร์ 4 ธ.ค.", "19:00 ปฐมนิเทศ ไม่บังคับ", false],
              ["5–7 ธ.ค.", "แฮกกาธอน 3 วัน", false],
              ["จันทร์ 7 ธ.ค.", "รอบชิงชนะเลิศ และ 60 วินาทีบนเวทีของผู้สนับสนุนกองรางวัล", true],
              ["11 ธ.ค.", "Request for Winners เปิดรับ บ่มเพาะ 4 สัปดาห์ แล้วจบด้วย Demo Day", false],
              [null, "รายงานผลถึงมือคุณ", false],
            ] as const
          ).map(([when, what, draft], i) => (
            <li key={i} className="grid grid-cols-[130px_1fr] gap-4 border-t py-4 sm:grid-cols-[200px_1fr]" style={{ borderColor: LINE_DARK }}>
              <span className="text-[18px]" style={{ fontWeight: 400 }}>
                {when ?? <Fill>report date</Fill>}
              </span>
              <span className="text-[17px] leading-[1.6]" style={{ fontWeight: 300, color: EL.creamSoft }}>
                {what}
                {draft ? <Draft /> : null}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* 07 Appendix: the event itself */}
      <Section id="event" tone="paper">
        <Tag n="07 APPENDIX" light>
          รายละเอียดงาน
        </Tag>
        <H2>5 สิ่งที่ทุกคนใช้ร่วมกัน นักเรียนจะสร้างทางแก้ให้มัน</H2>
        <Body light>ธีม Environmental negligence: เมื่อการทำธุรกิจทิ้งต้นทุนไว้กับสิ่งแวดล้อม แต่ละทีมเลือกธาตุ แล้วสร้างสิ่งที่ช่วยคนจริงได้อย่างน้อย 1 คน</Body>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {ELEMENTS.map(({ key, harm }) => {
            const e = el(key);
            return (
              <div key={key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/hackathon/elemental/sponsor/el-${key}.webp`} alt="" className="aspect-square w-full object-cover" style={{ imageRendering: "pixelated" }} />
                <p className="m-0 mt-3 text-[22px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                  {e.th}
                  <span className="ml-2 text-[11px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                    {e.en.toUpperCase()}
                  </span>
                </p>
                <p className="m-0 mt-1 text-[14px] leading-[1.55]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.inkSoft }}>
                  {harm}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-x-10 border-b sm:grid-cols-2" style={{ borderColor: LINE_LIGHT }}>
          <Row light label="ทีม">
            2–4 คน คนที่สมัครเดี่ยวจะได้จับคู่เข้าทีม
            <Draft />
          </Row>
          <Row light label="ค่าสมัคร">
            ฿{ELEMENTAL.priceBaht} ต่อคน · มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} ต่อคน
          </Row>
          <Row light label="การตัดสิน">
            กรรมการ 2 คนต่อทีม 8 ทีมสุดท้ายนำเสนอสดต่อกรรมการ 3 คน
            <Draft />
          </Row>
          <Row light label="ทำงานบน">Discord และ whiteboard ของ PassionSeed</Row>
        </div>
      </Section>

      {/* 08 Contact and paperwork */}
      <Section id="contact">
        <Tag n="08 NEXT STEP">ร่วมกับเรา</Tag>
        <H2>ตอบรับภายใน 26 พ.ย. 2569 แล้วเราส่งเอกสารให้คุณ</H2>
        <div className="mt-10 border-b" style={{ borderColor: LINE_DARK }}>
          <Row label="ติดต่อ">
            <Fill>contact person and channel</Fill>
          </Row>
          <Row label="เอกสาร">
            <Fill>quotation, invoice, receipt or tax invoice: what PassionSeed can issue</Fill>
          </Row>
          <Row label="การชำระเงิน">
            <Fill>how and when sponsors pay</Fill>
          </Row>
        </div>
        <div className="deck-no-print mt-10">
          <PrintButton />
        </div>
      </Section>
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
  /* The appendix holds the most; shorter element crops keep it on one page. */
  .elemental-deck #event img { aspect-ratio: 16 / 10; }
  .elemental-deck .deck-page:last-child { break-after: auto; page-break-after: auto; }
  .elemental-deck .deck-no-print { display: none !important; }
}
`;
