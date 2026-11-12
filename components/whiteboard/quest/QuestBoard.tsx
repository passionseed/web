"use client";

import { convertToExcalidrawElements, Excalidraw, getCommonBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFileData, ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { questName, type PersonWork, type Quest } from "@/lib/whiteboard/quests";
import { BLOCK_PAD, nameSize, packBlocks } from "@/lib/whiteboard/questBoard";

import { Face } from "../chrome/Face";
import { WB_FONT_VARS } from "../fonts";
import { useSceneMemo } from "../shift/sceneMemo";

type Who = { userId: string; name: string; avatarUrl: string | null };
type Student = { who: Who; work: PersonWork | null };

type Props = {
  api: ExcalidrawImperativeAPI;
  quest: Quest;
  /** The students in view (the mentor's group, or everyone), with their work for this quest. */
  students: Student[];
  /** "กลุ่มของฉัน", a group's name, or "ทุกคน". */
  groupLabel: string;
  onClose: () => void;
};

const VIEW_UI: ExcalidrawProps["UIOptions"] = {
  canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveAsImage: false, saveToActiveFile: false, toggleTheme: false },
  tools: { image: false },
};

/**
 * One quest's work by every student in view, side by side on a board of its
 * own: each student's pieces are moved into a block with their name above it,
 * so a mentor can see whose work is whose. Read-only, and it follows the live
 * board. Nothing here is saved; the real board is untouched.
 */
export function QuestBoard({ api, quest, students, groupLabel, onClose }: Props) {
  const [view, setView] = useState<ExcalidrawImperativeAPI | null>(null);
  const handed = students.filter((s) => s.work);
  const missing = students.filter((s) => !s.work);
  const key = handed.map((s) => `${s.who.userId}:${s.who.name}:${s.work!.ids.length}`).join("|");
  const scene = useSceneMemo(api, (elements) => buildScene(elements, handed), [key]);
  // Excalidraw loads initialData after handing over its API, so the first scene goes in
  // there (an earlier updateScene would be overwritten); later changes follow the live board.
  const [initialData] = useState(() => ({
    elements: scene,
    files: api.getFiles(),
    appState: { theme: api.getAppState().theme, viewBackgroundColor: "#f5f5f3" },
  }));
  const shown = useRef(scene);
  const fitted = useRef(false);
  // Fit everyone in view once the first scene is drawn (initialData's own scrollToContent
  // misjudges a board that opens inside a page-sized overlay).
  const onChange = () => {
    if (fitted.current || !view) return;
    const elements = view.getSceneElements();
    if (elements.length === 0) return;
    fitted.current = true;
    view.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.95 });
  };

  useEffect(() => {
    if (!view || scene === shown.current) return;
    shown.current = scene;
    const files = Object.values(api.getFiles()) as BinaryFileData[];
    if (files.length) view.addFiles(files);
    view.updateScene({ elements: scene });
  }, [api, view, scene]);

  // Escape closes it, as other panes do.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className={`wb-theme wb-quest-board fixed inset-0 z-[70] flex flex-col ${WB_FONT_VARS}`} role="dialog" aria-label={questName(quest)}>
      <header className="wb-quest-pane__head flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <button type="button" onClick={onClose} className="wb-quest-option inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> กลับบอร์ด
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{questName(quest)}</p>
        <p className="wb-soft shrink-0 text-xs">
          {groupLabel} · ส่งแล้ว {handed.length}/{students.length} คน
        </p>
        {missing.length > 0 && (
          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <span className="wb-soft shrink-0">ยังไม่ส่ง</span>
            {missing.map((s) => (
              <span key={s.who.userId} className="wb-qd-chip inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2">
                <Face person={s.who} size={18} />
                <span className="max-w-[7rem] truncate">{s.who.name}</span>
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="relative min-h-0 flex-1">
        {handed.length === 0 ? (
          <p className="wb-soft p-6 text-sm">ยังไม่มีใครในกลุ่มนี้ส่งงาน Quest นี้</p>
        ) : (
          <Excalidraw
            excalidrawAPI={setView}
            initialData={initialData}
            onChange={onChange}
            viewModeEnabled
            UIOptions={VIEW_UI}
            name={questName(quest)}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Each student's work moved into its own block, with their name above it. */
function buildScene(elements: readonly ExcalidrawElement[], handed: Student[]): ExcalidrawElement[] {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const blocks = handed.flatMap((s) => {
    const ids = new Set(s.work!.ids);
    // The words inside a note travel with it even when only the note was tagged.
    for (const id of s.work!.ids) for (const b of byId.get(id)?.boundElements ?? []) if (b.type === "text") ids.add(b.id);
    const mine = [...ids].map((id) => byId.get(id)).filter((el): el is ExcalidrawElement => Boolean(el && !el.isDeleted));
    if (mine.length === 0) return [];
    const [minX, minY, maxX, maxY] = getCommonBounds(mine);
    return [{ who: s.who, mine, minX, minY, width: maxX - minX + BLOCK_PAD * 2, height: maxY - minY + BLOCK_PAD * 2 }];
  });
  const sizes = blocks.map((b) => ({ key: b.who.userId, width: b.width, height: b.height }));
  // Packed once to see how wide it is, then again with room for names that size.
  const first = packBlocks(sizes);
  const font = nameSize(Math.max(0, ...first.map((p) => p.x + p.width)));
  const room = Math.round(font * 1.5);
  const placed = packBlocks(sizes, room);

  return blocks.flatMap((b, i) => {
    const p = placed[i];
    const dx = p.x + BLOCK_PAD - b.minX;
    const dy = p.y + BLOCK_PAD - b.minY;
    const frame = convertToExcalidrawElements([
      {
        type: "rectangle",
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        strokeColor: "#8e9be0",
        backgroundColor: "#ffffff",
        fillStyle: "solid",
        strokeWidth: 1,
        roughness: 0,
        roundness: { type: 3 },
        locked: true,
      },
      {
        type: "text",
        x: p.x + 4,
        y: p.y - room + Math.round(font * 0.2),
        text: b.who.name,
        // Large enough to read when the whole group is in view.
        fontSize: font,
        fontFamily: 2,
        strokeColor: "#2a2e9b",
        locked: true,
      },
    ]);
    const moved = b.mine.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy, frameId: null, locked: true }) as ExcalidrawElement);
    return [...frame, ...moved];
  });
}
