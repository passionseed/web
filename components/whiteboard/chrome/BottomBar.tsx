"use client";

import type { ExcalidrawImperativeAPI, ToolType } from "@excalidraw/excalidraw/types";
import { Hand, MessageCircle, MousePointer2, MoveUpRight, PenLine, Plus, Shapes, SmilePlus, StickyNote, Type } from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";

import type { EMOTES } from "@/lib/whiteboard/core";

import type { BoardPlugin } from "../plugins/types";
import { useScriptWindow } from "../script/ScriptButton";
import { AppsMenu } from "./AppsMenu";
import { ReactionPicker } from "./ReactionPicker";
import { PICKER_TOOLS, ShapePicker } from "./ShapePicker";
import { StickyPicker } from "./StickyPicker";
import { ToolButton } from "./ToolButton";
import { focusCanvas, useActiveTool } from "./useActiveTool";
import { useDismiss } from "./useDismiss";

type Pop = "sticky" | "shape" | "react" | "apps" | null;

const icon = "h-5 w-5";

const SIMPLE_TOOLS: { type: ToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
  { type: "selection", label: "เลือก · Select", shortcut: "V", icon: <MousePointer2 className={icon} aria-hidden /> },
  { type: "hand", label: "มือ เลื่อนบอร์ด · Hand", shortcut: "H", icon: <Hand className={icon} aria-hidden /> },
  { type: "freedraw", label: "ปากกา · Pen", shortcut: "P", icon: <PenLine className={icon} aria-hidden /> },
];

const LINE_TOOLS: typeof SIMPLE_TOOLS = [
  { type: "arrow", label: "ลูกศร · Arrow", shortcut: "A", icon: <MoveUpRight className={icon} aria-hidden /> },
  { type: "text", label: "ข้อความ · Text", shortcut: "T", icon: <Type className={icon} aria-hidden /> },
];

const isPickerTool = (t: ToolType) => PICKER_TOOLS.some((p) => p.type === t);

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
}) {
  const { tool, setTool } = useActiveTool(api);
  const [pop, setPop] = useState<Pop>(null);
  const [lastShape, setLastShape] = useState<ToolType>("rectangle");
  const wrap = useRef<HTMLDivElement>(null);
  // Focus goes back to the canvas whenever a popover closes, so shortcuts, undo and paste keep working.
  const close = useCallback(() => {
    setPop(null);
    focusCanvas();
  }, []);
  useDismiss(wrap, pop !== null, close);
  const script = useScriptWindow(boardId);

  const toggle = (next: Exclude<Pop, null>) => {
    if (pop === next) close();
    else setPop(next);
  };
  const pickTool = (type: ToolType) => {
    if (placingComment) onPlacingComment(false);
    setTool(type);
    setPop(null);
  };
  const shapeIcon = PICKER_TOOLS.find((t) => t.type === (isPickerTool(tool) ? tool : lastShape))?.icon ?? (
    <Shapes className={icon} aria-hidden />
  );
  const appsOn = Object.keys(openWindows).length > 0 || script.isOpen;

  return (
    <div ref={wrap} className="wb-bar-wrap">
      {pop && api && (
        <div className={`wb-popover wb-popover--up ${pop === "apps" ? "wb-popover--apps" : ""}`}>
          {pop === "sticky" && <StickyPicker api={api} onDone={close} />}
          {pop === "shape" && (
            <ShapePicker
              tool={tool}
              onPick={(type) => {
                setLastShape(type);
                pickTool(type);
              }}
              onTextToDiagram={
                editable
                  ? () => {
                      close();
                      api.updateScene({ appState: { openDialog: { name: "ttd", tab: "mermaid" } } });
                    }
                  : undefined
              }
            />
          )}
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
              onDone={close}
            />
          )}
        </div>
      )}

      <div className="wb-bar" role="toolbar" aria-label="เครื่องมือ · Tools">
        <div className="wb-bar__tools">
          {editable ? (
            <>
              {SIMPLE_TOOLS.map((t) => (
                <ToolButton key={t.type} label={t.label} shortcut={t.shortcut} active={!placingComment && tool === t.type} onClick={() => pickTool(t.type)}>
                  {t.icon}
                </ToolButton>
              ))}
              <ToolButton label="โน้ต · Sticky note" active={pop === "sticky"} aria-expanded={pop === "sticky"} onClick={() => toggle("sticky")}>
                <StickyNote className={icon} aria-hidden />
              </ToolButton>
              <ToolButton
                label="รูปทรงและเครื่องมืออื่น · Shapes and more"
                shortcut="R"
                active={pop === "shape" || (!placingComment && isPickerTool(tool))}
                aria-expanded={pop === "shape"}
                onClick={() => toggle("shape")}
              >
                {shapeIcon}
              </ToolButton>
              {LINE_TOOLS.map((t) => (
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
          <span className="wb-bar__divider" aria-hidden />
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
          <ToolButton label="รีแอคชัน · Reactions" active={pop === "react"} aria-expanded={pop === "react"} onClick={() => toggle("react")}>
            <SmilePlus className={icon} aria-hidden />
          </ToolButton>
          <ToolButton
            label="แอปและเครื่องมือ · Apps and more"
            active={pop === "apps" || appsOn}
            aria-expanded={pop === "apps"}
            aria-haspopup="menu"
            onClick={() => toggle("apps")}
            className="wb-tool--apps"
          >
            <Plus className={icon} aria-hidden />
          </ToolButton>
        </div>
      </div>
      {script.portal}
    </div>
  );
});
