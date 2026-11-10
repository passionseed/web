"use client";

import { CaptureUpdateAction, newElementWith, sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Lock, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { accessOf, canEditCanvas, cleanEditors, type CanvasAccess } from "@/lib/whiteboard/canvas-access";

import { useViewportTick } from "../useViewportTick";
import { isBusy, useSceneMemo } from "./sceneMemo";

type Person = { userId: string; name: string; role: string };

type Props = {
  api: ExcalidrawImperativeAPI;
  meId: string;
  /** The board's owner may change any canvas, to moderate. */
  manager: boolean;
  /** Everyone on the board, to pick teammates from. */
  people: Person[];
  nameOf: (id: string) => string;
};

/** Zoomed out further than this, the tags would crowd an overview of many canvases. */
const MIN_ZOOM = 0.15;

/** Saves a canvas's new team (and owner) on its frame, so it syncs, saves and is checked like any edit. */
function setAccess(api: ExcalidrawImperativeAPI, frameId: string, access: Partial<CanvasAccess>) {
  const all = api.getSceneElementsIncludingDeleted();
  api.updateScene({
    elements: all.map((el) =>
      el.id === frameId
        ? newElementWith(el as ExcalidrawElement, { customData: { ...el.customData, ...access } })
        : el,
    ),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/**
 * A tag above every SHIFT canvas saying whose it is and who may change it.
 * Its owner (and moderators) pick teammates from the people on the board, and
 * can hand the canvas to one of them; everyone else sees it is view-only and
 * whom to ask.
 */
export function CanvasTeamLayer({ api, meId, manager, people, nameOf }: Props) {
  useViewportTick(api, { elements: true });
  const [openId, setOpenId] = useState<string | null>(null);
  const frames = useSceneMemo(api, (elements) =>
    elements.flatMap((frame) => {
      const access = accessOf(frame);
      return access ? [{ frame, access, mine: canEditCanvas(access, meId, manager) }] : [];
    }),
    [meId, manager],
  );
  const appState = api.getAppState();
  if (appState.zoom.value < MIN_ZOOM || frames.length === 0 || (isBusy(appState) && !openId)) return null;

  const canvases = frames.map((c) => ({
    ...c,
    pos: sceneCoordsToViewportCoords({ sceneX: c.frame.x + c.frame.width, sceneY: c.frame.y }, appState),
  }));
  const open = canvases.find((c) => c.frame.id === openId);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        {canvases.map(({ frame, access, pos, mine }) => (
          <button
            key={frame.id}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpenId(openId === frame.id ? null : frame.id)}
            aria-haspopup="dialog"
            aria-expanded={openId === frame.id}
            className="wb-version-chip pointer-events-auto absolute flex -translate-x-full -translate-y-[calc(100%+6px)] items-center gap-1.5 rounded-md px-3 text-xs font-semibold"
            style={{ left: pos.x, top: pos.y }}
          >
            {mine ? (
              <>
                <Users className="h-3.5 w-3.5" />
                ทีม · {access.editors.length + 1} คน
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                ดูอย่างเดียว · ของ {nameOf(access.owner)}
              </>
            )}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
        {open && (
          <TeamPanel
            key={open.frame.id}
            access={open.access}
            at={open.pos}
            canManage={manager || open.access.owner === meId}
            people={people}
            nameOf={nameOf}
            onChange={(editors) => setAccess(api, open.frame.id, { editors: cleanEditors(editors, open.access.owner) })}
            onTransfer={(owner) =>
              // The old owner stays on the team. Postgres checks the new owner is on the board.
              setAccess(api, open.frame.id, { owner, editors: cleanEditors([...open.access.editors, open.access.owner], owner) })
            }
            onClose={() => setOpenId(null)}
          />
        )}
      </div>
    </>
  );
}

function TeamPanel(props: {
  access: CanvasAccess;
  at: { x: number; y: number };
  canManage: boolean;
  people: Person[];
  nameOf: (id: string) => string;
  onChange: (editors: string[]) => void;
  onTransfer: (owner: string) => void;
  onClose: () => void;
}) {
  const { access, at, canManage, people, nameOf, onChange, onTransfer, onClose } = props;
  const panel = useRef<HTMLDivElement>(null);
  // Handing a canvas over takes two clicks: the first asks, the second does it.
  const [handingTo, setHandingTo] = useState<string | null>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  // Teammates come from the board's editors; its owner can already change every canvas.
  const candidates = people.filter((p) => p.role === "editor" && p.userId !== access.owner);
  const width = Math.min(300, (typeof window !== "undefined" ? window.innerWidth : 1200) - 24);
  const left = Math.min(Math.max(at.x - width, 12), (typeof window !== "undefined" ? window.innerWidth : 1200) - width - 12);
  const top = Math.max(at.y + 8, 12);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="ทีมของแคนวาสนี้"
      className="wb-window wb-version-panel pointer-events-auto absolute flex flex-col"
      style={{ left, top, width, maxHeight: `calc(100vh - ${top + 12}px)` }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="wb-rule flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-semibold">ทีมของแคนวาสนี้</p>
        <button type="button" onClick={onClose} aria-label="ปิด · Close" className="wb-soft rounded-md p-1.5 hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        <p className="flex items-center justify-between">
          <span className="font-medium">{nameOf(access.owner)}</span>
          <span className="wb-soft text-xs">เจ้าของ</span>
        </p>
        {canManage ? (
          candidates.length === 0 ? (
            <p className="wb-soft pt-1 text-xs">ยังไม่มีเพื่อนบนบอร์ดนี้ ชวนเพื่อนเข้าบอร์ดก่อน แล้วค่อยเลือกเข้าทีม</p>
          ) : (
            candidates.map((p) => (
              <div key={p.userId} className="flex items-center justify-between gap-2 py-0.5">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <input
                    type="checkbox"
                    checked={access.editors.includes(p.userId)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked ? [...access.editors, p.userId] : access.editors.filter((id) => id !== p.userId),
                      )
                    }
                    className="h-4 w-4 accent-[#3d4bd8]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => (handingTo === p.userId ? onTransfer(p.userId) : setHandingTo(p.userId))}
                  onBlur={() => setHandingTo((id) => (id === p.userId ? null : id))}
                  className="wb-soft shrink-0 rounded-md px-1.5 py-0.5 text-xs hover:bg-black/5"
                >
                  {handingTo === p.userId ? "กดอีกครั้งเพื่อยืนยัน" : "ให้เป็นเจ้าของ"}
                </button>
              </div>
            ))
          )
        ) : (
          <>
            {access.editors.map((id) => (
              <p key={id}>{nameOf(id)}</p>
            ))}
            <p className="wb-soft pt-1 text-xs">อยากช่วยแก้ ขอให้ {nameOf(access.owner)} เพิ่มคุณในทีม</p>
          </>
        )}
      </div>
      <p className="wb-rule wb-soft border-t px-3 py-2 text-xs">
        คนในทีมแก้แคนวาสนี้ได้ คนอื่นบนบอร์ดดูได้อย่างเดียว เจ้าของส่งต่อแคนวาสให้เพื่อนในบอร์ดได้
      </p>
    </div>
  );
}
