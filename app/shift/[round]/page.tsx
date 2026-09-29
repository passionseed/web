import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { ShiftSeatsRemaining } from "@/components/shift/ShiftSeatsRemaining";
import { ShiftParentShare } from "@/components/shift/ShiftParentShare";
import { ShiftPageViewTracker } from "@/components/shift/ShiftPageViewTracker";
import { ShiftPayment } from "@/components/shift/ShiftPayment";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import { ShiftIcon } from "@/components/shift/round/ShiftIcon";
import { RisoHeading } from "@/components/shift/ShiftRiso";
import { ShiftGlance } from "@/components/shift/round/ShiftGlance";
import { ShiftProblem } from "@/components/shift/round/ShiftProblem";
import { ShiftSdt } from "@/components/shift/round/ShiftSdt";
import { ShiftSquads } from "@/components/shift/round/ShiftSquads";
import {
  ShiftCadence,
  ShiftSchedule,
} from "@/components/shift/round/ShiftTimeline";
import { floatClass, revealClass } from "@/components/shift/round/motion";
import "@/components/shift/round/shiftRound.css";
import { themeForRound } from "@/components/shift/theme";
import {
  HEADING,
  T,
  THEME_HAIR as HAIR,
  accentFor as inkFor,
  paletteVars,
  tint as paper,
} from "@/components/shift/theme/tokens";

import {
  PAIR_DISCOUNT_BAHT,
  SHIFT_COHORTS,
  formatThaiDate,
  cohortPath,
  cohortStatus,
  formatThaiDateRange,
  getShiftCohort,
  priceLabel,
  teamSizeLabel,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { SHIFT_TESTIMONIAL_GROUPS } from "@/lib/content/shift-testimonials";

/** Status flips on Bangkok dates, so re-render at least hourly. */
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return SHIFT_COHORTS.map((cohort) => ({ round: String(cohort.round) }));
}

interface RoundParams {
  params: Promise<{ round: string }>;
}

async function cohortFrom(params: RoundParams["params"]): Promise<ShiftCohort> {
  const cohort = getShiftCohort(Number((await params).round));
  if (!cohort) notFound();
  return cohort;
}

export async function generateMetadata({
  params,
}: RoundParams): Promise<Metadata> {
  const cohort = await cohortFrom(params);
  const path = cohortPath(cohort);
  const title = `${cohort.name} | The 7-Day Proof-of-Work Sandbox สำหรับ TCAS 1`;
  return {
    title,
    description: `${formatThaiDateRange(cohort.startDate, cohort.endDate)} · พื้นที่ 7 วัน ปั้นผลงานจริงที่คนนอกได้ลองใช้ เลิกสะสมใบเซอร์ค่ายนั่งฟัง แล้วสร้าง Live Project พร้อมพอร์ต 1 หน้า ยื่นรอบพอร์ตมหาลัยชั้นนำ`,
    keywords: [
      "SHIFT",
      cohort.name,
      "พอร์ต TCAS 1",
      "ทำพอร์ต TCAS",
      "ผลงาน TCAS รอบ 1",
      "โครงงานคอมพิวเตอร์ ม.ปลาย",
      "ค่าย TCAS",
      "PassionSeed",
    ],
    alternates: { canonical: path },
    openGraph: {
      title,
      description:
        "เลิกสะสมใบเซอร์ค่ายนั่งฟัง สร้างโปรเจกต์จริงที่คนนอกได้ลองใช้ใน 7 วัน พร้อมพอร์ต 1 หน้าสำหรับ TCAS",
      url: `https://passionseed.org${path}`,
      type: "website",
    },
  };
}

const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

/**
 * Apply CTA for one round. Once applications close, every CTA on the page
 * turns into a link back to /shift so nobody lands on a dead form.
 */
