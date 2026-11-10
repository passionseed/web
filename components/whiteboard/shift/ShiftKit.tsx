"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Frame } from "lucide-react";

import { canvasZones, SHIFT_CARDS, shortTitle } from "@/lib/whiteboard/shift-cards";

import { insertProjectCanvas } from "./insertShift";

const ZONES = canvasZones();
const MAP_W = Math.max(...ZONES.map((z) => z.x + z.width));
const MAP_H = Math.max(...ZONES.map((z) => z.y + z.height));

/** A small, true-to-scale map of the project canvas, so students see which box is which before adding it. */
function CanvasMap() {
  return (
    <div className="relative mt-2.5 w-full" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }} aria-hidden>
      {ZONES.map((z, i) => (
        <span
          key={i}
          className="absolute flex items-start overflow-hidden rounded-[3px] px-1 py-0.5 text-[10px] leading-tight"
          style={{
            left: `${(z.x / MAP_W) * 100}%`,
            top: `${(z.y / MAP_H) * 100}%`,
            width: `${(z.width / MAP_W) * 100}%`,
            height: `${(z.height / MAP_H) * 100}%`,
            background: SHIFT_CARDS[z.kind].color,
            color: "#1e1e1e",
          }}
        >
          {z.day ? z.day : `${SHIFT_CARDS[z.kind].emoji} ${shortTitle(z.kind)}`}
        </span>
      ))}
    </div>
  );
}

/** The SHIFT tab of the board kit: one button that adds a project canvas. */
export function ShiftKit({ api, myName }: { api: ExcalidrawImperativeAPI; myName: string }) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => insertProjectCanvas(api, myName)}
        className="wb-tile wb-tile--primary w-full p-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Frame className="h-4 w-4 shrink-0" />+ แคนวาสโปรเจกต์ · Project canvas
        </span>
        <CanvasMap />
      </button>
      <div className="wb-soft space-y-1 text-xs">
        <p>กด + เพิ่ม ในช่องไหน ก็ได้โน้ตเรื่องนั้น</p>
        <p>ลากลูกศรจากสัมภาษณ์หรือทดสอบ ไปที่เปลี่ยนแผน เพื่อบอกว่าเปลี่ยนเพราะอะไร</p>
      </div>
    </div>
  );
}
