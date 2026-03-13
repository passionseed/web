"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface AuroraWave {
  id: number;
  path: string;
  color: string;
  opacity: number;
  delay: number;
  duration: number;
}

export function HeroBackground() {
  // Generate aurora wave paths
  const auroraWaves = useMemo<AuroraWave[]>(() => {
    return [
      {
        id: 1,
        path: "M 0 60 Q 25 40 50 55 T 100 50 L 100 100 L 0 100 Z",
        color: "#ff6b4a",
        opacity: 0.15,
        delay: 0,
        duration: 20,
      },
      {
        id: 2,
        path: "M 0 70 Q 30 50 60 65 T 100 55 L 100 100 L 0 100 Z",
        color: "#fbbf24",
        opacity: 0.1,
        delay: 2,
        duration: 25,
      },
      {
        id: 3,
        path: "M 0 50 Q 40 35 70 50 T 100 45 L 100 100 L 0 100 Z",
        color: "#fb7185",
        opacity: 0.12,
        delay: 4,
        duration: 22,
      },
    ];
  }, []);

  // Floating particles for depth
  const depthParticles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient - deep purple to warm sunrise */}
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

      {/* Aurora mesh layer */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="aurora1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b4a" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="aurora2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {auroraWaves.map((wave) => (
          <motion.path
            key={wave.id}
            d={wave.path}
            fill={wave.color === "#ff6b4a" ? "url(#aurora1)" : "url(#aurora2)"}
            opacity={wave.opacity}
            animate={{
              d: [
                wave.path,
                wave.path.replace(/Q.*?T/, `Q ${30 + wave.id * 5} ${45 - wave.id * 5} T`),
                wave.path,
              ],
            }}
            transition={{
              duration: wave.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: wave.delay,
            }}
          />
        ))}
      </svg>

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
      {depthParticles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
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

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}