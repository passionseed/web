"use client";

import "./calendar.css";

import { useEffect, useRef } from "react";

import { KIND_STYLE, addDays, layoutWeek, shortThaiDay, timeRange, type CalendarBlock } from "@/lib/calendar/core";
import { bangkokToday } from "@/lib/content/shift-cohort";

const FIRST_HOUR = 7;
const LAST_HOUR = 24;
const HOUR_PX = 44;

/** A Monday-to-Sunday grid of time blocks. Click an empty hour to add one there. */
export function WeekView({
  monday,
  blocks,
  onOpen,
  onAdd,
}: {
  monday: string;
  blocks: CalendarBlock[];
  onOpen: (block: CalendarBlock) => void;
  onAdd: (date: string, hour: number) => void;
}) {
  const today = bangkokToday();
  const scroller = useRef<HTMLDivElement>(null);
  // Most blocks are after school: start the view at 16:00.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = (16 - FIRST_HOUR) * HOUR_PX;
  }, []);
  const placed = layoutWeek(blocks, monday, FIRST_HOUR, LAST_HOUR);
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const px = (minutes: number) => (minutes / 60) * HOUR_PX;

  return (
    <div className="cal-line overflow-hidden rounded-2xl border">
      <div className="cal-line grid grid-cols-[3rem_repeat(7,1fr)] border-b text-xs">
        <div />
        {Array.from({ length: 7 }, (_, d) => {
          const date = addDays(monday, d);
          return (
            <div key={date} className={`px-2 py-2 font-medium ${date === today ? "text-orange-400" : "opacity-70"}`}>
              {shortThaiDay(date)}
            </div>
          );
        })}
      </div>
      <div ref={scroller} className="max-h-[70vh] overflow-y-auto">
        <div className="relative grid grid-cols-[3rem_repeat(7,1fr)]" style={{ height: hours.length * HOUR_PX }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="pr-1.5 text-right text-[10px] opacity-50" style={{ height: HOUR_PX }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, d) => {
            const date = addDays(monday, d);
            return (
              <div key={date} className={`cal-grid-line relative border-l ${date === today ? "bg-orange-400/5" : ""}`}>
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-label={`Add at ${h}:00`}
                    onClick={() => onAdd(date, h)}
                    className="cal-grid-line cal-hover block w-full border-t"
                    style={{ height: HOUR_PX }}
                  />
                ))}
                {placed
                  .filter((b) => b.day === d)
                  .map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onOpen(b)}
                      className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm transition-transform hover:z-10 hover:scale-[1.02]"
                      style={{
                        top: px(b.top),
                        height: Math.max(px(b.height) - 2, 18),
                        left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / b.lanes}% - 4px)`,
                        background: KIND_STYLE[b.kind].color,
                        outline: b.joined ? "2px solid #fff" : undefined,
                      }}
                    >
                      <span className="block truncate font-semibold">{b.title}</span>
                      <span className="block truncate opacity-90">
                        {timeRange(b)}
                        {b.source === "block" ? ` · ${b.people.length} คน` : ""}
                      </span>
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
