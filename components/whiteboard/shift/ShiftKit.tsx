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
      <span className="mt-0.5 line-clamp-2 block opacity-75">{card.prompt}</span>
    </button>
  );
}

function CardGroup({ api, title, kinds }: { api: ExcalidrawImperativeAPI; title: string; kinds: ShiftCardKind[] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {kinds.map((kind) => (
          <CardButton key={kind} api={api} kind={kind} />
        ))}
      </div>
    </section>
  );
}

/** The SHIFT tab of the board kit: a project frame and the typed cards students log their project with. */
export function ShiftKit({ api, myName }: { api: ExcalidrawImperativeAPI; myName: string }) {
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => insertProjectFrame(api, myName)}
        className="wb-tile wb-tile--primary flex w-full items-start gap-3 p-3 text-left"
      >
        <Frame className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          <span className="block text-sm font-semibold">+ โปรเจกต์ · Project frame</span>
          <span className="block text-xs opacity-70">การ์ดที่อยู่ในกรอบ คืองานของโปรเจกต์นี้</span>
        </span>
      </button>

      <CardGroup api={api} title="ความคิดของเรา · เก็บเวอร์ชันได้" kinds={BELIEFS} />
      <CardGroup api={api} title="สิ่งที่เกิดขึ้น · การ์ดใหม่ทุกครั้ง" kinds={EVENTS} />

      <div className="space-y-1 text-xs opacity-60">
        <p>ลากลูกศรจากการ์ดที่ทำให้เปลี่ยน ไปที่การ์ดเปลี่ยนแผน</p>
        <p>ทุกการ์ดบันทึกว่าใครเขียน เมื่อไหร่ · มีใน 📚 Library ด้วย</p>
      </div>
    </div>
  );
}
