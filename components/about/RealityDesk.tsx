"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Bug, Send } from "lucide-react";

import type { ABOUT_REALITY } from "@/lib/content/about";
import { Phrases } from "./Phrases";

type Copy = typeof ABOUT_REALITY;
type Pick = "slide" | "proto";

const YELLOW = "#ffe800";
const MUTED = "rgba(242,234,217,0.75)";
const GRAPHITE = "#3a3843";
/** Sticky-note pads: yellow, pink, sky and orange, like a real desk drawer. */
const NOTES = ["#ffe97a", "#ff9ccf", "#9ad7ff", "#ffc078"];
const TILTS = [-4, 3, -1.5, 5];
const OFFSETS = [0, 10, -4, 14];
const PICKS: readonly Pick[] = ["slide", "proto"];

const vars = (v: Record<string, string>) => v as CSSProperties;

/** A laptop with the pitch deck open: gradient, sparkle, growth bars. */
function Laptop({ copy }: { copy: Copy }) {
  return (
    <svg viewBox="0 0 200 122" className="block h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="about-slide" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b3fe0" />
          <stop offset="0.6" stopColor="#8a3fd6" />
          <stop offset="1" stopColor="#ff48b0" />
        </linearGradient>
        <linearGradient id="about-alu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcdde2" />
          <stop offset="0.55" stopColor="#b5b7be" />
          <stop offset="1" stopColor="#7d7f87" />
        </linearGradient>
        <clipPath id="about-screen">
          <rect x="26" y="13" width="148" height="89" rx="1.5" />
        </clipPath>
      </defs>
      {/* Lid and bezel. */}
      <rect x="20" y="4" width="160" height="104" rx="8" fill="#16151a" stroke="#45444d" strokeWidth="0.8" />
      <circle cx="100" cy="8.6" r="1.3" fill="#2c2b33" />
      <circle cx="99.6" cy="8.2" r="0.4" fill="#5a5965" />
      <g clipPath="url(#about-screen)">
        <rect x="26" y="13" width="148" height="89" fill="url(#about-slide)" />
        <g fontFamily="var(--font-kodchasan), sans-serif" fontWeight="700" fill="#fff">
          {copy.slide.title.map((line, i) => (
            <text key={line} x="38" y={40 + i * 15} fontSize="12.5">
              {line}
            </text>
          ))}
        </g>
        <path d="M150 26 l3.2 7.4 7.4 3.2 -7.4 3.2 -3.2 7.4 -3.2 -7.4 -7.4 -3.2 7.4 -3.2z" fill={YELLOW} />
        <path d="M137 22 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4z" fill="#fff" opacity="0.8" />
        {/* The growth chart every deck has. */}
        <g fill="#fff">
          <rect x="135" y="78" width="6" height="12" rx="1" opacity="0.45" />
          <rect x="144" y="70" width="6" height="20" rx="1" opacity="0.65" />
          <rect x="153" y="60" width="6" height="30" rx="1" opacity="0.9" />
        </g>
        <text x="168" y="98" fontSize="5.5" textAnchor="end" fill="#fff" opacity="0.7" fontFamily="var(--font-bai-jamjuree), sans-serif">
          {copy.slide.page}
        </text>
        {/* Glare off the glass. */}
        <polygon points="26,13 96,13 46,102 26,102" fill="#fff" opacity="0.07" />
      </g>
      {/* Hinge, then the aluminium base with its thumb scoop. */}
      <rect x="20" y="106" width="160" height="3.2" fill="#0b0a0d" />
      <path d="M5 109 H195 L198.5 115.5 Q199 119 195.5 119 H4.5 Q1 119 1.5 115.5 Z" fill="url(#about-alu)" />
      <rect x="85" y="109" width="30" height="2.6" rx="1.3" fill="#8f9199" />
      <path d="M5 109 H195" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.5" />
    </svg>
  );
}

