import Link from "next/link";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import {
  RFW,
  SOON_TH,
  maybeThaiDate,
  priceLine,
  thaiDateWithYear,
  weekLines,
} from "./facts";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";
const LINE = "border-[#f3efe6]/16";

/** A fact, or a quiet "announced soon" when the brain still says (fill in). */
function Fact({ value }: { value: string | null }) {
  if (value) return <>{value}</>;
  return (
    <span
      className="border-b border-dashed border-[#f3efe6]/40"
      style={{ color: EL.creamSoft }}
    >
      {SOON_TH}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[#faf8f4]"
      style={{
        fontFamily: EL_FONT.display,
        fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
        fontWeight: 200,
        lineHeight: 1.15,
      }}
    >
      {children}
    </h2>
  );
}

/** A label on the left, its answer on the right; stacks on phones. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`grid grid-cols-1 gap-2 border-b ${LINE} py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-8`}
    >
      <span
        className="text-xl text-[#faf8f4] sm:text-2xl"
        style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
      >
        {label}
      </span>
      <span
        className="text-base leading-relaxed text-[#e8e3d9] sm:text-lg"
        style={{ fontFamily: BODY_FONT }}
      >
        {children}
      </span>
    </li>
  );
}

/** A full-width band with a hairline on top. */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className={`border-t ${LINE} py-20 sm:py-28`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-10">{children}</div>
    </section>
  );
}

/** One step in the 4 weeks: a mono tag on the left, what happens on the right. */
function TimelineRow({
  tag,
  tagColor,
  children,
}: {
  tag: string;
  tagColor: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`grid grid-cols-[90px_1fr] items-baseline gap-4 border-b ${LINE} py-5 sm:grid-cols-[140px_1fr]`}
    >
      <span
        className="text-xs tracking-[0.06em]"
        style={{ fontFamily: EL_FONT.mono, color: tagColor }}
      >
        {tag}
      </span>
      {children}
    </li>
  );
}

function ApplyAction() {
  const opens = thaiDateWithYear(RFW.opensOn);
  if (RFW.applyUrl) {
    return (
      <Link
        href={RFW.applyUrl}
        className="inline-block bg-[#f3efe6] px-7 py-4 text-lg text-[#1d211f] transition-colors hover:bg-[#ffd57a]"
        style={{ fontFamily: BODY_FONT, fontWeight: 600 }}
      >
        สมัคร {RFW.name}
      </Link>
    );
  }
  return (
    <p
      className={`inline-block border ${LINE} px-7 py-4 text-lg text-[#faf8f4]`}
      style={{ fontFamily: BODY_FONT }}
    >
      เปิดรับสมัคร {opens}
    </p>
  );
}

