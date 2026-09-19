import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Check,
  ClipboardList,
  Code2,
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

export const metadata: Metadata = {
  title: "SHIFT | The 7-Day Proof-of-Work Sandbox สำหรับ TCAS 1",
  description:
    "พื้นที่ 7 วัน ปั้นผลงานจริงให้มีคนใช้ 15–30 คน เลิกสะสมใบเซอร์ค่ายนั่งฟัง แล้วสร้าง Live Project พร้อม Pivot Log และ 1-Page Case Study ยื่นรอบพอร์ตมหาลัยชั้นนำ",
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
      "เลิกสะสมใบเซอร์ค่ายนั่งฟัง สร้างโปรเจกต์จริงที่มีคนใช้งาน 15–30 คนใน 7 วัน พร้อม 1-Page TCAS Case Study",
    url: "https://passionseed.org/shift",
    type: "website",
  },
};

const APPLY_URL = "https://forms.gle/3DaMNzuuFV4EHD2m7";

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="shift-eyebrow mb-3">{children}</p>;
}

const cadence = [
  {
    icon: Rocket,
    day: "Day 1 (Fri)",
    title: "Scope Lock & Hypothesis",
    body: "ตัดฟีเจอร์ที่ไม่จำเป็นออก 80% แล้วล็อกสโคปโปรเจกต์ระดับอะตอมให้จบใน 1 หน้า",
  },
  {
    icon: Hammer,
    day: "Day 3-5 (Wed)",
    title: "The Ugly Ship & Pivot Check",
    body: "ปล่อย MVP แบบ zero-code หรือ hardware ให้คนภายนอกใช้จริง ถ้าพังหรือไม่มีคนใช้ ดีแล้ว! นั่นคือ failure data ที่ต้องบันทึก",
  },
  {
    icon: Zap,
    day: "Day 7 (Sun)",
    title: "Reality Collision & TCAS Case Study",
    body: "แพ็กเมตริกจริงและบันทึกการแก้ปัญหาทั้งหมด ให้กลายเป็น 1-Page TCAS Case Study พร้อมใช้ในห้องสัมภาษณ์",
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

const deliverables = [
  {
    num: "01",
    title: "Functional Prototype / Shipped Asset",
    body: "เว็บทูลที่ใช้งานได้จริง รายงานวิจัย หรือ hardware prototype ที่มีคนภายนอกแตะต้องได้",
  },
  {
    num: "02",
    title: "The Experiment & Pivot Log",
    body: "บันทึกสมมติฐาน จุดพัง และการปรับแผนอย่างเป็นระบบ ซึ่งคือหลักฐาน mindset ที่อาจารย์มองหาตัวจริง",
  },
  {
    num: "03",
    title: "1-Page TCAS Case Study Blueprint",
    body: "สรุปตรรกะ ข้อมูล และผลลัพธ์ของโปรเจกต์ในหน้าเดียว พร้อมใช้ตอบคำถามในห้องสัมภาษณ์",
  },
];

const testimonialGroups = [
  {
    label: "TECH",
    cards: [
      {
        name: "Nutcha S.***",
        meta: "ม.ปลาย สาย Game Dev · TechSeed #5",
        quote:
          "จากตอนแรกสนใจทางการทำเกมอยู่แล้ว แต่ไม่เคยเริ่มทำโปรเจกต์จริงจังซักที พอได้มาเข้าร่วมกิจกรรมนี้ก็รู้สึกว่ามีไฟเพิ่มขึ้นมากๆ มีแรงบันดาลใจในการทำโปรเจกต์ของตัวเองขึ้นมามากๆ",
        shift: "จากคนที่ไม่เคยเริ่ม สู่การปั้นเกมที่เล่นได้จริงบน Unity",
      },
      {
        name: "Sitthinon S.***",
        meta: "ม.ปลาย สาย AI · TechSeed #3",
        quote:
          "เปิดโลกมากครับ ได้เห็นรุ่นพี่เปิดพอร์ต แล้วทำให้รู้แล้วว่าจะกลับไปทำโปรเจกต์อะไรใส่พอร์ตตัวเอง",
        shift: "จากคนที่งงทิศทางพอร์ต สู่ Blueprint โปรเจกต์ AI ยื่นมหาลัย",
      },
      {
        name: "Ananya H.***",
        meta: "ม.ปลาย สาย Web Dev · TechSeed #5",
        quote:
          "พอได้มาลงมือทำสายนี้ มันทำให้รู้เลยว่าเราโอเคกับการทำเว็บมากๆ และมีความมั่นใจมากขึ้นที่จะไปต่อสายนี้",
        shift: "จากความลังเล สู่ความมั่นใจ 100% ในสายอาชีพ",
      },
    ],
  },
  {
    label: "BUSINESS & FINANCE",
    cards: [
      {
        name: "Fifa F.***",
        meta: "ม.4 สาย Finance / BBA Candidate",
        quote:
          "เล่นเทรดจำลอง IQ Option มา 2-3 ปี มั่นใจแค่ 3-4/10 พอมาคุยถึงรู้ว่าอาจารย์มหาวิทยาลัยมองว่านั่นคือการเก็งกำไร พอเปลี่ยนมาทำ 1-Page Equity Research Note & Valuation Model ทำให้เห็นภาพพอร์ต BBA ที่ตึงขึ้นเยอะ",
        shift: "จาก Red-Flag Gambling App สู่ Institutional Equity Research Memo",
      },
      {
        name: "Pipat P.***",
        meta: "ม.4 สายผู้ประกอบการ / Business",
        quote:
          "อยากเป็นเจ้าของธุรกิจ ไม่อยากเป็นพนักงานเงินเดือน ได้รู้ว่าการไปเข้าค่ายเอาใบเซอร์ทั่วไปไม่ได้แสดงศักยภาพจริง สู้ทำ Capstone Project สร้างแบรนด์จริงแล้วดู Real Feedback ดีกว่าเยอะ",
        shift: "จาก Certificate Hoarder สู่ Real-World Capstone Builder",
      },
    ],
  },
  {
    label: "ENGINEERING & INNOVATION",
    cards: [
      {
        name: "Namtarn N.***",
        meta: "ม.6 KMITL Chem Eng Candidate",
        quote:
          "ตอน ม.5 ทำโครงงานโคมไฟน้ำทะเลแค่ส่งครูที่โรงเรียน มั่นใจพอร์ตแค่ 30% เพราะคิดว่าขาดค่าย พอมาวางแผนอัปเกรดเป็น Engineering Optimization Case Study สรุปค่า Voltage & Anode Degradation รู้สึกมั่นใจขึ้นทันทีโดยไม่ต้องไปไล่เก็บค่าย",
        shift: "จาก School Science Craft สู่ KMITL Chem Eng Spike Project",
      },
      {
        name: "Dockid D.***",
        meta: "ม.5 สายวิศวะนวัตกรรม / CPIRD Med",
        quote:
          "ค่ายที่จ่ายตังค์เข้าไป ผมมองว่าน้ำหนักมันเบาหวิว ค่ายหลอกเอาตังค์ สู้เอาเวลามาปั้นนวัตกรรมบอร์ดวัดควันบุหรี่ (Smart Smoking Detector) ของจริงดีกว่า",
        shift: "จากค่ายพาณิชย์ไร้น้ำหนัก สู่ Hardware Prototype + Process Log",
      },
    ],
  },
];

const faqs = [
  {
    q: "ทำไมใบเซอร์ค่าย 1 วันถึงไม่พอสำหรับ TCAS 1 อีกต่อไป?",
    a: "กรรมการสัมภาษณ์และอาจารย์มหาวิทยาลัยเจอนักเรียนส่งใบเซอร์หน้าตาเหมือนกันเป็นพันๆ ใบ อาจารย์ไม่ได้มองหาคนสะสมกระดาษ แต่มองหา 'ความสามารถในการแก้ปัญหาจริง' โปรเจกต์ที่มีคนใช้งานจริง 15–30 คนพร้อมบันทึกตอนระบบพังและวิธีแก้ จึงมีน้ำหนักมากกว่าใบเซอร์ค่ายนั่งฟังหลายสิบเท่า",
  },
  {
    q: "ผลงานจาก SHIFT นำไปใส่ใน Portfolio TCAS รอบ 1 ได้อย่างไร?",
    a: "SHIFT ออกแบบผลลัพธ์ให้ออกมาเป็น '1-Page Defense Case Study' บรรจุในพอร์ต 10 หน้าได้อย่างลงตัว: มีทั้งลิงก์โปรเจกต์จริง, สถิติผู้ใช้งาน (Telemetry), กราฟการทดสอบ, และ Failure/Pivot Log ซึ่งเป็นจุดดึงดูดสายตากรรมการมากที่สุดในห้องสัมภาษณ์",
  },
  {
    q: "เด็ก ม.ปลาย จะหาผู้ใช้งานจริง 15–30 คนใน 7 วันได้อย่างไร?",
    a: "ด้วยระเบียบวิธี 'Named 15' ใน Day 1 เราจะช่วยนักเรียนตัดฟีเจอร์ที่ไม่จำเป็นออกจนเหลือเพียง 1 จอหลักและ 1 แอ็กชันสำคัญ ทำให้เพื่อนร่วมชั้น กลุ่มที่มีความสนใจเฉพาะ หรือผู้คนในชุมชนสามารถเข้ามาทดลองใช้และให้ฟีดแบ็กได้ทันทีภายในไม่กี่นาที",
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
        "A 7-day intensive crucible where high school and early university students build a live artifact, validate it with 15–30 real users, and formulate a 1-page TCAS defense case study.",
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
    <div className="shift-scene min-h-screen font-bai-jamjuree antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shiftJsonLd) }}
      />
      <ShiftPageViewTracker />
      <div className="shift-scene__grid" aria-hidden="true" />
      <div className="shift-scene__glow-a" aria-hidden="true" />
      <div className="shift-scene__glow-b" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-40 sm:px-8">
        {/* ============ 1. HERO ============ */}
        <header className="flex min-h-[92vh] flex-col items-center justify-center py-20 text-center">
          <p className="shift-eyebrow mb-8">PassionSeed R&D Lab</p>

          <p className="shift-wordmark mb-10 select-none">SHIFT[0]</p>

          <h1 className="font-kodchasan text-4xl font-bold leading-[1.4] tracking-tight sm:text-6xl">
            7 วัน <span className="shift-gradient-text">ชิ้นงานจริง</span>
            <br />
            ปล่อยสู่โลกจริง
          </h1>

          <p className="mt-5 text-lg font-medium text-white/80 sm:text-xl">
            สำหรับ ม.4-ม.6 สาย Tech / ธุรกิจ / วิศวะ
          </p>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--shift-text-dim)] sm:text-lg">
            เลิกสะสมใบเซอร์ค่ายนั่งฟังที่ใครๆ ก็มี แล้วมาเปลี่ยนจุดพังและ Data
            จริง ให้กลายเป็นพอร์ต TCAS 1 ที่กรรมการมหาวิทยาลัยปฏิเสธไม่ได้
          </p>

          <div className="mt-10">
            <ApplyButton>สมัครคัดเลือกเข้าร่วม SHIFT[0] (รับ 9 คนเท่านั้น)</ApplyButton>
          </div>

          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--shift-text-dim)]">
            Zero Lectures · 100% Execution · Discord 1-on-1 Mentorship
          </p>
        </header>

        {/* ============ 2. THE PROBLEM ============ */}
        <section className="py-16 sm:py-24">
          <Eyebrow>The Problem</Eyebrow>
          <h2 className="font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">
            กับดัก &ldquo;พอร์ตเมค&rdquo; ที่กรรมการรู้ทัน
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="shift-card p-6 sm:p-8">
              <p className="mb-5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-red-400">
                <X className="h-4 w-4" /> ใบเซอร์ค่ายทั่วไป
              </p>
              <ul className="space-y-4 text-[var(--shift-text-dim)]">
                <li className="leading-relaxed">
                  นั่งฟังบรรยาย 6 ชั่วโมง และเล่นเกมกลุ่ม
                </li>
                <li className="leading-relaxed">
                  ใบประกาศเข้าร่วมที่เด็กอีก 1,000 คนก็มีเหมือนกัน
                </li>
                <li className="leading-relaxed">
                  พอร์ตสร้างภาพ &ldquo;ทำสำเร็จ 100%&rdquo;
                  ซึ่งอาจารย์มองว่าเมค
                </li>
              </ul>
            </div>

            <div className="shift-card border-[var(--shift-hazard-line)] p-6 sm:p-8">
              <p className="mb-5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--shift-hazard)]">
                <Check className="h-4 w-4" /> SHIFT Experimental Sandbox
              </p>
              <ul className="space-y-4 text-[var(--shift-text)]">
                <li className="leading-relaxed">
                  <strong>Zero Theory, 100% Execution:</strong>{" "}
                  ลงมือสร้างตั้งแต่วันแรก ไม่มีสไลด์บรรยาย
                </li>
                <li className="leading-relaxed">
                  <strong>Live Project:</strong> ผลงานที่มีคนภายนอกใช้งานจริง
                  พร้อมเมตริกจริง
                </li>
                <li className="leading-relaxed">
                  <strong>The Pivot Log:</strong> บันทึกจุดพังและการแก้ปัญหา
                  ซึ่งคือสัญญาณที่แรงที่สุดในสายตาอาจารย์
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ============ 3. CADENCE ============ */}
        <section className="py-16 sm:py-24">
          <Eyebrow>How It Works</Eyebrow>
          <h2 className="font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">
            จังหวะ 7 วัน ไม่กระทบเวลาเรียน
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {cadence.map((step) => (
              <div key={step.day} className="shift-card p-6">
                <step.icon className="mb-4 h-6 w-6 text-[var(--shift-hazard)]" />
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--shift-hazard)]">
                  {step.day}
                </p>
                <h3 className="mt-2 font-kodchasan text-lg font-semibold leading-snug">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--shift-text-dim)]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 4. TRACKS ============ */}
        <section className="py-16 sm:py-24">
          <Eyebrow>Project Tracks</Eyebrow>
          <h2 className="font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">
            โปรเจกต์จริงที่ปั้นใน SHIFT
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {tracks.map((track) => (
              <div key={track.title} className="shift-card p-6">
                <track.icon className="mb-4 h-6 w-6 text-[var(--shift-hazard)]" />
                <h3 className="font-kodchasan text-lg font-semibold">
                  {track.title}
                </h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--shift-text-dim)]">
                  {track.tag}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--shift-text-dim)]">
                  {track.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 5. DELIVERABLES ============ */}
        <section className="py-16 sm:py-24">
          <Eyebrow>What You Will Ship</Eyebrow>
          <h2 className="font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">
            ครบ 7 วัน คุณถือของ 3 ชิ้นนี้ออกไป
          </h2>

          <div className="mt-10 space-y-4">
            {deliverables.map((item) => (
              <div
                key={item.num}
                className="shift-card flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:gap-6 sm:p-8"
              >
                <span className="font-mono text-2xl font-bold text-[var(--shift-hazard)]">
                  {item.num}
                </span>
                <div>
                  <h3 className="font-kodchasan text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--shift-text-dim)]">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 6. TESTIMONIALS ============ */}
        <section className="py-16 sm:py-24">
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-[var(--shift-hazard-line)] bg-[var(--shift-hazard-soft)] p-4 sm:p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--shift-hazard)]" />
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--shift-hazard)]">
                Verified Student Feedback & Case Studies
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--shift-text-dim)] sm:text-sm">
                ข้อความและผลลัพธ์ทั้งหมดมาจากฟอร์มประเมินหลังจบกิจกรรม TechSeed
                #3, #5 และบันทึกการวิเคราะห์พอร์ตรายบุคคลของ PassionSeed
              </p>
            </div>
          </div>

          <Eyebrow>Proof of Execution</Eyebrow>
          <h2 className="font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">
            เสียงจริงจากรุ่นพี่ที่ลงมือสร้าง
          </h2>

          {testimonialGroups.map((group) => (
            <div key={group.label} className="mt-12">
              <p className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.22em] text-[var(--shift-text-dim)]">
                {group.label}
              </p>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {group.cards.map((card) => (
                  <figure key={card.name} className="shift-card flex flex-col p-6">
                    <blockquote className="flex-1 text-sm leading-relaxed text-[var(--shift-text)]">
                      &ldquo;{card.quote}&rdquo;
                    </blockquote>
                    <p className="mt-4 border-l-2 border-[var(--shift-hazard)] pl-3 text-xs font-semibold leading-relaxed text-[var(--shift-hazard)]">
                      {card.shift}
                    </p>
                    <figcaption className="mt-4">
                      <p className="text-sm font-semibold">{card.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--shift-text-dim)]">
                        {card.meta}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-12 text-center">
            <Link
              href="/techseed"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--shift-card-line)] bg-white/[0.03] px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[var(--shift-hazard)] transition hover:border-[var(--shift-hazard-line)] hover:bg-[var(--shift-hazard-soft)]"
            >
              <span>สำรวจคลังชิ้นงานจริงของรุ่นพี่ที่ TechSeed Gallery</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ============ 7. COHORT & PRICING ============ */}
        <section className="py-16 sm:py-24">
          <Eyebrow>Cohort Details</Eyebrow>
          <h2 className="font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">
            ทำไมต้องสมัครคัดเลือก
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="shift-card p-6">
              <Users className="mb-4 h-6 w-6 text-[var(--shift-hazard)]" />
              <h3 className="font-kodchasan text-lg font-semibold">
                Invite Only · รับแค่ 9 คน
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--shift-text-dim)]">
                เปิดด้วยคำเชิญเท่านั้น เพื่อให้ทีมงานรีวิวงานแบบ 1-on-1 บน Discord ได้ทุกขั้นตอน ไม่มีใครหลุดจากเรดาร์
              </p>
            </div>
            <div className="shift-card border-[var(--shift-hazard-line)] p-6">
              <Banknote className="mb-4 h-6 w-6 text-[var(--shift-hazard)]" />
              <h3 className="font-kodchasan text-lg font-semibold">
                ฿990 <span className="text-sm font-normal text-[var(--shift-text-dim)] line-through">฿1,500</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--shift-text-dim)]">
                ราคา Beta พิเศษ แลกกับการให้ feedback ระบบและอนุญาตใช้ case
                study ของคุณเป็นตัวอย่างในรุ่นถัดไป
              </p>
            </div>
            <div className="shift-card p-6">
              <ClipboardList className="mb-4 h-6 w-6 text-[var(--shift-hazard)]" />
              <h3 className="font-kodchasan text-lg font-semibold">
                สมัคร 2 นาที
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--shift-text-dim)]">
                ตอบคำถามสั้นๆ เรื่องคณะเป้าหมายใน TCAS 1
                และไอเดียโปรเจกต์ดิบที่อยากลองปั้น
              </p>
            </div>
          </div>
        </section>

        {/* ============ 8. FAQ ============ */}
        <section className="py-16 sm:py-24">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">
            คำถามที่เจอบ่อย
          </h2>

          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="shift-card group p-6">
                <summary className="cursor-pointer list-none font-kodchasan text-base font-semibold leading-relaxed marker:hidden sm:text-lg">
                  {faq.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--shift-text-dim)]">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ============ 9. FINAL CTA ============ */}
        <section className="py-20 text-center sm:py-28">
          <Eyebrow>SHIFT[0] Private Beta</Eyebrow>
          <h2 className="mx-auto max-w-3xl font-kodchasan text-3xl font-bold leading-[1.4] tracking-tight sm:text-5xl">
            พร้อมเลิกสะสมใบเซอร์
            <br />
            แล้วมาสร้าง<span className="shift-gradient-text">โปรเจกต์จริง</span>หรือยัง
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[var(--shift-text-dim)]">
            เปิดแค่ 9 ที่นั่ง แบบ invite only สำหรับ SHIFT[0]
            ถ้าคุณมีไอเดียดิบที่อยากเห็นมันกลายเป็นของจริง นี่คือพื้นที่ของคุณ
          </p>
          <div className="mt-10">
            <ApplyButton location="final_cta">Apply for SHIFT[0]</ApplyButton>
          </div>
        </section>
      </div>

      {/* ============ STICKY CTA BAR ============ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--shift-card-line)] bg-[#05010d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--shift-text-dim)] sm:block">
            SHIFT[0] · 9 Seats · Invite Only
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--shift-text-dim)] sm:hidden">
            SHIFT[0] · ฿990
          </p>
          <ShiftApplyButton location="sticky_bar" className="!px-5 !py-2.5 !text-sm">
            สมัครเลย
          </ShiftApplyButton>
        </div>
      </div>
    </div>
  );
}
