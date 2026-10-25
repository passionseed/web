"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { KIND_STYLE, addDays, shortThaiDay, weekStart, type CalendarBlock } from "@/lib/calendar/core";

import { AgendaList } from "./AgendaList";
import { BlockDetails } from "./BlockDetails";
import { BlockForm } from "./BlockForm";
import { useCalendar } from "./useCalendar";
import { WeekView } from "./WeekView";

type Panel = { kind: "add"; date: string; hour?: number } | { kind: "open"; id: string; fresh?: boolean } | { kind: "edit"; id: string } | null;

/** /calendar: the community's week of time blocks. */
export function CalendarPage({ monday, initialBlock }: { monday: string; initialBlock?: string | null }) {
  const [week, setWeek] = useState(monday);
  const calendar = useCalendar(week, addDays(week, 6));
  const [panel, setPanel] = useState<Panel>(initialBlock ? { kind: "open", id: initialBlock } : null);
  const blocks = calendar.blocks ?? [];
  const current = panel && panel.kind !== "add" ? blocks.find((b) => b.id === panel.id) : undefined;

  const show = (next: string) => {
    setWeek(next);
    setPanel(null);
    window.history.replaceState(null, "", `/calendar?week=${next}`);
  };

  return (
    <main className="min-h-screen bg-[#0f0d1a] px-5 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">ปฏิทินชุมชน</h1>
            <p className="mt-1 text-sm text-white/60">นัดเจอ นั่งทำงานด้วยกัน เดดไลน์ ใครก็เพิ่มได้ กด &quot;ไปด้วย&quot; ให้เพื่อนรู้ว่าเราจะมา</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/whiteboard" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:border-white/30 hover:text-white">
              ไวท์บอร์ด
            </Link>
            <button type="button" onClick={() => setPanel({ kind: "add", date: week })} className="ei-button-dusk inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
              <Plus className="h-4 w-4" /> เพิ่มนัด
            </button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <button type="button" onClick={() => show(addDays(week, -7))} className="rounded-lg border border-white/15 p-1.5 hover:border-white/30" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => show(addDays(week, 7))} className="rounded-lg border border-white/15 p-1.5 hover:border-white/30" aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="font-medium">
            {shortThaiDay(week)} – {shortThaiDay(addDays(week, 6))}
          </span>
          {week !== monday && (
            <button type="button" onClick={() => show(monday)} className="text-xs text-white/60 underline">
              สัปดาห์นี้
            </button>
          )}
          <span className="ml-auto flex flex-wrap gap-3 text-xs text-white/60">
            {Object.values(KIND_STYLE).map((k) => (
              <span key={k.label} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: k.color }} /> {k.label}
              </span>
            ))}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="hidden md:block">
            <WeekView
              monday={week}
              blocks={blocks}
              onOpen={(b: CalendarBlock) => setPanel({ kind: "open", id: b.id })}
              onAdd={(date, hour) => setPanel({ kind: "add", date, hour })}
            />
          </div>
          <div className="md:hidden">
            <AgendaList calendar={calendar} initialOpen={initialBlock} />
          </div>

          <aside className={`order-first md:order-none ${panel ? "" : "hidden"} md:block`}>
            <div className="ei-card ei-card--static sticky top-6 p-4">
              {panel?.kind === "add" ? (
                <BlockForm
                  key={`${panel.date}-${panel.hour}`}
                  date={panel.date}
                  hour={panel.hour}
                  onSubmit={async (input) => {
                    const id = await calendar.create(input);
                    if (id) {
                      // Show the week the new block is in, opened, with the share nudge.
                      if (weekStart(input.date) !== week) show(weekStart(input.date));
                      setPanel({ kind: "open", id, fresh: true });
                    }
                    // The new block opens in place of the form.
                    return false;
                  }}
                  onCancel={() => setPanel(null)}
                />
              ) : panel?.kind === "edit" && current ? (
                <BlockForm key={current.id} block={current} onSubmit={(input) => calendar.update(current.id, input)} onCancel={() => setPanel(null)} />
              ) : current ? (
                <BlockDetails
                  block={current}
                  share={calendar.share}
                  fresh={panel?.kind === "open" && panel.fresh}
                  onJoin={(joined) => void calendar.join(current.id, joined)}
                  onEdit={() => setPanel({ kind: "edit", id: current.id })}
                  onDelete={async () => (await calendar.remove(current.id)) && setPanel(null)}
                />
              ) : (
                <p className="text-sm text-white/60">กดที่นัดเพื่อดูว่าใครไปบ้าง หรือกดช่องว่างในตารางเพื่อเพิ่มนัดตรงเวลานั้น</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