function ApplyButton({
  cohort,
  children,
  className = "",
  location = "hero",
}: {
  cohort: ShiftCohort;
  children: React.ReactNode;
  className?: string;
  location?: string;
}) {
  if (cohortStatus(cohort) !== "open") {
    return (
      <Link href="/shift" className={`shift-button ${className}`}>
        <span>ปิดรับสมัครแล้ว · ดูรุ่นอื่น</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <ShiftApplyButton
      className={className}
      location={location}
      href={cohort.applyUrl}
    >
      {children}
    </ShiftApplyButton>
  );
}

const tracks: {
  icon: RisoIconName;
  title: string;
  tag: string;
  body: string;
}[] = [
  {
    icon: "flask",
    title: "Engineering Track",
    tag: "Chem Eng / EE / Hardware",
    body: "เปลี่ยนงานคราฟต์งานวิทยาศาสตร์ (เช่น โคมไฟน้ำทะเล หรือ Sensor Board) ให้เป็น Engineering Optimization Study พร้อม voltage logs และ stress-test data จริง",
  },
  {
    icon: "trend",
    title: "Finance & BBA Track",
    tag: "Equity Research",
    body: "ก้าวข้าม binary options และ paper trading ไปสู่ 1-Page Equity Research Note & Valuation Model ที่อาจารย์ BBA มองว่าเป็นงานจริง",
  },
  {
    icon: "code",
    title: "Tech & Product Track",
    tag: "Zero-Code Ship",
    body: "ปล่อย micro-tool จาก zero-code stack (Tally / Carrd / Notion) แล้วหาผู้ใช้งานจริง 10-20 คนพร้อม feedback จริง",
  },
];

const deliverables: {
  num: string;
  icon: RisoIconName;
  title: string;
  body: string;
}[] = [
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

function buildFaqs(cohort: ShiftCohort) {
  return [
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
      a: `Day 1 ทุกคนเขียนชื่อคนจริง ${cohort.testerTarget} คนที่น่าจะเจอปัญหานี้ แล้วทักตรงทีละคน ไม่ใช่โพสต์ลงสตอรี่เพื่อนสนิทแล้วรอ ก่อนโพสต์ในกลุ่ม เพื่อนในทีมช่วยอ่านให้ก่อนว่าคนอ่านรู้ไหมว่าต้องทำอะไร ของที่ตัดเหลือ 1 จอ 1 แอ็กชัน ทำให้คนลองได้ในไม่กี่นาที ได้ไม่ครบก็ไม่เป็นไร จำนวนจริงพร้อมเหตุผลคือข้อมูลใน Pivot Log`,
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
}

function buildJsonLd(cohort: ShiftCohort, faqs: ReturnType<typeof buildFaqs>) {
  const url = `https://passionseed.org${cohortPath(cohort)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${url}#course`,
        name: `${cohort.name}: The 7-Day Proof-of-Work Sandbox`,
        description:
          "A 7-day intensive crucible where high school and early university students build a live artifact, test it with real outside users, and formulate a 1-page TCAS defense case study.",
        provider: {
          "@type": "Organization",
          name: "PassionSeed",
          url: "https://passionseed.org",
        },
        educationalLevel: "High School (M.4–M.6) / University Undergraduate",
        offers: [
          {
            "@type": "Offer",
            category: "Tuition",
            price: String(cohort.priceBaht),
            priceCurrency: "THB",
            availability: "https://schema.org/LimitedAvailability",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      },
    ],
  };
}

export default async function ShiftRoundPage({ params }: RoundParams) {
  const cohort = await cohortFrom(params);
  const COHORT_DATES = formatThaiDateRange(cohort.startDate, cohort.endDate);
  const DEADLINE = formatThaiDate(cohort.applyDeadline);
  const PRICE = priceLabel(cohort);
  const isOpen = cohortStatus(cohort) === "open";
  // Free rounds (the pilot) never show a price, not even "free".
  const showPrice = cohort.priceBaht > 0;
  const faqs = buildFaqs(cohort);
  const shiftJsonLd = buildJsonLd(cohort, faqs);
  const theme = themeForRound(cohort.round);
  const { Hero, Texture, Bookend } = theme;

  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={paletteVars(theme.palette)}
      data-shift-kind={theme.kind}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shiftJsonLd) }}
      />
      <ShiftPageViewTracker pagePath={cohortPath(cohort)} />
      {Texture && <Texture />}

      {/* ============ 1. HERO ============ */}
      <div className="relative">
        <ShiftTopBar back={{ href: "/shift", label: "SHIFT ทุกรุ่น" }} />
        <Hero
          cohort={cohort}
          headline={
            <>
              7 วัน ปั้น 1
              <br />
              โปรเจกต์จริง
            </>
          }
        >
          <p
            className="max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: paper("b3") }}
          >
            สำหรับ ม.4-ม.6 สาย Tech / ธุรกิจ / วิศวะ
            เลิกสะสมใบเซอร์ค่ายนั่งฟังที่ใครๆ ก็มี แล้วเปลี่ยนจุดพังและ Data
            จริง ให้กลายเป็นพอร์ต TCAS 1 ที่เล่าได้จริง พร้อมสอนใช้ AI แบบที่ AI
            แทนเราไม่ได้
          </p>
          <div className="mt-10">
            <ApplyButton cohort={cohort}>
              จองที่นั่ง {cohort.name} (รับ {cohort.seats} คน)
            </ApplyButton>
            {isOpen && (
              <div className="mt-4">
                <ShiftSeatsRemaining round={cohort.round} capacity={cohort.seats} />
                <ShiftParentShare cohort={cohort} />
              </div>
            )}
          </div>
          <p
            className="mt-8 font-kodchasan text-lg font-semibold sm:text-xl"
            style={HEADING}
          >
            {COHORT_DATES}
            {showPrice && ` · ${PRICE}`}
          </p>
          {isOpen && (
            <p
              className="mt-3 text-sm font-semibold sm:text-base"
              style={{ color: T.accent3 }}
            >
              ปิดรับสมัคร {DEADLINE}
            </p>
          )}
        </Hero>
      </div>

      <main className="relative mx-auto max-w-5xl px-5 pb-10 sm:px-8">
        <ShiftGlance cohort={cohort} kind={theme.kind} />

        {/* ============ 2. THE PROBLEM ============ */}
        <ShiftProblem kind={theme.kind} />

        {/* ============ 3. CADENCE + DATED SCHEDULE ============ */}
        <ShiftCadence kind={theme.kind} />
        <ShiftSchedule cohort={cohort} dates={COHORT_DATES} kind={theme.kind} />

        {/* ============ 3c. SQUADS & DAILY SHOW ============ */}
        <ShiftSquads cohort={cohort} kind={theme.kind} />

        {/* ============ 3d. WHY IT WORKS (SDT) ============ */}
        <ShiftSdt kind={theme.kind} />

        {/* ============ 4. TRACKS ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Project Tracks">
            โปรเจกต์จริงที่ปั้นใน SHIFT
          </RisoHeading>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {tracks.map((track, i) => (
              <div
                key={track.title}
                className={`shift-tile ${revealClass(i)} p-6`}
                style={{ borderTop: `3px solid ${inkFor(i)}` }}
              >
                <ShiftIcon
                    kind={theme.kind}
                  name={track.icon}
                  ink={inkFor(i)}
                  size={52}
                  className={floatClass(i)}
                />
                <h3 className="mt-5 font-kodchasan text-xl font-semibold">
                  {track.title}
                </h3>
                <p
                  className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em]"
                  style={{ color: paper("73") }}
                >
                  {track.tag}
                </p>
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: paper("99") }}
                >
                  {track.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 5. DELIVERABLES ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="What You Will Ship">
            ครบ 7 วัน คุณถือของ 3 ชิ้นนี้ออกไป
          </RisoHeading>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {deliverables.map((item, i) => (
              <div
                key={item.num}
                className={`shift-tile ${revealClass(i)} p-6 sm:p-7`}
              >
                <div className="flex items-end gap-3">
                  <ShiftIcon
                    kind={theme.kind}
                    name={item.icon}
                    ink={inkFor(i)}
                    size={64}
                    className={floatClass(i)}
                  />
                  <span
                    className="font-kodchasan text-3xl font-bold leading-none"
                    style={{
                      color: inkFor(i),
                      textShadow: `1.5px -1px 1.5px color-mix(in srgb, ${T.accent4} 60%, transparent)`,
                    }}
                  >
                    {item.num}
                  </span>
                </div>
                <h3 className="mt-5 font-kodchasan text-xl font-semibold">
                  {item.title}
                </h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: paper("99") }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 6. TESTIMONIALS ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Proof of Execution">
            เสียงจริงจากรุ่นพี่ที่ลงมือสร้าง
          </RisoHeading>
          <p
            className="mt-4 flex max-w-2xl items-start gap-2 text-xs leading-relaxed sm:text-sm"
            style={{ color: paper("80") }}
          >
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: T.accent3 }}
            />
            ข้อความและผลลัพธ์ทั้งหมดมาจากฟอร์มประเมินหลังจบกิจกรรม TechSeed #3,
            #5 และบันทึกการวิเคราะห์พอร์ตรายบุคคลของ PassionSeed
          </p>

          {SHIFT_TESTIMONIAL_GROUPS.map((group, gi) => (
            <div key={group.label} className="mt-14">
              <p
                className="mb-6 font-mono text-xs font-bold uppercase tracking-[0.24em]"
                style={{ color: inkFor(gi) }}
              >
                {group.label}
              </p>
              <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                {group.cards.map((card, ci) => (
                  <figure
                    key={card.name}
                    className={`${revealClass(ci)} relative flex flex-col border-l-2 pl-5`}
                    style={{ borderColor: inkFor(gi) }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-6 left-3 font-kodchasan text-6xl font-bold leading-none"
                      style={{
                        color: `color-mix(in srgb, ${inkFor(gi)} 35%, transparent)`,
                      }}
                    >
                      &ldquo;
                    </span>
                    <blockquote
                      className="relative flex-1 text-sm leading-relaxed"
                      style={{ color: paper("d9") }}
                    >
                      &ldquo;{card.quote}&rdquo;
                    </blockquote>
                    <p
                      className="mt-4 text-xs font-semibold leading-relaxed"
                      style={{ color: T.accent3 }}
                    >
                      {card.shift}
                    </p>
                    <figcaption className="mt-3">
                      <p className="text-sm font-semibold">{card.name}</p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: paper("80") }}
                      >
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
              className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] underline decoration-[color:var(--shift-accent2,#ff48b0)] decoration-2 underline-offset-8 transition "
              style={{ color: T.accent3 }}
            >
              <span>สำรวจคลังชิ้นงานจริงของรุ่นพี่ที่ TechSeed Gallery</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ============ 7. COHORT & PRICING ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="Cohort Details">
            ทำไมต้องสมัครคัดเลือก
          </RisoHeading>
          <div className={`mt-10 grid gap-4 ${showPrice ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              <div className={`shift-tile ${revealClass(0)} p-6`}>
                <ShiftIcon kind={theme.kind} name="people" ink={inkFor(0)} size={44} className="mb-4" />
                <h3 className="font-kodchasan text-xl font-semibold">
                  รับ {cohort.seats} คน · ดูแลทั่วถึง
                </h3>
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: paper("99") }}
                >
                  ทำคนเดียวหรือเป็นทีม {teamSizeLabel(cohort)} ก็ได้
                  เรียนสกิลใหม่ด้วยกันและช่วยกันหาคนมาลอง
                  ทุกเย็นโชว์ของจริงให้ทั้งห้องดู
                </p>
              </div>
              {showPrice && (
                <div
                  className={`shift-tile ${revealClass(1)} p-6`}
                  style={{
                    borderColor: `color-mix(in srgb, ${T.accent2} 50%, transparent)`,
                  }}
                >
                  <ShiftIcon kind={theme.kind} name="target" ink={T.accent2} size={44} className="mb-4" />
                  <h3
                    className="font-kodchasan text-3xl font-bold"
                    style={HEADING}
                  >
                    {PRICE}
                  </h3>
                  <p
                    className="mt-2 text-sm font-semibold"
                    style={{ color: T.accent2 }}
                  >
                    มากับเพื่อนเป็นคู่ ลดคนละ {baht(PAIR_DISCOUNT_BAHT)}
                  </p>
                  <p
                    className="mt-3 text-sm leading-relaxed"
                    style={{ color: paper("99") }}
                  >
                    โอนผ่าน QR พร้อมเพย์ แล้วส่งสลิปทาง LINE เพื่อยืนยันที่นั่ง
                    ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเงินเต็มจำนวน
                  </p>
                </div>
              )}
              <div className={`shift-tile ${revealClass(2)} p-6`}>
                <ShiftIcon kind={theme.kind} name="calendar" ink={T.accent3} size={44} className="mb-4" />
                <h3 className="font-kodchasan text-xl font-semibold">
                  สมัคร 2 นาที · ปิด {DEADLINE}
                </h3>
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: paper("99") }}
                >
                  ตอบคำถามสั้นๆ เรื่องคณะเป้าหมายใน TCAS 1
                  และไอเดียโปรเจกต์ดิบที่อยากลองปั้น
                </p>
              </div>
          </div>
        </section>

        {/* ============ 7b. PAYMENT ============ */}
        {isOpen && showPrice && (
          <section id="pay" className="scroll-mt-24 py-16 sm:py-24">
            <RisoHeading eyebrow="Payment">จ่ายยังไง</RisoHeading>
            <div className="mt-10">
              <ShiftPayment cohort={cohort} />
            </div>
          </section>
        )}

        {/* ============ 8. FAQ ============ */}
        <section className="py-16 sm:py-24">
          <RisoHeading eyebrow="FAQ">คำถามที่เจอบ่อย</RisoHeading>
          <div className={`mt-10 border-t ${HAIR}`}>
            {faqs.map((faq) => (
              <details key={faq.q} className={`group border-b py-6 ${HAIR}`}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-kodchasan text-base font-semibold leading-relaxed marker:hidden sm:text-lg [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span
                    className="mt-1 font-mono text-lg leading-none transition-transform group-open:rotate-45"
                    style={{ color: T.accent1 }}
                  >
                    +
                  </span>
                </summary>
                <p
                  className="mt-3 max-w-3xl text-sm leading-relaxed"
                  style={{ color: paper("99") }}
                >
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* ============ 9. FINAL CTA: sunrise bookend ============ */}
      <section className="relative overflow-hidden pb-64 pt-20 text-center sm:pb-72 sm:pt-28">
        {Bookend && <Bookend />}
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          <RisoHeading
            eyebrow={`${cohort.name} · ${COHORT_DATES}`}
            align="center"
          >
            พร้อมเลิกสะสมใบเซอร์
            <br />
            แล้วมาสร้างโปรเจกต์จริงหรือยัง
          </RisoHeading>
          <p className="mx-auto mt-6 max-w-xl" style={{ color: paper("b3") }}>
            {isOpen
              ? `เปิด ${cohort.seats} ที่นั่งสำหรับ ${cohort.name} ดูแลทั่วถึงทุกคน ปิดรับสมัคร ${DEADLINE}`
              : `${cohort.name} ปิดรับสมัครแล้ว ดูรุ่นที่ยังเปิดอยู่ได้ที่หน้า SHIFT`}
            ถ้าคุณมีไอเดียดิบที่อยากเห็นมันกลายเป็นของจริง นี่คือพื้นที่ของคุณ
          </p>
          <div className="mt-10">
            <ApplyButton cohort={cohort} location="final_cta">
              จองที่นั่ง {cohort.name}
            </ApplyButton>
          </div>
        </div>
      </section>

      {/* ============ STICKY CTA BAR ============ */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-md ${HAIR}`}
        style={{ backgroundColor: T.bar }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className="hidden text-sm sm:block" style={{ color: paper("99") }}>
            <span className="font-mono tracking-[0.18em]">{cohort.name}</span> ·{" "}
            {COHORT_DATES} · รับ {cohort.seats} คน
          </p>
          <p
            className="font-mono text-[11px] uppercase tracking-[0.18em] sm:hidden"
            style={{ color: paper("99") }}
          >
            {cohort.name}
            {showPrice && ` · ${PRICE}`}
          </p>
          <ApplyButton
            cohort={cohort}
            location="sticky_bar"
            className="!px-5 !py-2.5 !text-sm"
          >
            สมัครเลย
          </ApplyButton>
        </div>
      </div>
    </div>
  );
}
