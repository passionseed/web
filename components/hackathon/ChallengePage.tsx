"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Brain, Globe, Star, ChevronDown, Zap, AlertTriangle, Target, Heart, Clock } from "lucide-react";

type Lang = "en" | "th";

const TRACKS = [
  {
    id: 1,
    num: "01",
    title: "Traditional & Integrative Healthcare",
    subtitle: "แพทย์แผนไทยและการแพทย์เชิงป้องกัน",
    icon: HeartPulse,
    color: "#91C4E3",
    colorMuted: "rgba(145,196,227,0.12)",
    colorBorder: "rgba(145,196,227,0.25)",
    problems: [
      {
        num: "P1",
        titleEn: "The Last-Mile Chronic Disease Gap",
        titleTh: "ช่องว่างโรคเรื้อรังในพื้นที่ห่างไกล",
        hookEn: "Over 70% of Thai elderly live in rural areas far from chronic disease screening systems, causing diseases to be detected too late.",
        hookTh: "ผู้สูงอายุไทยกว่า 70% อาศัยในชนบทห่างไกลจากระบบการตรวจคัดกรองโรคเรื้อรัง ส่งผลให้โรคถูกตรวจพบในระยะที่สายเกินไป",
        challengeEn:
          "How might we design a low-cost, community-deployable screening tool that enables rural communities to detect chronic disease risk early — without requiring hospital infrastructure?",
        challengeTh:
          "เราจะออกแบบเครื่องมือคัดกรองต้นทุนต่ำที่ชุมชนสามารถนำไปใช้เองได้ เพื่อช่วยให้คนในชนบทตรวจพบความเสี่ยงโรคเรื้อรังได้ตั้งแต่เนิ่น ๆ โดยไม่ต้องพึ่งโรงพยาบาลได้อย่างไร?",
        tangibleEquivalent: {
          en: "Like leaving your grandparents' check engine light on until the car breaks down.",
          th: "เหมือนปล่อยให้ไฟเตือนเครื่องยนต์ของปู่ย่าตายายสว่างค้างไว้ จนกว่ารถจะพัง"
        },
        scores: { severity: 8, difficulty: 8, impact: 9, urgency: 8 },
        tags: ["Rural Health", "Screening", "Low-cost Tech"],
      },
      {
        num: "P2",
        titleEn: "The Traditional Medicine Data Desert",
        titleTh: "ช่องว่างข้อมูลแพทย์แผนไทย",
        hookEn: "Thailand has over 30,000 traditional medicine practitioners, but treatment data is rarely recorded or connected to modern health systems.",
        hookTh: "ประเทศไทยมีผู้ประกอบวิชาชีพแพทย์แผนไทยกว่า 30,000 คน แต่ข้อมูลการรักษาแทบไม่ถูกบันทึกหรือเชื่อมต่อกับระบบสุขภาพสมัยใหม่",
        challengeEn:
          "How might we create a bridge that digitizes traditional medicine treatment outcomes and makes them interoperable with modern health records — enabling integrated, evidence-based care?",
        challengeTh:
          "เราจะสร้างระบบที่แปลงข้อมูลการรักษาแพทย์แผนไทยให้เป็นดิจิทัล และเชื่อมต่อกับบันทึกสุขภาพสมัยใหม่ได้ เพื่อนำไปสู่การดูแลสุขภาพแบบบูรณาการที่มีหลักฐานรองรับได้อย่างไร?",
        tangibleEquivalent: {
          en: "Like burning a library of 30,000 medical books every generation.",
          th: "เหมือนการเผาห้องสมุดตำราแพทย์ 30,000 เล่มทิ้งในทุกๆ รุ่น"
        },
        scores: { severity: 8, difficulty: 8, impact: 9, urgency: 7 },
        tags: ["Digital Health", "Interoperability", "Traditional Medicine"],
      },
      {
        num: "P3",
        titleEn: "Preventive Intervention at Scale",
        titleTh: "การแทรกแซงเชิงป้องกันในวงกว้าง",
        hookEn: "Only 1 in 5 Thais at high risk of NCDs receives preventive intervention before the disease develops.",
        hookTh: "มีคนไทยเพียง 1 ใน 5 ที่มีความเสี่ยงสูงต่อโรค NCDs ที่ได้รับการแทรกแซงเชิงป้องกันก่อนที่โรคจะพัฒนาขึ้น",
        challengeEn:
          "How might we build a predictive health risk platform that identifies high-risk individuals early and triggers personalized preventive action — before symptoms appear?",
        challengeTh:
          "เราจะสร้างแพลตฟอร์มประเมินความเสี่ยงด้านสุขภาพเชิงพยากรณ์ที่ระบุตัวบุคคลที่มีความเสี่ยงสูงได้แต่เนิ่น ๆ และกระตุ้นให้เกิดการป้องกันแบบเฉพาะบุคคลก่อนที่อาการจะปรากฏได้อย่างไร?",
        tangibleEquivalent: {
          en: "Like ignoring a leaky roof until the house floods. 400,000 lives lost yearly.",
          th: "เหมือนเพิกเฉยต่อหลังคารั่วจนน้ำท่วมบ้าน 400,000 ชีวิตสูญเสียทุกปี"
        },
        scores: { severity: 9, difficulty: 8, impact: 9, urgency: 9 },
        tags: ["Predictive Analytics", "NCDs", "Behavioral Change"],
      },
    ],
  },
  {
    id: 2,
    num: "02",
    title: "Mental Health",
    subtitle: "สุขภาพจิตและความเป็นอยู่ที่ดี",
    icon: Brain,
    color: "#A594BA",
    colorMuted: "rgba(165,148,186,0.12)",
    colorBorder: "rgba(165,148,186,0.25)",
    problems: [
      {
        num: "P4",
        titleEn: "The Stigma Wall",
        titleTh: "กำแพงแห่งอคติ",
        hookEn: "37% of Thai students experience burnout, but more than 85% have never sought help out of fear of social judgment.",
        hookTh: "37% ของนักศึกษาไทยมีอาการ Burnout แต่มากกว่า 85% ไม่เคยขอความช่วยเหลือ เพราะกลัวการถูกตัดสินจากสังคม",
        challengeEn:
          "How might we design a destigmatized early mental health detection and support system that meets young people where they are — without labeling or exposing them?",
        challengeTh:
          "เราจะออกแบบระบบตรวจจับปัญหาสุขภาพจิตระยะแรกและระบบสนับสนุน ที่คนหนุ่มสาวเข้าถึงได้โดยไม่ต้องกลัวการถูกตัดสินหรือถูกเปิดเผยตัวตนได้อย่างไร?",
        tangibleEquivalent: {
          en: "Like having a broken leg, but society tells you it's 'just in your head'.",
          th: "เหมือนขาหัก แต่สังคมบอกคุณว่า 'คุณแค่คิดไปเอง'"
        },
        scores: { severity: 9, difficulty: 8, impact: 9, urgency: 9 },
        tags: ["Destigmatization", "Youth", "Early Detection"],
      },
      {
        num: "P5",
        titleEn: "Connected But Alone",
        titleTh: "เชื่อมต่อแต่โดดเดี่ยว",
        hookEn: "Teen loneliness in Thailand has reached crisis levels despite increased social media use — because online connections don't resolve real-life social isolation.",
        hookTh: "ความเหงาในวัยรุ่นไทยถึงระดับวิกฤตแม้จะใช้ Social Media มากขึ้น เพราะการเชื่อมต่อออนไลน์ไม่ได้แก้ปัญหาการแยกตัวจากสังคมในชีวิตจริง",
        challengeEn:
          "How might we design an intervention that addresses root-cause social isolation — not just surface-level connection — for teenagers and young adults?",
        challengeTh:
          "เราจะออกแบบการแทรกแซงที่แก้ไขการโดดเดี่ยวทางสังคมในเชิงต้นเหตุ ไม่ใช่แค่การเชื่อมต่อแบบผิวเผิน สำหรับวัยรุ่นและผู้ใหญ่ตอนต้นได้อย่างไร?",
        tangibleEquivalent: {
          en: "The mortality impact is equivalent to smoking 15 cigarettes a day.",
          th: "ผลกระทบต่ออัตราการตายเทียบเท่ากับการสูบบุหรี่ 15 มวนต่อวัน"
        },
        scores: { severity: 9, difficulty: 8, impact: 10, urgency: 10 },
        tags: ["Social Isolation", "Teenagers", "Intervention"],
      },
      {
        num: "P6",
        titleEn: "Mental Healthcare in the Last Mile",
        titleTh: "สุขภาพจิตในพื้นที่ห่างไกล",
        hookEn: "Rural Thailand has only 1 psychiatrist per 200,000 people, leaving those who need help with no way to access care.",
        hookTh: "พื้นที่ชนบทของไทยมีจิตแพทย์เพียง 1 คนต่อประชากร 200,000 คน ทำให้คนที่ต้องการความช่วยเหลือไม่มีทางเข้าถึงการดูแล",
        challengeEn:
          "How might we build a scalable, culturally appropriate mental wellness support system for underserved communities — where professional help is inaccessible?",
        challengeTh:
          "เราจะสร้างระบบสนับสนุนสุขภาพจิตที่ปรับขนาดได้และเหมาะสมกับวัฒนธรรม สำหรับชุมชนที่ขาดแคลนซึ่งเข้าถึงความช่วยเหลือจากผู้เชี่ยวชาญไม่ได้อย่างไร?",
        tangibleEquivalent: {
          en: "Imagine 1 doctor trying to treat a packed stadium of 200,000 people.",
          th: "ลองจินตนาการถึงหมอ 1 คนที่พยายามรักษาคน 200,000 คนในสเตเดียมที่อัดแน่น"
        },
        scores: { severity: 9, difficulty: 8, impact: 9, urgency: 9 },
        tags: ["Access", "Rural Communities", "Scalable Care"],
      },
    ],
  },
  {
    id: 3,
    num: "03",
    title: "Community, Public & Environmental Health",
    subtitle: "สุขภาพชุมชนและสิ่งแวดล้อม",
    icon: Globe,
    color: "#91C4E3",
    colorMuted: "rgba(145,196,227,0.12)",
    colorBorder: "rgba(145,196,227,0.25)",
    problems: [
      {
        num: "P7",
        titleEn: "Data Rich, Action Poor",
        titleTh: "ข้อมูลมาก การกระทำน้อย",
        hookEn: "Real-time air quality data is already available, but communities can't translate that data into protective actions.",
        hookTh: "ข้อมูลคุณภาพอากาศแบบ Real-time มีพร้อมแล้ว แต่ชุมชนไม่สามารถแปลงข้อมูลเหล่านั้นเป็นการกระทำเพื่อป้องกันตัวได้",
        challengeEn:
          "How might we turn real-time environmental health data into actionable community behavior change — at the neighborhood level, not just on a dashboard?",
        challengeTh:
          "เราจะแปลงข้อมูลสุขภาพสิ่งแวดล้อมแบบ Real-time ให้กลายเป็นการเปลี่ยนพฤติกรรมของชุมชนที่ลงมือทำได้จริงในระดับย่าน ไม่ใช่แค่บน Dashboard ได้อย่างไร?",
        tangibleEquivalent: {
          en: "Like having a fire alarm that rings, but gives you no water to put out the fire.",
          th: "เหมือนมีสัญญาณเตือนไฟไหม้ดังขึ้น แต่ไม่มีน้ำให้คุณดับไฟ"
        },
        scores: { severity: 9, difficulty: 7, impact: 9, urgency: 8 },
        tags: ["Environmental Data", "Behavior Change", "Community"],
      },
      {
        num: "P8",
        titleEn: "The Food Safety Blind Spot",
        titleTh: "จุดบอดด้านความปลอดภัยอาหาร",
        hookEn: "40% of Thai street food markets lack consistent food safety inspection, resulting in tens of thousands of food-related illnesses per year.",
        hookTh: "40% ของตลาดอาหารริมทางในไทยขาดระบบตรวจสอบความปลอดภัยที่สม่ำเสมอ ส่งผลให้มีผู้ป่วยจากอาหารหลายหมื่นคนต่อปี",
        challengeEn:
          "How might we design a community-powered food safety monitoring and early warning system that works without requiring top-down government enforcement?",
        challengeTh:
          "เราจะออกแบบระบบติดตามและเตือนภัยความปลอดภัยอาหารที่ขับเคลื่อนโดยชุมชน โดยไม่ต้องรอการบังคับใช้จากภาครัฐได้อย่างไร?",
        tangibleEquivalent: {
          en: "Like playing Russian Roulette with your lunch every day.",
          th: "เหมือนเล่นรัสเซียนรูเล็ตต์กับอาหารกลางวันของคุณทุกวัน"
        },
        scores: { severity: 8, difficulty: 7, impact: 8, urgency: 7 },
        tags: ["Food Safety", "Community Monitoring", "Public Health"],
      },
      {
        num: "P9",
        titleEn: "PM2.5 vs. Our Children",
        titleTh: "PM2.5 กับเด็กๆ ของเรา",
        hookEn: "PM2.5 dust disproportionately affects school children, but most schools lack timely warning systems or prevention plans.",
        hookTh: "ฝุ่น PM2.5 ส่งผลกระทบต่อเด็กนักเรียนอย่างไม่สมส่วน แต่โรงเรียนส่วนใหญ่ไม่มีระบบแจ้งเตือนหรือแผนป้องกันที่ทันการณ์",
        challengeEn:
          "How might we build a predictive PM2.5 alert and response system that triggers preemptive protective actions for schools and children — before dangerous exposure occurs?",
        challengeTh:
          "เราจะสร้างระบบแจ้งเตือนและตอบสนอง PM2.5 เชิงพยากรณ์ที่กระตุ้นให้เกิดการป้องกันล่วงหน้าสำหรับโรงเรียนและเด็กก่อนที่จะเกิดการสัมผัสอันตรายได้อย่างไร?",
        tangibleEquivalent: {
          en: "Like forcing 13.6 million kids to smoke cigarettes before recess.",
          th: "เหมือนบังคับให้เด็ก 13.6 ล้านคนสูบบุหรี่ก่อนพักเบรก"
        },
        scores: { severity: 9, difficulty: 7, impact: 9, urgency: 10 },
        tags: ["Air Quality", "Children", "Predictive Alerts"],
      },
    ],
  },
];

