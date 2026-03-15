"use client";

import { motion } from "framer-motion";

const glowOrbs = [
  {
    id: 1,
    className:
      "left-[-12%] top-[10%] h-[26rem] w-[26rem] bg-orange-400/18",
    x: [0, 20, 0],
    y: [0, -10, 0],
    scale: [1, 1.08, 1],
    duration: 18,
  },
  {
    id: 2,
    className:
      "right-[-10%] top-[18%] h-[24rem] w-[24rem] bg-fuchsia-500/14",
    x: [0, -18, 0],
    y: [0, 16, 0],
    scale: [1, 1.04, 1],
    duration: 22,
  },
  {
    id: 3,
    className:
      "left-1/2 top-[58%] h-[30rem] w-[30rem] -translate-x-1/2 bg-amber-300/12",
    x: [0, 0, 0],
    y: [0, -18, 0],
    scale: [1, 1.06, 1],
    duration: 20,
  },
];


export function HeroBackground() {

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            #1a0a2e 0%,
            #2d1449 25%,
            #4a1d6b 45%,
            #6b2d5b 60%,
            #8b3a4a 70%,
            #c45c3a 85%,
            #e87a3a 95%,
            #fbbf24 100%
          )`,
        }}
      />

      {/* Soft glow orbs */}
      {glowOrbs.map((orb) => (
        <motion.div
          key={orb.id}
          className={`absolute rounded-full blur-3xl ${orb.className}`}
          animate={{
            x: orb.x,
            y: orb.y,
            scale: orb.scale,
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Left cloud — purple-violet mass, opens toward center */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: "5%",
          width: "50%",
          height: "70%",
          background: `radial-gradient(ellipse 90% 80% at 0% 45%,
            rgba(160, 80, 220, 0.55) 0%,
            rgba(120, 50, 180, 0.30) 45%,
            transparent 80%)`,
          filter: "blur(36px)",
        }}
        animate={{ x: [0, 24, 0], y: [0, -14, 0], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Right cloud — amber-rose mass, opens toward center */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          right: 0,
          top: "8%",
          width: "50%",
          height: "70%",
          background: `radial-gradient(ellipse 90% 80% at 100% 45%,
            rgba(220, 80, 60, 0.50) 0%,
            rgba(200, 100, 40, 0.28) 45%,
            transparent 80%)`,
          filter: "blur(36px)",
        }}
        animate={{ x: [0, -24, 0], y: [0, 16, 0], opacity: [0.70, 0.95, 0.70] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Radial glow emanating from bottom center */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 80% 50% at 50% 100%,
            rgba(255, 107, 74, 0.25) 0%,
            rgba(251, 191, 36, 0.15) 30%,
            transparent 70%
          )`,
        }}
      />

      {/* Secondary glow layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 60% 40% at 50% 85%,
            rgba(251, 191, 36, 0.2) 0%,
            transparent 60%
          )`,
        }}
      />

      {/* Top fade to deep space */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            rgba(26, 10, 46, 0.8) 0%,
            transparent 40%
          )`,
        }}
      />

      {/* Animated shimmer overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            45deg,
            transparent 40%,
            rgba(255, 255, 255, 0.02) 50%,
            transparent 60%
          )`,
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

{/* Grain substitute without SVG */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}