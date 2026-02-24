"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface TimelineItem {
  num: string;
  title: string;
  desc: string;
  date: string;
}

const ITEMS: TimelineItem[] = [
  {
    num: "01",
    title: "Registration",
    desc: "Sign up your team and prepare for the journey ahead.",
    date: "23 Feb – 5 Apr",
  },
  {
    num: "02",
    title: "Opening Ceremony",
    desc: "Kickoff event to introduce the challenge and inspire participants.",
    date: "7 Apr",
  },
  {
    num: "03",
    title: "Workshops & Hacking",
    desc: "Learn, build, and develop your preventive healthcare solution.",
    date: "7 Apr – 28 May",
  },
  {
    num: "04",
    title: "1st Submission",
    desc: "Submit your prototype and presentation slides.",
    date: "29 May",
  },
  {
    num: "05",
    title: "2nd Submission",
    desc: "Submit your project video presentation.",
    date: "6 Jun",
  },
  {
    num: "06",
    title: "Final Pitch",
    desc: "Present your solution to judges and showcase your work.",
    date: "20 Jun",
  },
  {
    num: "07",
    title: "Futurist Fest 2026",
    desc: "Connect with researchers, experts, and investors to grow your ideas.",
    date: "21 Jun",
  },
];

const ANGLE_STEP = 30;
const SCROLL_PER_ITEM = 300;

interface CircleCfg {
  R: number;
  /** Circle center as % of viewport width */
  centerPct: number;
  numSize: number;
}

function buildCfg(vw: number): CircleCfg {
  if (vw < 640) {
    // Mobile: scale the circle so its left edge (active point) sits ~10% from left
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
  // Item 0 at 180° (active/left), others spread clockwise below.
  return 180 - index * ANGLE_STEP;
}

function circlePos(angleDeg: number, R: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: R + R * Math.cos(rad), y: R + R * Math.sin(rad) };
}

function toStablePx(value: number): string {
  return `${Number(value.toFixed(6))}px`;
}

function itemOpacity(distance: number): number {
  if (distance === 0) return 1;
  if (distance === 1) return 0.55;
  if (distance === 2) return 0.22;
  return 0;
}

export default function HackathonTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const itemDivsRef = useRef<(HTMLDivElement | null)[]>([]);
  const numSpansRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Use a fixed SSR-safe default (1440) so server and client initial render match.
  // useEffect corrects to the real viewport width after hydration.
  const [cfg, setCfg] = useState<CircleCfg>(() => buildCfg(1440));

  // Correct cfg to real viewport width after mount, and keep in sync on resize
  useEffect(() => {
    setCfg(buildCfg(window.innerWidth));
    const onResize = () => setCfg(buildCfg(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll-driven animation
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const totalScroll = (ITEMS.length - 1) * SCROLL_PER_ITEM;

    itemDivsRef.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { scale: i === 0 ? 1 : 0.5, opacity: itemOpacity(i), rotation: 0 });
    });
    numSpansRef.current.forEach((span, i) => {
      if (!span) return;
      gsap.set(span, { color: i === 0 ? "#e8f4fd" : "rgba(145,196,227,0.28)" });
    });

    const handleScroll = () => {
      const scrolled = Math.max(0, -section.getBoundingClientRect().top);
      const progress = Math.min(1, scrolled / totalScroll);
      const rot = progress * (ITEMS.length - 1) * ANGLE_STEP;
      const newActive = Math.round(progress * (ITEMS.length - 1));

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
          color: i === newActive ? "#e8f4fd" : "rgba(145,196,227,0.28)",
          duration: 0.35,
          overwrite: true,
        });
      });

      setActiveIndex(newActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const active = ITEMS[activeIndex];
  const { R, centerPct, numSize } = cfg;

  // Derived positions (all relative to viewport left via calc)
  const circleLEdge = `calc(${centerPct}% - ${R}px)`;   // left edge of circle = active point x
  const dotLeft = `calc(${centerPct}% - ${R - numSize - 20}px)`;   // dot positioned right of number
  const contentLeft = `calc(${centerPct}% - ${R - numSize - 50}px)`;  // content starts after dot
  // Max width: from content start to right viewport edge minus padding
  const contentMaxW = `calc(100% - (${centerPct}% - ${R - numSize - 50}px) - 20px)`;

  return (
    <section
      ref={sectionRef}
      style={{ height: `calc(100vh + ${(ITEMS.length - 1) * SCROLL_PER_ITEM}px)` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[#03050a]" />

        {/* Ambient glow at active point */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: dotLeft,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: Math.min(R * 0.7, 320),
            height: Math.min(R * 0.7, 320),
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(101,171,252,0.09) 0%, transparent 68%)",
          }}
        />

        {/* Section title */}
        <div className="absolute top-12 left-0 right-0 text-center z-10">
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ textShadow: "0 0 30px rgba(145,196,227,0.3)" }}
          >
            <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
              Event Timeline
            </span>
          </h2>
        </div>

        {/* ── Rotating circle ── */}
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
          {ITEMS.map((item, i) => {
            const { x, y } = circlePos(initialAngle(i), R);
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: toStablePx(x),
                  top: toStablePx(y),
                  transform: "translate(-50%, -50%)",
                }}
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
                      color: i === 0 ? "#e8f4fd" : "rgba(145,196,227,0.28)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.num}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dot at active position */}
        <div
          className="absolute z-20"
          style={{
            left: dotLeft,
            top: "50%",
            transform: "translateY(-50%)",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#91C4E3",
            boxShadow: "0 0 10px rgba(145,196,227,0.95), 0 0 22px rgba(145,196,227,0.45)",
          }}
        />

        {/* Content panel */}
        <div
          className="absolute z-10"
          style={{ left: contentLeft, top: "50%", transform: "translateY(-50%)" }}
        >
          <div key={activeIndex} style={{ animation: "tlFadeIn 0.38s ease forwards" }}>
            <p
              style={{
                color: "#65ABFC",
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 10,
                fontWeight: 600,
              }}
            >
              {active.date}
            </p>
            <h3
              style={{
                fontSize: R > 350 ? "26px" : "20px",
                fontWeight: 700,
                color: "#e8f4fd",
                marginBottom: 10,
                lineHeight: 1.25,
                maxWidth: contentMaxW,
              }}
            >
              {active.title}
            </h3>
            <p
              style={{
                color: "rgba(145,196,227,0.62)",
                fontSize: R > 350 ? "14px" : "13px",
                lineHeight: 1.72,
                maxWidth: contentMaxW,
              }}
            >
              {active.desc}
            </p>
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
  );
}
