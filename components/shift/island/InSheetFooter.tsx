"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Puts a step's buttons into the sheet's sticky footer (IslandSheet's
 * `footer`, which QuestDetailSheet hands down as an empty element). The
 * buttons stay in the React tree of the step that owns their state; a submit
 * button reaches its form in the body through the `form` attribute.
 */
export function InSheetFooter({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return slot ? createPortal(children, slot) : null;
}
