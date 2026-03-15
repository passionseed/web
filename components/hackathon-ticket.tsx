import React, { useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Trophy, Calendar, Sparkles, Zap } from "lucide-react";

interface HackathonTicketProps {
  participantName?: string;
  teamName?: string;
  ticketRef?: React.RefObject<HTMLDivElement | null>;
}

export function HackathonTicket({
  participantName = "Builder",
  teamName = "Team Alpha",
  ticketRef,
}: HackathonTicketProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Mouse tracking motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth spring physics for the mouse follow
  const mouseX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.5 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.5 });

  // Transform mouse position to rotation values
  // Card rotates around Y axis for X movement, and X axis for Y movement
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  // Parallax layers - different elements move at different depths
  const backgroundX = useTransform(mouseX, [-0.5, 0.5], [-20, 20]);
  const backgroundY = useTransform(mouseY, [-0.5, 0.5], [-20, 20]);
  const midgroundX = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);
  const midgroundY = useTransform(mouseY, [-0.5, 0.5], [-10, 10]);
  const foregroundX = useTransform(mouseX, [-0.5, 0.5], [-5, 5]);
  const foregroundY = useTransform(mouseY, [-0.5, 0.5], [-5, 5]);

  // Glow intensity based on mouse distance from center
  const glowOpacity = useTransform(
    [mouseX, mouseY],
    ([latestX, latestY]) => {
      const distance = Math.sqrt(latestX * latestX + latestY * latestY);
      return 0.3 + distance * 0.4;
    }
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Normalize to -0.5 to 0.5 range
    const mouseXNorm = (e.clientX - centerX) / rect.width;
    const mouseYNorm = (e.clientY - centerY) / rect.height;
    x.set(mouseXNorm);
    y.set(mouseYNorm);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="relative perspective-1000">
      <motion.div
        ref={(el) => {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (ticketRef) {
            (ticketRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative mx-auto w-[320px] h-[568px] shrink-0 font-[family-name:var(--font-kodchasan)] cursor-pointer"
      >
        {/* Main card container */}
        <div
          className="relative w-full h-full rounded-[2rem] overflow-hidden"
          style={{
            filter: "drop-shadow(0 25px 50px rgba(16, 185, 129, 0.3))",
          }}
        >
          {/* Base background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900" />

          {/* Animated grid pattern - parallax background layer */}
          <motion.div
            style={{ x: backgroundX, y: backgroundY }}
            className="absolute inset-0 opacity-20"
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: "30px 30px",
                backgroundPosition: "0 0",
              }}
            />
          </motion.div>

          {/* Glowing orbs - parallax midground layer */}
          <motion.div
            style={{ x: midgroundX, y: midgroundY }}
            className="absolute inset-0"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-600/15 rounded-full blur-[50px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-teal-400/10 rounded-full blur-[40px]" />
          </motion.div>

          {/* Dynamic glow overlay - follows mouse intensity */}
          <motion.div
            style={{ opacity: glowOpacity }}
            className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-green-600/10 pointer-events-none"
          />

          {/* Content container with 3d transform */}
          <div
            className="relative h-full flex flex-col p-6"
            style={{ transform: "translateZ(30px)" }}
          >
            {/* Header section */}
            <motion.div
              style={{ x: foregroundX, y: foregroundY }}
              className="flex justify-between items-start"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Sparkles className="text-emerald-400 w-4 h-4" />
                  <div className="absolute inset-0 bg-emerald-400/30 blur-md" />
                </div>
                <span className="text-emerald-300 tracking-[0.15em] text-[9px] font-bold">
                  PASSION SEED
                </span>
              </div>
              <div className="flex gap-1.5 items-center bg-emerald-500/10 rounded-full px-2 py-0.5 border border-emerald-500/30 backdrop-blur-md">
                <span className="text-[8px] font-bold tracking-wider text-emerald-400 uppercase">
                  Hackathon 2026
                </span>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                />
              </div>
            </motion.div>

            {/* Main title section */}
            <motion.div
              style={{ x: midgroundX, y: midgroundY, transform: "translateZ(20px)" }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              {/* Trophy icon with glow */}
              <div className="relative mb-4">
                <Trophy className="w-12 h-12 text-emerald-400" />
                <div className="absolute inset-0 bg-emerald-400/40 blur-xl" />
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(52, 211, 153, 0.4)",
                      "0 0 40px rgba(52, 211, 153, 0.7)",
                      "0 0 20px rgba(52, 211, 153, 0.4)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 rounded-full"
                />
              </div>

              <h3 className="text-3xl font-black text-white tracking-tight mb-1">
                HACKATHON
              </h3>
              <p className="text-emerald-400 text-[9px] tracking-[0.25em] font-bold uppercase mb-4">
                Official Participant
              </p>

              {/* Participant info card */}
              <div className="w-full bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-emerald-500/20 mb-3">
                <p className="text-emerald-300 text-[9px] font-bold uppercase tracking-widest mb-0.5">
                  Participant
                </p>
                <p className="text-xl font-bold text-white truncate">
                  {participantName}
                </p>
              </div>

              <div className="w-full bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-emerald-500/20">
                <p className="text-emerald-300 text-[9px] font-bold uppercase tracking-widest mb-0.5">
                  Team
                </p>
                <p className="text-lg font-bold text-white truncate">
                  {teamName}
                </p>
              </div>
            </motion.div>

            {/* Footer section */}
            <motion.div
              style={{ x: foregroundX, y: foregroundY, transform: "translateZ(15px)" }}
              className="mt-4 space-y-3"
            >
              {/* Decorative line */}
              <div className="relative h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent">
                <motion.div
                  animate={{
                    background: [
                      "linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.8), transparent)",
                      "linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.8), transparent)",
                    ],
                    backgroundPosition: ["-100% 0", "200% 0"],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                />
              </div>

              {/* Stats row */}
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span className="text-[8px] text-slate-400 font-medium">
                    48 Hours
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span className="text-[8px] text-slate-400 font-medium">
                    Elite Builder
                  </span>
                </div>
              </div>

              {/* Ticket ID */}
              <div className="text-center pt-2">
                <p className="text-[7px] text-slate-500 tracking-[0.2em] font-bold uppercase">
                  Ticket ID
                </p>
                <p className="text-[9px] text-emerald-500/70 font-mono tracking-wider">
                  HACK-2026-{participantName.slice(0, 3).toUpperCase()}
                  {Math.floor(Math.random() * 1000)}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Shiny border effect */}
          <div
            className="absolute inset-0 rounded-[2rem] pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(52, 211, 153, 0.3) 0%, transparent 50%, rgba(16, 185, 129, 0.3) 100%)",
              padding: "1px",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
        </div>

        {/* Ambient floating particles */}
        <div className="absolute -inset-4 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * 320,
                y: Math.random() * 568,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: Math.random() * 320,
                y: Math.random() * 568,
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
              }}
              className="absolute w-1 h-1 bg-emerald-400 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
