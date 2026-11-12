"use client";

import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { ExternalLink, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AgendaList } from "@/components/calendar/AgendaList";
import { BlockForm } from "@/components/calendar/BlockForm";
import { useCalendar } from "@/components/calendar/useCalendar";
import { addDays, bangkokParts, shortThaiDay, timeRange, type CalendarBlock } from "@/lib/calendar/core";
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
  const [added, setAdded] = useState<string | null>(null);
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
          tone="grain"
          attachBoard={board.role === "owner" ? { id: board.id, title: board.title } : undefined}
          rooms={calendar.share.rooms}
          onSubmit={async (input) => {
            const id = await calendar.create(input);
            if (id) setAdded(id);
            return Boolean(id);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAdding(true)} className="wb-btn wb-btn--solid inline-flex min-h-8 items-center gap-1 px-3 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> เพิ่มนัด
          </button>
          <a href="/calendar" target="_blank" rel="noreferrer" className="wb-link ml-auto inline-flex items-center gap-1 text-xs">
            ดูทั้งสัปดาห์ <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
      {/* No colour legend here: on a board each row names its kind in words (tone="grain"). */}
      <AgendaList
        tone="grain"
        key={added ?? "list"}
        initialOpen={added}
        calendar={calendar}
        onPlace={editable ? place : undefined}
        attachBoard={board.role === "owner" ? { id: board.id, title: board.title } : undefined}
      />
    </div>
  );
}
