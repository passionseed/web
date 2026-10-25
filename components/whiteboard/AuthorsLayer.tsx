"use client";

import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { useViewportTick } from "./CommentsLayer";

/** Kinds of element that carry someone's words or drawing. */
const LABELLED = new Set(["text", "freedraw", "image"]);
const MAX_CHIPS = 400;

/**
 * Admin overlay: a small name tag on each piece of writing, drawing or image
 * saying who made it (and who last edited it, when that is someone else).
 */
export function AuthorsLayer({ api, nameOf }: { api: ExcalidrawImperativeAPI; nameOf: (id: string) => string }) {
  useViewportTick(api);
  const appState = api.getAppState();
  const elements = api.getSceneElements();
  const byId = new Map(elements.map((el) => [el.id, el]));

  const chips = elements
    .filter((el) => LABELLED.has(el.type))
    .slice(0, MAX_CHIPS)
    .flatMap((el) => {
      const createdBy = el.customData?.createdBy;
      const updatedBy = el.customData?.updatedBy;
      if (typeof createdBy !== "string") return [];
      // Text inside a sticky is tagged at the sticky's corner.
      const anchor = (el.type === "text" && el.containerId && byId.get(el.containerId)) || el;
      const pos = sceneCoordsToViewportCoords({ sceneX: anchor.x, sceneY: anchor.y }, appState);
      const label =
        typeof updatedBy === "string" && updatedBy !== createdBy
          ? `${nameOf(createdBy)} · แก้: ${nameOf(updatedBy)}`
          : nameOf(createdBy);
      return [{ id: el.id, x: pos.x, y: pos.y, label }];
    });

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="absolute max-w-48 -translate-y-full truncate rounded-full rounded-bl-none bg-orange-600/90 px-2 py-0.5 text-[11px] font-medium text-white shadow"
          style={{ left: chip.x, top: chip.y - 2 }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
