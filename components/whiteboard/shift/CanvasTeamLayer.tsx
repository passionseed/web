"use client";

import { CaptureUpdateAction, newElementWith, sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Lock, Users } from "lucide-react";
import { useState } from "react";

import { accessOf, canEditCanvas, cleanEditors, type CanvasAccess } from "@/lib/whiteboard/canvas-access";

import { useViewportTick } from "../useViewportTick";
import { WHEEL_THROUGH } from "../wheelBridge";
import { isBusy, useSceneMemo } from "./sceneMemo";
import { type Person, TeamPanel } from "./TeamPanel";

type Props = {
  api: ExcalidrawImperativeAPI;
  meId: string;
  /** The board's owner may change any canvas, to moderate. */
  manager: boolean;
  /** Everyone on the board, to pick teammates from. */
  people: Person[];
  nameOf: (id: string) => string;
  /** Opens the share dialog to invite people to the board (its owner only). */
  onInvite?: () => void;
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
export function CanvasTeamLayer({ api, meId, manager, people, nameOf, onInvite }: Props) {
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
      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" {...WHEEL_THROUGH}>
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
            onInvite={
              onInvite &&
              (() => {
                setOpenId(null);
                onInvite();
              })
            }
          />
        )}
      </div>
    </>
  );
}
