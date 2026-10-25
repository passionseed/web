"use client";

import "./calendar.css";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { KIND_STYLE, bangkokParts, shortThaiDay, timeRange, type CalendarBlock } from "@/lib/calendar/core";
import { bangkokToday } from "@/lib/content/shift-cohort";

import { BlockDetails } from "./BlockDetails";
import { BlockForm } from "./BlockForm";
import type { CalendarApi } from "./useCalendar";

/** Upcoming blocks grouped by day; click one to open it. Used on boards and on phones. */
export function AgendaList({
  calendar,
  onPlace,
  attachBoard,
  initialOpen,
}: {
  calendar: CalendarApi;
  onPlace?: (block: CalendarBlock) => void;
  attachBoard?: { id: string; title: string };
  /** A block to show opened, e.g. the one just added (shown with the share nudge). */
  initialOpen?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(initialOpen ?? null);
  const [editing, setEditing] = useState<string | null>(null);
  const today = bangkokToday();
  const blocks = calendar.blocks ?? [];
  const days = [...new Set(blocks.map((b) => bangkokParts(b.startsAt).date))];

  if (calendar.blocks === null) return <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin opacity-50" />;
  if (blocks.length === 0) {
    return <p className="py-6 text-center text-sm opacity-60">ยังไม่มีนัดช่วงนี้ เพิ่มนัดแรกเลย</p>;
  }
  return (
    <div className="space-y-3">
      {days.map((day) => (
        <section key={day}>
          <h4 className="mb-1 text-xs font-semibold opacity-70">
            {day === today ? "วันนี้ · " : ""}
            {shortThaiDay(day)}
          </h4>
          <ul className="space-y-1">
            {blocks
              .filter((b) => bangkokParts(b.startsAt).date === day)
              .map((b) => (
                <li key={b.id} className="rounded-lg border cal-line">
                  {editing === b.id ? (
                    <div className="p-2">
                      <BlockForm block={b} attachBoard={attachBoard} onSubmit={(input) => calendar.update(b.id, input)} onCancel={() => setEditing(null)} />
                    </div>
                  ) : open === b.id ? (
                    <div className="p-2">
                      <button type="button" onClick={() => setOpen(null)} className="float-right text-xs opacity-50 hover:opacity-100">
                        ปิด
                      </button>
                      <BlockDetails
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
                    <button type="button" onClick={() => setOpen(b.id)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm cal-hover">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_STYLE[b.kind].color }} />
                      <span className="w-[5.5rem] shrink-0 text-xs tabular-nums opacity-70">{timeRange(b)}</span>
                      <span className="min-w-0 flex-1 truncate">{b.title}</span>
                      {b.source === "block" && (
                        <span className={`shrink-0 text-xs ${b.joined ? "text-orange-500" : "opacity-50"}`}>
                          {b.joined ? "✓ " : ""}
                          {b.people.length}
                        </span>
                      )}
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
