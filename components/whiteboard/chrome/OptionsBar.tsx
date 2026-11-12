"use client";

import type { ToolType } from "@excalidraw/excalidraw/types";
import { Circle, Diamond, Globe, Image as ImageIcon, Minus, MoveUpRight, Pointer, Square, Workflow } from "lucide-react";
import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useRef } from "react";

import { STICKY_COLORS } from "@/lib/whiteboard/core";

import { NibIcon } from "./ObjectTools";
import { INK_COLORS, type PenMode, type ShapeType, STICKY_THAI, TEXT_SIZES, type ToolOptions } from "./toolOptions";
import { focusCanvas } from "./useActiveTool";
import type { BindDrag } from "./useDragOut";

export type OptionsPanel = "pen" | "sticky" | "shapes" | "text";

const icon = "h-[22px] w-[22px]";
const tipOf = (label: string, shortcut?: string) => (shortcut ? `${label}  ${shortcut}` : label);
const ariaOf = (label: string, shortcut?: string) => (shortcut ? `${label} (${shortcut})` : label);

const SHAPES: { type: ShapeType; label: string; shortcut: string; icon: ReactNode }[] = [
  { type: "rectangle", label: "สี่เหลี่ยม · Rectangle", shortcut: "R", icon: <Square className={icon} aria-hidden /> },
  { type: "ellipse", label: "วงรี · Ellipse", shortcut: "O", icon: <Circle className={icon} aria-hidden /> },
  { type: "diamond", label: "ข้าวหลามตัด · Diamond", shortcut: "D", icon: <Diamond className={icon} aria-hidden /> },
  { type: "line", label: "เส้น · Line", shortcut: "L", icon: <Minus className={`${icon} -rotate-45`} aria-hidden /> },
  { type: "arrow", label: "ลูกศร · Arrow", shortcut: "A", icon: <MoveUpRight className={icon} aria-hidden /> },
];

/** Less-used tools that Excalidraw's own toolbar had; their shortcuts still work. */
const MORE: { type: ToolType; label: string; shortcut?: string; icon: ReactNode }[] = [
  { type: "image", label: "รูปภาพ · Image", shortcut: "9", icon: <ImageIcon className={icon} aria-hidden /> },
  { type: "laser", label: "เลเซอร์ชี้ · Laser pointer", shortcut: "K", icon: <Pointer className={icon} aria-hidden /> },
  { type: "embeddable", label: "ฝังเว็บ · Web embed", icon: <Globe className={icon} aria-hidden /> },
];

const PEN_MODES: { mode: PenMode; label: string; shortcut?: string }[] = [
  { mode: "marker", label: "มาร์กเกอร์ · Marker", shortcut: "P" },
  { mode: "highlighter", label: "ปากกาเน้นข้อความ · Highlighter" },
  { mode: "eraser", label: "ยางลบ · Eraser", shortcut: "E" },
];

const Divider = () => <span className="wb-bar__divider" aria-hidden />;