/** A paper prototype: a phone drawn in pencil on an index card. */
function PaperPrototype({ copy, circled }: { copy: Copy; circled: number }) {
  return (
    <svg viewBox="0 0 200 122" className="block h-auto w-full overflow-visible" aria-hidden="true">
      <g transform="rotate(-2 100 62)">
        <rect x="10" y="6" width="180" height="110" rx="2" fill="#fbf7ea" />
        <line x1="10" y1="21" x2="190" y2="21" stroke="#ff48b0" strokeOpacity="0.55" strokeWidth="0.8" />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="10" y1={30 + i * 9} x2="190" y2={30 + i * 9} stroke="#0078bf" strokeOpacity="0.17" strokeWidth="0.6" />
        ))}
        {/* The phone, gone over twice like pencil lines are. */}
        <g fill="none" stroke={GRAPHITE} strokeLinecap="round" strokeLinejoin="round">
          <path d="M77 15.5 C77 13 78.4 12 81 12.2 L119 11.8 C121.6 11.9 122.8 13 122.9 15.6 L123.4 108 C123.3 110.6 122 111.6 119.4 111.5 L81.2 111.9 C78.6 111.8 77.4 110.7 77.3 108.2 Z" strokeWidth="1.5" />
          <path d="M77.6 16.4 C77.4 14 79 12.8 81.6 13 L118.6 12.6 C121 12.8 122.2 14 122.3 16.4 L122.8 107.4" strokeWidth="0.6" opacity="0.6" />
          <rect x="84" y="41" width="32" height="22" strokeWidth="1" strokeDasharray="2.4 1.8" />
          <path d="M85 42 L115 62 M115 42 L85 62" strokeWidth="0.7" opacity="0.55" />
          <path d="M84 70 q8 -1.6 16 0 t15 0" strokeWidth="0.9" />
          <path d="M84 77 q6 -1.4 12 0 t9 0" strokeWidth="0.9" />
        </g>
        <text x="100" y="32" fontSize="9" textAnchor="middle" fill={GRAPHITE} fontFamily="var(--font-iannnnn-cow), sans-serif">
          {copy.proto.title}
        </text>
        {/* The start button: a scrap of sticky note at the very bottom. */}
        <g transform="rotate(-5 100 98)">
          <rect x="85" y="92" width="30" height="12" fill="#ff9ccf" />
          <rect x="85" y="92" width="30" height="2.4" fill="#000" opacity="0.06" />
          <text x="100" y="101.2" fontSize="8.5" textAnchor="middle" fill="#2b2620" fontFamily="var(--font-iannnnn-cow), sans-serif">
            {copy.proto.button}
          </text>
        </g>
        {circled > 0 && (
          <path
            key={circled}
            className="about-pen"
            pathLength={100}
            d="M118 92 C124 99 116 109 100 109.5 C82 110 73 103 77 95 C81 87.5 101 85.5 114 88.5 C119 89.8 122 92 121.5 94"
            fill="none"
            stroke="#d81b5c"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}
      </g>
      {/* Pencil cast shadow down-right onto the index card. */}
      <g transform="translate(152.5 89) rotate(-28)" fill="#000" opacity="0.22">
        <rect x="0" y="0" width="72" height="7" rx="1.5" />
        <polygon points="0,0 -11,3.5 0,7" />
      </g>
      {/* A pencil left lying across the corner. */}
      <g transform="translate(150 86) rotate(-28)">
        <rect x="0" y="0" width="58" height="7" fill="#ffe800" />
        <rect x="0" y="0" width="58" height="2.2" fill="#fff" opacity="0.35" />
        <rect x="0" y="4.6" width="58" height="2.4" fill="#000" opacity="0.12" />
        <rect x="58" y="-0.3" width="7" height="7.6" fill="#c9cbd2" />
        <rect x="58" y="-0.3" width="7" height="2" fill="#fff" opacity="0.5" />
        <rect x="65" y="0" width="7" height="7" rx="1.6" fill="#ff48b0" />
        <polygon points="0,0 -11,3.5 0,7" fill="#ecc893" />
        <polygon points="-7,2.2 -11,3.5 -7,4.8" fill="#2d2b31" />
      </g>
    </svg>
  );
}

/**
 * Belief 2 as a toy: a laptop with the pitch deck, and a paper prototype on
 * an index card. Pick one up, send it to real people, see what comes back.
 */
