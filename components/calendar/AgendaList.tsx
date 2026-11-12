"use client";

import "./calendar.css";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { KIND_STYLE, bangkokParts, shortThaiDay, timeRange, type CalendarBlock } from "@/lib/calendar/core";
import { bangkokToday } from "@/lib/content/shift-cohort";

import { BlockDetails } from "./BlockDetails";
import { BlockForm } from "./BlockForm";
import type { CalendarApi } from "./useCalendar";

/**
 * How the calendar pieces dress. "grain" is the whiteboard chrome (whiteboard.css must be
 * loaded): paper, ink and periwinkle only, kinds told apart by their label, not a colour.
 */
export type CalendarTone = "default" | "grain";

/** Upcoming blocks grouped by day; click one to open it. Used on boards and on phones. */
export function AgendaList({
  calendar,
  onPlace,
  attachBoard,
  initialOpen,
  tone = "default",
}: {
  calendar: CalendarApi;
  onPlace?: (block: CalendarBlock) => void;
  attachBoard?: { id: string; title: string };
  /** A block to show opened, e.g. the one just added (shown with the share nudge). */
  initialOpen?: string | null;
  tone?: CalendarTone;
}) {
  const grain = tone === "grain";
  const soft = grain ? "wb-soft" : "opacity-60";
  const [open, setOpen] = useState<string | null>(initialOpen ?? null);
  const [editing, setEditing] = useState<string | null>(null);
  const today = bangkokToday();
  const blocks = calendar.blocks ?? [];
  const days = [...new Set(blocks.map((b) => bangkokParts(b.startsAt).date))];

  if (calendar.blocks === null) return <Loader2 className={`mx-auto my-6 h-5 w-5 animate-spin ${grain ? "wb-soft" : "opacity-50"}`} />;
  if (blocks.length === 0) {
    return <p className={`py-6 text-center text-sm ${soft}`}>ยังไม่มีนัดช่วงนี้ เพิ่มนัดแรกเลย</p>;
  }
  return (
    <div className="space-y-3">
      {days.map((day) => (
        <section key={day}>
          <h4 className={`mb-1 text-xs font-semibold ${grain ? "wb-soft" : "opacity-70"}`}>
            {day === today ? "วันนี้ · " : ""}
            {shortThaiDay(day)}
          </h4>
          <ul className="space-y-1">
            {blocks
              .filter((b) => bangkokParts(b.startsAt).date === day)
              .map((b) => (
                <li key={b.id} className={grain ? "wb-box" : "rounded-lg border cal-line"}>
                  {editing === b.id ? (
                    <div className="p-2">
                      <BlockForm tone={tone} block={b} attachBoard={attachBoard} rooms={calendar.share.rooms} onSubmit={(input) => calendar.update(b.id, input)} onCancel={() => setEditing(null)} />
                    </div>
                  ) : open === b.id ? (
                    <div className="p-2">
                      <button type="button" onClick={() => setOpen(null)} className={`float-right text-xs ${grain ? "wb-link" : "opacity-50 hover:opacity-100"}`}>
                        ปิด
                      </button>
                      <BlockDetails
                        tone={tone}
                        block={b}
                        share={calendar.share}
                        fresh={b.id === initialOpen}
                        onJoin={(joined) => void calendar.join(b.id, joined)}
                        onEdit={() => setEditing(b.id)}
                        onDelete={() => void calendar.remove(b.id)}
                        onPlace={onPlace ? () => onPlace(b) : undefined}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpen(b.id)}
                      className={`flex w-full items-center gap-2 px-2 text-left text-sm ${grain ? "wb-hover-row min-h-11 rounded-[9px]" : "cal-hover py-1.5"}`}
                    >
                      {!grain && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_STYLE[b.kind].color }} />}
                      <span className={`w-[5.5rem] shrink-0 text-xs ${grain ? "wb-num wb-soft" : "tabular-nums opacity-70"}`}>{timeRange(b)}</span>
                      <span className="min-w-0 flex-1 truncate">{b.title}</span>
                      {/* Grain has one colour and it is not for categories: the kind is a word. */}
                      {grain && <span className="wb-soft shrink-0 text-[10px]">{KIND_STYLE[b.kind].label}</span>}
                      {b.source === "block" &&
                        (grain ? (
                          <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs ${b.joined ? "wb-accent font-medium" : "wb-soft"}`}>
                            {b.joined && <Check className="h-3 w-3" strokeWidth={2} aria-hidden />}
                            <span className="wb-num">{b.people.length}</span>
                          </span>
                        ) : (
                          <span className={`shrink-0 text-xs ${b.joined ? "text-orange-500" : "opacity-50"}`}>
                            {b.joined ? "✓ " : ""}
                            {b.people.length}
                          </span>
                        ))}
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
