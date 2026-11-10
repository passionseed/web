"use client";

import { useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { SCRIPT_CSS, ScriptPanel } from "./ScriptPanel";
import { useFloatingWindow } from "./useFloatingWindow";

/**
 * The presenter's private script in its own window, so sharing this tab or browser
 * window in Discord shows only the board. `toggle(true)` (shift-click) opens a plain
 * popup instead of the floating one.
 *
 * Call this in a component that stays mounted (the bottom bar) and render `portal`
 * there: the Apps menu that opens it closes right after the click.
 */
export function useScriptWindow(boardId: string) {
  const floating = useFloatingWindow({ name: `wb-script-${boardId}`, title: "สคริปต์ · Script", css: SCRIPT_CSS });
  const { win, open, close } = floating;

  const toggle = useCallback(
    async (popup: boolean) => {
      if (win) return close();
      if (!(await open({ popup }))) {
        toast.error("เบราว์เซอร์บล็อกหน้าต่างใหม่ อนุญาต pop-up แล้วกดอีกครั้ง · Allow pop-ups and try again");
      }
    },
    [win, open, close],
  );

  const portal = win ? createPortal(<ScriptPanel boardId={boardId} win={win} />, win.document.body) : null;
  return { isOpen: Boolean(win), toggle, portal };
}
