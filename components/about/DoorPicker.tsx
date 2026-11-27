"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";

import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import type { ABOUT_DOORS } from "@/lib/content/about";

type Copy = typeof ABOUT_DOORS;

const BLACK = "#17151c";
const YELLOW = "#ffe800";
/** Each destination's ink, chosen to print legibly on the paper ticket. */
const TICKET_INKS = ["#0078bf", "#ff48b0", "#ff6c2f", BLACK];

/** Bangkok time for the board's clock, set after mount so server and client agree. */
function useBangkokClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
    const tick = () => setTime(format.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

/** A barcode for the ticket, worked out from the destination so each one differs. */
function Barcode({ seed }: { seed: string }) {
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; x < 120; i++) {
    const code = seed.charCodeAt(i % seed.length) + i * 7;
    const w = (code % 3) + 1;
    if (i % 2 === 0) bars.push({ x, w });
    x += w + ((code >> 2) % 2) + 0.6;
  }
  return (
    <svg viewBox="0 0 120 30" className="h-8 w-32" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.w} height="30" fill={BLACK} />
      ))}
    </svg>
  );
}

/**
 * "Where are you now?": a departures board. Pick the row that sounds like
 * you and a ticket prints for the program that fits. The board is a radio
 * group with roving focus, so arrow keys move the choice.
 */
