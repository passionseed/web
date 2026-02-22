"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface TimelineItem {
  num: string;
  title: string;
  desc: string;
  phase: string;
}

const JOURNEY_STEPS: TimelineItem[] = [
  {
    num: "01",
    title: "เข้าร่วมโครงการ",
    desc: "ลงทะเบียนและพบกับทีม Mentor, Tester และเพื่อนร่วมทาง",
    phase: "เริ่มต้น",
  },
  {
    num: "02",
    title: "ค้นพบปัญหา",
    desc: "เรียนรู้การมองหาปัญหาในสังคมและโอกาสในการสร้าง Impact",
    phase: "Discovery",
  },
  {
    num: "03",
    title: "เรียนรู้และวางแผน",
    desc: "ทำความเข้าใจ Startup fundamentals ผ่าน Learning Guidelines",
    phase: "Learning",
  },
  {
    num: "04",
    title: "สร้าง Prototype",
    desc: "พัฒนาแนวคิดเป็นรูปธรรม พร้อมคำแนะนำจาก Mentor",
    phase: "Building",
  },
  {
    num: "05",
    title: "ทดสอบและปรับปรุง",
    desc: "รับ Feedback จาก Tester และพัฒนาต่อยอด",
    phase: "Testing",
  },
  {
    num: "06",
    title: "นำเสนอผลงาน",
    desc: "แบ่งปันแนวคิดและผลงานกับชุมชนและผู้เชี่ยวชาญ",
    phase: "Pitching",
  },
  {
    num: "07",
    title: "สร้าง Impact",
    desc: "เชื่อมต่อกับ ecosystem และพัฒนาต่อในโลกจริง",
    phase: "Impact",
  },
];

const ANGLE_STEP = 30;
const SCROLL_PER_ITEM = 300;

interface CircleCfg {
  R: number;
  centerPct: number;
  numSize: number;
}

function buildCfg(vw: number): CircleCfg {
  if (vw < 640) {
    const R = Math.min(Math.round(vw * 0.55), 230);
    return { R, centerPct: 72, numSize: 40 };
  }
  if (vw < 1024) {
    const R = Math.min(Math.round(vw * 0.50), 400);
    return { R, centerPct: 62, numSize: 56 };
  }
  return { R: 480, centerPct: 55, numSize: 72 };
}

function initialAngle(index: number): number {
  return 180 - index * ANGLE_STEP;
}

function circlePos(angleDeg: number, R: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: R + R * Math.cos(rad), y: R + R * Math.sin(rad) };
}

function itemOpacity(distance: number): number {
  if (distance === 0) return 1;
  if (distance === 1) return 0.55;
  if (distance === 2) return 0.22;
  return 0;
}

// Color scheme for each step
function getStepColor(index: number): string {
  const colors = [
    "rgba(34, 211, 238, 0.9)",   // cyan - start
    "rgba(96, 165, 250, 0.9)",   // blue - discovery
    "rgba(147, 51, 234, 0.9)",   // purple - learning
    "rgba(236, 72, 153, 0.9)",   // pink - building
    "rgba(251, 146, 60, 0.9)",   // orange - testing
    "rgba(250, 204, 21, 0.9)",   // yellow - pitching
    "rgba(52, 211, 153, 0.9)",   // emerald - impact
  ];
  return colors[index] || colors[0];
}

