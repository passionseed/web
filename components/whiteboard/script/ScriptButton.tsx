"use client";

import { ScrollText } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { SCRIPT_CSS, ScriptPanel } from "./ScriptPanel";
import { useFloatingWindow } from "./useFloatingWindow";

/**
 * Opens the presenter's private script in its own window, so sharing this tab or browser
 * window in Discord shows only the board. Shift-click opens a plain popup instead of the
 * floating one.
 */
export function ScriptButton({ boardId }: { boardId: string }) {
  const floating = useFloatingWindow({ name: `wb-script-${boardId}`, title: "สคริปต์ · Script", css: SCRIPT_CSS });

  const onClick = async (popup: boolean) => {
    if (floating.win) return floating.close();
    if (!(await floating.open({ popup }))) {
      toast.error("เบราว์เซอร์บล็อกหน้าต่างใหม่ อนุญาต pop-up แล้วกดอีกครั้ง · Allow pop-ups and try again");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => void onClick(e.shiftKey)}
        title="Speaker script, only you see it. Shift-click for a normal window."
        className={`wb-pill ${floating.win ? "wb-pill--on" : ""}`}
      >
        <ScrollText className="h-3.5 w-3.5" /> สคริปต์
      </button>
      {floating.win && createPortal(<ScriptPanel boardId={boardId} win={floating.win} />, floating.win.document.body)}
    </>
  );
}
