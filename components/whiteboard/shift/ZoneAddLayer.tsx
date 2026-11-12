"use client";

import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Plus } from "lucide-react";

import { canvasAccessMap, mayEditFrame } from "@/lib/whiteboard/canvas-access";
import { isShiftCardKind, isZone, zoneTitle } from "@/lib/whiteboard/shift-cards";

import { useViewportTick } from "../useViewportTick";
import { WHEEL_THROUGH } from "../wheelBridge";
import { insertZoneNote } from "./insertShift";
import { isBusy, useSceneMemo } from "./sceneMemo";

/** Zoomed out further than this (a mentor's overview of several canvases), the buttons would crowd them. */
const MIN_ZOOM = 0.2;
/** Inset of the button from the zone's top-right corner, in scene units. */
const INSET = 16;
/** A zone narrower than this on screen gets just "+", so the button never covers its title. */
const COMPACT_BELOW = 240;

/**
 * A "+ เพิ่ม" button at the top-right of every project canvas zone, for
 * editors. It adds an empty note of that zone's kind in the zone's next free
 * slot, so students never have to pick the right card type themselves.
 */
export function ZoneAddLayer({ api, meId, manager }: { api: ExcalidrawImperativeAPI; meId: string; manager: boolean }) {
  useViewportTick(api, { elements: true });
  // Only on canvases this person may change (theirs, their team's, or any for the board's owner).
  const zones = useSceneMemo(api, (elements) => {
    const access = canvasAccessMap(elements);
    return elements.filter((el) => isZone(el) && mayEditFrame(access, el.frameId, meId, manager));
  }, [meId, manager]);
  const appState = api.getAppState();
  if (appState.zoom.value < MIN_ZOOM || appState.viewModeEnabled || isBusy(appState)) return null;

  const buttons = zones
    .flatMap((zone) => {
      const kind = zone.customData?.zone;
      if (!isShiftCardKind(kind)) return [];
      const pos = sceneCoordsToViewportCoords({ sceneX: zone.x + zone.width - INSET, sceneY: zone.y + INSET }, appState);
      const offscreen = pos.x < 0 || pos.y < 0 || pos.x > appState.width + 200 || pos.y > appState.height;
      if (offscreen) return [];
      const day = typeof zone.customData?.day === "number" ? zone.customData.day : undefined;
      return [{ id: zone.id, title: zoneTitle(kind, day), pos, compact: zone.width * appState.zoom.value < COMPACT_BELOW }];
    });

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" {...WHEEL_THROUGH}>
      {buttons.map(({ id, title, pos, compact }) => (
        <button
          key={id}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => insertZoneNote(api, id)}
          aria-label={`เพิ่มโน้ต: ${title}`}
          title={`เพิ่มโน้ต · ${title}`}
          className={`wb-version-chip pointer-events-auto absolute flex -translate-x-full items-center gap-1 rounded-md text-xs font-semibold ${
            compact ? "w-7 justify-center" : "px-2.5"
          }`}
          style={{ left: pos.x, top: pos.y }}
        >
          <Plus className="h-3.5 w-3.5" />
          {!compact && "เพิ่ม"}
        </button>
      ))}
    </div>
  );
}
