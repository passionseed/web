"use client";

import type { ToolType } from "@excalidraw/excalidraw/types";
import { Circle, Diamond, Eraser, Frame, Globe, Image as ImageIcon, Minus, Square, WandSparkles, Workflow } from "lucide-react";
import type { ReactNode } from "react";

export type PickerTool = { type: ToolType; label: string; shortcut: string; icon: ReactNode };

const icon = "h-5 w-5";

export const SHAPES: PickerTool[] = [
  { type: "rectangle", label: "สี่เหลี่ยม · Rectangle", shortcut: "R", icon: <Square className={icon} aria-hidden /> },
  { type: "ellipse", label: "วงรี · Ellipse", shortcut: "O", icon: <Circle className={icon} aria-hidden /> },
  { type: "diamond", label: "ข้าวหลามตัด · Diamond", shortcut: "D", icon: <Diamond className={icon} aria-hidden /> },
  { type: "line", label: "เส้น · Line", shortcut: "L", icon: <Minus className={`${icon} -rotate-45`} aria-hidden /> },
];

/** Less-used tools that Excalidraw's own toolbar had; their shortcuts still work. */
export const MORE_TOOLS: PickerTool[] = [
  { type: "image", label: "รูปภาพ · Image", shortcut: "9", icon: <ImageIcon className={icon} aria-hidden /> },
  { type: "eraser", label: "ยางลบ · Eraser", shortcut: "E", icon: <Eraser className={icon} aria-hidden /> },
  { type: "laser", label: "เลเซอร์ชี้ · Laser pointer", shortcut: "K", icon: <WandSparkles className={icon} aria-hidden /> },
  { type: "frame", label: "เฟรม · Frame", shortcut: "F", icon: <Frame className={icon} aria-hidden /> },
  { type: "embeddable", label: "ฝังเว็บ · Web embed", shortcut: "", icon: <Globe className={icon} aria-hidden /> },
];

export const PICKER_TOOLS = [...SHAPES, ...MORE_TOOLS];

/** Shapes, then image, eraser, laser, frame, web embed and text to diagram. */
export function ShapePicker({
  tool,
  onPick,
  onTextToDiagram,
}: {
  tool: ToolType;
  onPick: (type: ToolType) => void;
  /** Opens Excalidraw's text-to-diagram (Mermaid) dialog. */
  onTextToDiagram?: () => void;
}) {
  const button = (t: PickerTool) => (
    <button
      key={t.type}
      type="button"
      aria-label={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
      aria-pressed={tool === t.type}
      data-tip={t.shortcut ? `${t.label}  ${t.shortcut}` : t.label}
      data-tip-side="top"
      onClick={() => onPick(t.type)}
      className={`wb-tool ${tool === t.type ? "wb-tool--on" : ""}`}
    >
      {t.icon}
    </button>
  );
  return (
    <div className="p-2">
      <p className="wb-popover__label">รูปทรง · Shapes</p>
      <div className="flex gap-1">{SHAPES.map(button)}</div>
      <p className="wb-popover__label mt-2">เครื่องมืออื่น · More tools</p>
      <div className="flex flex-wrap gap-1">
        {MORE_TOOLS.map(button)}
        {onTextToDiagram && (
          <button
            type="button"
            aria-label="ข้อความเป็นแผนภาพ · Text to diagram"
            data-tip="ข้อความเป็นแผนภาพ · Text to diagram"
            data-tip-side="top"
            onClick={onTextToDiagram}
            className="wb-tool"
          >
            <Workflow className={icon} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
