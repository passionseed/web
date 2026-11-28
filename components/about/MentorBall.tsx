"use client";

import { useState, type CSSProperties } from "react";
import { MessageCircleQuestion } from "lucide-react";

import type { ABOUT_CHOOSE } from "@/lib/content/about";
import { Phrases } from "./Phrases";

/**
 * Belief 1 as a toy: an answer ball with "พี่เลี้ยง" taped on. Shake it for
 * the answer and a question floats up instead, every time.
 */
export function MentorBall({ copy }: { copy: typeof ABOUT_CHOOSE }) {
  const [asked, setAsked] = useState(0);
  const question = asked > 0 ? copy.questions[(asked - 1) % copy.questions.length] : null;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => setAsked((n) => n + 1)}
        className="about-ball-btn flex w-full flex-col items-center gap-8 rounded-2xl pt-2"
      >
        <span aria-hidden="true" className="relative block w-[min(100%,250px)]">
          {/* Wide table shadow and tight contact point under the ball. */}
          <span
            aria-hidden="true"
            className="absolute -bottom-6 left-[58%] h-9 w-[80%] -translate-x-1/2 rounded-[50%]"
            style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 70%)" }}
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-[53%] h-2.5 w-[46%] -translate-x-1/2 rounded-[50%]"
            style={{ background: "rgba(0,0,0,0.85)", filter: "blur(3px)" }}
          />
          <span key={`shake-${asked}`} className={`relative block ${asked > 0 ? "about-shake" : ""}`}>
            <span className="about-ball relative block aspect-square w-full rounded-full transition-transform duration-150">
              {/* Top-left light highlight and neutral table bounce underneath. */}
              <span
                aria-hidden="true"
                className="absolute left-[16%] top-[10%] h-[18%] w-[31%] -rotate-[30deg] rounded-[50%]"
                style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)" }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(242,234,217,0.07), transparent 35%)" }}
              />

              <span className="about-ball-window absolute left-1/2 top-[52%] flex aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full">
                <span
                  key={`die-${asked}`}
                  className={`relative mt-[5%] block w-[94%] ${asked > 0 ? "about-rise" : ""}`}
                >
                  {/* Before the first shake the face sits blank and sunk in the liquid. */}
                  <svg
                    viewBox="0 0 100 88"
                    className="block w-full"
                    aria-hidden="true"
                    style={asked === 0 ? { opacity: 0.35, filter: "blur(0.6px)" } : undefined}
                  >
                    <defs>
                      <linearGradient id="about-die" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#0f78c4" />
                        <stop offset="1" stopColor="#004478" />
                      </linearGradient>
                    </defs>
                    <polygon points="2,3 98,3 50,86" fill="url(#about-die)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeLinejoin="round" />
                  </svg>
                  {question && (
                    <span className="about-ball-text absolute inset-x-[8%] top-[4%] text-center font-semibold text-white">
                      <Phrases text={question} />
                    </span>
                  )}
                </span>
                {/* Air trapped in the liquid. */}
                <span aria-hidden="true" className="absolute left-[24%] top-[74%] h-[4%] w-[4%] rounded-full bg-white/15" />
                <span aria-hidden="true" className="absolute left-[70%] top-[66%] h-[2.5%] w-[2.5%] rounded-full bg-white/20" />
                {/* Murk layer: triangle corners fade into the dark liquid. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: "radial-gradient(circle at 50% 45%, transparent 38%, rgba(2,6,15,0.75) 78%)" }}
                />
                {/* Glass lens over the window: top-left crescent glare and bottom-right rim light. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[12%] top-[7%] h-[22%] w-[40%] -rotate-[25deg] rounded-[50%]"
                  style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 72%)" }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ boxShadow: "inset -1px -1px 0 rgba(255,255,255,0.12)" }}
                />
              </span>

              <span className="about-tape left-1/2 top-[9%] flex !h-auto !w-auto -translate-x-1/2 -rotate-[5deg] px-5 py-0.5">
                <span className="about-hand text-[20px] leading-snug text-[#2b2620]">{copy.mentor}</span>
              </span>
            </span>
          </span>
        </span>
        {/* The window is too small to read at a glance, so the answer is said out loud below it. */}
        <span
          key={`say-${asked}`}
          aria-hidden="true"
          className={`flex min-h-[3.25rem] max-w-[17rem] items-center justify-center text-center font-kodchasan text-[17px] font-semibold leading-snug ${asked > 0 ? "about-pop" : ""}`}
          style={{ color: asked > 0 ? "#f2ead9" : "rgba(242,234,217,0.6)", ...(asked > 0 ? { "--d": "900ms" } : {}) } as CSSProperties}
        >
          <span>
            <Phrases text={question ?? copy.idle} />
          </span>
        </span>
        <span className="shift-button !px-5 !py-3 !text-base">
          <span>{asked === 0 ? copy.askButton : copy.askAgain}</span>
          <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
      <p className="sr-only" aria-live="polite">
        {question?.split("|").join("")}
      </p>
      <p className="mt-6 min-h-[1.5rem] text-center text-sm tabular-nums" style={{ color: "rgba(242,234,217,0.75)" }}>
        {asked > 0 && copy.tally.replace("{n}", String(asked))}
      </p>
    </div>
  );
}
