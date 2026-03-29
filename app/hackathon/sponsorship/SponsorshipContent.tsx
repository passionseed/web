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

type HackathonStats = {
  participants: number;
  teams: number;
  gradeLevels: Record<string, number>;
};

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

// --- Animated SVG Components for Sections ---

const InnovationTrackingAnimation = ({ className }: { className?: string }) => {
  return (
    <div className={`relative w-full aspect-square ${className || ''}`}>
      <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(168,85,247,0.15)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0)" />
          </radialGradient>
          <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(216,180,254,0.6)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0)" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Glow */}
        <circle cx="200" cy="200" r="180" fill="url(#radar-glow)" />

        {/* Radar Grid */}
        <circle cx="200" cy="200" r="160" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="200" cy="200" r="110" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="200" cy="200" r="60" fill="none" stroke="rgba(168,85,247,0.4)" strokeWidth="1" />
        
        <line x1="40" y1="200" x2="360" y2="200" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
        <line x1="200" y1="40" x2="200" y2="360" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />

        {/* Radar Sweep */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50% 50%" }}
        >
          {/* Invisible rect to force bounding box for transformOrigin */}
          <rect x="0" y="0" width="400" height="400" fill="transparent" />
          <path d="M 200 200 L 200 40 A 160 160 0 0 1 313 87 Z" fill="url(#sweep-grad)" opacity="0.4" />
          <line x1="200" y1="200" x2="200" y2="40" stroke="rgba(216,180,254,0.8)" strokeWidth="2" />
        </motion.g>

        {/* Background Nodes (Participants) */}
        <motion.circle r="4" fill="#a855f7" animate={{ cx: [100, 120, 150, 100], cy: [100, 150, 120, 100], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.circle r="3" fill="#c084fc" animate={{ cx: [300, 280, 250, 300], cy: [150, 100, 120, 150], opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
        <motion.circle r="5" fill="#e879f9" animate={{ cx: [150, 100, 120, 150], cy: [300, 280, 250, 300], opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
        <motion.circle r="4" fill="#818cf8" animate={{ cx: [280, 320, 300, 280], cy: [280, 250, 300, 280], opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />

        {/* The "Top Talent" Node Journey */}
        <motion.g
          animate={{ x: [60, 140, 200], y: [260, 220, 200] }}
          transition={{ duration: 4, times: [0, 0.6, 1], ease: "easeOut", repeat: Infinity, repeatDelay: 5 }}
        >
          {/* Trail */}
          <motion.path
            d="M -140 60 Q -60 20 0 0"
            fill="none"
            stroke="rgba(232,121,249,0.5)"
            strokeWidth="2"
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 4, ease: "easeOut", repeat: Infinity, repeatDelay: 5 }}
          />
          
          {/* The Node itself */}
          <motion.circle
            cx="0" cy="0" r="8"
            fill="#f0abfc"
            filter="url(#glow-strong)"
            animate={{ scale: [1, 1.5, 1.2], fill: ["#c084fc", "#e879f9", "#fdf4ff"] }}
            transition={{ duration: 4, times: [0, 0.8, 1], repeat: Infinity, repeatDelay: 5 }}
          />
          
          {/* Target Reticle */}
          <motion.g
            initial={{ opacity: 0, scale: 2, rotate: 45 }}
            animate={{ opacity: [0, 0, 1, 1], scale: [2, 2, 1, 1], rotate: [45, 45, 0, 0] }}
            transition={{ duration: 4, times: [0, 0.8, 0.9, 1], repeat: Infinity, repeatDelay: 5 }}
          >
            <path d="M -20 -10 L -20 -20 L -10 -20" fill="none" stroke="#fdf4ff" strokeWidth="2" />
            <path d="M 20 -10 L 20 -20 L 10 -20" fill="none" stroke="#fdf4ff" strokeWidth="2" />
            <path d="M -20 10 L -20 20 L -10 20" fill="none" stroke="#fdf4ff" strokeWidth="2" />
            <path d="M 20 10 L 20 20 L 10 20" fill="none" stroke="#fdf4ff" strokeWidth="2" />
          </motion.g>
        </motion.g>

        {/* Analysis Lines & Popups */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 9, times: [0, 0.44, 0.88, 1], repeat: Infinity }}
        >
          {/* Think (Top Left) */}
          <g>
            <motion.line
              x1="200" y1="200" x2="120" y2="100"
              stroke="rgba(232,121,249,0.6)" strokeWidth="2" strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 4 }}
            />
            <motion.circle cx="120" cy="100" r="24" fill="rgba(15,23,42,0.8)" stroke="#e879f9" strokeWidth="2" filter="url(#glow)"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 4.2 }}
            />
            <motion.path d="M 120 90 C 114 90 110 94 110 100 C 110 104 113 107 116 108 L 116 112 L 124 112 L 124 108 C 127 107 130 104 130 100 C 130 94 126 90 120 90 Z" fill="none" stroke="#fdf4ff" strokeWidth="2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.4 }}
            />
            <motion.line x1="118" y1="115" x2="122" y2="115" stroke="#fdf4ff" strokeWidth="2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.4 }}
            />
          </g>

          {/* Collaborate (Top Right) */}
          <g>
            <motion.line
              x1="200" y1="200" x2="280" y2="100"
              stroke="rgba(129,140,248,0.6)" strokeWidth="2" strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 4.2 }}
            />
            <motion.circle cx="280" cy="100" r="24" fill="rgba(15,23,42,0.8)" stroke="#818cf8" strokeWidth="2" filter="url(#glow)"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 4.4 }}
            />
            <motion.circle cx="272" cy="96" r="4" fill="none" stroke="#e0e7ff" strokeWidth="2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6 }}
            />
            <motion.circle cx="288" cy="96" r="4" fill="none" stroke="#e0e7ff" strokeWidth="2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6 }}
            />
            <motion.path d="M 266 108 C 266 104 270 102 272 102 C 274 102 278 104 278 108" fill="none" stroke="#e0e7ff" strokeWidth="2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6 }}
            />
            <motion.path d="M 282 108 C 282 104 286 102 288 102 C 290 102 294 104 294 108" fill="none" stroke="#e0e7ff" strokeWidth="2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6 }}
            />
            <motion.line x1="276" y1="96" x2="284" y2="96" stroke="#e0e7ff" strokeWidth="1.5" strokeDasharray="2 2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6 }}
            />
          </g>

          {/* Solve (Bottom) */}
          <g>
            <motion.line
              x1="200" y1="200" x2="200" y2="300"
              stroke="rgba(52,211,153,0.6)" strokeWidth="2" strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 4.4 }}
            />
            <motion.circle cx="200" cy="300" r="24" fill="rgba(15,23,42,0.8)" stroke="#34d399" strokeWidth="2" filter="url(#glow)"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 4.6 }}
            />
            <motion.path d="M 192 300 L 198 306 L 208 294" fill="none" stroke="#d1fae5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 4.8 }}
            />
          </g>
        </motion.g>
      </svg>
    </div>
  );
};

const TrackTraditionalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    {/* Lotus Petals forming a cross in negative space */}
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "50px 50px" }}
    >
      {/* Top Petal */}
      <motion.path d="M50 10 C 65 30, 65 45, 50 50 C 35 45, 35 30, 50 10 Z" fill="none" stroke="currentColor" strokeWidth="3"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "50px 50px" }} />
      {/* Bottom Petal */}
      <motion.path d="M50 90 C 65 70, 65 55, 50 50 C 35 55, 35 70, 50 90 Z" fill="none" stroke="currentColor" strokeWidth="3"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "50px 50px" }} />
      {/* Left Petal */}
      <motion.path d="M10 50 C 30 35, 45 35, 50 50 C 45 65, 30 65, 10 50 Z" fill="none" stroke="currentColor" strokeWidth="3"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} style={{ transformOrigin: "50px 50px" }} />
      {/* Right Petal */}
      <motion.path d="M90 50 C 70 35, 55 35, 50 50 C 55 65, 70 65, 90 50 Z" fill="none" stroke="currentColor" strokeWidth="3"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} style={{ transformOrigin: "50px 50px" }} />
    </motion.g>
    {/* Central Medical Cross */}
    <motion.path
      d="M46 40 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 z"
      fill="currentColor"
      animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "50px 50px" }}
    />
  </svg>
);

const TrackMentalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    {/* Heart Outline */}
    <motion.path
      d="M50 85 C 50 85, 15 55, 15 30 C 15 15, 35 10, 50 25 C 65 10, 85 15, 85 30 C 85 55, 50 85, 50 85 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "50px 50px" }}
    />
    {/* Neural Network inside the Heart */}
    {/* Left Node */}
    <motion.circle cx="35" cy="35" r="4" fill="currentColor"
      animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
    {/* Right Node */}
    <motion.circle cx="65" cy="35" r="4" fill="currentColor"
      animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
    {/* Bottom Node */}
    <motion.circle cx="50" cy="55" r="5" fill="currentColor"
      animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1 }} />
    {/* Top Center Node */}
    <motion.circle cx="50" cy="25" r="3" fill="currentColor"
      animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.25 }} />

    {/* Connecting Lines */}
    <motion.line x1="35" y1="35" x2="50" y2="55" stroke="currentColor" strokeWidth="2"
      animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
    <motion.line x1="65" y1="35" x2="50" y2="55" stroke="currentColor" strokeWidth="2"
      animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1 }} />
    <motion.line x1="35" y1="35" x2="50" y2="25" stroke="currentColor" strokeWidth="2"
      animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.25 }} />
    <motion.line x1="65" y1="35" x2="50" y2="25" stroke="currentColor" strokeWidth="2"
      animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }} />
    <motion.line x1="35" y1="35" x2="65" y2="35" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"
      animate={{ opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 3, repeat: Infinity }} />
  </svg>
);

const TrackCommunityIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <motion.circle
      cx="50"
      cy="50"
      r="10"
      fill="currentColor"
      animate={{ scale: [1, 1.3, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.circle
      cx="25"
      cy="35"
      r="7"
      fill="currentColor"
      animate={{ scale: [1, 1.4, 1] }}
      transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
    />
    <motion.circle
      cx="75"
      cy="35"
      r="7"
      fill="currentColor"
      animate={{ scale: [1, 1.4, 1] }}
      transition={{ duration: 2, delay: 1, repeat: Infinity }}
    />
    <motion.circle
      cx="35"
      cy="75"
      r="7"
      fill="currentColor"
      animate={{ scale: [1, 1.4, 1] }}
      transition={{ duration: 2, delay: 1.5, repeat: Infinity }}
    />
    <motion.circle
      cx="65"
      cy="75"
      r="7"
      fill="currentColor"
      animate={{ scale: [1, 1.4, 1] }}
      transition={{ duration: 2, delay: 2, repeat: Infinity }}
    />
    <motion.path
      d="M30 40 L45 48 M70 40 L55 48 M38 70 L48 58 M62 70 L52 58"
      stroke="currentColor"
      strokeWidth="2"
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </svg>
);

const OutcomeResearchIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <motion.rect
      x="25"
      y="15"
      width="50"
      height="70"
      rx="6"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      animate={{ strokeDasharray: ["0 240", "240 0"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    />
    <motion.line
      x1="40"
      y1="35"
      x2="60"
      y2="35"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      animate={{ x2: [40, 60, 40] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.line
      x1="40"
      y1="50"
      x2="55"
      y2="50"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      animate={{ x2: [40, 55, 40] }}
      transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
    />
    <motion.circle
      cx="65"
      cy="70"
      r="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.line
      x1="75"
      y1="80"
      x2="88"
      y2="93"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />
  </svg>
);

const OutcomePrototypeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <motion.polygon
      points="50,15 85,35 85,65 50,85 15,65 15,35"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      animate={{ rotate: 360 }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "50px 50px" }}
    />
    <motion.polygon
      points="50,35 65,45 65,60 50,70 35,60 35,45"
      fill="currentColor"
      animate={{ scale: [0.8, 1.1, 0.8] }}
      transition={{ duration: 2, repeat: Infinity }}
      style={{ transformOrigin: "50px 50px" }}
    />
    <motion.circle cx="50" cy="50" r="4" fill="#0B0415" />
  </svg>
);

const OutcomeCollabIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <motion.circle
      cx="35"
      cy="50"
      r="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      animate={{ cx: [35, 30, 35] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.circle
      cx="65"
      cy="50"
      r="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      animate={{ cx: [65, 70, 65] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path
      d="M50 33 A 17 17 0 0 1 50 67 A 17 17 0 0 1 50 33"
      fill="currentColor"
      animate={{ opacity: [0.2, 0.8, 0.2] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
  </svg>
);

const OutcomeSystemsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <motion.circle
      cx="50"
      cy="50"
      r="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeDasharray="12 6"
      animate={{ rotate: -360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "50px 50px" }}
    />
    <motion.circle
      cx="50"
      cy="50"
      r="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeDasharray="6 6"
      animate={{ rotate: 360 }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "50px 50px" }}
    />
    <motion.circle
      cx="50"
      cy="50"
      r="6"
      fill="currentColor"
      animate={{ scale: [1, 1.5, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.line
      x1="50"
      y1="18"
      x2="50"
      y2="32"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.line
      x1="50"
      y1="68"
      x2="50"
      y2="82"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 2, delay: 1, repeat: Infinity }}
    />
    <motion.line
      x1="18"
      y1="50"
      x2="32"
      y2="50"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
    />
    <motion.line
      x1="68"
      y1="50"
      x2="82"
      y2="50"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 2, delay: 1.5, repeat: Infinity }}
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
      "Full access to the Innovation Tracking System for talent discovery",
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
      "Full access to the Innovation Tracking System for talent discovery",
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

export function SponsorshipContent({ stats }: { stats: HackathonStats }) {
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
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
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
              <h3 className="text-xl font-medium text-white mb-3 relative z-10">
                Hyper-Targeted Reach
              </h3>
              <p className="text-gray-400 leading-relaxed relative z-10 text-sm">
                Connect directly with {stats.participants}+ highly motivated high school and
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
              <h3 className="text-xl font-medium text-white mb-3 relative z-10">
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
              <h3 className="text-xl font-medium text-white mb-3 relative z-10">
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

        {/* Innovation Tracking System Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="mb-32 max-w-5xl mx-auto"
        >
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-3xl p-8 md:p-10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-medium text-white mb-4">
                  Exclusive Talent Discovery
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  We built our own <strong>Innovation Tracking System</strong>{" "}
                  that monitors the journey of every participant. Identify top
                  talent early by seeing how they think, collaborate, and solve
                  problems.
                  <br />
                  <br />
                  <span className="text-purple-300 font-medium">
                    Full access to this system is exclusively shared with our
                    Diamond and Platinum tier sponsors.
                  </span>
                </p>
              </div>
              <div className="w-full md:w-1/2 flex justify-center">
                <InnovationTrackingAnimation className="w-full max-w-[320px]" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hackathon Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-32 max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              Hackathon Tracks
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Participants will build solutions across three critical areas of
              healthcare.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Track 1 */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.04] transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30">
                <TrackTraditionalIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-medium text-purple-400 mb-2">
                Traditional & Integrative Healthcare
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Clinical care, prevention, and holistic health systems
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Early detection & risk screening</li>
                <li>• Chronic disease prevention & management</li>
                <li>• Patient journeys across care systems</li>
                <li>
                  • Safe integration of traditional & alternative practices
                </li>
                <li>• Assistive technology for traditional healthcare</li>
              </ul>
            </div>
            {/* Track 2 */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.04] transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center mb-6 border border-fuchsia-500/30">
                <TrackMentalIcon className="w-8 h-8 text-fuchsia-400" />
              </div>
              <h3 className="text-xl font-medium text-fuchsia-400 mb-2">
                Mental Health
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Emotional well-being, resilience, and early support
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Stress, burnout & anxiety prevention</li>
                <li>• Early risk detection & intervention</li>
                <li>• Loneliness & social isolation</li>
                <li>• Mental well-being in schools, workplaces, communities</li>
                <li>• Empathetic chatbots & LLMs</li>
              </ul>
            </div>
            {/* Track 3 */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.04] transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/30">
                <TrackCommunityIcon className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-indigo-400 mb-2">
                Community & Public Health
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Community, Public & Environmental Health
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Population-level prevention</li>
                <li>• Health equity & accessibility</li>
                <li>• Environmental health (air, water, climate)</li>
                <li>• Early risk detection & prediction</li>
                <li>• Community-based interventions</li>
                <li>• Real-time monitoring & wearables</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Participant Outcomes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-32 max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              What Participants Will Gain
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              We focus on building real-world capabilities, ensuring every
              participant leaves with tangible skills and portfolio-ready
              experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Evidence-Based Research Skills",
                desc: "Ability to navigate medical databases (e.g., PubMed), validate problem statements, and ground solutions in clinical reality.",
                Icon: OutcomeResearchIcon,
                color: "text-blue-400",
                bg: "bg-blue-500/20",
                border: "border-blue-500/30",
              },
              {
                title: "Rapid Prototyping & Testing",
                desc: "Hands-on experience building viable, testable prototypes and iterating based on real user feedback.",
                Icon: OutcomePrototypeIcon,
                color: "text-pink-400",
                bg: "bg-pink-500/20",
                border: "border-pink-500/30",
              },
              {
                title: "Interdisciplinary Collaboration",
                desc: "Working across health, tech, business, and design to solve complex systemic challenges.",
                Icon: OutcomeCollabIcon,
                color: "text-emerald-400",
                bg: "bg-emerald-500/20",
                border: "border-emerald-500/30",
              },
              {
                title: "Systems & Critical Thinking",
                desc: "Understanding patient journeys and healthcare contexts to design preventive and predictive solutions.",
                Icon: OutcomeSystemsIcon,
                color: "text-amber-400",
                bg: "bg-amber-500/20",
                border: "border-amber-500/30",
              },
            ].map((outcome, i) => (
              <div
                key={i}
                className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 hover:bg-white/[0.04] transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${outcome.bg} flex items-center justify-center mb-6 border ${outcome.border}`}
                >
                  <outcome.Icon className={`w-7 h-7 ${outcome.color}`} />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">
                  {outcome.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">{outcome.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-32 max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              Innovation Journey
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A structured pipeline designed to identify talent and produce
              viable solutions.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 z-0" />

            {[
              {
                phase: "Ideation & Research",
                date: "April",
                focus: "Problem Validation",
                output: "Evidence-backed proposals",
              },
              {
                phase: "Prototyping",
                date: "May",
                focus: "Skill Building",
                output: "Testable MVPs",
              },
              {
                phase: "Acceleration",
                date: "Early June",
                focus: "Talent Identification",
                output: "Top 30 Teams Shortlisted",
              },
              {
                phase: "Final Showcase",
                date: "Late June",
                focus: "Industry Exposure",
                output: "Winning Solutions Pitched",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="relative z-10 flex-1 flex flex-col items-center text-center group"
              >
                <div className="w-4 h-4 rounded-full bg-purple-500 mb-4 shadow-[0_0_10px_rgba(168,85,247,0.8)] group-hover:scale-150 transition-transform" />
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 w-full backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
                  <div className="text-purple-400 text-sm font-medium mb-1 uppercase tracking-wider">
                    {step.date}
                  </div>
                  <h3 className="text-lg font-medium text-white mb-3">
                    {step.phase}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-white/5 rounded-lg py-1.5 px-2">
                      <span className="text-gray-400 block text-xs mb-0.5">
                        Focus
                      </span>
                      <span className="text-gray-200 font-medium">
                        {step.focus}
                      </span>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg py-1.5 px-2 border border-purple-500/20">
                      <span className="text-purple-300/70 block text-xs mb-0.5">
                        Output
                      </span>
                      <span className="text-purple-200 font-medium">
                        {step.output}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Partners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-32 max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              Our Partners
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Collaborating with industry leaders to ensure medical integrity
              and strategic growth.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* AMSA THAILAND */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1">
                  <img
                    src="/hackathon/AMSA.png"
                    alt="AMSA Thailand"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-medium text-blue-400">
                  AMSA THAILAND
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-gray-300">
                <li>
                  <strong className="text-white block mb-1">
                    Medical Integrity and Scientific Oversight
                  </strong>
                  Serve as the primary authority on medical accuracy, ensuring
                  that all participant problem statements and solutions align
                  with current healthcare standards and scientific principles.
                </li>
                <li>
                  <strong className="text-white block mb-1">
                    Research Validation Guidance
                  </strong>
                  Provide participants with the necessary framework and
                  expertise to conduct research based on credible medical
                  databases and evidence.
                </li>
                <li>
                  <strong className="text-white block mb-1">
                    Clinical Mentorship & Community Engagement
                  </strong>
                  Facilitate access to medical students and professionals to act
                  as mentors. Leverage AMSA's network to recruit
                  interdisciplinary teams.
                </li>
                <li>
                  <strong className="text-white block mb-1">
                    Expert Judging Panel
                  </strong>
                  Appoint qualified representatives to evaluate the final
                  deliverables based on medical feasibility, potential health
                  impact, and the rigor of the research used.
                </li>
              </ul>
            </div>
            {/* STEM like Her */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1">
                  <img
                    src="/hackathon/StemLike.png"
                    alt="STEM like Her"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-medium text-pink-400">
                  STEM like Her
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-gray-300">
                <li>
                  <strong className="text-white block mb-1">
                    Strategic Marketing & Content Production
                  </strong>
                  Collaborate on marketing strategies to build awareness and
                  produce video contents to showcase the partnership and attract
                  the target audience.
                </li>
                <li>
                  <strong className="text-white block mb-1">
                    Strategic Networking
                  </strong>
                  Connect the initiative with other organizations within their
                  network to expand the project's impact and create
                  opportunities for international growth.
                </li>
                <li>
                  <strong className="text-white block mb-1">
                    Technical Mentorship & Workshops
                  </strong>
                  Support experts and mentors to lead workshops on prototyping
                  and provide guidance to ensure participant ideas are developed
                  into tangible products.
                </li>
                <li>
                  <strong className="text-white block mb-1">
                    Expert Panel & Talent Recruitment
                  </strong>
                  Provide qualified judges for the competition and assist in
                  recruiting additional personnel to strengthen the project
                  management and operational team.
                </li>
              </ul>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center mb-8">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
              <div className="inline-block transform-gpu text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 mb-2">
                {stats.participants}+
              </div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Hackers
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
              <div className="inline-block transform-gpu text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400 mb-2">
                {stats.teams}+
              </div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Teams Formed
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
              <div className="inline-block transform-gpu text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 mb-2">
                48 Hrs
              </div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Of Innovation
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

          {/* Educational Levels Breakdown */}
          {Object.keys(stats.gradeLevels).length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h4 className="text-white/60 text-xs uppercase tracking-wider mb-4">
                Educational Levels
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(stats.gradeLevels)
                  .sort(([, a], [, b]) => b - a)
                  .map(([level, count]) => (
                    <div
                      key={level}
                      className="flex flex-col items-center p-3 rounded-lg bg-white/[0.02] border border-white/5"
                    >
                      <span className="text-2xl font-medium text-purple-300">{count}</span>
                      <span className="text-xs text-gray-400 text-center mt-1">{level}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
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
          <h2 className="text-2xl md:text-3xl font-medium mb-4">
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
                <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white text-xs font-medium uppercase tracking-wider py-2 text-center z-20 shadow-[0_0_20px_rgba(232,121,249,0.6)] border-b border-white/20">
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
                  <h3 className="text-2xl font-medium text-white tracking-wide">
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
                  className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2
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