const JUDGING_CRITERIA = [
  {
    label: "Impact",
    weight: "30%",
    desc: "Does it address a real health problem? What's the scale of potential impact?",
    color: "#91C4E3",
  },
  {
    label: "Innovation",
    weight: "25%",
    desc: "Is the approach novel? Does it combine ideas in an unexpected way?",
    color: "#A594BA",
  },
  {
    label: "Feasibility",
    weight: "25%",
    desc: "Can this be built? Is the prototype functional or clearly demonstrable?",
    color: "#91C4E3",
  },
  {
    label: "Prototype Quality",
    weight: "20%",
    desc: "How well does the demo communicate the solution? UX, clarity, completeness.",
    color: "#A594BA",
  },
];

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div
      className="flex items-center rounded-full border border-white/10 overflow-hidden text-xs font-mono"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {(["en", "th"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className="px-3 py-1.5 transition-all duration-200"
          style={{
            background: lang === l ? "rgba(145,196,227,0.15)" : "transparent",
            color: lang === l ? "#91C4E3" : "rgba(255,255,255,0.3)",
            fontWeight: lang === l ? 600 : 400,
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function ChallengePage() {
  const router = useRouter();
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 50%, #010D18 100%)" }}
    >
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.85; }
        }
        @keyframes twinkle-hot {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes aurora {
          0%, 100% { opacity: 0.18; transform: translateX(-5%) scaleY(1); }
          33% { opacity: 0.28; transform: translateX(2%) scaleY(1.15); }
          66% { opacity: 0.22; transform: translateX(-2%) scaleY(0.9); }
        }
        @keyframes drift {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(8px) translateY(-4px); }
          50% { transform: translateX(4px) translateY(-10px); }
          75% { transform: translateX(-4px) translateY(-6px); }
          100% { transform: translateX(0) translateY(0); }
        }
        .star { animation: twinkle var(--dur) ease-in-out var(--delay) infinite; }
        .star-hot { animation: twinkle-hot var(--dur) ease-in-out var(--delay) infinite; }
        .float-slow { animation: float 8s ease-in-out infinite; }
        .aurora { animation: aurora var(--dur) ease-in-out infinite; }
        .drift { animation: drift var(--dur) ease-in-out var(--delay) infinite; }
      `}</style>

      {/* Stars */}
      {Array.from({ length: 90 }).map((_, i) => {
        const isHot = i % 11 === 0;
        const color = i % 5 === 0 ? "#91C4E3" : i % 7 === 0 ? "#C4A8D4" : i % 13 === 0 ? "#7DD3FC" : "#ffffff";
        const size = isHot ? (i % 2) + 2 : (i % 3) + 1;
        return (
          <div
            key={i}
            className={`${isHot ? "star-hot" : "star"} absolute rounded-full pointer-events-none`}
            style={{
              left: `${(i * 11.3) % 100}%`,
              top: `${(i * 9.7) % 85}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: color,
              boxShadow: isHot ? `0 0 4px ${color}` : "none",
              "--dur": `${2 + (i % 5)}s`,
              "--delay": `${(i * 0.25) % 6}s`,
            } as React.CSSProperties}
          />
        );
      })}

      {/* Aurora bands */}
      <div
        className="aurora fixed top-0 left-0 right-0 h-[280px] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(145,196,227,0.06) 0%, rgba(165,148,186,0.04) 50%, transparent 100%)",
          "--dur": "14s",
        } as React.CSSProperties}
      />
      <div
        className="aurora fixed top-0 left-[-10%] right-[-10%] h-[160px] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(101,171,252,0.05) 0%, transparent 100%)",
          "--dur": "19s",
        } as React.CSSProperties}
      />

      {/* Ambient glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#91C4E3] opacity-[0.055] blur-[180px] rounded-full pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[600px] h-[350px] bg-[#A594BA] opacity-[0.05] blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed top-2/3 left-1/4 w-[400px] h-[250px] bg-[#65ABFC] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ background: "rgba(1,1,8,0.8)" }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/hackathon")}
            className="flex items-center gap-2 text-sm transition-all duration-200 hover:gap-3"
            style={{ color: "#65ABFC", textShadow: "0 0 12px rgba(101,171,252,0.4)" }}
          >
            ← Back to Hackathon
          </button>
          <span className="text-xs text-gray-600 font-mono tracking-widest hidden md:block">CHALLENGE BRIEF 2026</span>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} onChange={setLang} />
            <button
              onClick={() => router.push("/hackathon/register")}
              className="text-xs px-4 py-2 rounded-full border border-[#91C4E3]/30 text-[#91C4E3] hover:border-[#91C4E3]/60 hover:bg-[#91C4E3]/5 transition-all duration-200 font-[family-name:var(--font-bai-jamjuree)]"
            >
              Register
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <p className="text-xs text-[#91C4E3]/50 tracking-[0.3em] uppercase mb-6 font-[family-name:var(--font-bai-jamjuree)]">
            The Next Decade Hackathon 2026
          </p>
          <h1
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{
              background: "linear-gradient(135deg, #91C4E3 0%, #ffffff 40%, #A594BA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
            }}
          >
            Challenge Brief
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed mb-4">
            9 real problems. 3 tracks. One shot to build something that actually changes lives.
          </p>
          <p className="text-sm font-[family-name:var(--font-bai-jamjuree)]" style={{ color: "#91C4E3", opacity: 0.5 }}>
            Preventive & Predictive Healthcare
          </p>

          {/* Track quick-nav */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {TRACKS.map((t) => (
              <a
                key={t.id}
                href={`#track-${t.id}`}
                className="text-xs px-4 py-2 rounded-full border transition-all duration-200 font-[family-name:var(--font-bai-jamjuree)]"
                style={{
                  borderColor: `${t.color}30`,
                  color: t.color,
                  background: t.colorMuted,
                }}
              >
                {t.num} — {t.title.split(" ").slice(0, 2).join(" ")}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Tracks + Problems */}
      <section className="pb-20 relative z-10">
        <div className="container mx-auto px-4 max-w-5xl space-y-20">
          {TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <div key={track.id} id={`track-${track.id}`} className="scroll-mt-24">
                {/* Track Header */}
                <div className="flex items-center gap-6 mb-10">
                  <div className="flex items-center gap-4 flex-1">
                    <span
                      className="text-7xl md:text-8xl font-bold leading-none select-none"
                      style={{ color: `${track.color}35`, textShadow: `0 0 60px ${track.color}20` }}
                    >
                      {track.num}
                    </span>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Icon className="w-5 h-5" style={{ color: track.color, filter: `drop-shadow(0 0 6px ${track.color}80)` }} strokeWidth={1.5} />
                        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: track.color }}>
                          {track.title}
                        </h2>
                      </div>
                      <p className="text-base text-gray-500 font-[family-name:var(--font-bai-jamjuree)]">{track.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Problem Cards */}
                <div className="space-y-3">
                  {track.problems.map((p) => {
                    const key = `${track.id}-${p.num}`;
                    const isOpen = expandedProblem === key;
                    const title = lang === "th" ? p.titleTh : p.titleEn;
                    const hook = lang === "th" ? p.hookTh : p.hookEn;
                    const challenge = lang === "th" ? p.challengeTh : p.challengeEn;
                    const contextLabel = lang === "th" ? "บริบท" : "Context";
                    const challengeLabel = lang === "th" ? "โจทย์" : "The Challenge";
                    return (
                      <div
                        key={p.num}
                        className="rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden"
                        style={{
                          borderColor: isOpen ? track.colorBorder : "rgba(255,255,255,0.06)",
                          background: isOpen ? track.colorMuted : "rgba(13,18,25,0.6)",
                          boxShadow: isOpen ? `0 0 60px ${track.color}22, inset 0 0 40px ${track.color}06` : "none",
                        }}
                        onClick={() => setExpandedProblem(isOpen ? null : key)}
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between gap-4 p-6 md:p-8">
                          <div className="flex items-center gap-5 flex-1 min-w-0">
                            <span
                              className="text-xs font-mono flex-shrink-0 w-8"
                              style={{ color: `${track.color}50` }}
                            >
                              {p.num}
                            </span>
                            <h3
                              className="text-lg md:text-xl font-normal truncate font-[family-name:var(--font-bai-jamjuree)]"
                              style={{ color: isOpen ? track.color : "rgba(255,255,255,0.8)" }}
                            >
                              {title}
                            </h3>
                          </div>
                          <ChevronDown
                            className="flex-shrink-0 w-4 h-4 transition-transform duration-300"
                            style={{
                              color: `${track.color}60`,
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </div>

                        {/* Expanded Content */}
                        <div
                          className={`grid transition-all duration-500 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                          <div className="overflow-hidden">
                            <div className="px-6 md:px-8 pb-8 space-y-6 pt-2">
                              {/* Divider */}
                              <div className="h-px" style={{ background: `${track.color}20` }} />
                              
                              <div className="flex flex-col md:flex-row gap-6">
                                {/* Thumbnail */}
                                <div className="md:w-1/3 shrink-0 rounded-xl overflow-hidden border border-white/5 relative aspect-video md:aspect-square" style={{ background: "rgba(13,18,25,0.8)" }}>
                                  <img 
                                    src={`/images/hackathon_${p.num.toLowerCase()}_thumb.png`} 
                                    alt="Problem concept" 
                                    className="w-full h-full object-cover mix-blend-screen opacity-90 transition-transform duration-700 hover:scale-105" 
                                  />
                                  <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
                                </div>
                                <div className="flex-1 space-y-6">
                                  {/* Data hook */}
                            <div
                              className="rounded-xl p-5 border-l-2"
                              style={{
                                borderColor: track.color,
                                background: `${track.color}08`,
                              }}
                            >
                              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-bai-jamjuree)]">
                                {contextLabel}
                              </p>
                              <p className="text-gray-300 text-sm leading-relaxed font-[family-name:var(--font-bai-jamjuree)]">{hook}</p>
                            </div>

                                  {/* Challenge Statement */}
                                  <div>
                                    <p className="text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-bai-jamjuree)]" style={{ color: `${track.color}70` }}>
                                      {challengeLabel}
                                    </p>
                                    <p className="text-white/75 text-base leading-relaxed font-light font-[family-name:var(--font-bai-jamjuree)]">{challenge}</p>
                                  </div>
                                </div>
                              </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-6">
                              {p.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-3 py-1.5 rounded-full font-[family-name:var(--font-bai-jamjuree)] tracking-wide"
                                  style={{
                                    background: `${track.color}18`,
                                    border: `1px solid ${track.color}40`,
                                    color: track.color,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Tangible Equivalent & Scores */}
                            <div className="flex flex-col md:flex-row gap-6 mb-4">
                              <div className="flex-1 rounded-2xl p-6 border border-white/5 relative overflow-hidden group shadow-lg" style={{ background: "rgba(13,18,25,0.8)" }}>
                                <div className="absolute inset-0 transition-opacity duration-1000 opacity-0 group-hover:opacity-100" style={{ background: `radial-gradient(circle at top right, ${track.color}10 0%, transparent 70%)` }} />
                                <div className="relative z-10 flex items-start gap-4">
                                  <div className="p-2 rounded-full shrink-0" style={{ background: `${track.color}15` }}>
                                    <Zap className="w-5 h-5" style={{ color: track.color }} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest mb-2 font-[family-name:var(--font-bai-jamjuree)]" style={{ color: `${track.color}70` }}>
                                      Real-World Impact
                                    </p>
                                    <p className="text-base text-white/90 leading-relaxed font-[family-name:var(--font-bai-jamjuree)] drop-shadow-sm font-medium">
                                      "{'tangibleEquivalent' in p ? (p as any).tangibleEquivalent[lang] : ''}"
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 md:w-64 shrink-0 rounded-2xl p-5 border border-white/5" style={{ background: "rgba(13,18,25,0.6)" }}>
                                {[
                                  { label: "Sev", score: (p as any).scores?.severity, icon: AlertTriangle },
                                  { label: "Diff", score: (p as any).scores?.difficulty, icon: Target },
                                  { label: "Imp", score: (p as any).scores?.impact, icon: Heart },
                                  { label: "Urg", score: (p as any).scores?.urgency, icon: Clock }
                                ].map(s => (
                                  <div key={s.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <s.icon className="w-3.5 h-3.5" style={{ color: track.color }} />
                                        <span className="text-[10px] uppercase text-gray-500">{s.label}</span>
                                      </div>
                                      <span className="text-xs font-bold" style={{ color: track.color }}>{s.score}</span>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${(s.score || 0) * 10}%`, 
                                          background: `linear-gradient(90deg, ${track.color}60, ${track.color})`,
                                          boxShadow: `0 0 4px ${track.color}40`
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* View Details Link */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/hackathon/challenge/${p.num.toLowerCase()}`);
                              }}
                              className="text-sm px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 font-[family-name:var(--font-bai-jamjuree)]"
                              style={{
                                background: `${track.color}15`,
                                border: `1px solid ${track.color}30`,
                                color: track.color,
                              }}
                            >
                              View Full Research →
                            </button>
                          </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Wildcard / Own Problem Section */}
      <section className="py-12 relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div 
            className="rounded-2xl p-8 md:p-10 border-2 border-dashed border-[#91C4E3]/30 relative overflow-hidden group hover:border-[#91C4E3]/50 transition-colors duration-500"
            style={{ background: "rgba(145,196,227,0.03)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#91C4E3]/5 to-[#A594BA]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center shadow-[0_0_30px_rgba(145,196,227,0.2)]" style={{ background: "rgba(145,196,227,0.15)", border: "1px solid rgba(145,196,227,0.3)" }}>
                <Star className="w-8 h-8 text-[#91C4E3]" />
              </div>
              
              <div className="text-center md:text-left flex-1">
                <p className="text-xs text-[#91C4E3]/70 uppercase tracking-widest mb-3 font-[family-name:var(--font-bai-jamjuree)]">
                  {lang === "en" ? "Open Track" : "โจทย์เปิดกว้าง"}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {lang === "en" ? "Bring Your Own Observation" : "นำเสนอโจทย์ของคุณเอง"}
                </h3>
                <p className="text-white/70 text-base leading-relaxed font-[family-name:var(--font-bai-jamjuree)] mb-6">
                  {lang === "en" 
                    ? "The 9 problems above are just starting points. If you've observed a different health equity gap in your community—whether it's about accessibility, mental wellness, or environmental health—you are highly encouraged to tackle it! Sometimes the most impactful solutions come from personal experience." 
                    : "โจทย์ทั้ง 9 ข้อด้านบนเป็นเพียงจุดเริ่มต้น หากคุณค้นพบปัญหาความเหลื่อมล้ำทางสุขภาพอื่นๆ ในชุมชนของคุณ—ไม่ว่าจะเป็นด้านการเข้าถึงสุขภาพ สุขภาพจิต หรือสิ่งแวดล้อม—เราขอสนับสนุนให้คุณนำมาเป็นโจทย์! เพราะบ่อยครั้งที่ทางแก้ปัญหาที่ทรงพลังที่สุดมักมาจากประสบการณ์ตรง"}
                </p>
                
                <div className="inline-flex items-center gap-2 text-sm text-[#91C4E3] font-mono bg-[#91C4E3]/10 px-4 py-2 rounded-full border border-[#91C4E3]/20">
                  <Zap className="w-4 h-4" />
                  <span>{lang === "en" ? "As long as it fits the theme, it's fair game." : "ตราบใดที่ตรงกับธีมหลัก คุณก็สามารถเลือกทำได้เลย"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Judging Criteria */}
      <section className="py-20 relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs text-[#91C4E3]/50 tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-bai-jamjuree)]">How you'll be scored</p>
            <h2
              className="text-4xl md:text-5xl font-bold"
              style={{
                background: "linear-gradient(135deg, #91C4E3 0%, #A594BA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Judging Criteria
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {JUDGING_CRITERIA.map((c) => (
              <div
                key={c.label}
                className="rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300"
                style={{ background: "rgba(13,18,25,0.7)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{c.label}</h3>
                  <span
                    className="text-2xl font-black font-mono"
                    style={{ color: c.color }}
                  >
                    {c.weight}
                  </span>
                </div>
                {/* Weight bar */}
                <div className="h-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: c.weight,
                      background: `linear-gradient(90deg, ${c.color}80, ${c.color})`,
                      boxShadow: `0 0 8px ${c.color}60`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prizes */}
      <section className="py-20 relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs text-[#91C4E3]/50 tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-bai-jamjuree)]">What you can win</p>
            <h2
              className="text-4xl md:text-5xl font-bold"
              style={{
                background: "linear-gradient(135deg, #91C4E3 0%, #A594BA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Prizes
            </h2>
          </div>

          {/* Track Winner Prizes */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { place: "1st", label: "First Place", icon: "🥇", glow: "#FFD700" },
              { place: "2nd", label: "Second Place", icon: "🥈", glow: "#C0C0C0" },
              { place: "3rd", label: "Third Place", icon: "🥉", glow: "#CD7F32" },
            ].map((prize) => (
              <div
                key={prize.place}
                className="rounded-2xl p-8 border border-white/5 text-center group hover:border-white/10 transition-all duration-300 hover:-translate-y-1"
                style={{ background: "rgba(13,18,25,0.7)" }}
              >
                <div className="text-4xl mb-4">{prize.icon}</div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-bai-jamjuree)]">{prize.label}</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: prize.glow, textShadow: `0 0 20px ${prize.glow}40` }}
                >
                  To be revealed
                </p>
              </div>
            ))}
          </div>

          {/* Special Awards */}
          <div
            className="rounded-2xl p-8 border border-[#91C4E3]/15"
            style={{ background: "rgba(145,196,227,0.04)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-5 h-5 text-[#91C4E3]" strokeWidth={1.5} />
              <h3 className="text-lg font-bold text-white">Special Awards</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: "Best Use of Data", desc: "Team that leverages real-world data most effectively" },
                { title: "Most Impactful Solution", desc: "Highest potential real-world health impact" },
                { title: "Best Beginner Team", desc: "Outstanding work from first-time hackathon participants" },
              ].map((award) => (
                <div key={award.title} className="space-y-1">
                  <p className="text-sm font-semibold text-[#91C4E3]/80">{award.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed font-[family-name:var(--font-bai-jamjuree)]">{award.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-gray-600 font-[family-name:var(--font-bai-jamjuree)]">
                Sponsor prizes & prize amounts will be announced soon. Stay tuned.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{
              background: "linear-gradient(135deg, #91C4E3 0%, #ffffff 50%, #A594BA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(145,196,227,0.3))",
            }}
          >
            Your move.
          </h2>
          <p className="text-gray-300 mb-10 text-lg font-[family-name:var(--font-bai-jamjuree)]">
            เลือก 1 ปัญหา แล้วพิสูจน์ว่าคนรุ่นใหม่เปลี่ยนวงการสุขภาพได้จริง
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/hackathon/register")}
              className="px-10 py-4 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 font-[family-name:var(--font-bai-jamjuree)]"
              style={{
                background: "linear-gradient(135deg, rgba(145,196,227,0.2), rgba(165,148,186,0.2))",
                border: "1px solid rgba(145,196,227,0.55)",
                color: "#91C4E3",
                boxShadow: "0 0 40px rgba(145,196,227,0.25), inset 0 0 20px rgba(145,196,227,0.05)",
              }}
            >
              Register Now
            </button>
            <button
              onClick={() => router.push("/hackathon/team")}
              className="px-10 py-4 rounded-full text-sm font-semibold text-gray-400 hover:text-white transition-all duration-300 border border-white/10 hover:border-white/20 font-[family-name:var(--font-bai-jamjuree)]"
            >
              View Your Team
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm font-[family-name:var(--font-bai-jamjuree)]">
            The Next Decade Hackathon 2026 · Preventive & Predictive Healthcare
          </p>
        </div>
      </footer>
    </div>
  );
}
