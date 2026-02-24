"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Trophy,
  ArrowRight,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

// The official Passion Seed logo path used as the base for our bioluminescent icons
const PASSION_SEED_PATH =
  "M426.4,938.59c-175.03-33.51-352.32-186.42-372.71-390.62C27.97,290.51,260.87,43.63,524.5,54.45c193.88,7.96,375,154.09,415.56,355.63,50.05,248.71-137.84,463.14-323.33,519.7-19.6,5.98-94.7,27.12-190.34,8.81Z";

const DiamondSeed = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1000 1000" className={className}>
    <defs>
      <radialGradient id="diamond-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="30%" stopColor="#f0abfc" stopOpacity="0.9" />
        <stop offset="70%" stopColor="#818cf8" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#3b0764" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="diamond-shine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#e879f9" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0.9" />
      </linearGradient>
      <filter id="diamond-blur">
        <feGaussianBlur stdDeviation="20" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="super-glow">
        <feGaussianBlur stdDeviation="60" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Deep background aura */}
    <circle
      cx="500"
      cy="500"
      r="350"
      fill="url(#diamond-glow)"
      filter="url(#super-glow)"
      className="origin-center animate-pulse"
      style={{ animationDuration: "3s" }}
    />

    {/* Rotating outer rings */}
    <g
      className="origin-center animate-spin"
      style={{ animationDuration: "25s" }}
    >
      <circle
        cx="500"
        cy="500"
        r="420"
        fill="none"
        stroke="url(#diamond-shine)"
        strokeWidth="6"
        strokeDasharray="10 40"
        opacity="0.6"
      />
      <circle
        cx="500"
        cy="500"
        r="460"
        fill="none"
        stroke="#c084fc"
        strokeWidth="3"
        strokeDasharray="4 20"
        opacity="0.4"
      />
    </g>
    <g
      className="origin-center animate-spin"
      style={{ animationDuration: "15s", animationDirection: "reverse" }}
    >
      <circle
        cx="500"
        cy="500"
        r="390"
        fill="none"
        stroke="#818cf8"
        strokeWidth="4"
        strokeDasharray="30 60"
        opacity="0.5"
      />
    </g>

    {/* Main Seed Path */}
    <path
      d={PASSION_SEED_PATH}
      fill="url(#diamond-glow)"
      filter="url(#diamond-blur)"
    />
    <g transform="scale(0.75) translate(160, 160)">
      <path
        d={PASSION_SEED_PATH}
        fill="none"
        stroke="url(#diamond-shine)"
        strokeWidth="25"
        filter="url(#diamond-blur)"
      />
    </g>

    {/* Inner Crystal/Diamond shapes */}
    <path
      d="M500 200 L680 500 L500 800 L320 500 Z"
      fill="url(#diamond-shine)"
      opacity="0.7"
      filter="url(#diamond-blur)"
    />
    <path d="M500 280 L600 500 L500 720 L400 500 Z" fill="#fff" opacity="0.9" />

    {/* Sparkles */}
    <g
      className="origin-center animate-pulse"
      style={{ animationDuration: "2s" }}
    >
      <circle
        cx="500"
        cy="500"
        r="50"
        fill="#fff"
        filter="url(#diamond-blur)"
      />
      <path
        d="M500 50 L530 470 L950 500 L530 530 L500 950 L470 530 L50 500 L470 470 Z"
        fill="#fff"
        opacity="0.8"
        filter="url(#diamond-blur)"
      />
    </g>
  </svg>
);

const PlatinumSeed = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1000 1000" className={className}>
    <defs>
      <radialGradient id="plat-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
      </radialGradient>
      <filter id="plat-blur">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path
      d={PASSION_SEED_PATH}
      fill="url(#plat-glow)"
      filter="url(#plat-blur)"
    />
    <g transform="scale(0.8) translate(120, 120)">
      <path
        d={PASSION_SEED_PATH}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="20"
        filter="url(#plat-blur)"
      />
    </g>
    <path
      d="M 500 200 L 500 800 M 350 350 L 350 650 M 650 350 L 650 650"
      stroke="#fff"
      strokeWidth="20"
      strokeDasharray="40 40"
      filter="url(#plat-blur)"
    />
  </svg>
);