function Hero() {
  const details: [string, string | null][] = [
    ["เปิดรับสมัคร", thaiDateWithYear(RFW.opensOn)],
    ["ระยะเวลา", `${RFW.weeks} สัปดาห์`],
    ["Demo Day", maybeThaiDate(RFW.demoDayOn)],
    ["ค่าเข้าร่วม", priceLine(RFW.priceBaht)],
  ];
  return (
    <header className="mx-auto max-w-6xl px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-40">
      <p
        className="text-2xl italic sm:text-3xl"
        style={{
          fontFamily: EL_FONT.display,
          fontWeight: 300,
          color: EL.flameCore,
        }}
      >
        {RFW.name}
      </p>
      <h1
        className="mt-4 max-w-4xl text-[#faf8f4]"
        style={{
          fontFamily: EL_FONT.display,
          fontSize: "clamp(2.5rem, 6.5vw, 5.5rem)",
          fontWeight: 200,
          lineHeight: 1.1,
        }}
      >
        เคยชนะการแข่งขันมาแล้ว เอาผลงานนั้นไปทำให้เป็นธุรกิจจริง
      </h1>
      <p
        className="mt-8 max-w-2xl text-base leading-relaxed text-[#e8e3d9] sm:text-xl"
        style={{ fontFamily: BODY_FONT }}
      >
        บ่มเพาะ {RFW.weeks} สัปดาห์ ทำงานกับทีมบน PassionSeed whiteboard
        มีเช็กอินทุกสัปดาห์ และจบด้วย Demo Day
      </p>

      <dl className={`mt-14 grid grid-cols-2 border-t ${LINE} sm:grid-cols-4`}>
        {details.map(([label, value]) => (
          <div key={label} className={`border-b ${LINE} py-5 pr-4`}>
            <dt
              className="text-xs tracking-[0.06em]"
              style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}
            >
              {label}
            </dt>
            <dd
              className="mt-2 text-lg text-[#faf8f4] sm:text-xl"
              style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}
            >
              <Fact value={value} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <ApplyAction />
        <Link
          href="/hackathon"
          className="text-base text-[#e8e3d9] underline underline-offset-4 hover:text-[#faf8f4]"
          style={{ fontFamily: BODY_FONT }}
        >
          ยังไม่เคยชนะ? เริ่มที่ Elemental Hackathon
        </Link>
      </div>
    </header>
  );
}

function WhoCanApply() {
  return (
    <Section>
      <SectionTitle>ใครสมัครได้</SectionTitle>
      <ul className={`mt-10 border-t ${LINE}`}>
        <Row label="นักเรียนที่เคยชนะการแข่งขัน">
          ชนะรายการไหนก็สมัครได้ ไม่จำเป็นต้องเป็นรายการของ PassionSeed
        </Row>
        <Row label="รายการที่นับ">
          <Fact value={RFW.whichContestsTh} />
        </Row>
        <Row label="หลักฐานที่ใช้สมัคร">
          <Fact value={RFW.proofTh} />
        </Row>
        <Row label="ทีมจาก Elemental Hackathon">
          ผลงานที่ดีที่สุดจาก Elemental ได้ต่อยอดในโครงการนี้
        </Row>
      </ul>
    </Section>
  );
}

function FourWeeks() {
  const weeks = weekLines(RFW.weeks, RFW.weeksTh);
  return (
    <Section>
      <SectionTitle>
        {RFW.weeks} สัปดาห์
        <span
          className="block italic"
          style={{ fontWeight: 300, color: EL.flameCore }}
        >
          จากผลงานในการแข่งขัน สู่ธุรกิจจริง
        </span>
      </SectionTitle>
      <ol className={`mt-10 border-t ${LINE}`}>
        {weeks.map((line, i) => (
          <TimelineRow key={i} tag={`สัปดาห์ ${i + 1}`} tagColor={EL.toxicCyan}>
            <span
              className="text-base text-[#faf8f4] sm:text-lg"
              style={{ fontFamily: BODY_FONT }}
            >
              <Fact value={line} />
            </span>
          </TimelineRow>
        ))}
        <TimelineRow tag="Demo Day" tagColor={EL.flame}>
          <span
            className="text-base sm:text-lg"
            style={{ fontFamily: BODY_FONT, color: EL.flameCore }}
          >
            นำเสนอผลงานบนเวที Demo Day ·{" "}
            <Fact value={maybeThaiDate(RFW.demoDayOn)} />
          </span>
        </TimelineRow>
      </ol>
      <ul className={`mt-10 border-t ${LINE}`}>
        <Row label="ทำงานที่ไหน">PassionSeed whiteboard และเช็กอินทุกสัปดาห์</Row>
        <Row label="ออนไลน์หรือตัวจริง">
          <Fact value={RFW.formatTh} />
        </Row>
      </ul>
    </Section>
  );
}

function GiveAndGet() {
  const get = [
    `เวลา ${RFW.weeks} สัปดาห์เพื่อทำผลงานให้เป็นธุรกิจจริง`,
    "เช็กอินกับทีมทุกสัปดาห์",
    "เวที Demo Day เพื่อนำเสนอผลงาน",
  ];
  const ask = ["เล่าประสบการณ์ของคุณให้คนอื่นฟัง", "ช่วยบอกต่อ PassionSeed"];
  const column = (title: string, items: string[], color: string) => (
    <div>
      <h3
        className="text-2xl text-[#faf8f4] sm:text-3xl"
        style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}
      >
        {title}
      </h3>
      <ul className={`mt-6 border-t ${LINE}`}>
        {items.map((item) => (
          <li
            key={item}
            className={`border-b ${LINE} py-4 text-base sm:text-lg`}
            style={{ fontFamily: BODY_FONT, color }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section className={`border-t ${LINE} py-20 sm:py-28`}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-5 sm:px-10 md:grid-cols-2">
        {column("สิ่งที่คุณได้", get, "#faf8f4")}
        {column("สิ่งที่เราขอ", ask, "#e8e3d9")}
      </div>
    </section>
  );
}

/** Where the money goes (Big, 2026-11-22): fees and sponsor money host this, not just us. */
function WhereTheMoneyGoes() {
  return (
    <Section>
      <SectionTitle>เงินจาก Elemental ไปไหน</SectionTitle>
      <p
        className="mt-6 max-w-2xl text-base leading-relaxed text-[#e8e3d9] sm:text-lg"
        style={{ fontFamily: BODY_FONT }}
      >
        ค่าสมัคร Elemental Hackathon และเงินจากผู้สนับสนุน ไม่ได้เข้ากระเป๋าเราอย่างเดียว
        ส่วนหนึ่งนำมาจัด {RFW.name} เพื่อให้ผลงานของผู้ชนะได้ไปต่อจนเป็นธุรกิจจริง
      </p>
      <Link
        href="/hackathon/elemental/sponsor"
        className="mt-6 inline-block text-base text-[#e8e3d9] underline underline-offset-4 hover:text-[#faf8f4]"
        style={{ fontFamily: BODY_FONT }}
      >
        อยากร่วมสนับสนุน? ดูข้อเสนอสำหรับผู้สนับสนุน
      </Link>
    </Section>
  );
}

function SafeSpace() {
  return (
    <Section>
      <SectionTitle>สำหรับผู้ปกครอง</SectionTitle>
      <p
        className="mt-6 max-w-2xl text-base leading-relaxed text-[#e8e3d9] sm:text-lg"
        style={{ fontFamily: BODY_FONT }}
      >
        ทุกการพูดคุยอยู่ในพื้นที่ของทีมที่ทุกคนในทีมเห็น ไม่มีแชตส่วนตัวระหว่างผู้ใหญ่กับนักเรียน
      </p>
    </Section>
  );
}

function Closing() {
  return (
    <section className={`border-t ${LINE} py-24 sm:py-32`}>
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 sm:px-10">
        <p
          className="max-w-3xl text-[#faf8f4]"
          style={{
            fontFamily: EL_FONT.display,
            fontSize: "clamp(1.75rem, 4vw, 3rem)",
            fontWeight: 200,
            lineHeight: 1.2,
          }}
        >
          ชนะมาแล้ว อย่าให้ผลงานจบแค่บนเวที
        </p>
        <ApplyAction />
      </div>
    </section>
  );
}

/**
 * /request-for-winners: the public page for students who have won a contest.
 * Same type and colours as the Elemental pages, without the pollution art,
 * because the program is open to winners of any contest. Every fact comes
 * from ./facts.ts.
 */
export function RequestForWinnersPage() {
  return (
    <main className={`${trirong.variable} min-h-screen bg-[#0c0d0c]`}>
      <Hero />
      <WhoCanApply />
      <FourWeeks />
      <GiveAndGet />
      <WhereTheMoneyGoes />
      <SafeSpace />
      <Closing />
    </main>
  );
}
