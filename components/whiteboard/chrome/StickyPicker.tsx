"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { STICKY_COLORS } from "@/lib/whiteboard/core";

import { addSticky } from "../KitSidebar";
import { focusCanvas } from "./useActiveTool";

const THAI_COLOR: Record<string, string> = {
  Yellow: "เหลือง",
  Orange: "ส้ม",
  Pink: "ชมพู",
  Purple: "ม่วง",
  Blue: "ฟ้า",
  Green: "เขียว",
  Gray: "เทา",
  Grey: "เทา",
  White: "ขาว",
};

/** Sticky colours: a click drops one in the middle of the screen, ready to type into. */
export function StickyPicker({ api, onDone }: { api: ExcalidrawImperativeAPI; onDone: () => void }) {
  return (
    <div className="p-2">
      <p className="wb-popover__label">โน้ต · Sticky note</p>
      <div className="grid grid-cols-4 gap-1.5">
        {STICKY_COLORS.map((c) => {
          const label = `โน้ต${THAI_COLOR[c.name] ?? ""} · ${c.name} sticky`;
          return (
            <button
              key={c.name}
              type="button"
              aria-label={label}
              data-tip={label}
              data-tip-side="top"
              onClick={() => {
                addSticky(api, c.fill);
                onDone();
                focusCanvas();
              }}
              className="wb-swatch"
              style={{ background: c.fill }}
            />
          );
        })}
      </div>
      <p className="mt-2 px-1 text-xs opacity-60">ดับเบิลคลิกที่โน้ตเพื่อพิมพ์ · Double-click to type</p>
    </div>
  );
}
