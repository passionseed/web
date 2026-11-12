"use client";

import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, ToolType } from "@excalidraw/excalidraw/types";
import { Frame, Hand, MessageCircle, MousePointer2, Plus, SmilePlus, Type } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import type { EMOTES } from "@/lib/whiteboard/core";

import { insertSkeletons } from "../insert";
import { addSticky } from "../KitSidebar";
import type { BoardPlugin } from "../plugins/types";
import { useScriptWindow } from "../script/ScriptButton";
import { AppsMenu } from "./AppsMenu";
import { type ClusterShape, ObjectTool, PenArt, ShapeCluster, ShapeObject, StickyArt } from "./ObjectTools";
import { OptionsBar, type OptionsPanel } from "./OptionsBar";
import { ReactionPicker } from "./ReactionPicker";
import { ToolButton } from "./ToolButton";
import { isShape, MORE_TYPES, type PenMode, type ShapeType, shapeSkeleton, useToolOptions } from "./toolOptions";
import { focusCanvas, useActiveTool } from "./useActiveTool";
import { useDismiss } from "./useDismiss";
import { useDragOut } from "./useDragOut";

type Pop = "react" | "apps" | null;

const icon = "h-6 w-6";

type Simple = { type: ToolType; label: string; shortcut: string; icon: React.ReactNode };

const POINTERS: Simple[] = [
  { type: "selection", label: "เลือก · Select", shortcut: "V", icon: <MousePointer2 className={icon} aria-hidden /> },
  { type: "hand", label: "มือ เลื่อนบอร์ด · Hand", shortcut: "H", icon: <Hand className={icon} aria-hidden /> },
];

const WRITERS: Simple[] = [
  { type: "text", label: "ข้อความ · Text", shortcut: "T", icon: <Type className={icon} aria-hidden /> },
  { type: "frame", label: "เฟรม · Frame", shortcut: "F", icon: <Frame className={icon} aria-hidden /> },
];

/** The three shapes on the bar, each its own object: the one you grab is the one you drag out. */
const CLUSTER: { type: ClusterShape; label: string; shortcut: string }[] = [
  { type: "rectangle", label: "สี่เหลี่ยม คลิกหรือลากไปวาง · Rectangle, click or drag out", shortcut: "R" },
  { type: "ellipse", label: "วงกลม คลิกหรือลากไปวาง · Circle, click or drag out", shortcut: "O" },
  { type: "arrow", label: "ลูกศร คลิกหรือลากไปวาง · Arrow, click or drag out", shortcut: "A" },
];

/** Tools whose defaults Excalidraw would show in its own panel with nothing selected. */
const QUIET_TOOLS: readonly string[] = ["selection", "hand", "eraser", "laser", "custom"];

const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input, textarea, [contenteditable="true"]');

/**
 * The floating bar at the bottom middle, like FigJam's: only the tools people
 * use all the time. Everything else is in the "+" Apps menu.
 */
