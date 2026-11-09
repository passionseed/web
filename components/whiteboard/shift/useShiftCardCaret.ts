"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect } from "react";

import { isShiftCardKind } from "@/lib/whiteboard/shift-cards";

/**
 * On a laptop, Excalidraw selects all of a text when editing starts, so the
 * first key a student types would replace a SHIFT card's header and question.
 * When editing starts on a SHIFT card, this moves the caret to the end instead:
 * below the question, where the answer goes, and after any earlier answer.
 */
export function useShiftCardCaret(api: ExcalidrawImperativeAPI | null) {
  useEffect(() => {
    if (!api) return;
    let editing: string | null = null;
    return api.onChange((elements, appState) => {
      const text = appState.editingTextElement;
      const id = text?.id ?? null;
      if (id === editing) return;
      editing = id;
      if (text?.type !== "text" || !text.containerId) return;
      const containerId = text.containerId;
      const card = elements.find((el) => el.id === containerId);
      if (!isShiftCardKind(card?.customData?.card)) return;
      // Excalidraw selects the text while it mounts the editor; move the caret after that.
      requestAnimationFrame(() => {
        const area = document.querySelector<HTMLTextAreaElement>("textarea.excalidraw-wysiwyg");
        if (!area || document.activeElement !== area) return;
        const end = area.value.length;
        area.setSelectionRange(end, end);
        area.scrollTop = area.scrollHeight;
      });
    });
  }, [api]);
}
