"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitFork,
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
      {/* Blur orbs — PassionSeed signature */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/10 rounded-full blur-[128px]" />
      </div>
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
    </>
  );
}

// ─── Slide 1: One-Sentence Pitch ────────────────────────────────────────────

function SlideOne() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative px-8">
      <SlideBackground />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <Image
            src="/passionseed-logo.svg"
            alt="PassionSeed Logo"
            width={48}
            height={48}
            className="brightness-0 invert drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          />
        </motion.div>

        {/* Problem headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-sm tracking-[0.3em] uppercase text-gray-500 mb-10 font-mono"
        >
          Students choose their future before they try it.
        </motion.p>

        {/* Hero text */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          style={{ fontFamily: "League Gothic" }}
          className="text-[5rem] md:text-[6rem] lg:text-[7rem] leading-[0.9] uppercase tracking-wider mb-10"
        >
          <span className="text-white">Try Before You</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Commit.
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          A 5-day career exploration platform that helps students test real
          paths before choosing university.
        </motion.p>

        {/* Forked icon + bottom tagline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col items-center gap-5"
        >
          <GitFork className="w-10 h-10 text-purple-400/60 rotate-180" />
          <p className="text-sm font-mono tracking-widest uppercase">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Reducing costly wrong education decisions.
            </span>
          </p>
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
    title: "School Licensing",
    points: ["Annual license per cohort", "Scalable, predictable revenue"],
    challenge: "Long sales cycles",
    highlighted: true,
  },
  {
    rank: 2,
    icon: Users,
    title: "Parent-Paid Sprint",
    points: ["$ per 5-day exploration", "Fast validation"],
    challenge: "Building trust early",
    highlighted: false,
  },
  {
    rank: 3,
    icon: BarChart3,
    title: "Counselor Dashboard",
    points: ["Subscription analytics", "Recurring SaaS"],
    challenge: "Proving measurable advantage",
    highlighted: false,
  },
];

function SlideTwo() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-12 py-16 relative">
      <SlideBackground />

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2
            style={{ fontFamily: "League Gothic" }}
            className="text-5xl md:text-6xl uppercase tracking-wider mb-3"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Revenue Models
            </span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-600 mx-auto mb-4 rounded-full" />
          <p className="text-gray-500 font-mono text-sm tracking-wider uppercase">
            Ranked by scalability &amp; predictability
          </p>
        </motion.div>

        {/* 3 Columns */}
        <div className="grid grid-cols-3 gap-6 items-stretch">
          {REVENUE_MODELS.map((model, i) => {
            const Icon = model.icon;
            return (
              <motion.div
                key={model.rank}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
                className={`relative rounded-xl border p-8 flex flex-col backdrop-blur-sm ${
                  model.highlighted
                    ? "border-purple-500/40 bg-purple-600/[0.08] scale-105 shadow-[0_0_40px_rgba(168,85,247,0.1)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {/* Rank badge */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-6 ${
                    model.highlighted
                      ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                      : "bg-white/10 text-gray-400"
                  }`}
                  style={{ fontFamily: "League Gothic" }}
                >
                  {model.rank}
                </div>

                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl border shadow-xl flex items-center justify-center mb-4 ${
                    model.highlighted
                      ? "bg-purple-600/10 border-purple-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      model.highlighted ? "text-purple-400" : "text-gray-500"
                    }`}
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-4">
                  {model.title}
                </h3>

                {/* Points */}
                <ul className="space-y-2 mb-auto">
                  {model.points.map((point, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-gray-400 text-sm"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          model.highlighted ? "bg-purple-400" : "bg-gray-600"
                        }`}
                      />
                      {point}
                    </li>
                  ))}
                </ul>

                {/* Challenge */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-orange-400" />
                    <span className="text-xs font-mono tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                      Challenge
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{model.challenge}</p>
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

const LANE_ICON_CLASS: Record<string, string> = {
  purple: "text-purple-400",
  blue: "text-blue-400",
  pink: "text-pink-400",
};

const SWIMLANES = [
  {
    label: "School",
    icon: School,
    color: "purple",
    steps: [
      { text: "Pilot", hard: false },
      { text: "Measure clarity improvement", hard: true },
      { text: "Convert to paid contract", hard: false },
      { text: "Expand", hard: false },
    ],
  },
  {
    label: "Parents",
    icon: Users,
    color: "blue",
    steps: [
      { text: "Beta cohort", hard: false },
      { text: "Testimonials", hard: true },
      { text: "Paid launch", hard: false },
      { text: "Repeat cohorts", hard: false },
    ],
  },
  {
    label: "Counselor",
    icon: BarChart3,
    color: "pink",
    steps: [
      { text: "Aggregate data", hard: false },
      { text: "Build report", hard: false },
      { text: "Pilot", hard: true },
      { text: "Subscription", hard: false },
    ],
  },
];

function SlideThree() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-12 py-16 relative">
      <SlideBackground />

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2
            style={{ fontFamily: "League Gothic" }}
            className="text-5xl md:text-6xl uppercase tracking-wider mb-3"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Steps to Revenue
            </span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-600 mx-auto mb-4 rounded-full" />
          <p className="text-gray-500 font-mono text-sm tracking-wider uppercase">
            Three parallel paths to monetization
          </p>
        </motion.div>

        {/* Swimlanes */}
        <div className="space-y-6">
          {SWIMLANES.map((lane, laneIdx) => {
            const LaneIcon = lane.icon;
            return (
              <motion.div
                key={lane.label}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + laneIdx * 0.2, duration: 0.5 }}
                className="flex items-center gap-4"
              >
                {/* Lane label */}
                <div className="w-36 flex-shrink-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <LaneIcon
                      className={`w-4 h-4 ${LANE_ICON_CLASS[lane.color]}`}
                    />
                  </div>
                  <span className="text-white font-bold text-sm uppercase tracking-wider">
                    {lane.label}
                  </span>
                </div>

                {/* Steps */}
                <div className="flex-1 flex items-center gap-2">
                  {lane.steps.map((step, stepIdx) => (
                    <Fragment key={stepIdx}>
                      {stepIdx > 0 && (
                        <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      )}
                      <div
                        className={`relative flex-1 px-4 py-3 rounded-xl text-center text-sm border backdrop-blur-sm transition-colors ${
                          step.hard
                            ? "border-orange-500/30 bg-orange-500/[0.06] text-orange-300"
                            : "border-white/10 bg-white/5 text-gray-400"
                        }`}
                      >
                        {step.text}
                        {step.hard && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3 text-orange-400" />
                          </div>
                        )}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-10 flex items-center gap-2 justify-center text-xs text-gray-600 font-mono"
        >
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          <span>= Hardest step (key risk)</span>
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
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
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
    [currentSlide, totalSlides]
  );

  const nextSlide = useCallback(
    () => goToSlide(currentSlide + 1),
    [currentSlide, goToSlide]
  );
  const prevSlide = useCallback(
    () => goToSlide(currentSlide - 1),
    [currentSlide, goToSlide]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === " "
      ) {
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
      <div className="absolute top-6 right-8 z-20 font-mono text-xs text-gray-600">
        {currentSlide + 1} / {totalSlides}
      </div>
    </div>
  );
}
