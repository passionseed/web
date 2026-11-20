import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "@/components/hackathon/poster/elemental/facts";

import { PrintButton } from "./PrintButton";

/**
 * Elemental Hackathon sponsor deck: one scrollable page that also prints as
 * an A4 landscape PDF, one section per page.
 *
 * Sources: passionseed/company-brain, private/hackathon-december-2026.md,
 * private/hackathon-elemental-theme-and-rules.md, private/hackathon-december-2026-rules.md
 * and private/hackathon-december-2026-judging.md (main, 2026-11-20). Event
 * facts (dates, prices, prize total) come from facts.ts.
 *
 * Status of what this page says:
 * - Decided: dates, orientation on Fri 4 Dec 19:00, prices, prize total,
 *   theme, the five elements, no company named, the 350 target (Big),
 *   Discord and the whiteboard, sponsors fund the prize pool, sponsors get no
 *   participant list, Request for Winners from 11 Dec with 4 weeks and a demo day.
 * - Draft in the brain: M.4 to M.6, teams of 2 to 4, finals on Mon 7 Dec,
 *   judging, what a sponsor gets, the theme check, the 26 Nov target.
 * - Claude's draft for this page: the three packages.
 * Anything we don't know yet shows as <Fill>. Nothing here may be invented.
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

/** A fact nobody has told us yet. Highlighted so it can't ship by accident. */
function Fill({ children }: { children: ReactNode }) {
  return (
    <mark
      className="rounded-[2px] px-[6px] py-[1px]"
      style={{ background: EL.toxicYellow, color: EL.ink, fontFamily: EL_FONT.mono, fontSize: "min(0.72em, 17px)", letterSpacing: "0.02em", verticalAlign: "middle" }}
    >
      (fill in: {children})
    </mark>
  );
}

function Tag({ n, children, light = false }: { n: string; children: ReactNode; light?: boolean }) {
  return (
    <p className="m-0 mb-6 text-[13px] tracking-[0.12em] sm:text-[14px]" style={{ fontFamily: EL_FONT.mono, color: light ? EL.inkSoft : EL.creamSoft }}>
      [{n}] {children}
    </p>
  );
}

function Section({ id, children, tone = "dark", className = "" }: { id: string; children: ReactNode; tone?: "dark" | "paper"; className?: string }) {
  const dark = tone === "dark";
  return (
    <section
      id={id}
      className={`deck-page relative flex min-h-[100svh] flex-col justify-center px-4 py-20 sm:px-12 lg:px-20 ${className}`}
      style={{ background: dark ? DARK : PAPER, color: dark ? EL.cream : EL.ink }}
    >
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
    </section>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="m-0 max-w-[900px] text-[34px] leading-[1.25] sm:text-[52px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, letterSpacing: "-0.01em" }}>
      {children}
    </h2>
  );
}

function Body({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className="m-0 mt-6 max-w-[760px] text-[18px] leading-[1.75] sm:text-[20px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: light ? EL.inkSoft : EL.creamSoft }}>
      {children}
    </p>
  );
}

/** Each element, cropped from the key visual (the plate built by scripts/render-elemental-plate.mjs). */
const ELEMENTS: { key: "water" | "earth" | "air" | "fire" | "aether"; harm: string }[] = [
  { key: "water", harm: "พิษที่มองไม่เห็นในแม่น้ำที่คนใช้ดื่มและทำเกษตร" },
  { key: "earth", harm: "ขยะพิษที่ถูกฝัง แล้วถูกขุดขึ้นมาและหายไป" },
  { key: "air", harm: "ฝุ่นและควันพิษข้างบ้านคน" },
  { key: "fire", harm: "ไฟไหม้ที่แหล่งเก็บสารเคมีซึ่งควรถูกเก็บกวาดไปแล้ว" },
  { key: "aether", harm: "อันตรายที่มองไม่เห็น: ข้อมูลที่บิดเบือน ร่องรอยที่หายไป และ digital footprint ที่ไม่มีใครนับ" },
];

function Stat({ big, label }: { big: ReactNode; label: ReactNode }) {
  return (
    <div className="border-t pt-5" style={{ borderColor: "rgba(243,239,230,0.25)" }}>
      <div className="text-[44px] leading-none sm:text-[60px]" style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}>
        {big}
      </div>
      <div className="mt-3 text-[16px] leading-[1.6]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.creamSoft }}>
        {label}
      </div>
    </div>
  );
}

