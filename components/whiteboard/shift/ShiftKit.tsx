"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Frame } from "lucide-react";

import { SHIFT_CARD_KINDS, SHIFT_CARDS, shortTitle, type ShiftCardKind } from "@/lib/whiteboard/shift-cards";

import { insertProjectFrame, insertShiftCard } from "./insertShift";

const BELIEFS = SHIFT_CARD_KINDS.filter((k) => SHIFT_CARDS[k].versioned);
const EVENTS = SHIFT_CARD_KINDS.filter((k) => !SHIFT_CARDS[k].versioned);

function CardButton({ api, kind }: { api: ExcalidrawImperativeAPI; kind: ShiftCardKind }) {
  const card = SHIFT_CARDS[kind];
  return (
    <button
      type="button"
      onClick={() => insertShiftCard(api, kind)}
      className="rounded-md p-2 text-left text-xs shadow-sm ring-1 ring-black/10 transition-transform hover:-rotate-1 hover:scale-[1.03]"
      style={{ background: card.color, color: "#1e1e1e" }}
    >
      <span className="block font-semibold">
        {card.emoji} {shortTitle(kind)}
      </span>
      <span className="block truncate opacity-70">{card.lines.join(" ")}</span>
    </button>
  );
}

/** The SHIFT tab of the board kit: a project frame and the typed cards students log their project with. */
export function ShiftKit({ api, myName }: { api: ExcalidrawImperativeAPI; myName: string }) {
  return (
    <div className="space-y-5">
      <section>
        <button
          type="button"
          onClick={() => insertProjectFrame(api, myName)}
          className="wb-tile flex w-full items-start gap-3 p-3 text-left"
        >
          <Frame className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="block text-sm font-medium">+ โปรเจกต์ · Project frame</span>
            <span className="block text-xs opacity-60">กรอบของโปรเจกต์เรา การ์ดที่วางในกรอบนับเป็นของโปรเจกต์นี้</span>
          </span>
        </button>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide opacity-60">สิ่งที่เราเชื่อ · เก็บเวอร์ชันได้</h3>
        <p className="mb-2 text-xs opacity-60">เลือกการ์ดแล้วกด เก็บเวอร์ชัน ทุกครั้งที่ความคิดเปลี่ยน</p>
        <div className="grid grid-cols-2 gap-2">
          {BELIEFS.map((kind) => (
            <CardButton key={kind} api={api} kind={kind} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide opacity-60">สิ่งที่เกิดขึ้น · การ์ดใหม่ทุกครั้ง</h3>
        <p className="mb-2 text-xs opacity-60">คุยกับใคร ลองอะไร เปลี่ยนแผน ใช้การ์ดใหม่ทุกครั้ง ลากลูกศรเชื่อมได้</p>
        <div className="grid grid-cols-2 gap-2">
          {EVENTS.map((kind) => (
            <CardButton key={kind} api={api} kind={kind} />
          ))}
        </div>
      </section>

      <p className="text-xs opacity-60">บอร์ดจำว่าใครแปะการ์ดไหน เมื่อไหร่ ใช้ดูว่าโปรเจกต์เดินไปถึงไหน · มีใน 📚 Library ด้วย</p>
    </div>
  );
}
