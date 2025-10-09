"use client";

import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface StreakCounterProps {
  streak: number;
  onClick?: () => void;
}

export function StreakCounter({ streak, onClick }: StreakCounterProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-[2px] cursor-pointer group hover:scale-[1.02] transition-transform"
    >
      {/* Animated gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 h-full">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-500/20 to-transparent rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          {/* Flame icon with glow */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 rounded-full blur-2xl opacity-60" />
            <Flame className="relative h-16 w-16 text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]" />
          </motion.div>

          {/* Streak number */}
          <div className="text-center">
            <motion.div
              key={streak}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-7xl font-black bg-gradient-to-br from-orange-300 via-orange-400 to-red-500 bg-clip-text text-transparent drop-shadow-lg"
            >
              {streak}
            </motion.div>
            <div className="text-orange-200 text-lg font-semibold tracking-wider uppercase mt-2">
              {streak === 1 ? "Night" : "Nights"}
            </div>
            <div className="text-orange-400/80 text-sm font-medium tracking-widest uppercase mt-1">
              Streak
            </div>
          </div>

          {/* Recent days indicator */}
          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-4"
            >
              {Array.from({ length: Math.min(7, streak) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="w-2.5 h-8 bg-gradient-to-t from-orange-600 to-orange-400 rounded-full shadow-[0_0_10px_rgba(251,146,60,0.5)]"
                />
              ))}
            </motion.div>
          )}

          {/* Motivational text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-orange-200/60 text-xs text-center max-w-[200px] mt-2"
          >
            {streak === 0
              ? "Start your reflection journey today!"
              : streak < 3
                ? "Keep the fire burning! 🔥"
                : streak < 7
                  ? "You're on a roll! Keep going! ✨"
                  : streak < 14
                    ? "Amazing dedication! 🌟"
                    : "Legendary streak! 🏆"}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
