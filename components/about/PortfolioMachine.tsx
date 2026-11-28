"use client";

import { useId, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";

import type { ABOUT_MACHINE } from "@/lib/content/about";
import { Phrases } from "./Phrases";

type Copy = typeof ABOUT_MACHINE;
type Phase = "idle" | "polished" | "real";

const PINK = "#ff48b0";
const BLUE = "#0078bf";
const YELLOW = "#ffe800";
/** Ballpoint inks on the notebook page. */
const PEN = { blue: "#1f3f9e", black: "#27242f", red: "#d81b5c" };
const MAX_NAME = 20;

const vars = (v: Record<string, string>) => v as CSSProperties;

/** The notebook page's top edge, torn by hand. Fixed, so it never shifts. */
const TORN =
  "polygon(0 5px, 3% 2px, 6% 6px, 9% 3px, 12% 7px, 16% 2px, 19% 5px, 23% 1px, 27% 6px, 31% 3px, 35% 7px, 39% 2px, 43% 5px, 47% 3px, 51% 7px, 55% 2px, 59% 6px, 63% 3px, 67% 5px, 71% 1px, 75% 6px, 79% 3px, 83% 7px, 87% 2px, 91% 5px, 95% 3px, 100% 6px, 100% 100%, 0 100%)";

/* ---------- The machine ---------- */

function Screw({ className, turn }: { className: string; turn: number }) {
  return <span aria-hidden="true" className={`about-screw ${className}`} style={vars({ "--turn": `${turn}deg` })} />;
}

/** A desktop printer that only makes one thing: the same portfolio, again. */
function Machine({ phase, copy, printKey }: { phase: Phase; copy: Copy; printKey: string }) {
  const lcd = copy.lcd[phase];
  const led = phase === "real" ? PINK : phase === "polished" ? BLUE : YELLOW;
  const jolting = phase === "polished";
  return (
    <div key={jolting ? `jolt-${printKey}` : "still"} className={`relative z-20 mx-auto w-full max-w-md pt-7 ${jolting ? "about-jolt" : ""}`}>
      {/* Input tray at the back, with two blank sheets waiting in it. */}
      <div aria-hidden="true" className="relative">
        <span
          className="absolute left-1/2 -top-[22px] z-0 block h-[26px] w-[58%] -translate-x-1/2"
          style={{
            background: "linear-gradient(180deg, #43404c 0%, #3a3741 55%, #2a2730 100%)",
            clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        />
        {/* Back sheet in the tray. */}
        <span
          className="absolute left-1/2 -top-[27px] z-[1] block h-[30px] w-[47%] -translate-x-1/2"
          style={{
            background: "linear-gradient(180deg, #faf8f2 0px, #faf8f2 1px, #e4dfd3 1px, #cfc9bc 100%)",
            clipPath: "polygon(2.5% 0, 97.5% 0, 100% 100%, 0 100%)",
            boxShadow: "0 -1px 2px rgba(0,0,0,0.32)",
          }}
        />
        {/* Front sheet, 3px lower, 1px lighter along its top edge. */}
        <span
          className="absolute left-1/2 -top-[24px] z-[2] block h-[27px] w-[48.5%] -translate-x-1/2"
          style={{
            background: "linear-gradient(180deg, #ffffff 0px, #ffffff 1px, #f3f1ea 1px, #dfdbd0 100%)",
            clipPath: "polygon(2% 0, 98% 0, 100% 100%, 0 100%)",
            boxShadow: "0 -1.5px 2px rgba(0,0,0,0.3)",
          }}
        />
        {/* The top of the case, seen from slightly above. */}
        <span
          className="relative z-[3] block h-8 rounded-t-[10px]"
          style={{
            margin: "0 10px",
            background: "linear-gradient(180deg, #56535f 0px, #4d4a55 2px, #35323c 100%)",
            clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)",
          }}
        />
      </div>

      {/* Front face of the printer, ending directly at the exit slit. */}
      <div
        className="relative z-[4] rounded-t-[14px] rounded-b-[2px] px-5 pb-3.5 pt-4"
        style={{
          background: "linear-gradient(180deg, #3a3741 0%, #2a2730 38%, #1f1d24 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.6), 6px 14px 26px -12px rgba(0,0,0,0.85)",
        }}
      >
        <Screw className="left-2 top-2" turn={20} />
        <Screw className="right-2 top-2" turn={-35} />
        <Screw className="bottom-2 left-2" turn={70} />
        <Screw className="bottom-2 right-2" turn={-10} />

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Nameplate, embossed into the plastic. */}
          <div className="shrink-0 pl-2">
            <p
              className="font-kodchasan text-[15px] font-bold leading-none"
              style={{ color: "#d6cfbf", textShadow: "0 -1px 0 rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              {copy.brand}
            </p>
            <p className="about-lcd-code mt-1.5 text-[11px] leading-none" style={{ color: "rgba(214,207,191,0.55)" }}>
              {copy.model}
            </p>
          </div>

          <div className="about-lcd min-w-0 flex-1 rounded-[5px] px-3 py-1.5">
            <p className="about-lcd-code text-[13px] leading-tight">
              {lcd.code}
              {phase === "idle" && (
                <span className="about-blink" aria-hidden="true">
                  _
                </span>
              )}
            </p>
            <p className="text-[11.5px] font-semibold leading-tight">
              <Phrases text={lcd.line} />
            </p>
          </div>

          {/* Status light: a domed lens with the colour lit behind it. */}
          <span
            aria-hidden="true"
            className={`relative h-3.5 w-3.5 shrink-0 rounded-full ${phase === "polished" ? "" : "about-blink"}`}
            style={{
              background: `radial-gradient(circle at 35% 30%, #fff 0%, ${led} 38%, ${led} 70%, rgba(0,0,0,0.5) 100%)`,
              boxShadow: `0 0 10px 1px ${led}88, inset 0 0 0 1px rgba(0,0,0,0.35)`,
            }}
          />
        </div>

        {/* Vent slats along bottom-left of the front panel. */}
        <div className="mt-3 flex items-center pl-4">
          <span
            aria-hidden="true"
            className="h-2.5 w-14 shrink-0 rounded-[2px]"
            style={{ background: "repeating-linear-gradient(90deg, #0e0d11 0 2px, transparent 2px 5px)" }}
          />
        </div>
      </div>

      {/* Exit slot: full-width 10px dark slit at the bottom edge of the front face. */}
      <div
        aria-hidden="true"
        className="relative z-[3] mx-[2px] h-[10px]"
        style={{
          backgroundColor: "#030204",
          boxShadow: "inset 0 3px 4px rgba(0,0,0,0.95)",
        }}
      />

      {/* Output lip under the slit, with rubber feet at the outer corners. */}
      <div
        aria-hidden="true"
        className="relative z-[2] h-[6px] rounded-b-[6px]"
        style={{
          backgroundColor: "#2f2c35",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 4px rgba(0,0,0,0.6)",
        }}
      >
        <span className="absolute -bottom-1.5 left-[4%] h-2 w-8 rounded-b-[4px] bg-[#0b0a0d]" />
        <span className="absolute -bottom-1.5 right-[4%] h-2 w-8 rounded-b-[4px] bg-[#0b0a0d]" />
      </div>
    </div>
  );
}

/* ---------- What comes out ---------- */

/** A rubber stamp: a double rule, uneven ink, printed into the paper. */
function RubberStamp({
  ink,
  delay,
  className,
  children,
}: {
  ink: string;
  delay?: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={`about-stamp about-ink absolute rounded-[7px] border-[3px] p-[3px] font-kodchasan font-bold leading-snug mix-blend-multiply ${className}`}
      style={vars({ borderColor: ink, color: ink, ...(delay ? { "--d": `${delay}ms` } : {}) })}
    >
      <span className="block rounded-[4px] border-[1.5px] px-3" style={{ borderColor: ink }}>
        {children}
      </span>
    </span>
  );
}

/** The template every generator ships: glossy, polite and exactly the same. */
function PolishedSheet({ copy, name }: { copy: Copy; name: string }) {
  return (
    <div className="about-feed relative mx-auto w-full max-w-[21rem] pb-6">
      {/* The rest of the print run under it, never quite squared up. */}
      {[1.8, -1.4, 0.8].map((turn, i) => (
        <span
          key={turn}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-6 top-[2px] rounded-b-[3px] bg-[#f3f3f6]"
          style={{
            transform: `translate(${(i + 1) * 3}px, ${(i + 1) * 4}px) rotate(${turn}deg)`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        />
      ))}
      <article
        className="relative overflow-hidden rounded-b-[3px] bg-white text-[#1f2633]"
        style={{ boxShadow: "6px 16px 26px -10px rgba(0,0,0,0.75)" }}
      >
        <div className="relative h-[4.5rem]" style={{ background: "linear-gradient(120deg, #c7d2fe 0%, #e9d5ff 55%, #fbcfe8 100%)" }}>
          <span
            aria-hidden="true"
            className="absolute -bottom-7 left-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#eef2ff] text-xl font-bold text-[#4f46e5]"
          >
            {name.slice(0, 1)}
          </span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-[#4f46e5]">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> AI
          </span>
        </div>
        <div className="px-5 pb-4 pt-9">
          <h3 className="text-lg font-semibold leading-snug">
            {copy.polished.title}ของ{name}
          </h3>
          <ul className="mt-3 space-y-2">
            {copy.polished.lines.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6366f1]" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[#eef0f4] pt-2 text-[10px] tracking-wide text-[#8b93a1]">{copy.polished.footer}</p>
        </div>
        {/* Laminate: one soft band of light across the gloss. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.5) 44%, transparent 56%)" }}
        />
        {/* Shadow cast by the printer lip onto the top of the sheet. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-4"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.32), transparent 16px)" }}
        />
        <RubberStamp ink={PINK} delay={1200} className="bottom-3 right-3 text-3xl">
          ×1,000
        </RubberStamp>
      </article>
    </div>
  );
}

/** A pen doodle in the margin: the button moved from the bottom to the top. */
function MoveDoodle() {
  return (
    <svg viewBox="0 0 70 92" className="h-[92px] w-[70px]" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6.5 C8 4 9.5 3 12 3.2 L37.5 2.8 C40 2.9 41 4 41.2 6.6 L41.6 84 C41.5 86.6 40.2 87.6 37.6 87.5 L12.2 87.9 C9.6 87.8 8.4 86.7 8.3 84.2 Z" stroke={PEN.black} strokeWidth="1.6" />
      <path d="M21 8.5 h8" stroke={PEN.black} strokeWidth="1.4" />
      {/* Old spot, crossed out. */}
      <rect x="14.5" y="72" width="20" height="8" rx="2" stroke={PEN.black} strokeWidth="1.3" />
      <path d="M13 70 L36.5 82.5 M36 70 L13.5 82" stroke={PEN.red} strokeWidth="1.5" />
      {/* New spot, coloured in. */}
      <rect x="14.5" y="15" width="20" height="8" rx="2" fill={PEN.blue} fillOpacity="0.85" stroke={PEN.blue} strokeWidth="1.3" />
      <path d="M53 74 C60 58 60 36 52 21" stroke={PEN.blue} strokeWidth="1.7" />
      <path d="M47.5 25.5 L52 20.5 L57.5 24" stroke={PEN.blue} strokeWidth="1.7" />
    </svg>
  );
}

/** The real thing: a page from a notebook, by hand, dated and crooked. */
function NotebookPage({ copy, name }: { copy: Copy; name: string }) {
  return (
    <div className="about-place relative mx-auto w-full max-w-[26rem]" style={vars({ "--rest": "-1.6deg" })}>
      {/* Deeper shadow pocket under the lifted bottom-right corner. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-6 w-[40%] rotate-[2.5deg] rounded-[50%]"
        style={{ background: "radial-gradient(ellipse at 72% 62%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 75%)", filter: "blur(5px)" }}
      />
      <div className="relative" style={{ filter: "drop-shadow(5px 14px 12px rgba(0,0,0,0.6))" }}>
        {/* Torn-edge fibres: a pale white paper core peeking 2px along the tear. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-[2px] h-6"
          style={{ clipPath: TORN, backgroundColor: "#fffdf6" }}
        />
        <article
          className="about-notebook relative overflow-hidden pb-28 pt-[51px]"
          style={{ clipPath: TORN, color: PEN.black, borderBottomRightRadius: "60% 10px" }}
        >
          <span aria-hidden="true" className="about-coffee -bottom-12 -left-10" />
          <h3 className="about-hand pl-[98px] pr-24 text-[26px] leading-[32px]" style={{ color: PEN.black }}>
            {copy.real.title}ของ{name}
          </h3>
          <ol className="mt-8">
            {copy.real.lines.map((line, i) => {
              const broke = i === 2;
              return (
                <li key={line.day} className="about-hand grid grid-cols-[84px_1fr] text-[19px] leading-[32px]">
                  <span className="pl-3.5" style={{ color: PEN.blue }}>
                    {line.day}
                  </span>
                  <span className="pl-3.5 pr-5">
                    {line.tried && (
                      <>
                        <s style={{ textDecorationThickness: 2, textDecorationColor: PEN.black, opacity: 0.75 }}>{line.tried}</s>{" "}
                      </>
                    )}
                    <span
                      style={
                        broke
                          ? {
                              textDecorationLine: "underline",
                              textDecorationStyle: "wavy",
                              textDecorationColor: PEN.red,
                              textDecorationThickness: 1.5,
                              textUnderlineOffset: 6,
                            }
                          : undefined
                      }
                    >
                      {line.text}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <span className="absolute bottom-5 right-6 -rotate-3">
            <MoveDoodle />
          </span>
          {/* Subtle top-left-to-bottom-right paper shading so the sheet has weight. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.06), transparent 40%, rgba(60,40,20,0.08))" }}
          />
        </article>
      </div>
      <span aria-hidden="true" className="about-tape -left-5 top-2 -rotate-[32deg]" />
      <span aria-hidden="true" className="about-tape -right-6 top-3 rotate-[28deg]" />
      <span className="about-tape right-4 top-12 flex !h-auto !w-auto rotate-[4deg] items-center justify-center px-3.5 py-0.5">
        <span className="about-hand text-[16px] leading-snug text-[#2b2620]">{copy.real.tag}</span>
      </span>
      <RubberStamp ink={BLUE} delay={720} className="bottom-8 left-[92px] text-[28px]">
        {copy.real.stamp}
      </RubberStamp>
    </div>
  );
}

/* ---------- The name tag ---------- */

/** A stick-on name tag: a printed band, then a white panel you write on. */
function NameTag({ copy, value, onChange }: { copy: Copy; value: string; onChange: (v: string) => void }) {
  const inputId = useId();
  const [hello, ...rest] = copy.nameLabel.split(" ");
  return (
    <div
      className="relative -rotate-[1.5deg] overflow-hidden rounded-[14px]"
      style={{ backgroundColor: BLUE, boxShadow: "0 1px 1px rgba(0,0,0,0.2), 5px 14px 22px -10px rgba(0,0,0,0.75)" }}
    >
      <label htmlFor={inputId} className="block px-4 pb-2 pt-2 text-center text-white" style={{ backgroundColor: BLUE }}>
        <span className="block font-kodchasan text-[28px] font-bold leading-tight tracking-tight">{hello}</span>
        <span className="block text-[15px] font-semibold leading-tight">{rest.join(" ")}</span>
      </label>
      <div className="border-x-[7px] bg-white px-4 pb-3 pt-2" style={{ borderColor: BLUE }}>
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_NAME))}
          placeholder={copy.namePlaceholder}
          autoComplete="off"
          maxLength={MAX_NAME}
          className="about-nametag-input"
        />
      </div>
      <span aria-hidden="true" className="block h-3" style={{ backgroundColor: BLUE }} />
    </div>
  );
}

/**
 * The portfolio machine: write a nickname on the tag, let the "AI" print
 * the portfolio, then see the real thing, which the machine cannot make.
 * Nothing typed leaves the browser.
 */
export function PortfolioMachine({ copy }: { copy: Copy }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState("");
  const [run, setRun] = useState(0);
  const shown = name.trim() || copy.defaultName;

  const make = (event: FormEvent) => {
    event.preventDefault();
    setRun((n) => n + 1);
    setPhase("polished");
  };

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      <div>
        <p className="max-w-md text-base leading-relaxed sm:text-lg" style={{ color: "rgba(242,234,217,0.85)" }}>
          {copy.intro}
        </p>
        <form onSubmit={make} className="mt-9 max-w-[19rem]">
          <NameTag copy={copy} value={name} onChange={setName} />
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {phase === "idle" && (
              <button type="submit" className="shift-button">
                <span>{copy.makeButton}</span>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {phase === "polished" && (
              <button type="button" className="shift-button" onClick={() => setPhase("real")}>
                <span>{copy.realButton}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {phase !== "idle" && (
              <button type="button" className="about-ghost" onClick={() => setPhase("idle")}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {copy.againButton}
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <Machine phase={phase} copy={copy} printKey={`${run}-${shown}`} />
        {/* Output area: idle paper edge and printed sheet start right inside the slit. */}
        <div className="relative z-30" aria-live="polite">
          {phase === "idle" && (
            <div
              aria-hidden="true"
              className="-mt-[11px] px-5 pb-12"
              style={{ clipPath: "inset(0 -80px -80px -80px)" }}
            >
              <span
                className="relative mx-auto block h-[14px] w-full max-w-[21rem] rounded-b-[2px] bg-[#f3f1ea]"
                style={{
                  boxShadow: "0 3px 5px rgba(0,0,0,0.45)",
                  backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 5px, transparent 10px)",
                }}
              />
            </div>
          )}
          {phase === "polished" && (
            <div>
              <div className="-mt-[11px] px-5" style={{ clipPath: "inset(0 -80px -80px -80px)" }}>
                <PolishedSheet key={`p-${run}-${shown}`} copy={copy} name={shown} />
              </div>
              <p
                className="about-pop mx-auto mt-4 max-w-[21rem] px-3 text-sm leading-relaxed"
                style={vars({ color: "rgba(242,234,217,0.78)", "--d": "1350ms" })}
              >
                {copy.polished.caption}
              </p>
            </div>
          )}
          {phase === "real" && (
            <div className="px-3 pt-9">
              <NotebookPage key={`r-${shown}`} copy={copy} name={shown} />
              <p
                className="about-pop mx-auto mt-10 max-w-[26rem] text-sm font-semibold leading-relaxed"
                style={vars({ color: YELLOW, "--d": "900ms" })}
              >
                {copy.real.caption}
              </p>
              <p
                className="about-pop mx-auto mt-3 max-w-[26rem] text-sm leading-relaxed"
                style={vars({ color: "rgba(242,234,217,0.78)", "--d": "1100ms" })}
              >
                {copy.aiLine}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
