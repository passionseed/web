import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Check,
  ClipboardList,
  Code2,
  Mic,
  FlaskConical,
  Hammer,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { ShiftPageViewTracker } from "@/components/shift/ShiftPageViewTracker";
import { RisoIcon, type RisoIconName } from "@/components/shift/poster/RisoIcons";
import {
  HAIR,
  HairlineColumns,
  INK,
  MISREG_TEXT,
  RisoHeading,
  RisoHero,
  RisoNumeral,
  RisoPageTexture,
  RisoSunrise,
  inkFor,
  paper,
} from "@/components/shift/ShiftRiso";

import {
  SHIFT_COHORT,
  SHIFT_DAILY_SHOW,
  SHIFT_SDT,
  SHIFT_SKILL_CARDS,
  formatThaiDate,
  formatThaiDateRange,
  squadCount,
} from "@/lib/content/shift-cohort";
import { SHIFT_TESTIMONIAL_GROUPS } from "@/lib/content/shift-testimonials";

export const metadata: Metadata = {
  title: "SHIFT | The 7-Day Proof-of-Work Sandbox สำหรับ TCAS 1",
  description:
    "พื้นที่ 7 วัน ปั้นผลงานจริงที่คนนอกได้ลองใช้ เลิกสะสมใบเซอร์ค่ายนั่งฟัง แล้วสร้าง Live Project พร้อม Pivot Log และ 1-Page Case Study ยื่นรอบพอร์ตมหาลัยชั้นนำ",
  keywords: [
    "SHIFT",
    "พอร์ต TCAS 1",
    "ทำพอร์ต TCAS",
    "พอร์ตวิศวะ จุฬา",
    "ผลงาน TCAS รอบ 1",
    "โครงงานคอมพิวเตอร์ ม.ปลาย",
    "ค่าย TCAS",
    "Portfolio Case Study",
    "TechSeed",
    "PassionSeed",
  ],
  alternates: {
    canonical: "/shift",
  },
  openGraph: {
    title: "SHIFT | The 7-Day Proof-of-Work Sandbox สำหรับ TCAS 1",
    description:
      "เลิกสะสมใบเซอร์ค่ายนั่งฟัง สร้างโปรเจกต์จริงที่คนนอกได้ลองใช้ใน 7 วัน พร้อม 1-Page TCAS Case Study",
    url: "https://passionseed.org/shift",
    type: "website",
  },
};

const COHORT_DATES = formatThaiDateRange(SHIFT_COHORT.startDate, SHIFT_COHORT.endDate);
const DEADLINE = formatThaiDate(SHIFT_COHORT.applyDeadline);
const PRICE = `฿${SHIFT_COHORT.priceBaht.toLocaleString("en-US")}`;

function ApplyButton({
  children,
  className = "",
  location = "hero",
}: {
  children: React.ReactNode;
  className?: string;
  location?: string;
}) {
  return (
    <ShiftApplyButton className={className} location={location}>
      {children}
    </ShiftApplyButton>
  );
}

const cadence = [
  {
    icon: Rocket,
    day: "Day 1–2 (Mon–Tue)",
    title: "Lock One Problem",
    body: "ตัดฟีเจอร์ที่ไม่จำเป็นออก 80% แล้วล็อกสโคปโปรเจกต์ระดับอะตอมให้จบใน 1 หน้า",
  },
  {
    icon: Hammer,
    day: "Day 3–5 (Wed–Fri)",
    title: "Ship to Strangers",
    body: "ปล่อย MVP แบบ zero-code หรือ hardware ให้คนภายนอกใช้จริง ถ้าพังหรือไม่มีคนใช้ ดีแล้ว! นั่นคือ failure data ที่ต้องบันทึก",
  },
  {
    icon: Zap,
    day: "Day 6–7 (Sat–Sun)",
    title: "Demo Day",
    body: "โชว์ของจริงต่อหน้าทั้งรุ่น เล่าว่าอะไรพัง เปลี่ยนอะไร และได้เรียนรู้อะไร แล้วเรียบเรียงเป็น 1-Page Case Study ไว้ใช้ในพอร์ต",
  },
];