const GoldSeed = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1000 1000" className={className}>
    <defs>
      <radialGradient id="gold-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#facc15" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
      </radialGradient>
      <filter id="gold-blur">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path
      d={PASSION_SEED_PATH}
      fill="url(#gold-glow)"
      filter="url(#gold-blur)"
    />
    <g transform="scale(0.85) translate(80, 80)">
      <path
        d={PASSION_SEED_PATH}
        fill="none"
        stroke="#facc15"
        strokeWidth="20"
        filter="url(#gold-blur)"
      />
    </g>
    <circle cx="400" cy="400" r="45" fill="#fff" filter="url(#gold-blur)" />
    <circle cx="600" cy="450" r="55" fill="#fff" filter="url(#gold-blur)" />
    <circle cx="500" cy="600" r="45" fill="#fff" filter="url(#gold-blur)" />
    <circle cx="450" cy="500" r="35" fill="#fff" filter="url(#gold-blur)" />
  </svg>
);

const SilverSeed = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1000 1000" className={className}>
    <defs>
      <radialGradient id="silver-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#9ca3af" stopOpacity="0" />
      </radialGradient>
      <filter id="silver-blur">
        <feGaussianBlur stdDeviation="20" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path
      d={PASSION_SEED_PATH}
      fill="url(#silver-glow)"
      filter="url(#silver-blur)"
    />
    <g transform="scale(0.75) translate(160, 160)">
      <path
        d={PASSION_SEED_PATH}
        fill="none"
        stroke="#d1d5db"
        strokeWidth="25"
        filter="url(#silver-blur)"
      />
    </g>
    <path
      d="M 500 300 L 500 700"
      stroke="#fff"
      strokeWidth="35"
      filter="url(#silver-blur)"
    />
  </svg>
);

