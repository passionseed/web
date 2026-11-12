"use client";

import { useEffect, useRef, useState } from "react";

import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { INK, inkFor, paper } from "@/components/shift/ShiftRiso";
import { HOME_DAY_ICONS } from "@/lib/content/home";
import type { ShiftDay } from "@/lib/content/shift-cohort";

const AUTOPLAY_MS = 3700;

/**
 * Plays the week through on its own while it is on screen, then hands
 * control over for good the moment the visitor picks a day.
 */
function useAutoplay(count: number, setActive: (fn: (i: number) => number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
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

function DayChip({
  day,
  index,
  active,
  onSelect,
}: {
  day: ShiftDay;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className="group flex flex-col items-center gap-2 rounded-md py-3 transition-colors hover:bg-[rgba(242,234,217,0.05)]"
    >
      <span
        className={`transition-transform duration-300 ${active ? "scale-110" : "opacity-45 group-hover:opacity-80"}`}
      >
        <RisoIcon name={HOME_DAY_ICONS[index]} ink={inkFor(index)} size={34} />
      </span>
      <span
        className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]"
        style={{ color: active ? INK.paper : paper("66") }}
      >
        D{day.day}
      </span>
    </button>
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
      <div role="tablist" aria-label="7 วันของ SHIFT" className="grid grid-cols-7 gap-1">
        {schedule.map((d, i) => (
          <DayChip key={d.day} day={d} index={i} active={i === active} onSelect={() => select(i)} />
        ))}
      </div>

      <div className="relative mt-2 h-[3px] overflow-hidden rounded-full" style={{ backgroundColor: paper("1a") }}>
        <div
          className="home-week-fill absolute inset-y-0 left-0 w-full"
          style={{
            transform: `scaleX(${(active + 1) / schedule.length})`,
            background: `linear-gradient(90deg, ${INK.orange}, ${INK.pink}, ${INK.yellow})`,
          }}
        />
      </div>

      <div key={day.day} role="tabpanel" className="home-day-panel mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="hidden sm:block">
          <RisoIcon name={HOME_DAY_ICONS[active]} ink={inkFor(active)} size={88} />
        </div>
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: inkFor(active) }}>
            Day {day.day} · {day.label}
          </p>
          <h3 className="mt-2 font-kodchasan text-2xl font-semibold leading-snug sm:text-3xl">{day.title}</h3>
          <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: paper("b3") }}>
            {day.detail}
          </p>
        </div>
      </div>
    </div>
  );
}