export function DoorPicker({ copy }: { copy: Copy }) {
  const [picked, setPicked] = useState(0);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const clock = useBangkokClock();
  const door = copy.doors[picked];
  const ink = TICKET_INKS[picked % TICKET_INKS.length];

  const move = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + copy.doors.length) % copy.doors.length;
    setPicked(next);
    rows.current[next]?.focus();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
      {/* The board: a black panel in a metal frame, hung from two rods, lit in dot letters. */}
      <div className="relative pt-7">
        {/* Two hanging rods with top mounting brackets. */}
        {[18, 82].map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${pos}%` }}
          >
            <span
              className="block h-[28px] w-[6px]"
              style={{
                background: "linear-gradient(90deg, #1b1920 0%, #3d3a45 38%, #2b2930 72%, #17151c 100%)",
                boxShadow: "2px 0 4px rgba(0,0,0,0.45)",
              }}
            />
            <span
              className="-mt-1 block h-[7px] w-[14px] rounded-t-[2px]"
              style={{
                background: "linear-gradient(180deg, #43404c 0%, #2b2930 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 1px 2px rgba(0,0,0,0.7)",
              }}
            />
          </span>
        ))}
        <div
          className="relative overflow-hidden rounded-[10px] p-2.5"
          style={{
            background: "linear-gradient(180deg, #3d3a44 0%, #1b1920 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.85), 6px 18px 30px -12px rgba(0,0,0,0.9)",
          }}
        >
          <div className="relative overflow-hidden rounded-[6px]" style={{ backgroundColor: "#09080b", boxShadow: "inset 0 2px 12px rgba(0,0,0,0.9)" }}>
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 px-4 pb-2.5 pt-3.5 text-[11px] font-semibold sm:px-5"
              style={{ color: "rgba(242,234,217,0.55)", borderBottom: "1px solid rgba(242,234,217,0.1)" }}
            >
              <span>{copy.board.you}</span>
              <span className="flex items-center gap-4">
                <span>{copy.board.to}</span>
                <span className="about-led text-sm tabular-nums" aria-hidden="true">
                  {clock ?? "--:--"}
                </span>
              </span>
            </div>
            <div role="radiogroup" aria-label={copy.heading}>
              {copy.doors.map((d, i) => {
                const on = i === picked;
                return (
                  <button
                    key={d.label}
                    ref={(el) => {
                      rows.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setPicked(i)}
                    onKeyDown={(e) => move(e, i)}
                    className="about-board-row relative grid w-full grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left transition-colors sm:px-5"
                    style={{
                      borderTop: i === 0 ? undefined : "1px dashed rgba(242,234,217,0.1)",
                    }}
                  >
                    <svg viewBox="0 0 10 12" className={`h-3 w-2.5 ${on ? "about-blink" : "opacity-0"}`} aria-hidden="true">
                      <polygon points="0,0 10,6 0,12" fill={YELLOW} />
                    </svg>
                    <span
                      className="font-kodchasan text-base font-semibold leading-snug sm:text-lg"
                      style={{
                        color: on ? "#f2ead9" : "rgba(242,234,217,0.72)",
                        textShadow: on ? "0 0 6px rgba(242,234,217,0.35)" : "none",
                      }}
                    >
                      {d.you}
                    </span>
                    <span
                      className="about-led text-right text-[13px] leading-tight sm:text-[15px]"
                      style={{
                        opacity: on ? 1 : 0.6,
                        textShadow: on ? "0 0 10px rgba(255,232,0,0.6)" : "none",
                      }}
                    >
                      {d.board}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* The LED dot grid sits over everything the board shows. */}
            <span aria-hidden="true" className="about-led-grid pointer-events-none absolute inset-0" />
            {/* Diagonal glass reflection over the panel, above the dot grid. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.06) 40%, transparent 52%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* The dispenser slot and the ticket it prints. */}
      <div className="relative mx-auto w-full max-w-[25rem] lg:mt-7" aria-live="polite">
        {/* Dispenser slot housing: metal hood, 10px dark slit, 6px lower lip. */}
        <div aria-hidden="true" className="relative z-10 mx-auto w-full">
          <div
            className="h-3 rounded-t-[6px]"
            style={{
              background: "linear-gradient(180deg, #3d3a44 0%, #24212b 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 4px 8px 16px -8px rgba(0,0,0,0.85)",
            }}
          />
          <div
            className="mx-auto h-[10px] w-[96%]"
            style={{
              backgroundColor: "#030204",
              boxShadow: "inset 0 3px 4px rgba(0,0,0,0.95)",
            }}
          />
          <div
            className="h-[6px] rounded-b-[6px]"
            style={{
              backgroundColor: "#2f2c35",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 4px rgba(0,0,0,0.6)",
            }}
          />
        </div>

        {/* Output wrapper starts inside the slit, clipped only along the top. */}
        <div
          className="relative z-20 mx-auto -mt-[11px] w-[92%]"
          style={{ clipPath: "inset(0 -80px -80px -80px)" }}
        >
          <div key={picked} className="about-feed" style={{ filter: "drop-shadow(5px 14px 12px rgba(0,0,0,0.6))" }}>
            <article className="about-ticket about-paper relative rounded-b-[10px]" style={{ color: BLACK }}>
              {/* Shadow cast by the dispenser lip onto the top of the ticket. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-4"
                style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.32), transparent 16px)" }}
              />
              <div className="px-5 pb-7 pt-5 sm:px-6">
                <p className="flex items-center justify-between gap-3 text-[11px] font-bold tracking-[0.12em]" style={{ color: "rgba(23,21,28,0.55)" }}>
                  <span>PASSIONSEED</span>
                  <span className="font-mono tabular-nums tracking-normal">No. {String(2569000 + picked * 137 + 41)}</span>
                </p>
                <div className="mt-4 grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 gap-y-2">
                  <span className="pt-0.5 text-xs font-bold" style={{ color: "rgba(23,21,28,0.55)" }}>
                    {copy.ticket.from}
                  </span>
                  <span className="text-sm font-semibold leading-snug">{door.you}</span>
                  <span className="pt-2.5 text-xs font-bold" style={{ color: ink }}>
                    {copy.ticket.to}
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-kodchasan text-[2rem] font-bold leading-tight tracking-tight">{door.label}</span>
                    <RisoIcon name={door.icon} ink={ink} size={48} />
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(23,21,28,0.78)" }}>
                  {door.body}
                </p>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <Barcode seed={door.board} />
                  <span
                    className="about-ink -rotate-3 rounded-[4px] border-2 px-2 py-0.5 text-[11px] font-bold"
                    style={{ borderColor: ink, color: ink }}
                  >
                    {copy.ticket.change}
                  </span>
                </div>
              </div>
              {/* Tear here: punched round perforation holes between the ticket and its stub. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 h-1"
                style={{
                  bottom: "calc(var(--stub) - 2px)",
                  background: "radial-gradient(circle 1.6px, rgba(23,21,28,0.38) 98%, transparent) 0 0 / 9px 4px repeat-x",
                }}
              />
              <div className="flex items-center px-5 sm:px-6" style={{ height: "var(--stub)" }}>
                <Link href={door.href} className="about-printed-cta">
                  <span>
                    {copy.go}: {door.label}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