const sponsorshipPackages = [
  {
    name: "Diamond",
    price: "100,000 Baht",
    gradient: "from-pink-200 via-purple-200 to-indigo-200",
    textGradient: "from-pink-400 via-purple-300 to-indigo-400",
    border: "border-purple-400/50",
    glow: "shadow-[0_0_60px_rgba(232,121,249,0.4)]",
    Icon: DiamondSeed,
    highlight: "Maximum Impact & Reach",
    isPremium: true,
    features: [
      'Primary placement as "Presented by _" across all leagues',
      "Full digital campaign + featured Brand Story video",
      "Access to Top 50 Teams' CVs & skill profiles",
      "Premium central booth at Futurist Fest + 6 VIP passes",
      "Exclusive Workshop Slot (Workshop 4 - June 9)",
      "Founding Partner Status on the PassionSeed platform",
      "Guest Judge for the Final Pitch (June 20)",
    ],
  },
  {
    name: "Platinum",
    price: "50,000 Baht",
    isPremium: false,
    gradient: "from-slate-100 via-blue-100 to-slate-200",
    textGradient: "from-blue-400 to-cyan-400",
    border: "border-blue-400/40",
    glow: "shadow-[0_0_30px_rgba(96,165,250,0.2)]",
    Icon: PlatinumSeed,
    features: [
      "Large logo placement on official merchandise (T-shirts / lanyards)",
      "2 dedicated social posts + 1 collaborative short video/Reel",
      "Access to Top 30 Teams' CVs & skill profiles",
      "Standard booth at Futurist Fest + 4 VIP passes + product sampling rights",
      'Sponsor 1 Track Award (e.g., "Best Tech for Health")',
      "Seat on the 2nd Round Judging Panel (June 6)",
    ],
  },
  {
    name: "Gold",
    price: "20,000 Baht",
    isPremium: false,
    gradient: "from-yellow-200 via-amber-300 to-orange-300",
    textGradient: "from-yellow-400 to-orange-400",
    border: "border-yellow-400/40",
    glow: "shadow-[0_0_30px_rgba(250,204,21,0.15)]",
    Icon: GoldSeed,
    features: [
      "Medium logo placement on all PR materials and event backdrops",
      "1 dedicated brand feature post",
      "Small booth at Futurist Fest + 2 VIP passes",
      'Logo placement on the digital "Self-Learning Map" dashboard',
    ],
  },
  {
    name: "Silver",
    price: "5,000 Baht",
    isPremium: false,
    gradient: "from-gray-100 via-gray-200 to-gray-300",
    textGradient: "from-gray-300 to-gray-400",
    border: "border-gray-400/30",
    glow: "shadow-[0_0_20px_rgba(156,163,175,0.1)]",
    Icon: SilverSeed,
    features: [
      "Logo placement on website and digital posters",
      "1 group thank-you social media post",
      "1 representative invitation to Futurist Fest (June 21)",
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

// Starfield component
const Starfield = () => {
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (starsRef.current && starsRef.current.children.length === 0) {
      const starCount = 40; // Reduced for performance
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement("div");
        star.className = "absolute rounded-full bg-white";
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.opacity = `${Math.random() * 0.7 + 0.3}`;
        star.style.animation = `twinkle ${Math.random() * 3 + 2}s infinite ease-in-out`;
        starsRef.current.appendChild(star);
      }
    }
  }, []);

  return (
    <>
      <div
        ref={starsRef}
        className="absolute inset-0 pointer-events-none z-0"
      />
      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

// Background floating particles component
const BackgroundParticles = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Generate particles only on client to avoid hydration mismatch
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 6 + 2,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 15 + 10,
      xOffset: Math.random() * 100 - 50,
      color: [
        "bg-purple-500",
        "bg-blue-500",
        "bg-fuchsia-500",
        "bg-indigo-500",
      ][Math.floor(Math.random() * 4)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color} blur-[2px] mix-blend-screen`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            bottom: "-10%",
          }}
          animate={{
            y: ["0vh", "-120vh"],
            x: [0, p.xOffset],
            opacity: [0, 0.8, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default function SponsorshipPage() {
  return (
    <div className="min-h-screen bg-[#0B0415] text-white overflow-hidden relative selection:bg-purple-500/30">
      {/* Bioluminescent Background Elements */}
      <Starfield />
      <BackgroundParticles />

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[60%] h-[20%] rounded-full bg-fuchsia-900/10 blur-[80px]" />

        {/* Subtle grid pattern for tech feel */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Trophy className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-200 tracking-wide uppercase">
              Partner With Us
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Empower the Next <br className="hidden md:block" />
            <span className="inline-block transform-gpu text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.3)]">
              Generation of Innovators
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
            Position your brand at the forefront of healthcare innovation and
            education. Connect with top-tier talent, showcase your commitment to
            preventive health, and make a lasting impact at The Next Decade
            Hackathon.
          </p>
        </motion.div>

        {/* Why Sponsor Us Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="mb-32 max-w-5xl mx-auto mt-12"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Sponsor The Next Decade Hackathon?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Move beyond passive marketing. Hackathon sponsorship creates
              active, memorable engagement with the next generation of tech
              leaders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Value Prop 1 */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30 relative z-10">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 relative z-10">
                Hyper-Targeted Reach
              </h3>
              <p className="text-gray-400 leading-relaxed relative z-10 text-sm">
                Connect directly with 500+ highly motivated high school and
                university students, designers, and early adopters. Unlike broad
                digital marketing, every impression here is a qualified,
                high-intent innovator actively looking for tools and
                opportunities to shape healthcare.
              </p>
            </div>

            {/* Value Prop 2 */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center mb-6 border border-fuchsia-500/30 relative z-10">
                <TrendingUp className="w-6 h-6 text-fuchsia-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 relative z-10">
                Learning, Adaptation & Resilience
              </h3>
              <p className="text-gray-400 leading-relaxed relative z-10 text-sm">
                Traditional marketing is ignored; hands-on tools are embraced.
                Put your APIs, platforms, and research directly into the hands
                of the next generation. They won't just see your brand—they will
                use it to build solutions that foster learning, adaptation, and
                resilience.
              </p>
            </div>

            {/* Value Prop 3 */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/30 relative z-10">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 relative z-10">
                Train a Capable Workforce
              </h3>
              <p className="text-gray-400 leading-relaxed relative z-10 text-sm">
                Support an inclusive environment where high school and
                university students learn to tackle real-world challenges. Watch
                them become a more capable, AI-ready workforce, demonstrating
                empathy, teamwork, and problem-solving skills in real-time.
              </p>
            </div>
          </div>
        </motion.div>

        {/* By the Numbers / Targets Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-32 max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
              <div className="inline-block transform-gpu text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 mb-2">
                500+
              </div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Hackers
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
              <div className="inline-block transform-gpu text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400 mb-2">
                48 Hrs
              </div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Of Innovation
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
              <div className="inline-block transform-gpu text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 mb-2">
                100+
              </div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Projects Built
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
              <div className="inline-block transform-gpu text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                50K+
              </div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Community Reach
              </div>
            </div>
          </div>
        </motion.div>

        {/* Urgency / Limited Availability Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="mb-20 max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-red-400 tracking-wide uppercase">
              Limited Availability
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Secure Your Sponsorship Early
          </h2>
          <p className="text-gray-400 text-lg">
            To ensure maximum visibility and ROI for our partners, we strictly
            limit the number of sponsors at each tier. Diamond and Platinum
            tiers are highly sought after and fill up quickly.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-start"
        >
          {sponsorshipPackages.map((pkg, index) => (
            <motion.div
              key={pkg.name}
              variants={itemVariants}
              className={`relative group rounded-3xl bg-white/[0.03] border ${pkg.isPremium ? "border-transparent" : "border-white/10"} backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:bg-white/[0.05] ${pkg.glow} ${pkg.isPremium ? "md:-mt-4 md:mb-4 md:scale-105 z-20 shadow-[0_0_80px_rgba(232,121,249,0.2)]" : "z-10"}`}
            >
              {/* Premium Animated Border for Diamond */}
              {pkg.isPremium && (
                <>
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(232,121,249,1)_360deg)] opacity-100" />
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[spin_4s_linear_infinite_reverse] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(129,140,248,1)_360deg)] opacity-100" />
                  </div>
                  <div className="absolute inset-[2px] bg-[#0B0415] rounded-[22px] z-0" />
                  <div className="absolute inset-[2px] bg-gradient-to-b from-white/[0.08] to-transparent rounded-[22px] z-0" />
                </>
              )}

              {/* Highlight Banner for Diamond */}
              {pkg.highlight && (
                <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-2 text-center z-20 shadow-[0_0_20px_rgba(232,121,249,0.6)] border-b border-white/20">
                  <span className="inline-block animate-pulse">
                    {pkg.highlight}
                  </span>
                </div>
              )}

              {/* Card Header with Custom Bioluminescent Icon */}
              <div
                className={`relative h-40 flex items-center justify-center overflow-hidden ${pkg.highlight ? "mt-8" : ""} z-10`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${pkg.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-500`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0415] to-transparent" />

                <div className="relative z-10 flex flex-col items-center gap-3 mt-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      filter: [
                        "brightness(1)",
                        "brightness(1.2)",
                        "brightness(1)",
                      ],
                    }}
                    transition={{
                      duration: 3 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative"
                  >
                    {/* Subtle background glow behind the icon */}
                    <div
                      className={`absolute inset-0 blur-xl opacity-50 bg-gradient-to-r ${pkg.textGradient} rounded-full scale-150 ${pkg.isPremium ? "animate-pulse" : ""}`}
                    />
                    <pkg.Icon
                      className={`w-16 h-16 relative z-10 drop-shadow-2xl ${pkg.isPremium ? "scale-125" : ""}`}
                    />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white tracking-wide">
                    {pkg.name}
                  </h3>
                </div>
              </div>

              {/* Price Tag */}
              <div className="relative z-10 px-6 pb-6 pt-4 text-center border-b border-white/10">
                <div
                  className={`inline-block transform-gpu text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${pkg.textGradient} ${pkg.isPremium ? "drop-shadow-[0_0_10px_rgba(232,121,249,0.5)] text-4xl" : ""}`}
                >
                  {pkg.price}
                </div>
              </div>

              {/* Features List */}
              <div className="relative z-10 p-6">
                <ul className="space-y-4">
                  {pkg.features.map((feature, fIndex) => (
                    <li
                      key={fIndex}
                      className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed group/item"
                    >
                      <div
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-colors duration-300 ${pkg.isPremium ? "bg-purple-500/20 border-purple-400/50 group-hover/item:bg-purple-400/40 group-hover/item:shadow-[0_0_10px_rgba(232,121,249,0.5)]" : "bg-white/5 border-white/10 group-hover/item:border-purple-400/50 group-hover/item:bg-purple-400/10"}`}
                      >
                        <Check
                          className={`w-3 h-3 ${pkg.isPremium ? "text-pink-300" : "text-purple-400"}`}
                        />
                      </div>
                      <span
                        className={`transition-colors duration-300 ${pkg.isPremium ? "text-gray-200 group-hover/item:text-white font-medium" : "group-hover/item:text-white"}`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <div className="relative z-10 p-6 pt-0 mt-auto">
                <button
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2
                  ${
                    pkg.isPremium
                      ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(232,121,249,0.4)] hover:shadow-[0_0_30px_rgba(232,121,249,0.7)] hover:scale-[1.03] border border-white/20"
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/30 hover:scale-[1.02]"
                  }`}
                >
                  Select {pkg.name}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-block p-[1px] rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent">
            <div className="px-8 py-4 rounded-2xl bg-[#0B0415]/80 backdrop-blur-sm text-gray-400 text-sm md:text-base italic">
              *Sponsorship may come in cash or merchandise worth the value of
              the package.*
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