export default function ImpactTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const itemDivsRef = useRef<(HTMLDivElement | null)[]>([]);
  const numSpansRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cfg, setCfg] = useState<CircleCfg>(() => buildCfg(1440));

  useEffect(() => {
    setCfg(buildCfg(window.innerWidth));
    const onResize = () => setCfg(buildCfg(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const totalScroll = (JOURNEY_STEPS.length - 1) * SCROLL_PER_ITEM;

    itemDivsRef.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { scale: i === 0 ? 1 : 0.5, opacity: itemOpacity(i), rotation: 0 });
    });
    numSpansRef.current.forEach((span, i) => {
      if (!span) return;
      gsap.set(span, { color: i === 0 ? getStepColor(0) : "rgba(145,196,227,0.28)" });
    });

    const handleScroll = () => {
      const scrolled = Math.max(0, -section.getBoundingClientRect().top);
      const progress = Math.min(1, scrolled / totalScroll);
      const rot = progress * (JOURNEY_STEPS.length - 1) * ANGLE_STEP;
      const newActive = Math.round(progress * (JOURNEY_STEPS.length - 1));

      gsap.to(circleRef.current, {
        rotation: rot,
        duration: 0.45,
        ease: "power2.out",
        overwrite: true,
      });

      itemDivsRef.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, {
          rotation: -rot,
          scale: i === newActive ? 1 : 0.5,
          opacity: itemOpacity(Math.abs(i - newActive)),
          duration: 0.45,
          ease: "power2.out",
          overwrite: true,
        });
      });

      numSpansRef.current.forEach((span, i) => {
        if (!span) return;
        gsap.to(span, {
          color: i === newActive ? getStepColor(newActive) : "rgba(145,196,227,0.28)",
          duration: 0.35,
          overwrite: true,
        });
      });

      setActiveIndex(newActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const active = JOURNEY_STEPS[activeIndex];
  const { R, centerPct, numSize } = cfg;

  const circleLEdge = `calc(${centerPct}% - ${R}px)`;
  const dotLeft = `calc(${centerPct}% - ${R - numSize - 20}px)`;
  const contentLeft = `calc(${centerPct}% - ${R - numSize - 50}px)`;
  const contentMaxW = `calc(100% - (${centerPct}% - ${R - numSize - 50}px) - 20px)`;

  return (
    <>
      {/* Font imports */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;700&display=swap');
      `}</style>

      <section
        ref={sectionRef}
        style={{ height: `calc(100vh + ${(JOURNEY_STEPS.length - 1) * SCROLL_PER_ITEM}px)` }}
        className="relative"
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0118] via-[#0d051a] to-[#03050a]" />

          {/* Ambient glow at active point - color changes with active step */}
          <div
            className="absolute pointer-events-none transition-all duration-700"
            style={{
              left: dotLeft,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: Math.min(R * 0.8, 380),
              height: Math.min(R * 0.8, 380),
              borderRadius: "50%",
              background: `radial-gradient(circle, ${getStepColor(activeIndex).replace('0.9', '0.15')} 0%, transparent 68%)`,
            }}
          />

          {/* Section title */}
          <div className="absolute top-12 left-0 right-0 text-center z-10">
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                เส้นทางสู่ Impact
              </span>
            </h2>
          </div>

          {/* Rotating circle */}
          <div
            ref={circleRef}
            className="absolute"
            style={{
              width: R * 2,
              height: R * 2,
              borderRadius: "50%",
              border: "1px solid rgba(145,196,227,0.09)",
              left: circleLEdge,
              top: "50%",
              marginTop: -R,
              transformOrigin: "center center",
            }}
          >
            {JOURNEY_STEPS.map((item, i) => {
              const { x, y } = circlePos(initialAngle(i), R);
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{ left: `${x}px`, top: `${y}px`, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    ref={(el) => { itemDivsRef.current[i] = el; }}
                    style={{ display: "inline-block", transformOrigin: "center center" }}
                  >
                    <span
                      ref={(el) => { numSpansRef.current[i] = el; }}
                      style={{
                        fontSize: numSize,
                        fontWeight: 700,
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                        display: "block",
                        userSelect: "none",
                        color: i === 0 ? getStepColor(0) : "rgba(145,196,227,0.28)",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "'Sora', sans-serif",
                        textShadow: i === activeIndex ? `0 0 20px ${getStepColor(i)}` : "none",
                        transition: "text-shadow 0.3s ease",
                      }}
                    >
                      {item.num}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dot at active position - color changes */}
          <div
            className="absolute z-20 transition-all duration-500"
            style={{
              left: dotLeft,
              top: "50%",
              transform: "translateY(-50%)",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: getStepColor(activeIndex),
              boxShadow: `0 0 15px ${getStepColor(activeIndex)}, 0 0 30px ${getStepColor(activeIndex).replace('0.9', '0.5')}`,
            }}
          />

          {/* Content panel */}
          <div
            className="absolute z-10"
            style={{ left: contentLeft, top: "50%", transform: "translateY(-50%)" }}
          >
            <div key={activeIndex} style={{ animation: "tlFadeIn 0.38s ease forwards" }}>
              <p
                className="transition-colors duration-500"
                style={{
                  color: getStepColor(activeIndex),
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {active.phase}
              </p>
              <h3
                style={{
                  fontSize: R > 350 ? "28px" : "22px",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: 12,
                  lineHeight: 1.25,
                  maxWidth: contentMaxW,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {active.title}
              </h3>
              <p
                style={{
                  color: "rgba(200,200,200,0.75)",
                  fontSize: R > 350 ? "15px" : "14px",
                  lineHeight: 1.72,
                  maxWidth: contentMaxW,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {active.desc}
              </p>
            </div>
          </div>

          {/* Progress pips */}
          <div className="absolute bottom-8 z-10" style={{ left: contentLeft }}>
            <div className="flex gap-2">
              {JOURNEY_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="transition-all duration-500"
                  style={{
                    width: i === activeIndex ? 24 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === activeIndex ? getStepColor(activeIndex) : "rgba(145,196,227,0.25)",
                    boxShadow: i === activeIndex ? `0 0 10px ${getStepColor(activeIndex).replace('0.9', '0.6')}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <style>{`
            @keyframes tlFadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      </section>
    </>
  );
}