const tracks = [
  {
    icon: FlaskConical,
    title: "Engineering Track",
    tag: "Chem Eng / EE / Hardware",
    body: "เปลี่ยนงานคราฟต์งานวิทยาศาสตร์ (เช่น โคมไฟน้ำทะเล หรือ Sensor Board) ให้เป็น Engineering Optimization Study พร้อม voltage logs และ stress-test data จริง",
  },
  {
    icon: TrendingUp,
    title: "Finance & BBA Track",
    tag: "Equity Research",
    body: "ก้าวข้าม binary options และ paper trading ไปสู่ 1-Page Equity Research Note & Valuation Model ที่อาจารย์ BBA มองว่าเป็นงานจริง",
  },
  {
    icon: Code2,
    title: "Tech & Product Track",
    tag: "Zero-Code Ship",
    body: "ปล่อย micro-tool จาก zero-code stack (Tally / Carrd / Notion) แล้วหาผู้ใช้งานจริง 10-20 คนพร้อม feedback จริง",
  },
];

const deliverables: { num: string; icon: RisoIconName; title: string; body: string }[] = [
  {
    num: "1",
    icon: "live",
    title: "Functional Prototype / Shipped Asset",
    body: "เว็บทูลที่ใช้งานได้จริง รายงานวิจัย หรือ hardware prototype ที่มีคนภายนอกแตะต้องได้",
  },
  {
    num: "2",
    icon: "metrics",
    title: "The Experiment & Pivot Log",
    body: "บันทึกสมมติฐาน จุดพัง และการปรับแผนอย่างเป็นระบบ ซึ่งคือหลักฐาน mindset ที่อาจารย์มองหาตัวจริง",
  },
  {
    num: "3",
    icon: "caseStudy",
    title: "1-Page TCAS Case Study Blueprint",
    body: "สรุปตรรกะ ข้อมูล และผลลัพธ์ของโปรเจกต์ในหน้าเดียว พร้อมใช้ตอบคำถามในห้องสัมภาษณ์",
  },
];

const faqs = [
  {
    q: "ทำไมใบเซอร์ค่าย 1 วันถึงไม่พอสำหรับ TCAS 1 อีกต่อไป?",
    a: "กรรมการสัมภาษณ์และอาจารย์มหาวิทยาลัยเจอนักเรียนส่งใบเซอร์หน้าตาเหมือนกันเป็นพันๆ ใบ อาจารย์ไม่ได้มองหาคนสะสมกระดาษ แต่มองหา 'ความสามารถในการแก้ปัญหาจริง' โปรเจกต์ที่คนนอกได้ใช้จริงพร้อมบันทึกตอนระบบพังและวิธีแก้ จึงมีน้ำหนักมากกว่าใบเซอร์ค่ายนั่งฟังหลายสิบเท่า",
  },
  {
    q: "ผลงานจาก SHIFT นำไปใส่ใน Portfolio TCAS รอบ 1 ได้อย่างไร?",
    a: "SHIFT ออกแบบผลลัพธ์ให้ออกมาเป็น '1-Page Defense Case Study' บรรจุในพอร์ต 10 หน้าได้อย่างลงตัว: มีทั้งลิงก์โปรเจกต์จริง, สถิติผู้ใช้งาน (Telemetry), กราฟการทดสอบ, และ Failure/Pivot Log ซึ่งเป็นจุดดึงดูดสายตากรรมการมากที่สุดในห้องสัมภาษณ์",
  },
  {
    q: "เด็ก ม.ปลาย จะหาคนนอกมาลองใช้ใน 7 วันได้อย่างไร?",
    a: `Day 1 ทุกคนเขียนชื่อคนจริง ${SHIFT_COHORT.testerTarget} คนที่น่าจะเจอปัญหานี้ แล้วทักตรงทีละคน ไม่ใช่โพสต์ลงสตอรี่เพื่อนสนิทแล้วรอ ก่อนโพสต์ในกลุ่ม เพื่อนในทีมช่วยอ่านให้ก่อนว่าคนอ่านรู้ไหมว่าต้องทำอะไร ของที่ตัดเหลือ 1 จอ 1 แอ็กชัน ทำให้คนลองได้ในไม่กี่นาที ได้ไม่ครบก็ไม่เป็นไร จำนวนจริงพร้อมเหตุผลคือข้อมูลใน Pivot Log`,
  },
  {
    q: "ถ้าไม่มีพื้นฐานโปรแกรมมิ่งเลย จะทำได้ไหม?",
    a: "ทำได้ 100% เพราะเราใช้ระบบ Zero-Code Templates (Tally, Carrd, Notion, Hardware Modding) เน้นกระบวนการคิดและการแก้ปัญหาจริง ไม่ต้องเสียเวลานั่งแก้ Syntax",
  },
  {
    q: "ถ้าลองทำแล้วโปรเจกต์พัง หรือไม่มีคนใช้ จะทำยังไง?",
    a: "นั่นคือจุดประสงค์หลักของเรา อาจารย์ไม่ได้อยากเห็นพอร์ตเมคที่เพอร์เฟกต์ 100% แต่อยากเห็น Data ตอนพังบวกกับวิธีที่เรา Pivot แก้ไข ซึ่งเป็น asset ที่มีน้ำหนักที่สุดในพอร์ต",
  },
  {
    q: "เวลาจัดกิจกรรมเป็นยังไง กระทบเวลาเรียนไหม?",
    a: "เป็น Hybrid Sprint ออนไลน์บน Discord ใช้เวลาช่วงเย็นและเสาร์-อาทิตย์ ไม่กระทบการเรียนปกติ",
  },
];

const shiftJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Course",
      "@id": "https://passionseed.org/shift#course",
      "name": "SHIFT: The 7-Day Proof-of-Work Sandbox",
      "description":
        "A 7-day intensive crucible where high school and early university students build a live artifact, test it with real outside users, and formulate a 1-page TCAS defense case study.",
      "provider": {
        "@type": "Organization",
        "name": "PassionSeed",
        "url": "https://passionseed.org"
      },
      "educationalLevel": "High School (M.4–M.6) / University Undergraduate",
      "offers": [
        {
          "@type": "Offer",
          "category": "Tuition",
          "price": "990",
          "priceCurrency": "THB",
          "availability": "https://schema.org/LimitedAvailability"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://passionseed.org/shift#faq",
      "mainEntity": faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.a
        }
      }))
    }
  ]
};

export default function ShiftPage() {
  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shiftJsonLd) }}
      />
      <ShiftPageViewTracker />
      <RisoPageTexture />

      {/* ============ 1. HERO ============ */}
      <RisoHero
        headline={
          <>
            7 วัน ปั้น 1
            <br />
            โปรเจกต์จริง
          </>
        }
      >
        <p className="max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: paper("b3") }}>
          สำหรับ ม.4-ม.6 สาย Tech / ธุรกิจ / วิศวะ เลิกสะสมใบเซอร์ค่ายนั่งฟังที่ใครๆ ก็มี
          แล้วเปลี่ยนจุดพังและ Data จริง ให้กลายเป็นพอร์ต TCAS 1 ที่เล่าได้จริง
          พร้อมสอนใช้ AI แบบที่ AI แทนเราไม่ได้
        </p>
        <div className="mt-10">
          <ApplyButton>จองที่นั่ง {SHIFT_COHORT.name} (รับ {SHIFT_COHORT.seats} คน)</ApplyButton>
        </div>
        <p className="mt-8 font-kodchasan text-lg font-semibold sm:text-xl" style={MISREG_TEXT}>
          {COHORT_DATES} · {PRICE}
        </p>
        <p className="mt-3 text-sm font-semibold sm:text-base" style={{ color: INK.yellow }}>
          ปิดรับสมัคร {DEADLINE}
        </p>
      </RisoHero>

      <main className="relative mx-auto max-w-5xl px-5 pb-10 sm:px-8">
        {/* ============ 2. THE PROBLEM ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="The Problem">
            กับดัก &ldquo;พอร์ตเมค&rdquo; ที่กรรมการรู้ทัน
          </RisoHeading>

          <div className="mt-10">
            <HairlineColumns cols={2}>
              <div>
                <p className="mb-5 flex items-center gap-2 text-sm font-semibold" style={{ color: paper("73") }}>
                  <X className="h-4 w-4" /> ใบเซอร์ค่ายทั่วไป
                </p>
                <ul className="space-y-4" style={{ color: paper("80") }}>
                  <li className="leading-relaxed">นั่งฟังบรรยาย 6 ชั่วโมง และเล่นเกมกลุ่ม</li>
                  <li className="leading-relaxed">ใบประกาศเข้าร่วมที่เด็กอีก 1,000 คนก็มีเหมือนกัน</li>
                  <li className="leading-relaxed">
                    พอร์ตสร้างภาพ &ldquo;ทำสำเร็จ 100%&rdquo; ซึ่งอาจารย์มองว่าเมค
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: INK.yellow }}>
                  <Check className="h-4 w-4" /> SHIFT Sandbox
                </p>
                <ul className="space-y-4">
                  <li className="leading-relaxed">
                    <strong>Zero Theory, 100% Execution:</strong> ลงมือสร้างตั้งแต่วันแรก ไม่มีสไลด์บรรยาย
                  </li>
                  <li className="leading-relaxed">
                    <strong>Live Project:</strong> ผลงานที่มีคนภายนอกใช้งานจริง พร้อมเมตริกจริง
                  </li>
                  <li className="leading-relaxed">
                    <strong>The Pivot Log:</strong> บันทึกจุดพังและการแก้ปัญหา ซึ่งคือสัญญาณที่แรงที่สุดในสายตาอาจารย์
                  </li>
                </ul>
              </div>
            </HairlineColumns>
          </div>
        </section>

        {/* ============ 3. CADENCE ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="How It Works">จังหวะ 7 วัน ไม่กระทบเวลาเรียน</RisoHeading>
          <div className="mt-10">
            <HairlineColumns>
              {cadence.map((step) => (
                <div key={step.day}>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: INK.orange }}>
                    {step.day}
                  </p>
                  <h3 className="mt-2 font-kodchasan text-2xl font-semibold leading-snug">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </HairlineColumns>
          </div>
        </section>

        {/* ============ 3b. DATED SCHEDULE ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="ตารางรอบนี้">7 วัน วันละหนึ่งงาน</RisoHeading>
          <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: paper("99") }}>
            {COHORT_DATES} ทำวันละ 1 ถึง 2 ชั่วโมง ไม่ต้องลาเรียน ทุกวันมีของต้องส่ง
            ถ้าวันไหนหาย ทีมกับพี่เลี้ยงรู้ทันทีตั้งแต่วันนั้น ไม่ใช่ตอนจบ
          </p>

          <ol className={`mt-10 border-t ${HAIR}`}>
            {SHIFT_COHORT.schedule.map((step) => (
              <li
                key={step.date}
                className={`grid gap-2 border-b py-6 sm:grid-cols-[9rem_11rem_1fr] sm:items-baseline sm:gap-6 ${HAIR}`}
              >
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: INK.orange }}>
                    Day {step.day}
                  </p>
                  <p className="mt-1 font-kodchasan text-base font-semibold">{formatThaiDate(step.date)}</p>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: INK.yellow }}>
                  {step.label}
                </p>
                <div>
                  <h3 className="font-kodchasan text-lg font-semibold leading-snug">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: paper("99") }}>
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ============ 3c. SQUADS & DAILY SHOW ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Squads & Daily Show">
            โปรเจกต์ของคุณ ทีมของคุณ สกิลที่คุณเลือก
          </RisoHeading>
          <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: paper("99") }}>
            ทุกคนทำโปรเจกต์ของตัวเอง แต่ไม่ได้ทำคนเดียว ทีมละ {SHIFT_COHORT.squadSize} คน
            เลือกสกิลจากเมนูตามที่โปรเจกต์ต้องใช้วันนั้น เรียนด้วยกัน แล้วใช้กับงานจริงในวันเดียวกัน
            คุยกับพี่เลี้ยงได้ทั้งวันในห้อง Discord ของทีม
          </p>

          <div className="mt-10">
            <HairlineColumns cols={2}>
              <div>
                <h3 className="flex items-center gap-2 font-kodchasan text-xl font-semibold" style={{ color: INK.yellow }}>
                  <Users className="h-5 w-5" /> เมนูสกิล
                </h3>
                <ul className="mt-5 space-y-4">
                  {SHIFT_SKILL_CARDS.map((card) => (
                    <li key={card.title} className="text-sm leading-relaxed">
                      <span className="font-semibold">{card.title}</span>
                      <span style={{ color: paper("99") }}>: {card.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-kodchasan text-xl font-semibold" style={{ color: INK.yellow }}>
                  <Mic className="h-5 w-5" /> Daily Show ทุกเย็น
                </h3>
                <ol className="mt-5 space-y-5">
                  {SHIFT_DAILY_SHOW.map((beat, i) => (
                    <li key={beat.label} className="flex items-baseline gap-4">
                      <RisoNumeral index={i}>{i + 1}</RisoNumeral>
                      <p className="text-sm leading-relaxed">
                        <span className="font-semibold">{beat.label}</span>
                        <span style={{ color: paper("99") }}> {beat.detail}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </HairlineColumns>
          </div>
        </section>

        {/* ============ 3d. WHY IT WORKS (SDT) ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Self-Determination">ทำไมถึงเวิร์ก</RisoHeading>
          <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: paper("99") }}>
            คนจะลงมือเองได้นานเมื่อได้ 3 อย่างนี้พร้อมกัน ทุกส่วนของ 7 วันออกแบบมาจากตรงนี้
          </p>
          <div className="mt-10">
            <HairlineColumns>
              {SHIFT_SDT.map((item, i) => (
                <div key={item.pillar}>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: inkFor(i) }}>
                    {item.pillar}
                  </p>
                  <h3 className="mt-2 font-kodchasan text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                    {item.detail}
                  </p>
                </div>
              ))}
            </HairlineColumns>
          </div>
        </section>

        {/* ============ 4. TRACKS ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Project Tracks">โปรเจกต์จริงที่ปั้นใน SHIFT</RisoHeading>
          <div className="mt-10">
            <HairlineColumns>
              {tracks.map((track, i) => (
                <div key={track.title}>
                  <track.icon className="mb-4 h-6 w-6" style={{ color: inkFor(i) }} />
                  <h3 className="font-kodchasan text-xl font-semibold">{track.title}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: paper("73") }}>
                    {track.tag}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                    {track.body}
                  </p>
                </div>
              ))}
            </HairlineColumns>
          </div>
        </section>

        {/* ============ 5. DELIVERABLES ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="What You Will Ship">ครบ 7 วัน คุณถือของ 3 ชิ้นนี้ออกไป</RisoHeading>
          <div className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
            {deliverables.map((item, i) => (
              <div key={item.num}>
                <div className="flex items-end gap-3">
                  <RisoIcon name={item.icon} ink={inkFor(i)} size={52} />
                  <span
                    className="font-kodchasan text-3xl font-bold leading-none"
                    style={{ color: inkFor(i), textShadow: `1.5px -1px 1.5px ${INK.blue}99` }}
                  >
                    {item.num}
                  </span>
                </div>
                <h3 className="mt-5 font-kodchasan text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: paper("99") }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 6. TESTIMONIALS ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Proof of Execution">เสียงจริงจากรุ่นพี่ที่ลงมือสร้าง</RisoHeading>
          <p className="mt-4 flex max-w-2xl items-start gap-2 text-xs leading-relaxed sm:text-sm" style={{ color: paper("80") }}>
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: INK.yellow }} />
            ข้อความและผลลัพธ์ทั้งหมดมาจากฟอร์มประเมินหลังจบกิจกรรม TechSeed #3, #5
            และบันทึกการวิเคราะห์พอร์ตรายบุคคลของ PassionSeed
          </p>

          {SHIFT_TESTIMONIAL_GROUPS.map((group, gi) => (
            <div key={group.label} className="mt-14">
              <p className="mb-6 font-mono text-xs font-bold uppercase tracking-[0.24em]" style={{ color: inkFor(gi) }}>
                {group.label}
              </p>
              <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                {group.cards.map((card) => (
                  <figure key={card.name} className="flex flex-col border-l-2 pl-5" style={{ borderColor: inkFor(gi) }}>
                    <blockquote className="flex-1 text-sm leading-relaxed" style={{ color: paper("d9") }}>
                      &ldquo;{card.quote}&rdquo;
                    </blockquote>
                    <p className="mt-4 text-xs font-semibold leading-relaxed" style={{ color: INK.yellow }}>
                      {card.shift}
                    </p>
                    <figcaption className="mt-3">
                      <p className="text-sm font-semibold">{card.name}</p>
                      <p className="mt-0.5 text-xs" style={{ color: paper("80") }}>
                        {card.meta}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-14">
            <Link
              href="/techseed"
              className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] underline decoration-[rgba(255,72,176,0.6)] decoration-2 underline-offset-8 transition hover:decoration-[rgba(255,72,176,1)]"
              style={{ color: INK.yellow }}
            >
              <span>สำรวจคลังชิ้นงานจริงของรุ่นพี่ที่ TechSeed Gallery</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ============ 7. COHORT & PRICING ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Cohort Details">ทำไมต้องสมัครคัดเลือก</RisoHeading>
          <div className="mt-10">
            <HairlineColumns>
              <div>
                <Users className="mb-4 h-6 w-6" style={{ color: INK.orange }} />
                <h3 className="font-kodchasan text-xl font-semibold">
                  รับ {SHIFT_COHORT.seats} คน · ดูแลทั่วถึง
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                  ทุกคนมีโปรเจกต์ของตัวเอง แบ่งเป็น {squadCount()} ทีม ทีมละ {SHIFT_COHORT.squadSize} คน
                  ไว้เรียนสกิลใหม่ด้วยกันและช่วยกันหาคนมาลอง ทุกเย็นโชว์ของจริงให้ทั้งห้องดู
                </p>
              </div>
              <div>
                <Banknote className="mb-4 h-6 w-6" style={{ color: INK.pink }} />
                <h3 className="font-kodchasan text-3xl font-bold" style={MISREG_TEXT}>
                  {PRICE}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                  จ่ายหลังได้รับคัดเลือก พี่ส่งลิงก์ PromptPay ให้ในแชท ถ้าจบวันที่ 7
                  แล้วไม่มีชิ้นงานกับ Case Study ในมือ คืนเงินเต็มจำนวน
                </p>
              </div>
              <div>
                <ClipboardList className="mb-4 h-6 w-6" style={{ color: INK.yellow }} />
                <h3 className="font-kodchasan text-xl font-semibold">สมัคร 2 นาที · ปิด {DEADLINE}</h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                  ตอบคำถามสั้นๆ เรื่องคณะเป้าหมายใน TCAS 1 และไอเดียโปรเจกต์ดิบที่อยากลองปั้น
                </p>
              </div>
            </HairlineColumns>
          </div>
        </section>

        {/* ============ 8. FAQ ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="FAQ">คำถามที่เจอบ่อย</RisoHeading>
          <div className={`mt-10 border-t ${HAIR}`}>
            {faqs.map((faq) => (
              <details key={faq.q} className={`group border-b py-6 ${HAIR}`}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-kodchasan text-base font-semibold leading-relaxed marker:hidden sm:text-lg [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="mt-1 font-mono text-lg leading-none transition-transform group-open:rotate-45" style={{ color: INK.orange }}>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: paper("99") }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* ============ 9. FINAL CTA: sunrise bookend ============ */}
      <section className="relative overflow-hidden pb-64 pt-20 text-center sm:pb-72 sm:pt-28">
        <RisoSunrise />
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <RisoHeading eyebrow={`${SHIFT_COHORT.name} · ${COHORT_DATES}`} align="center">
            พร้อมเลิกสะสมใบเซอร์
            <br />
            แล้วมาสร้างโปรเจกต์จริงหรือยัง
          </RisoHeading>
          <p className="mx-auto mt-6 max-w-xl" style={{ color: paper("b3") }}>
            เปิด {SHIFT_COHORT.seats} ที่นั่งสำหรับ {SHIFT_COHORT.name} ดูแลทั่วถึงทุกคน ปิดรับสมัคร {DEADLINE}
            ถ้าคุณมีไอเดียดิบที่อยากเห็นมันกลายเป็นของจริง นี่คือพื้นที่ของคุณ
          </p>
          <div className="mt-10">
            <ApplyButton location="final_cta">จองที่นั่ง {SHIFT_COHORT.name}</ApplyButton>
          </div>
        </div>
      </section>

      {/* ============ STICKY CTA BAR ============ */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-md ${HAIR}`}
        style={{ backgroundColor: "rgba(23,21,28,0.88)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className="hidden text-sm sm:block" style={{ color: paper("99") }}>
            <span className="font-mono tracking-[0.18em]">{SHIFT_COHORT.name}</span> · {COHORT_DATES} · รับ {SHIFT_COHORT.seats} คน
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] sm:hidden" style={{ color: paper("99") }}>
            {SHIFT_COHORT.name} · {PRICE}
          </p>
          <ShiftApplyButton location="sticky_bar" className="!px-5 !py-2.5 !text-sm">
            สมัครเลย
          </ShiftApplyButton>
        </div>
      </div>
    </div>
  );
}