function Package({ name, en, slots, price, items, accent }: { name: string; en: string; slots: ReactNode; price: ReactNode; items: ReactNode[]; accent: string }) {
  return (
    <div className="flex flex-col border p-6 sm:p-8" style={{ borderColor: "rgba(29,33,31,0.25)", background: "rgba(255,255,255,0.35)" }}>
      <span className="mb-5 block h-[6px] w-12" style={{ background: accent }} />
      <p className="m-0 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
        {en.toUpperCase()}
      </p>
      <h3 className="m-0 mt-2 text-[28px] leading-[1.3]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
        {name}
      </h3>
      <p className="m-0 mt-2 text-[16px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
        {slots}
      </p>
      <ul className="m-0 mt-6 flex-1 list-none space-y-3 p-0 text-[17px] leading-[1.6]" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden="true" className="mt-[10px] block h-[6px] w-[6px] shrink-0" style={{ background: EL.ink }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-8 border-t pt-4 text-[20px]" style={{ borderColor: "rgba(29,33,31,0.25)", fontFamily: EL_FONT.display }}>
        {price}
      </p>
    </div>
  );
}

export function SponsorDeck() {
  const el = (k: string) => ELEMENTAL.elements.find((e) => e.key === k)!;
  return (
    <main className={`${trirong.variable} elemental-deck`}>
      <style>{PRINT_CSS}</style>

      {/* Cover */}
      {/* The title sits on the poster's own grey sky; the poisoned valley fills the other half. */}
      <section id="cover" className="deck-page deck-cover grid min-h-[100svh] grid-cols-1 lg:grid-cols-[1.05fr_1fr]" style={{ backgroundColor: SKY, color: EL.ink }}>
        <div className="flex flex-col justify-between gap-12 px-4 py-10 sm:px-12 sm:py-14 lg:px-16">
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
            [SPONSORSHIP] ร่วมเป็นผู้สนับสนุน
          </p>
          <h1 className="m-0 mt-2" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
            <span className="block text-[64px] sm:text-[112px]" style={{ fontWeight: 200 }}>
              {ELEMENTAL.edition}
            </span>
            <span className="block text-[64px] italic sm:text-[112px]" style={{ fontWeight: 300 }}>
              Hackathon
            </span>
          </h1>
          <p className="m-0 mt-2 text-[26px] sm:text-[36px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
            ดิน · น้ำ · ลม · ไฟ · ธาตุที่ 5
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3" style={{ borderColor: "rgba(29,33,31,0.3)", fontFamily: EL_FONT.display }}>
          <div>
            <div className="text-[15px]" style={{ color: EL.inkSoft }}>วันที่</div>
            <div className="text-[26px] font-light sm:text-[30px]">{thaiDayRange()}</div>
            <div className="text-[15px]" style={{ color: EL.inkSoft }}>
              {ELEMENTAL.startDate.slice(0, 4)} · หยุดยาว {ELEMENTAL.days} วัน
            </div>
          </div>
          <div>
            <div className="text-[15px]" style={{ color: EL.inkSoft }}>รางวัลรวมมูลค่า</div>
            <div className="text-[26px] font-light sm:text-[30px]">{prizeTotal()} บาท</div>
          </div>
          <div>
            <div className="text-[15px]" style={{ color: EL.inkSoft }}>เป้าหมายผู้เข้าร่วม</div>
            <div className="text-[26px] font-light sm:text-[30px]">350 คนขึ้นไป</div>
            <div className="text-[15px]" style={{ color: EL.inkSoft }}>นักเรียนมัธยมปลาย</div>
          </div>
        </div>
        </div>
        <div className="relative min-h-[60svh] overflow-hidden lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/elemental/sponsor/cover.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_68%]" />
        </div>
      </section>

      {/* 01 The idea */}
      <Section id="idea">
        <Tag n="01 THE IDEA">แนวคิด</Tag>
        <H2>5 สิ่งที่เราทุกคนใช้ร่วมกัน และบางธุรกิจทำให้มันเสีย เพราะแบบนั้นถูกกว่า</H2>
        <Body>
          ธีมปีนี้คือ Environmental negligence: ธุรกิจที่ทำร้ายสิ่งแวดล้อมเพื่อลดต้นทุนหรือเพิ่มกำไร แต่ละทีมเลือกธาตุ แล้วสร้างสิ่งที่ช่วยคนจริงได้อย่างน้อย 1 คน
          เราไม่เอ่ยชื่อบริษัทหรือคดีใดเลย ทุกทีมทำงานกับปัญหา ไม่ใช่การกล่าวหาใคร
        </Body>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {ELEMENTS.map(({ key, harm }) => {
            const e = el(key);
            return (
              <div key={key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/hackathon/elemental/sponsor/el-${key}.webp`} alt="" className="aspect-square w-full object-cover" style={{ imageRendering: "pixelated" }} />
                <p className="m-0 mt-4 text-[26px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                  {e.th}
                </p>
                <p className="m-0 text-[12px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
                  {e.en.toUpperCase()}
                </p>
                <p className="m-0 mt-2 text-[15px] leading-[1.6]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.creamSoft }}>
                  {harm}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 02 Who joins */}
      <Section id="who">
        <Tag n="02 WHO JOINS">ใครเข้าร่วม</Tag>
        <H2>นักเรียนมัธยมปลายที่เลือกใช้วันหยุดยาว สร้างของที่ใช้ได้จริง</H2>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat big="350+" label="เป้าหมายผู้เข้าร่วม" />
          <Stat big="ม.4–ม.6" label="ระดับชั้นของผู้เข้าร่วม" />
          <Stat big="2–4" label="คนต่อทีม คนที่สมัครเดี่ยวจะได้จับคู่เข้าทีม" />
          <Stat big={<Fill>reach</Fill>} label="คนที่เห็นโพสต์ของเราบน Instagram ใน 7 วัน" />
        </div>
      </Section>

      {/* 03 How it runs */}
      <Section id="format" tone="paper">
        <Tag n="03 HOW IT RUNS" light>
          รูปแบบงาน
        </Tag>
        <H2>3 วัน ออนไลน์บน Discord และ whiteboard ของ PassionSeed</H2>
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr]">
          <ol className="m-0 list-none space-y-0 p-0" style={{ fontFamily: EL_FONT.display }}>
            {[
              ["ศุกร์ 4 ธ.ค.", "19:00 ปฐมนิเทศ ไม่บังคับ และมีวิดีโอย้อนหลัง"],
              ["เสาร์ 5 ธ.ค.", "เริ่มแข่ง ทีมเลือกธาตุและคนจริงที่จะช่วย"],
              ["อาทิตย์ 6 ธ.ค.", "สร้างและทดสอบกับคนจริง"],
              ["จันทร์ 7 ธ.ค.", "รอบชิงชนะเลิศ นำเสนอสด"],
            ].map(([day, what]) => (
              <li key={day} className="grid grid-cols-[140px_1fr] gap-4 border-t py-5 sm:grid-cols-[180px_1fr]" style={{ borderColor: "rgba(29,33,31,0.25)" }}>
                <span className="text-[20px]" style={{ fontWeight: 400 }}>
                  {day}
                </span>
                <span className="text-[18px] leading-[1.6]" style={{ fontWeight: 300, color: EL.inkSoft }}>
                  {what}
                </span>
              </li>
            ))}
          </ol>
          <div className="space-y-8" style={{ fontFamily: EL_FONT.display }}>
            <div>
              <p className="m-0 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                [ค่าสมัคร]
              </p>
              <p className="m-0 mt-2 text-[22px] font-light leading-[1.6]">
                ฿{ELEMENTAL.priceBaht} ต่อคน · มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} ต่อคน
              </p>
            </div>
            <div>
              <p className="m-0 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                [รางวัล]
              </p>
              <p className="m-0 mt-2 text-[22px] font-light leading-[1.6]">รางวัลรวมมูลค่า {prizeTotal()} บาท จากกองรางวัลของผู้สนับสนุน</p>
            </div>
            <div>
              <p className="m-0 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                [การตัดสิน]
              </p>
              <p className="m-0 mt-2 text-[18px] font-light leading-[1.7]" style={{ color: EL.inkSoft }}>
                ทุกทีมได้รับการตรวจจากกรรมการ 2 คนแบบสุ่ม ไม่มีใครตรวจทีมที่ตัวเองรู้จัก 8 ทีมสุดท้ายนำเสนอสดต่อกรรมการ 3 คน และมีรางวัลขวัญใจผู้ชม
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 04 Track record */}
      <Section id="proof">
        <Tag n="04 TRACK RECORD">ผลงานที่ผ่านมา</Tag>
        <H2>{ELEMENTAL.series} ไม่ใช่ครั้งแรก</H2>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat big={<Fill>participants</Fill>} label={`ผู้เข้าร่วม ${ELEMENTAL.series} ครั้งก่อน`} />
          <Stat big={<Fill>teams</Fill>} label="ทีมที่ส่งผลงาน" />
          <Stat big={<Fill>schools</Fill>} label="โรงเรียน" />
        </div>
        <Body>
          PassionSeed จัดโปรแกรม SHIFT ให้นักเรียนสร้างโปรเจกต์จริงและทดสอบกับผู้ใช้จริง <Fill>SHIFT cohorts and students to date</Fill>
        </Body>
      </Section>

      {/* 05 Packages */}
      <Section id="packages" tone="paper">
        <Tag n="05 PACKAGES" light>
          สิ่งที่ผู้สนับสนุนได้รับ
        </Tag>
        <H2>3 วิธีร่วมกับเรา</H2>
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Package
            name="ผู้สนับสนุนกองรางวัล"
            en="Prize pool partner"
            slots="1 ราย"
            accent={EL.flame}
            items={[
              `ชื่อของคุณบนรางวัลรวม ${prizeTotal()} บาท`,
              "60 วินาทีบนเวทีรอบชิงชนะเลิศ",
              "1 ที่นั่งในคณะกรรมการรอบชิง",
              "ทุนที่นั่งให้นักเรียนที่ไม่มีค่าสมัคร",
              "เชิญร่วม Demo Day ของ Request for Winners",
            ]}
            price={<Fill>price</Fill>}
          />
          <Package
            name="ผู้สนับสนุนธาตุ"
            en="Element partner"
            slots="5 ราย ธาตุละ 1 ราย"
            accent={EL.toxicGreen}
            items={["ชื่อของคุณบนธาตุที่เลือก ในโจทย์และโพสต์ของธาตุนั้น", "ทุนที่นั่งให้นักเรียนที่ไม่มีค่าสมัคร", "เชิญร่วม Demo Day ของ Request for Winners"]}
            price={<Fill>price</Fill>}
          />
          <Package
            name="ผู้สนับสนุนสิ่งของ"
            en="In-kind partner"
            slots={<Fill>slots</Fill>}
            accent={EL.aetherGrey}
            items={["สถานที่จัดรอบชิงแบบพบหน้ากัน", "เครดิตเครื่องมือหรือซอฟต์แวร์ให้ทีม", "ของรางวัล"]}
            price={<Fill>what we accept</Fill>}
          />
        </div>
      </Section>

      {/* 06 Our rules */}
      <Section id="rules">
        <Tag n="06 OUR RULES">กติกาของเรา</Tag>
        <H2>กติกาที่ทำให้รางวัลนี้มีความหมาย</H2>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            ["ผู้สนับสนุนต้องเข้ากับธีม", "เราตรวจผู้สนับสนุนทุกราย ธุรกิจที่มีประวัติก่อมลพิษ หรืออยู่ได้ด้วย clickbait และ AI slop จะทำให้ธีมนี้ไม่น่าเชื่อถือ"],
            ["ไม่มีรายชื่อนักเรียน", "ผู้สนับสนุนไม่ได้รับรายชื่อหรือช่องทางติดต่อผู้เข้าร่วม และไม่ติดต่อนักเรียนโดยตรง ทุกอย่างผ่าน PassionSeed ในช่องทางสาธารณะ"],
            ["ผู้ชนะคือผู้ชนะ", "ผู้สนับสนุนเปลี่ยนผลการตัดสินไม่ได้ กรรมการจากผู้สนับสนุนใช้กฎเรื่องผลประโยชน์ทับซ้อนเหมือนกรรมการทุกคน"],
          ].map(([title, text]) => (
            <div key={title} className="border-t pt-5" style={{ borderColor: "rgba(243,239,230,0.25)" }}>
              <h3 className="m-0 text-[24px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                {title}
              </h3>
              <p className="m-0 mt-3 text-[17px] leading-[1.7]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.creamSoft }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 07 After */}
      <Section id="after" tone="paper">
        <Tag n="07 AFTER THE HACKATHON" light>
          หลังจบงาน
        </Tag>
        <H2>ผู้ชนะไปต่อที่ Request for Winners</H2>
        <Body light>
          เริ่ม 11 ธ.ค. 2569 เปิดรับนักเรียนที่เคยชนะการแข่งขันใดก็ได้ ไม่ใช่แค่แฮกกาธอนนี้ ทีมที่ได้รับเลือกจะได้รับการบ่มเพาะ 4 สัปดาห์ แล้วนำเสนอใน Demo Day
          ผู้สนับสนุนได้เห็นงานของทีมต่อเนื่องหลายสัปดาห์ ไม่ใช่แค่ 3 วัน
        </Body>
      </Section>

      {/* 08 Next step */}
      <Section id="contact">
        <Tag n="08 NEXT STEP">ร่วมกับเรา</Tag>
        <H2>ตอบรับภายในวันที่ 26 พ.ย. 2569 เพื่อให้ชื่อของคุณอยู่ในการโปรโมตสัปดาห์สุดท้ายก่อนงาน</H2>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2" style={{ fontFamily: EL_FONT.display }}>
          <div>
            <p className="m-0 text-[13px] tracking-[0.12em]" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
              [ติดต่อ]
            </p>
            <p className="m-0 mt-2 text-[24px] font-light">
              <Fill>contact person and channel</Fill>
            </p>
          </div>
          <div className="deck-no-print sm:text-right">
            <PrintButton />
          </div>
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
    padding: 14mm 18mm; justify-content: center;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .elemental-deck .deck-cover { padding: 0; display: grid; grid-template-columns: 1.05fr 1fr; }
  .elemental-deck .deck-cover > div:first-child { padding: 12mm 14mm; }
  .elemental-deck .deck-page:last-child { break-after: auto; page-break-after: auto; }
  .elemental-deck .deck-no-print { display: none !important; }
}
`;
