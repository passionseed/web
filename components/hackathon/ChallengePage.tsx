"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Brain, Globe, Star, ChevronDown } from "lucide-react";

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
        title: "The Last-Mile Chronic Disease Gap",
        hook: "ผู้สูงอายุไทยกว่า 70% อาศัยในชนบทห่างไกลจากระบบการตรวจคัดกรองโรคเรื้อรัง ส่งผลให้โรคถูกตรวจพบในระยะที่สายเกินไป",
        challenge:
          "How might we design a low-cost, community-deployable screening tool that enables rural communities to detect chronic disease risk early — without requiring hospital infrastructure?",
        tags: ["Rural Health", "Screening", "Low-cost Tech"],
      },
      {
        num: "P2",
        title: "The Traditional Medicine Data Desert",
        hook: "ประเทศไทยมีผู้ประกอบวิชาชีพแพทย์แผนไทยกว่า 30,000 คน แต่ข้อมูลการรักษาแทบไม่ถูกบันทึกหรือเชื่อมต่อกับระบบสุขภาพสมัยใหม่",
        challenge:
          "How might we create a bridge that digitizes traditional medicine treatment outcomes and makes them interoperable with modern health records — enabling integrated, evidence-based care?",
        tags: ["Digital Health", "Interoperability", "Traditional Medicine"],
      },
      {
        num: "P3",
        title: "Preventive Intervention at Scale",
        hook: "มีคนไทยเพียง 1 ใน 5 ที่มีความเสี่ยงสูงต่อโรค NCDs ที่ได้รับการแทรกแซงเชิงป้องกันก่อนที่โรคจะพัฒนาขึ้น",
        challenge:
          "How might we build a predictive health risk platform that identifies high-risk individuals early and triggers personalized preventive action — before symptoms appear?",
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
        title: "The Stigma Wall",
        hook: "37% ของนักศึกษาไทยมีอาการ Burnout แต่มากกว่า 85% ไม่เคยขอความช่วยเหลือ เพราะกลัวการถูกตัดสินจากสังคม",
        challenge:
          "How might we design a destigmatized early mental health detection and support system that meets young people where they are — without labeling or exposing them?",
        tags: ["Destigmatization", "Youth", "Early Detection"],
      },
      {
        num: "P5",
        title: "Connected But Alone",
        hook: "ความเหงาในวัยรุ่นไทยถึงระดับวิกฤตแม้จะใช้ Social Media มากขึ้น เพราะการเชื่อมต่อออนไลน์ไม่ได้แก้ปัญหาการแยกตัวจากสังคมในชีวิตจริง",
        challenge:
          "How might we design an intervention that addresses root-cause social isolation — not just surface-level connection — for teenagers and young adults?",
        tags: ["Social Isolation", "Teenagers", "Intervention"],
      },
      {
        num: "P6",
        title: "Mental Healthcare in the Last Mile",
        hook: "พื้นที่ชนบทของไทยมีจิตแพทย์เพียง 1 คนต่อประชากร 200,000 คน ทำให้คนที่ต้องการความช่วยเหลือไม่มีทางเข้าถึงการดูแล",
        challenge:
          "How might we build a scalable, culturally appropriate mental wellness support system for underserved communities — where professional help is inaccessible?",
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
        title: "Data Rich, Action Poor",
        hook: "ข้อมูลคุณภาพอากาศแบบ Real-time มีพร้อมแล้ว แต่ชุมชนไม่สามารถแปลงข้อมูลเหล่านั้นเป็นการกระทำเพื่อป้องกันตัวได้",
        challenge:
          "How might we turn real-time environmental health data into actionable community behavior change — at the neighborhood level, not just on a dashboard?",
        tags: ["Environmental Data", "Behavior Change", "Community"],
      },
      {
        num: "P8",
        title: "The Food Safety Blind Spot",
        hook: "40% ของตลาดอาหารริมทางในไทยขาดระบบตรวจสอบความปลอดภัยที่สม่ำเสมอ ส่งผลให้มีผู้ป่วยจากอาหารหลายหมื่นคนต่อปี",
        challenge:
          "How might we design a community-powered food safety monitoring and early warning system that works without requiring top-down government enforcement?",
        tags: ["Food Safety", "Community Monitoring", "Public Health"],
      },
      {
        num: "P9",
        title: "PM2.5 vs. Our Children",
        hook: "ฝุ่น PM2.5 ส่งผลกระทบต่อเด็กนักเรียนอย่างไม่สมส่วน แต่โรงเรียนส่วนใหญ่ไม่มีระบบแจ้งเตือนหรือแผนป้องกันที่ทันการณ์",
        challenge:
          "How might we build a predictive PM2.5 alert and response system that triggers preemptive protective actions for schools and children — before dangerous exposure occurs?",
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

export default function ChallengePage() {
  const router = useRouter();
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 50%, #010D18 100%)" }}
    >
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.6; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .star { animation: twinkle var(--dur) ease-in-out var(--delay) infinite; }
        .float-slow { animation: float 8s ease-in-out infinite; }
      `}</style>

      {/* Stars */}
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="star absolute rounded-full pointer-events-none"
          style={{
            left: `${(i * 17.3) % 100}%`,
            top: `${(i * 13.7) % 80}%`,
            width: `${(i % 3) + 1}px`,
            height: `${(i % 3) + 1}px`,
            background: i % 4 === 0 ? "#91C4E3" : "#ffffff",
            "--dur": `${2.5 + (i % 4)}s`,
            "--delay": `${(i * 0.3) % 5}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Ambient glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#91C4E3] opacity-[0.03] blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[300px] bg-[#A594BA] opacity-[0.03] blur-[150px] rounded-full pointer-events-none" />

      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ background: "rgba(1,1,8,0.8)" }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/hackathon")}
            className="flex items-center gap-2 text-sm transition-all duration-200 hover:gap-3"
            style={{ color: "#65ABFC", textShadow: "0 0 12px rgba(101,171,252,0.4)" }}
          >
            ← Back to Hackathon
          </button>
          <span className="text-xs text-gray-600 font-mono tracking-widest hidden md:block">CHALLENGE BRIEF 2026</span>
          <button
            onClick={() => router.push("/hackathon/register")}
            className="text-xs px-4 py-2 rounded-full border border-[#91C4E3]/30 text-[#91C4E3] hover:border-[#91C4E3]/60 hover:bg-[#91C4E3]/5 transition-all duration-200 font-[family-name:var(--font-mitr)]"
          >
            Register
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <p className="text-xs text-[#91C4E3]/50 tracking-[0.3em] uppercase mb-6 font-[family-name:var(--font-mitr)]">
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
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed mb-4">
            9 specific problems across 3 tracks. Pick one. Build something that matters.
          </p>
          <p className="text-sm text-gray-600 font-[family-name:var(--font-mitr)]">
            Preventive & Predictive Healthcare
          </p>

          {/* Track quick-nav */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {TRACKS.map((t) => (
              <a
                key={t.id}
                href={`#track-${t.id}`}
                className="text-xs px-4 py-2 rounded-full border transition-all duration-200 font-[family-name:var(--font-mitr)]"
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
                      style={{ color: `${track.color}20` }}
                    >
                      {track.num}
                    </span>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Icon className="w-5 h-5" style={{ color: track.color }} strokeWidth={1.5} />
                        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: track.color }}>
                          {track.title}
                        </h2>
                      </div>
                      <p className="text-sm text-gray-500 font-[family-name:var(--font-mitr)]">{track.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Problem Cards */}
                <div className="space-y-3">
                  {track.problems.map((p) => {
                    const key = `${track.id}-${p.num}`;
                    const isOpen = expandedProblem === key;
                    return (
                      <div
                        key={p.num}
                        className="rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden"
                        style={{
                          borderColor: isOpen ? track.colorBorder : "rgba(255,255,255,0.06)",
                          background: isOpen ? track.colorMuted : "rgba(13,18,25,0.6)",
                          boxShadow: isOpen ? `0 0 40px ${track.color}10` : "none",
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
                              className="text-lg md:text-xl font-bold truncate"
                              style={{ color: isOpen ? track.color : "rgba(255,255,255,0.8)" }}
                            >
                              {p.title}
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
                          className="overflow-hidden transition-all duration-500 ease-out"
                          style={{ maxHeight: isOpen ? "400px" : "0px" }}
                        >
                          <div className="px-6 md:px-8 pb-8 space-y-6">
                            {/* Divider */}
                            <div className="h-px" style={{ background: `${track.color}20` }} />

                            {/* Data hook */}
                            <div
                              className="rounded-xl p-5 border-l-2"
                              style={{
                                borderColor: track.color,
                                background: `${track.color}08`,
                              }}
                            >
                              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-mitr)]">Context</p>
                              <p className="text-gray-300 text-sm leading-relaxed font-[family-name:var(--font-mitr)]">{p.hook}</p>
                            </div>

                            {/* Challenge Statement */}
                            <div>
                              <p className="text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-mitr)]" style={{ color: `${track.color}70` }}>
                                The Challenge
                              </p>
                              <p className="text-white/90 text-base leading-relaxed font-semibold">{p.challenge}</p>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              {p.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-3 py-1 rounded-full font-[family-name:var(--font-mitr)]"
                                  style={{
                                    background: `${track.color}10`,
                                    border: `1px solid ${track.color}20`,
                                    color: `${track.color}80`,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
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

      {/* Judging Criteria */}
      <section className="py-20 relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs text-[#91C4E3]/50 tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-mitr)]">How you'll be scored</p>
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
            <p className="text-xs text-[#91C4E3]/50 tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-mitr)]">What you can win</p>
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
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-[family-name:var(--font-mitr)]">{prize.label}</p>
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
                  <p className="text-xs text-gray-500 leading-relaxed font-[family-name:var(--font-mitr)]">{award.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-gray-600 font-[family-name:var(--font-mitr)]">
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
              background: "linear-gradient(135deg, #91C4E3 0%, #A594BA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Ready to solve something real?
          </h2>
          <p className="text-gray-400 mb-10 text-lg font-[family-name:var(--font-mitr)]">
            เลือก 1 ปัญหา แล้วมาสร้างสิ่งที่เปลี่ยนแปลงวงการสุขภาพไปด้วยกัน
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/hackathon/register")}
              className="px-10 py-4 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 font-[family-name:var(--font-mitr)]"
              style={{
                background: "linear-gradient(135deg, rgba(145,196,227,0.15), rgba(165,148,186,0.15))",
                border: "1px solid rgba(145,196,227,0.4)",
                color: "#91C4E3",
                boxShadow: "0 0 30px rgba(145,196,227,0.15)",
              }}
            >
              Register Now
            </button>
            <button
              onClick={() => router.push("/hackathon/team")}
              className="px-10 py-4 rounded-full text-sm font-semibold text-gray-400 hover:text-white transition-all duration-300 border border-white/10 hover:border-white/20 font-[family-name:var(--font-mitr)]"
            >
              View Your Team
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm font-[family-name:var(--font-mitr)]">
            The Next Decade Hackathon 2026 · Preventive & Predictive Healthcare
          </p>
        </div>
      </footer>
    </div>
  );
}
