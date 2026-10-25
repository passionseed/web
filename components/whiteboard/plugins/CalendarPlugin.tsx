"use client";

import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { ExternalLink, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AgendaList } from "@/components/calendar/AgendaList";
import { BlockForm } from "@/components/calendar/BlockForm";
import { useCalendar } from "@/components/calendar/useCalendar";
import { KIND_STYLE, addDays, bangkokParts, shortThaiDay, timeRange, type CalendarBlock } from "@/lib/calendar/core";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { STICKY_COLORS } from "@/lib/whiteboard/core";
import { sticky } from "@/lib/whiteboard/templates";

import { insertSkeletons } from "../insert";
import type { BoardPluginProps } from "./types";

const DAYS_SHOWN = 14;

/** The community calendar as a board window: the next two weeks, add a block, join, or drop one on the board. */
export function CalendarPlugin({ api, board, editable, broadcast, onBroadcast }: BoardPluginProps) {
  const today = bangkokToday();
  const calendar = useCalendar(today, addDays(today, DAYS_SHOWN - 1), broadcast);
  const [adding, setAdding] = useState(false);
  const { reload } = calendar;

  // Someone else on the board changed the calendar.
  useEffect(() => onBroadcast(() => void reload()), [onBroadcast, reload]);

  const place = useCallback(
    (block: CalendarBlock) => {
      const lines = [block.title, `${shortThaiDay(bangkokParts(block.startsAt).date)} ${timeRange(block)}`, block.place ?? ""];
      const fill = block.kind === "deadline" ? "Pink" : block.kind === "work" ? "Blue" : "Orange";
      const note = sticky(0, 0, STICKY_COLORS.find((c) => c.name === fill)!.fill, lines.filter(Boolean).join("\n"), 240) as {
        label?: object;
      };
      insertSkeletons(api, [{ ...note, label: { ...note.label, fontSize: 18 } } as ExcalidrawElementSkeleton]);
    },
    [api],
  );

  return (
    <div className="space-y-3 p-3">
      {adding ? (
        <BlockForm
          attachBoard={board.role === "owner" ? { id: board.id, title: board.title } : undefined}
          onSubmit={calendar.create}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white">
            <Plus className="h-3.5 w-3.5" /> เพิ่มนัด
          </button>
          <a href="/calendar" target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100">
            ดูทั้งสัปดาห์ <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] opacity-60">
        {Object.values(KIND_STYLE).map((k) => (
          <span key={k.label} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.color }} /> {k.label}
          </span>
        ))}
      </div>
      <AgendaList
        calendar={calendar}
        onPlace={editable ? place : undefined}
        attachBoard={board.role === "owner" ? { id: board.id, title: board.title } : undefined}
      />
    </div>
  );
}
