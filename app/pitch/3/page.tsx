"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  AlertTriangle,
  School,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";

// ─── Animation Variants ─────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.3 },
};

// ─── Shared Background ──────────────────────────────────────────────────────

function SlideBackground() {
  return (
    <>
      {/* Base Background Gradient */}
      <div className="absolute inset-0 bg-[#060606]" />

      {/* Noise Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Dynamic Blur Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -40, 0],
            y: [0, 60, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-pink-500/10 rounded-full blur-[160px]"
        />
      </div>

      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%) pointer-events-none" />
    </>
  );
}

// ─── Slide 1: One-Sentence Pitch ────────────────────────────────────────────

function SlideOne() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative px-8">
      <SlideBackground />

      <div className="relative z-10 text-center max-w-6xl mx-auto">
        {/* Logo with Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-12 relative"
        >
          <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full scale-150" />
          <Image
            src="/passionseed-logo.svg"
            alt="PassionSeed Logo"
            width={72}
            height={72}
            className="relative z-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          />
        </motion.div>

        {/* Headline — High Contrast Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-8 overflow-hidden font-heading"
        >
          <span className="block text-[2.5rem] md:text-[4rem] lg:text-[4.5rem] leading-[1.1] font-bold tracking-tight text-white/90">
            Students are{" "}
            <span className="text-white underline decoration-purple-500/50 underline-offset-8">
              Forced
            </span>{" "}
            to Choose
          </span>
          <span className="block text-[2.5rem] md:text-[4rem] lg:text-[4.5rem] leading-[1.1] font-bold tracking-tight">
            a Future{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500">
              Before They&apos;ve Tested It.
            </span>
          </span>
        </motion.h1>

        {/* Subhead — Refined & Readable */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="text-xl md:text-2xl text-gray-400 max-w-4xl mx-auto leading-relaxed mb-14 font-light italic"
        >
          PassionSeed is a{" "}
          <span className="text-gray-200 font-medium">
            5-day structured exploration platform
          </span>{" "}
          that lets students test real paths — generating an evidence-backed
          direction report.
        </motion.p>

        {/* Market Stat Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="inline-flex items-center gap-4 bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl px-8 py-5 group hover:border-purple-500/40 transition-colors duration-500"
        >
          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
            <ArrowRight className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-left max-w-md">
            <span className="block text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 font-heading">
              4.3 MILLION
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-[0.2em] leading-none font-medium">
              Thai secondary students lack structured career guidance.
            </span>
          </p>
        </motion.div>

        {/* Scroll Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">
            Explore the Vision
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-8 bg-gradient-to-b from-purple-500/50 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Slide 2: Revenue Models ────────────────────────────────────────────────

const REVENUE_MODELS = [
  {
    rank: 1,
    icon: School,
    title: "B2B School Licensing",
    description: "Annual recurring revenue from institutional partnerships.",
    points: [
      "~2,600 upper-secondary schools in Thailand",
      "Public + private + international segmentation",
    ],
    challenge: "Long procurement cycles",
    highlighted: true,
    color: "from-purple-500 to-indigo-600",
  },
  {
    rank: 2,
    icon: Users,
    title: "Parent-Paid Sprint",
    description: "Direct-to-consumer 5-day intensive exploration kits.",
    points: [
      "~2M upper-secondary decision-makers",
      "Willingness to spend on value-backed guidance",
    ],
    challenge: "Building trust early",
    highlighted: false,
    color: "from-blue-500 to-cyan-600",
  },
  {
    rank: 3,
    icon: BarChart3,
    title: "Counselor Dashboard",
    description: "SaaS tool for advisors to track student progress at scale.",
    points: [
      "High counselor workload with limited tools",
      "Actionable data from student exploration",
    ],
    challenge: "Proving measurable advantage",
    highlighted: false,
    color: "from-pink-500 to-rose-600",
  },
];

function SlideTwo() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-start md:justify-center px-4 py-8 md:px-16 md:py-16 relative overflow-y-auto">
      <SlideBackground />

      <div className="relative z-10 w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-2 md:mb-4 leading-tight font-heading">
            <span className="text-white/20">Our </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Revenue Models
            </span>
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-white/10" />
            <p className="text-gray-500 font-mono text-xs tracking-[0.3em] uppercase">
              Scalability & Predictability
            </p>
            <div className="h-px w-12 bg-white/10" />
          </div>
        </motion.div>

        {/* 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-stretch">
          {REVENUE_MODELS.map((model, i) => {
            const Icon = model.icon;
            return (
              <motion.div
                key={model.rank}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2 + i * 0.15,
                  duration: 0.8,
                  ease: "easeOut",
                }}
                whileHover={{ y: -10 }}
                className={`group relative rounded-3xl border p-5 md:p-10 flex flex-col transition-all duration-500 backdrop-blur-xl ${
                  model.highlighted
                    ? "border-purple-500/30 bg-purple-500/[0.04] shadow-[0_20px_60px_-15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                }`}
              >
                {/* Ranking */}
                <span className="absolute top-5 right-5 md:top-10 md:right-10 font-mono text-5xl md:text-8xl text-white/[0.03] leading-none pointer-events-none select-none italic font-black">
                  0{model.rank}
                </span>

                {/* Icon Container */}
                <div
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-8 bg-gradient-to-br ${model.color} shadow-lg shadow-purple-500/10`}
                >
                  <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3 group-hover:text-purple-400 transition-colors">
                  {model.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 md:mb-8 leading-relaxed">
                  {model.description}
                </p>

                {/* Metrics/Points */}
                <div className="space-y-3 md:space-y-4 mb-4 md:mb-10">
                  {model.points.map((point, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-3 text-sm text-gray-300"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gradient-to-r ${model.color}`}
                      />
                      {point}
                    </div>
                  ))}
                </div>

                {/* Challenge Footer */}
                <div className="mt-auto pt-4 md:pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-orange-400/80">
                      Primary Challenge
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm italic">
                    {model.challenge}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 3: Steps to Revenue ──────────────────────────────────────────────