export const BottomBar = memo(function BottomBar({
  api,
  boardId,
  editable,
  isAdmin,
  placingComment,
  onPlacingComment,
  onReact,
  openWindows,
  onToggleWindow,
  onPlace,
  onSettings,
}: {
  api: ExcalidrawImperativeAPI | null;
  boardId: string;
  editable: boolean;
  isAdmin: boolean;
  placingComment: boolean;
  onPlacingComment: (placing: boolean) => void;
  onReact: (emoji: (typeof EMOTES)[number]) => void;
  openWindows: Record<string, unknown>;
  onToggleWindow: (id: string) => void;
  onPlace?: (plugin: BoardPlugin) => void;
  onSettings: () => void;
}) {
  const { tool, selected, setTool } = useActiveTool(api);
  const { options, setOptions, setNib } = useToolOptions(api, tool);
  const [pop, setPop] = useState<Pop>(null);
  // The sticky colours stay open after a sticky is added, until another tool or a click on the board.
  const [stickyOpen, setStickyOpen] = useState(false);
  const lastSticky = useRef<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const bindDrag = useDragOut(api);
  // Focus goes back to the canvas whenever a popover closes, so shortcuts, undo and paste keep working.
  const close = useCallback(() => {
    setPop(null);
    focusCanvas();
  }, []);
  useDismiss(wrap, pop !== null, close);
  const closeSticky = useCallback(() => setStickyOpen(false), []);
  useDismiss(wrap, stickyOpen && pop === null, closeSticky);
  const script = useScriptWindow(boardId);

  // The sticky colours belong to Select. An effect, not a check while rendering: a click on the
  // stack opens them a moment before Excalidraw reports the switch back to Select.
  useEffect(() => {
    if (tool !== "selection") setStickyOpen(false);
  }, [tool]);

  const drawing = !placingComment && editable;
  const panel: OptionsPanel | null = !drawing
    ? null
    : tool === "freedraw" || tool === "eraser"
      ? "pen"
      : isShape(tool) || MORE_TYPES.includes(tool)
        ? "shapes"
        : tool === "text"
          ? "text"
          : stickyOpen
            ? "sticky"
            : null;

  // Tool defaults live in our options bar: Excalidraw's own panel shows only for a selection.
  const hideNative = editable && !selected && !QUIET_TOOLS.includes(tool);
  useEffect(() => {
    const room = wrap.current?.closest(".whiteboard-room");
    if (!room || !hideNative) return;
    room.setAttribute("data-tool-options", "1");
    return () => room.removeAttribute("data-tool-options");
  }, [hideNative]);

  // Escape puts the options away: back to Select. (A popover, or text being typed, takes Escape first.)
  useEffect(() => {
    if (!panel || pop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || isTyping(e.target)) return;
      setStickyOpen(false);
      setTool("selection");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, pop, setTool]);

  const toggle = (next: Exclude<Pop, null>) => {
    if (pop === next) close();
    else setPop(next);
  };
  const pickTool = (type: ToolType) => {
    if (placingComment) onPlacingComment(false);
    setStickyOpen(false);
    setTool(type);
    setPop(null);
  };
  const pickPenMode = (mode: PenMode) => {
    if (mode !== "eraser") setOptions((o) => ({ ...o, pen: { ...o.pen, mode } }));
    pickTool(mode === "eraser" ? "eraser" : "freedraw");
  };

  const dropSticky = (at?: { x: number; y: number }) => {
    if (!api) return;
    pickTool("selection");
    lastSticky.current = addSticky(api, options.sticky, at)[0]?.id ?? null;
    setStickyOpen(true);
  };
  const pickStickyColor = (color: string) => {
    setOptions((o) => ({ ...o, sticky: color }));
    if (!api) return;
    // The sticky just added, while it is still the selection, takes the colour too.
    const ids = Object.keys(api.getAppState().selectedElementIds);
    if (ids.length !== 1 || ids[0] !== lastSticky.current) return;
    api.updateScene({
      elements: api.getSceneElementsIncludingDeleted().map((el) => (el.id === ids[0] ? newElementWith(el, { backgroundColor: color, strokeColor: color }) : el)),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  };
  const dropShape = (type: ShapeType, at: { x: number; y: number }) => {
    if (!api) return;
    pickTool("selection");
    insertSkeletons(api, [shapeSkeleton(type, options.shape, api.getAppState())], at);
  };
  const bindShape = (type: ShapeType) =>
    bindDrag({ kind: type, color: options.shape.color, fill: options.shape.fill, onClick: () => pickTool(type), onDrop: (at) => dropShape(type, at) });

  const appsOn = Object.keys(openWindows).length > 0 || script.isOpen;
  const penOn = drawing && (tool === "freedraw" || tool === "eraser");

  return (
    <div ref={wrap} className="wb-bar-wrap">
      {pop && api && (
        <div className={`wb-popover wb-popover--up ${pop === "apps" ? "wb-popover--apps" : ""}`}>
          {pop === "react" && <ReactionPicker onPick={onReact} />}
          {pop === "apps" && (
            <AppsMenu
              api={api}
              editable={editable}
              isAdmin={isAdmin}
              openWindows={openWindows}
              onToggleWindow={onToggleWindow}
              onPlace={onPlace}
              script={script}
              onSettings={onSettings}
              onDone={close}
            />
          )}
        </div>
      )}
      {panel && !pop && api && (
        <OptionsBar
          key={panel}
          panel={panel}
          tool={tool}
          options={options}
          setOptions={setOptions}
          setNib={setNib}
          onPenMode={pickPenMode}
          onTool={pickTool}
          onStickyColor={pickStickyColor}
          onTextToDiagram={() => {
            pickTool("selection");
            api.updateScene({ appState: { openDialog: { name: "ttd", tab: "mermaid" } } });
          }}
          bindShape={bindShape}
        />
      )}

      {/* Any click on the bar ends with focus on the canvas, so shortcuts keep working. */}
      <div className="wb-bar" role="toolbar" aria-label="เครื่องมือ · Tools" onClick={focusCanvas}>
        <div className="wb-bar__tools">
          {editable ? (
            <>
              {POINTERS.map((t) => (
                <ToolButton key={t.type} label={t.label} shortcut={t.shortcut} active={!placingComment && tool === t.type} onClick={() => pickTool(t.type)}>
                  {t.icon}
                </ToolButton>
              ))}
              <span className="wb-bar__divider" aria-hidden />
              <div className="wb-bar__objects">
                <ObjectTool kind="pen" label="ปากกา · Pen" shortcut="P" active={penOn} onClick={() => pickTool("freedraw")}>
                  <PenArt mode={options.pen.mode} color={options.pen[options.pen.mode].color} />
                </ObjectTool>
                <ObjectTool
                  kind="sticky"
                  label="โน้ต คลิกหรือลากออกจากปึก · Sticky note, click or peel one off"
                  active={panel === "sticky"}
                  // Select is still the tool, and it has the bar's one bloom.
                  ground="ink"
                  {...bindDrag({ kind: "sticky", color: options.sticky, onClick: () => dropSticky(), onDrop: dropSticky })}
                >
                  <StickyArt color={options.sticky} />
                </ObjectTool>
                <ShapeCluster active={panel === "shapes"}>
                  {CLUSTER.map((s) => (
                    <ShapeObject key={s.type} type={s.type} label={s.label} shortcut={s.shortcut} active={drawing && tool === s.type} {...bindShape(s.type)} />
                  ))}
                </ShapeCluster>
              </div>
              <span className="wb-bar__divider" aria-hidden />
              {WRITERS.map((t) => (
                <ToolButton key={t.type} label={t.label} shortcut={t.shortcut} active={!placingComment && tool === t.type} onClick={() => pickTool(t.type)}>
                  {t.icon}
                </ToolButton>
              ))}
            </>
          ) : (
            <ToolButton
              label="มือ เลื่อนบอร์ด · Hand"
              active={!placingComment}
              onClick={() => {
                onPlacingComment(false);
                focusCanvas();
              }}
            >
              <Hand className={icon} aria-hidden />
            </ToolButton>
          )}
        </div>
        <div className="wb-bar__end">
          {/* Editors: Text to Apps read as one group; the divider is only the phone's split. */}
          <span className={`wb-bar__divider ${editable ? "wb-bar__divider--split" : ""}`} aria-hidden />
          <ToolButton
            label={placingComment ? "คลิกบนบอร์ดเพื่อคอมเมนต์ · Click the board to comment" : "คอมเมนต์ · Comment"}
            active={placingComment}
            onClick={() => {
              setPop(null);
              onPlacingComment(!placingComment);
              focusCanvas();
            }}
          >
            <MessageCircle className={icon} aria-hidden />
          </ToolButton>
          <ToolButton label="รีแอคชัน · Reactions" className="wb-tool--menu" active={pop === "react"} aria-expanded={pop === "react"} onClick={() => toggle("react")}>
            <SmilePlus className={icon} aria-hidden />
          </ToolButton>
          <ToolButton
            label="แอปและเครื่องมือ · Apps and more"
            active={pop === "apps" || appsOn}
            aria-expanded={pop === "apps"}
            aria-haspopup="menu"
            onClick={() => toggle("apps")}
            className="wb-tool--menu wb-tool--apps"
          >
            <Plus className={icon} aria-hidden />
          </ToolButton>
        </div>
      </div>
      {script.portal}
    </div>
  );
});
