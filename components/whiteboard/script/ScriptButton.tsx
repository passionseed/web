"use client";

import { ScrollText } from "lucide-react";
import { toast } from "sonner";

/**
 * Opens the presenter's private script in its own tab, where it can float on top of the board
 * (see ScriptTab). Sharing only the board tab or window in Discord keeps it hidden.
 */
export function ScriptButton({ boardId }: { boardId: string }) {
  const open = () => {
    // An empty URL finds the script tab if it is already open without reloading it, which
    // would close its floating window.
    const tab = window.open("", `wb-script-${boardId}`);
    if (!tab) {
      toast.error("เบราว์เซอร์บล็อกแท็บใหม่ อนุญาต pop-up แล้วกดอีกครั้ง · Allow pop-ups and try again");
      return;
    }
    if (tab.location.href === "about:blank") tab.location.href = `/whiteboard/${boardId}/script`;
    tab.focus();
  };

  return (
    <button type="button" onClick={open} title="Speaker script, only you see it" className="wb-pill">
      <ScrollText className="h-3.5 w-3.5" /> สคริปต์
    </button>
  );
}