const REVENUE_PATHS = [
  {
    icon: School,
    title: "Step 1: Pilot Phase",
    label: "Institutional validation",
    color: "from-purple-500 to-indigo-600",
    steps: [
      { text: "Onboard 5-10 Private Thai High Schools", hard: false },
      { text: "Measure 'Clarity Score' increase per student", hard: true },
      { text: "Generate case studies for government outreach", hard: false },
    ],
  },
  {
    icon: Users,
    title: "Step 2: D2C Scale",
    label: "Growth & Viral Loop",
    color: "from-blue-500 to-cyan-600",
    steps: [
      { text: "Social-first student community & challenges", hard: false },
      { text: "Influencer-led 5-day exploration sprints", hard: false },
      { text: "Automated upsell to family strategy sessions", hard: false },
    ],
  },
  {
    icon: BarChart3,
    title: "Step 3: Ecosystem",
    label: "Market Saturation",
    color: "from-pink-500 to-rose-600",
    steps: [
      { text: "Open API for university recruiters", hard: true },
      { text: "Counselor-certified dashboard rollout", hard: false },
      { text: "National-level policy integration", hard: false },
    ],
  },
];

function SlideThree() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-start md:justify-center px-4 py-8 md:px-16 md:py-16 relative overflow-y-auto">
      <SlideBackground />

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight text-white mb-2 font-heading">
            The Path to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Revenue
            </span>
          </h2>
          <p className="text-gray-500 font-mono text-xs md:text-sm tracking-[0.4em] uppercase">
            Execution Roadmap 2026
          </p>
        </motion.div>

        {/* Timeline Flow */}
        <div className="flex flex-col md:flex-row gap-4 relative">
          {REVENUE_PATHS.map((path, idx) => {
            const StepIcon = path.icon;
            return (
              <motion.div
                key={path.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.2, duration: 0.8 }}
                className="flex-1 flex flex-col group"
              >
                {/* Visual Step Marker & Header */}
                <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
                  <div className="relative">
                    <div
                      className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-2xl relative z-10 group-hover:border-purple-500/50 transition-colors`}
                    >
                      <div
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${path.color} opacity-10 blur-xl group-hover:opacity-30 transition-opacity`}
                      />
                      <StepIcon className="w-5 h-5 md:w-6 md:h-6 text-white relative z-10" />
                    </div>
                    {/* Connector line to next phase */}
                    {idx < REVENUE_PATHS.length - 1 && (
                      <div className="absolute top-1/2 left-full w-full h-[2px] bg-gradient-to-r from-white/10 to-transparent -translate-y-1/2 hidden md:block z-0" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 block">
                      {path.label}
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white font-heading">
                      {path.title}
                    </h3>
                  </div>
                </div>

                {/* Steps Flow Vertical */}
                <div className="space-y-3 md:space-y-6 relative pl-7">
                  {/* Vertical connector line */}
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />

                  {path.steps.map((step, sIdx) => (
                    <motion.div
                      key={sIdx}
                      className="relative flex gap-4 items-center group/step"
                      whileHover={{ x: 5 }}
                    >
                      {/* Interaction Dot */}
                      <div
                        className={`absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a] z-10 transition-colors ${
                          step.hard
                            ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                            : "bg-white/40 group-hover/step:bg-purple-500"
                        }`}
                      />

                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 md:p-4 flex-1 backdrop-blur-sm group-hover/step:bg-white/[0.06] group-hover/step:border-white/10 transition-all">
                        <p
                          className={`text-xs md:text-sm leading-tight ${step.hard ? "text-orange-200/90 font-medium" : "text-gray-300 font-light"}`}
                        >
                          {step.text}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 md:mt-16 flex items-center justify-center gap-4 md:gap-8 text-[10px] font-mono text-gray-600 uppercase tracking-[0.3em]"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
            <span>High Complexity Milestone</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span>Thailand Expansion Protocol</span>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Dot Navigation ─────────────────────────────────────────────────────────

function DotNavigation({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`transition-all duration-300 rounded-full ${
            i === current
              ? "w-8 h-2 bg-gradient-to-r from-purple-400 to-pink-600"
              : "w-2 h-2 bg-white/20 hover:bg-white/40"
          }`}
          aria-label={`Go to slide ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

const SLIDES = [
  <SlideOne key="s1" />,
  <SlideTwo key="s2" />,
  <SlideThree key="s3" />,
];

export default function PitchDeck3Page() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const totalSlides = SLIDES.length;

  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentSlide || index < 0 || index >= totalSlides) return;
      setDirection(index > currentSlide ? 1 : -1);
      setCurrentSlide(index);
    },
    [currentSlide, totalSlides],
  );

  const nextSlide = useCallback(
    () => goToSlide(currentSlide + 1),
    [currentSlide, goToSlide],
  );
  const prevSlide = useCallback(
    () => goToSlide(currentSlide - 1),
    [currentSlide, goToSlide],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      delta > 0 ? nextSlide() : prevSlide();
    }
    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white font-sans antialiased overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Persistent Brand Header */}
      <div className="absolute top-4 left-4 md:top-8 md:left-10 z-[110] flex items-center gap-3 md:gap-4 pointer-events-none">
        <Image
          src="/passionseed-logo.svg"
          alt="PS"
          width={24}
          height={24}
          className="opacity-50"
        />
        <div className="h-4 w-px bg-white/10" />
        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em]">
          Pitch Deck v3.0
        </span>
      </div>

      {/* Slide content */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0"
          >
            {SLIDES[currentSlide]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow nav — left */}
      {currentSlide > 0 && (
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Arrow nav — right */}
      {currentSlide < totalSlides - 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Dot navigation */}
      <DotNavigation
        total={totalSlides}
        current={currentSlide}
        onSelect={goToSlide}
      />

      {/* Slide counter */}
      <div className="absolute top-4 right-4 md:top-6 md:right-8 z-20 font-mono text-xs text-gray-600">
        {currentSlide + 1} / {totalSlides}
      </div>
    </div>
  );
}
