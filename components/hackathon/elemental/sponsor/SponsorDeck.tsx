import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "@/components/hackathon/poster/elemental/facts";

import { PrintButton } from "./PrintButton";

/**
 * Elemental Hackathon sponsor deck: one scrollable page that also prints as
 * an A4 landscape PDF, one section per page.
 *
 * Order: cover with the ask, project overview, sponsor benefits, past
 * event, brand safety, sponsorship packages, timeline, competition details,
 * contact. Headings use the words Thai sponsorship proposals use
 * (ข้อมูลโครงการ, สิทธิประโยชน์, รูปแบบการสนับสนุน, กำหนดการ), not translations.
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
const YEAR_TH = Number(ELEMENTAL.startDate.slice(0, 4)) + 543;

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

function Tag({ n, light = false }: { n: string; children?: ReactNode; light?: boolean }) {
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

function Package({ name, en, slots, price, items, accent, draft }: { name: string; en: string; slots: ReactNode; price: ReactNode; items: ReactNode[]; accent: string; draft?: ReactNode }) {
  return (
    <div className="flex flex-col border p-5 sm:p-6" style={{ borderColor: LINE_LIGHT, background: "rgba(255,255,255,0.4)" }}>
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
      <p className="m-0 mt-5 border-t pt-3 text-[17px]" style={{ borderColor: LINE_LIGHT, fontFamily: EL_FONT.display }}>
        {price}
      </p>
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
              <div className="text-[15px]" style={{ color: EL.inkSoft }}>ยืนยันการสนับสนุนภายใน</div>
              <div className="text-[24px] font-light sm:text-[28px]">26 พ.ย. {YEAR_TH}</div>
              <Draft />
            </div>
          </div>
        </div>
        <div className="relative min-h-[55svh] overflow-hidden lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/elemental/sponsor/cover.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_68%]" />
        </div>
      </section>

      {/* 01 Project overview */}
      <Section id="overview" tone="paper">
        <Tag n="01 OVERVIEW" light>
          ข้อมูลโครงการ
        </Tag>
        <H2>ข้อมูลโครงการ</H2>
        <div className="mt-6 border-b" style={{ borderColor: LINE_LIGHT }}>
          <Row light label="ชื่อโครงการ">
            {ELEMENTAL.edition} Hackathon
          </Row>
          <Row light label="ผู้จัด">
            {ELEMENTAL.series} และ PassionSeed
          </Row>
          <Row light label="วันจัดงาน">
            {thaiDayRange()} {YEAR_TH} ({ELEMENTAL.days} วัน ช่วงวันหยุดยาว)
          </Row>
          <Row light label="รูปแบบ">
            การแข่งขันพัฒนาผลงานเป็นทีม ทำงานผ่าน Discord และ whiteboard ของ PassionSeed
          </Row>
          <Row light label="ผู้เข้าร่วม">
            นักเรียนมัธยมศึกษาตอนปลาย ม.4–ม.6 เป้าหมาย 350 คนขึ้นไป
            <Draft>ม.4–ม.6 ร่าง</Draft>
          </Row>
          <Row light label="หัวข้อการแข่งขัน">
            ปัญหาสิ่งแวดล้อม แบ่งเป็น 5 หัวข้อ เรียกว่า 5 ธาตุ: ดิน น้ำ ลม ไฟ และธาตุที่ 5 (ผลกระทบที่มองไม่เห็น) รายละเอียดอยู่ในหน้า 07
          </Row>
          <Row light label="เงินรางวัลรวม">
            {prizeTotal()} บาท
          </Row>
          <Row light label="แพ็กเกจการสนับสนุน">
            เริ่มต้น <Fill>lowest price</Fill>
          </Row>
          <Row light label="ผู้ประสานงาน">
            <Fill>contact person and channel</Fill>
          </Row>
        </div>
      </Section>

      {/* 02 Benefits */}
      <Section id="benefits">
        <Tag n="02 BENEFITS">สิทธิประโยชน์</Tag>
        <H2>สิทธิประโยชน์ของผู้สนับสนุน</H2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat big={<Fill>reach</Fill>} label="ยอดการมองเห็นบน Instagram ของ PassionSeed ช่วงประชาสัมพันธ์" />
          <Stat big="350+" label="ผู้เข้าร่วมที่เห็นโลโก้ผู้สนับสนุนตลอด 3 วัน (เป้าหมาย)" />
          <Stat big={<Fill>posts</Fill>} label="โพสต์ประชาสัมพันธ์ที่มีโลโก้ผู้สนับสนุน บน Instagram ของ PassionSeed และ The Next Decade" />
        </div>
        <div className="mt-8 border-b" style={{ borderColor: LINE_DARK }}>
          <Row label="ก่อนงาน">
            โลโก้บนโปสเตอร์ โพสต์ประชาสัมพันธ์ และหน้ารับสมัคร
            <Draft>Claude ร่าง</Draft>
          </Row>
          <Row label="ระหว่างงาน">โลโก้บนหัวข้อที่สนับสนุนและในช่อง Discord ของงาน กล่าวขอบคุณบนเวทีรอบชิงชนะเลิศ</Row>
          <Row label="หลังงาน">
            รายงานสรุปผลโครงการ: จำนวนผู้สมัคร ทีม ผลงาน และยอดการมองเห็นของโพสต์ พร้อมภาพและคลิปบรรยากาศที่ได้รับความยินยอมแล้ว
            <Draft>Claude ร่าง</Draft>
          </Row>
        </div>
      </Section>

      {/* 03 Past event */}
      <Section id="past" tone="paper">
        <Tag n="03 PAST EVENT" light>
          ผลงานที่ผ่านมา
        </Tag>
        <H2>{ELEMENTAL.series} ครั้งที่ผ่านมา</H2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat light big={<Fill>participants</Fill>} label="ผู้เข้าร่วม" />
          <Stat light big={<Fill>teams</Fill>} label="ทีมที่ส่งผลงาน" />
          <Stat light big={<Fill>sign-ups so far</Fill>} label="ผู้สมัครครั้งนี้ ณ ปัจจุบัน" />
        </div>
        <p className="m-0 mt-10 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          ผู้สนับสนุนครั้งที่ผ่านมา
          <Draft>ยืนยันการใช้โลโก้</Draft>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-5">
          {LAST_SPONSORS.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.alt} src={s.src} alt={s.alt} className="h-10 w-auto object-contain sm:h-12" />
          ))}
        </div>
        <p className="m-0 mt-8 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          พันธมิตรครั้งที่ผ่านมา
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
        <Tag n="04 BRAND SAFETY">ความปลอดภัยของแบรนด์</Tag>
        <H2>แนวทางดูแลแบรนด์ผู้สนับสนุน</H2>
        <Body>หัวข้อของงานเป็นเรื่องสิ่งแวดล้อม เราจึงวางแนวทางไว้ชัดเจน เพื่อให้ผู้สนับสนุนมั่นใจได้</Body>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["ไม่ระบุชื่อบริษัทหรือคดีใด", "สื่อของงานไม่ระบุชื่อบริษัทหรือคดีใด ผู้เข้าร่วมพัฒนาผลงานเพื่อแก้ปัญหา ไม่ใช่เพื่อกล่าวโทษผู้ใด", false],
              ["คัดเลือกผู้สนับสนุนที่สอดคล้องกับหัวข้อ", "ผู้สนับสนุนทุกรายผ่านการพิจารณาว่าสอดคล้องกับหัวข้อของงาน", true],
              ["ไม่ส่งต่อข้อมูลผู้เข้าร่วม", "ผู้สนับสนุนจะไม่ได้รับรายชื่อหรือข้อมูลติดต่อของผู้เข้าร่วม การสื่อสารทั้งหมดผ่าน PassionSeed ในช่องทางสาธารณะ", false],
              ["ดูแลความปลอดภัยของนักเรียน", "ไม่มีช่องทางสื่อสารส่วนตัวระหว่างผู้ใหญ่กับนักเรียน ขอความยินยอมจากผู้ปกครองก่อนเผยแพร่ภาพนักเรียน และผลการตัดสินเป็นของคณะกรรมการเท่านั้น", false],
            ] as const
          ).map(([title, text, draft]) => (
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

      {/* 05 Packages */}
      <Section id="packages" tone="paper">
        <Tag n="05 PACKAGES" light>
          รูปแบบการสนับสนุน
        </Tag>
        <H2>รูปแบบการสนับสนุน</H2>
        <p className="m-0 mt-3 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          ผู้สนับสนุนแต่ละรายมีกรรมการได้ไม่เกิน 1 ใน 3 ที่นั่งในรอบชิงชนะเลิศ และไม่มีส่วนในการเปลี่ยนแปลงผลการตัดสิน
          <Draft>แพ็กเกจ: Claude ร่าง</Draft>
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            price={<Fill>price</Fill>}
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
            price={<Fill>price, and whether Fire costs more</Fill>}
          />
          <Package
            name="ผู้สนับสนุนโจทย์"
            en="Challenge sponsor"
            slots={<Fill>how many</Fill>}
            accent={EL.toxicCyan}
            draft={<Draft>ยังไม่ได้ตัดสินใจ</Draft>}
            items={["ตั้งโจทย์จากปัญหาจริงขององค์กร ภายใต้หัวข้อที่เลือก", "ผู้เชี่ยวชาญขององค์กรร่วมให้ข้อมูลหรือเป็นกรรมการ", "ได้รับผลงานทุกชิ้นที่ทีมพัฒนาจากโจทย์ขององค์กร"]}
            price={<Fill>price</Fill>}
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

      {/* 06 Timeline */}
      <Section id="timeline">
        <Tag n="06 TIMELINE">กำหนดการ</Tag>
        <H2>กำหนดการสำหรับผู้สนับสนุน</H2>
        <ol className="m-0 mt-8 list-none border-b p-0" style={{ borderColor: LINE_DARK, fontFamily: EL_FONT.display }}>
          {(
            [
              [`ภายใน 26 พ.ย.`, "ยืนยันการสนับสนุนและส่งโลโก้", true],
              ["ถึง 4 ธ.ค.", "ประชาสัมพันธ์งาน พร้อมโลโก้ผู้สนับสนุน", true],
              ["ศุกร์ 4 ธ.ค.", "ปฐมนิเทศผู้เข้าร่วม 19:00 น. (ไม่บังคับ)", false],
              [`${thaiDayRange()}`, `การแข่งขัน ${ELEMENTAL.days} วัน`, false],
              ["จันทร์ 7 ธ.ค.", "รอบชิงชนะเลิศ", true],
              ["11 ธ.ค.", "เปิดรับสมัครโครงการ Request for Winners (บ่มเพาะ 4 สัปดาห์ และ Demo Day)", false],
              [null, "ส่งรายงานสรุปผลโครงการให้ผู้สนับสนุน", false],
            ] as const
          ).map(([when, what, draft], i) => (
            <li key={i} className="grid grid-cols-[130px_1fr] gap-4 border-t py-3 sm:grid-cols-[200px_1fr]" style={{ borderColor: LINE_DARK }}>
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

      {/* 07 Competition details */}
      <Section id="details" tone="paper">
        <Tag n="07 DETAILS" light>
          รายละเอียดการแข่งขัน
        </Tag>
        <H2>5 ธาตุ คือ 5 หัวข้อการแข่งขัน</H2>
        <Body light>
          หัวข้อหลักคือ Environmental negligence: ธุรกิจที่สร้างผลกระทบต่อสิ่งแวดล้อมเพื่อลดต้นทุนหรือเพิ่มกำไร แต่ละทีมเลือกหัวข้อ แล้วพัฒนาผลงานที่ช่วยแก้ปัญหาให้คนจริงอย่างน้อย 1 คน
        </Body>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {ELEMENTS.map(({ key, topic }) => {
            const e = el(key);
            return (
              <div key={key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/hackathon/elemental/sponsor/el-${key}.webp`} alt="" className="aspect-square w-full object-cover" style={{ imageRendering: "pixelated" }} />
                <p className="m-0 mt-3 text-[22px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                  {e.th}
                </p>
                <p className="m-0 mt-1 text-[14px] leading-[1.55]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.inkSoft }}>
                  {topic}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-x-10 border-b sm:grid-cols-2" style={{ borderColor: LINE_LIGHT }}>
          <Row light label="ทีม">
            ทีมละ 2–4 คน ผู้สมัครเดี่ยวจะได้รับการจับคู่เข้าทีม
            <Draft />
          </Row>
          <Row light label="ค่าสมัคร">
            {ELEMENTAL.priceBaht} บาทต่อคน หรือ {ELEMENTAL.groupPriceBaht} บาทต่อคนเมื่อสมัครพร้อมเพื่อน
          </Row>
          <Row light label="การตัดสิน">
            กรรมการ 2 คนพิจารณาทุกทีม 8 ทีมสุดท้ายนำเสนอต่อกรรมการ 3 คนในรอบชิงชนะเลิศ
            <Draft />
          </Row>
          <Row light label="หลังการแข่งขัน">ผู้ชนะสมัครเข้าโครงการ Request for Winners ได้</Row>
        </div>
      </Section>

      {/* 08 Contact */}
      <Section id="contact">
        <Tag n="08 CONTACT">ติดต่อ</Tag>
        <H2>ติดต่อสอบถาม</H2>
        <div className="mt-8 border-b" style={{ borderColor: LINE_DARK }}>
          <Row label="ผู้ประสานงาน">
            <Fill>contact person and channel</Fill>
          </Row>
          <Row label="ยืนยันการสนับสนุนภายใน">
            26 พ.ย. {YEAR_TH}
            <Draft />
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
  /* The details page holds the most; shorter element crops keep it on one page. */
  .elemental-deck #details img { aspect-ratio: 16 / 10; }
  .elemental-deck .deck-page:last-child { break-after: auto; page-break-after: auto; }
  .elemental-deck .deck-no-print { display: none !important; }
}
`;