export function RealityDesk({ copy }: { copy: Copy }) {
  const [choice, setChoice] = useState<Pick>("slide");
  const [sent, setSent] = useState(0);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const pick = (next: Pick) => {
    setChoice(next);
    setSent(0);
  };
  const move = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const nextIndex = (index + step + PICKS.length) % PICKS.length;
    pick(PICKS[nextIndex]);
    radios.current[nextIndex]?.focus();
  };

  const option = (key: Pick, index: number, object: ReactNode, liftTurn: string, shrink = false) => {
    const on = choice === key;
    // The slide shrugs each time it is sent: nobody can use it.
    const shrug = key === "slide" && on && sent > 0;
    return (
      <button
        ref={(el) => {
          radios.current[index] = el;
        }}
        type="button"
        role="radio"
        aria-checked={on}
        tabIndex={on ? 0 : -1}
        onClick={() => pick(key)}
        onKeyDown={(e) => move(e, index)}
        className="group rounded-lg p-1.5 text-left"
      >
        <span className="about-object block" style={vars({ "--lift-r": liftTurn })}>
          <span className={`relative block ${shrink ? "ml-auto w-[80%]" : "w-full"}`}>
            {/* Contact shadow resting on the table under the object. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-1 left-1/2 h-2 w-[90%] rounded-[50%]"
              style={{
                background: "rgba(0,0,0,0.82)",
                filter: "blur(3px)",
                transform: "translateX(calc(-50% + 4px))",
              }}
            />
            <span key={shrug ? `shrug-${sent}` : "still"} className={`relative block ${shrug ? "about-shrug" : ""}`}>
              {object}
            </span>
          </span>
        </span>
        <span
          className="mt-4 flex items-start gap-2 text-sm font-semibold leading-snug transition-colors"
          style={{ color: on ? YELLOW : MUTED }}
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
            style={{ borderColor: on ? YELLOW : "rgba(242,234,217,0.4)" }}
          >
            {on && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: YELLOW }} />}
          </span>
          <span>
            <Phrases text={copy.options[key]} />
          </span>
        </span>
      </button>
    );
  };

  return (
    <div>
      <div role="radiogroup" aria-label={copy.title} className="grid grid-cols-2 items-end gap-4 sm:gap-6">
        {option("slide", 0, <Laptop copy={copy} />, "-1deg")}
        {option("proto", 1, <PaperPrototype copy={copy} circled={choice === "proto" ? sent : 0} />, "1.5deg", true)}
      </div>
      <div className="mt-7">
        <button type="button" className="shift-button !px-5 !py-3 !text-base" onClick={() => setSent((n) => n + 1)}>
          <span>{copy.sendButton}</span>
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-6 min-h-[150px]" aria-live="polite">
        {sent > 0 && choice === "slide" && (
          <p key={`s-${sent}`} className="about-pop flex items-baseline gap-3">
            <span className="font-kodchasan text-5xl font-bold tabular-nums" style={{ color: "rgba(242,234,217,0.45)" }}>
              0
            </span>
            <span className="text-sm leading-relaxed" style={{ color: MUTED }}>
              {copy.slideResult}
            </span>
          </p>
        )}
        {sent > 0 && choice === "proto" && (
          <div key={`p-${sent}`}>
            <ul className="flex items-start pb-4">
              {copy.protoFeedback.map((line, i) => (
                <li
                  key={line}
                  className={`about-sticky about-stick min-w-0 flex-1 aspect-square ${i > 0 ? "-ml-2 sm:-ml-3" : ""}`}
                  style={{
                    ...vars({
                      "--note": NOTES[i % NOTES.length],
                      "--r": `${TILTS[i % TILTS.length]}deg`,
                      "--y": `${OFFSETS[i % OFFSETS.length]}px`,
                      "--d": `${700 + i * 170}ms`,
                    }),
                    zIndex: i + 1,
                  }}
                >
                  {line}
                </li>
              ))}
            </ul>
            <p className="about-pop mt-6 flex items-center gap-2 text-sm font-semibold" style={vars({ color: YELLOW, "--d": "1500ms" })}>
              <Bug className="h-4 w-4" aria-hidden="true" /> {copy.protoResult}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
