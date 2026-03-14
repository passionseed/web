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

const particles = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 7) % 84)}%`,
  top: `${10 + ((index * 11) % 70)}%`,
  size: 2 + (index % 3),
  duration: 8 + (index % 5) * 2,
  delay: (index % 4) * 0.6,
}));

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

      {/* Depth particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: `radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

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