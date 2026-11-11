"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { HAIR, T, accentFor, tint } from "./homeTheme";
import { HOME_DAY_ICONS } from "@/lib/content/home";
import type { ShiftDay } from "@/lib/content/shift-cohort";

const AUTOPLAY_MS = 3700;
/** Below this width the week is a list, and a moving list is hard to read. */
const LIST_LAYOUT = "(max-width: 639px)";

/**
 * Plays the week through on its own while it is on screen, then hands
 * control over for good the moment the visitor picks a day. Never plays on
 * the phone list, where opening the next day would shift what is being read.
 */
function useAutoplay(count: number, setActive: (fn: (i: number) => number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia(LIST_LAYOUT).matches
    ) {
      setPaused(true);
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, inView, count, setActive]);

  return { ref, stop: () => setPaused(true) };
}

interface DayProps {
  day: ShiftDay;
  index: number;
  active: boolean;
  onSelect: () => void;
}

function DayLabel({ day, index }: { day: ShiftDay; index: number }) {
  return (
    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accentFor(index) }}>
      Day {day.day}
    </span>
  );
}

/** Desktop: one column per day, so the whole week reads left to right. */
function DayTab({ day, index, active, onSelect }: DayProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className="group flex flex-col items-start gap-2 rounded-xl px-2.5 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.05)]"
      style={active ? { backgroundColor: tint("0f") } : undefined}
    >
      <span className={`transition-transform duration-300 ${active ? "scale-110" : "opacity-70 group-hover:opacity-100"}`}>
        <RisoIcon flat name={HOME_DAY_ICONS[index]} ink={accentFor(index)} size={34} />
      </span>
      <DayLabel day={day} index={index} />
      <span
        className="font-kodchasan text-[13px] font-semibold leading-snug [text-wrap:balance]"
        style={{ color: active ? T.text : tint("b3") }}
      >
        {day.title}
      </span>
    </button>
  );
}

/** Phone: one row per day; the open row carries the detail. */
function DayRow({ day, index, active, onSelect }: DayProps) {
  return (
    <li className={`border-b ${HAIR}`}>
      <button
        type="button"
        aria-expanded={active}
        onClick={onSelect}
        className="grid w-full grid-cols-[34px_1fr_auto] items-center gap-4 py-4 text-left"
      >
        <RisoIcon flat name={HOME_DAY_ICONS[index]} ink={accentFor(index)} size={34} />
        <span className="flex flex-col gap-0.5">
          <DayLabel day={day} index={index} />
          <span className="font-kodchasan text-base font-semibold leading-snug">{day.title}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${active ? "rotate-180" : ""}`}
          style={{ color: tint("80") }}
          aria-hidden="true"
        />
      </button>
      {active && (
        <p className="home-day-panel pb-5 pl-[50px] text-sm leading-relaxed" style={{ color: tint("cc") }}>
          {day.detail}
        </p>
      )}
    </li>
  );
}

export function WeekStepper({ schedule }: { schedule: ShiftDay[] }) {
  const [active, setActive] = useState(0);
  const { ref, stop } = useAutoplay(schedule.length, setActive);
  const day = schedule[active];

  const select = (i: number) => {
    stop();
    setActive(i);
  };

  return (
    <div ref={ref}>
      <ol className={`border-t sm:hidden ${HAIR}`}>
        {schedule.map((d, i) => (
          <DayRow key={d.day} day={d} index={i} active={i === active} onSelect={() => select(i)} />
        ))}
      </ol>

      <div className="hidden sm:block">
        <div role="tablist" aria-label="7 วันของ SHIFT" className="grid grid-cols-7 gap-1">
          {schedule.map((d, i) => (
            <DayTab key={d.day} day={d} index={i} active={i === active} onSelect={() => select(i)} />
          ))}
        </div>

        <div className="relative mt-3 h-[3px] overflow-hidden rounded-full" style={{ backgroundColor: tint("1a") }}>
          <div
            className="home-week-fill absolute inset-y-0 left-0 w-full"
            style={{
              transform: `scaleX(${(active + 1) / schedule.length})`,
              background: `linear-gradient(90deg, ${T.accent1}, ${T.accent2}, ${T.accent4})`,
            }}
          />
        </div>

        <div key={day.day} role="tabpanel" className="home-day-panel mt-8 grid grid-cols-[auto_1fr] items-start gap-6">
          <RisoIcon flat name={HOME_DAY_ICONS[active]} ink={accentFor(active)} size={88} />
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accentFor(active) }}>
              Day {day.day} · {day.label}
            </p>
            <h3 className="mt-2 font-kodchasan text-3xl font-semibold leading-snug">{day.title}</h3>
            <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: tint("cc") }}>
              {day.detail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