function Opt({
  label,
  shortcut,
  on,
  className = "",
  children,
  ...rest
}: { label: string; shortcut?: string; on?: boolean; children: ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title">) {
  return (
    <button
      type="button"
      aria-label={ariaOf(label, shortcut)}
      aria-pressed={on}
      data-tip={tipOf(label, shortcut)}
      data-tip-side="top"
      className={`wb-opt ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Colour dots, then a dot that opens the system colour picker. The one in use wears a ring. */
function ColorDots({ value, onPick }: { value: string; onPick: (color: string) => void }) {
  const custom = !INK_COLORS.some((c) => c.value === value.toLowerCase());
  const input = useRef<HTMLInputElement>(null);
  // "change" (not React's onChange, which is "input") fires once, when the picker closes.
  useEffect(() => {
    const el = input.current;
    el?.addEventListener("change", focusCanvas);
    return () => el?.removeEventListener("change", focusCanvas);
  }, []);
  return (
    <div className="wb-dots" role="group" aria-label="สี · Colour">
      {INK_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-label={c.name}
          aria-pressed={c.value === value.toLowerCase()}
          data-tip={c.name}
          data-tip-side="top"
          className="wb-dot"
          style={{ background: c.value }}
          onClick={() => onPick(c.value)}
        />
      ))}
      <label className={`wb-dot wb-dot--custom ${custom ? "wb-dot--on" : ""}`} data-tip="เลือกสีเอง · Custom colour" data-tip-side="top" style={custom ? { background: value } : undefined}>
        {!custom && (
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden focusable="false">
            <path d="M6 2v8M2 6h8" />
          </svg>
        )}
        <input ref={input} type="color" aria-label="เลือกสีเอง · Custom colour" value={value} onChange={(e) => onPick(e.target.value)} />
      </label>
    </div>
  );
}

type Props = {
  panel: OptionsPanel;
  tool: ToolType;
  options: ToolOptions;
  setOptions: Dispatch<SetStateAction<ToolOptions>>;
  setNib: (value: { color?: string; thick?: boolean }) => void;
  onPenMode: (mode: PenMode) => void;
  onTool: (type: ToolType) => void;
  onStickyColor: (color: string) => void;
  /** Opens Excalidraw's text-to-diagram (Mermaid) dialog. */
  onTextToDiagram: () => void;
  /** Shapes can be dragged out of this bar too. */
  bindShape: (type: ShapeType) => ReturnType<BindDrag>;
};

/**
 * The options of the active tool, in a card above the bottom bar. This is the only place tool
 * defaults are set: Excalidraw's own panel is hidden until something is selected.
 */
export function OptionsBar({ panel, tool, options, setOptions, setNib, onPenMode, onTool, onStickyColor, onTextToDiagram, bindShape }: Props) {
  const penMode: PenMode = tool === "eraser" ? "eraser" : options.pen.mode;
  const nib = options.pen[options.pen.mode];

  return (
    <div
      className="wb-options"
      role="toolbar"
      aria-label="ตัวเลือกเครื่องมือ · Tool options"
      // Back to the canvas after every click, so shortcuts, undo and paste keep working. The
      // colour input keeps focus while its picker is open.
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("label")) focusCanvas();
      }}
    >
      {panel === "pen" && (
        <>
          <div className="wb-options__group">
            {PEN_MODES.map((m) => (
              <Opt key={m.mode} label={m.label} shortcut={m.shortcut} on={penMode === m.mode} onClick={() => onPenMode(m.mode)}>
                <NibIcon mode={m.mode} color={m.mode === "eraser" ? undefined : options.pen[m.mode].color} />
              </Opt>
            ))}
          </div>
          {penMode !== "eraser" && (
            <>
              <Divider />
              <div className="wb-options__group">
                <Opt label="เส้นบาง · Thin" on={!nib.thick} onClick={() => setNib({ thick: false })}>
                  <span className="wb-weight wb-weight--thin" aria-hidden />
                </Opt>
                <Opt label="เส้นหนา · Thick" on={nib.thick} onClick={() => setNib({ thick: true })}>
                  <span className="wb-weight wb-weight--thick" aria-hidden />
                </Opt>
              </div>
              <Divider />
              <ColorDots value={nib.color} onPick={(color) => setNib({ color })} />
            </>
          )}
        </>
      )}

      {panel === "sticky" && (
        <div className="wb-dots" role="group" aria-label="สีโน้ต · Sticky colour">
          {STICKY_COLORS.map((c) => {
            const label = `โน้ต${STICKY_THAI[c.name] ?? ""} · ${c.name} sticky`;
            return (
              <button
                key={c.name}
                type="button"
                aria-label={label}
                aria-pressed={options.sticky === c.fill}
                data-tip={label}
                data-tip-side="top"
                className="wb-dot wb-dot--sticky"
                style={{ background: c.fill }}
                onClick={() => onStickyColor(c.fill)}
              />
            );
          })}
        </div>
      )}

      {panel === "shapes" && (
        <>
          <div className="wb-options__group">
            {SHAPES.map((s) => (
              <Opt key={s.type} label={s.label} shortcut={s.shortcut} on={tool === s.type} className="wb-opt--drag" {...bindShape(s.type)}>
                {s.icon}
              </Opt>
            ))}
          </div>
          <Divider />
          <ColorDots value={options.shape.color} onPick={(color) => setOptions((o) => ({ ...o, shape: { ...o.shape, color } }))} />
          <Opt label="เติมสีพื้น · Fill" on={options.shape.fill} onClick={() => setOptions((o) => ({ ...o, shape: { ...o.shape, fill: !o.shape.fill } }))}>
            <span className="wb-fill" style={{ borderColor: options.shape.color, background: options.shape.fill ? options.shape.color : undefined }} aria-hidden />
          </Opt>
          <Divider />
          <div className="wb-options__group">
            {MORE.map((m) => (
              <Opt key={m.type} label={m.label} shortcut={m.shortcut} on={tool === m.type} onClick={() => onTool(m.type)}>
                {m.icon}
              </Opt>
            ))}
            <Opt label="ข้อความเป็นแผนภาพ · Text to diagram" onClick={onTextToDiagram}>
              <Workflow className={icon} aria-hidden />
            </Opt>
          </div>
        </>
      )}

      {panel === "text" && (
        <>
          <div className="wb-options__group">
            {TEXT_SIZES.map((s) => (
              <Opt key={s.key} label={s.label} on={options.text.size === s.value} className="wb-opt--size" onClick={() => setOptions((o) => ({ ...o, text: { ...o.text, size: s.value } }))}>
                {s.key}
              </Opt>
            ))}
          </div>
          <Divider />
          <ColorDots value={options.text.color} onPick={(color) => setOptions((o) => ({ ...o, text: { ...o.text, color } }))} />
        </>
      )}
    </div>
  );
}
