"use client";

import { createPortal } from "react-dom";
import { toast } from "sonner";

import { SCRIPT_CSS, ScriptPanel } from "./ScriptPanel";
import { useFloatingWindow } from "./useFloatingWindow";

/**
 * The script's own tab. Its floating window belongs to this tab, not the board's, so it stays
 * on top while you present from the board tab, like Google Meet. Arc closes a floating window
 * when you go back to the tab that opened it, which made one opened from the board vanish.
 */
export function ScriptTab({ boardId }: { boardId: string }) {
  const floating = useFloatingWindow({ name: `wb-script-float-${boardId}`, title: "สคริปต์ · Script", css: SCRIPT_CSS });

  const float = async (popup: boolean) => {
    if (!(await floating.open({ popup }))) {
      toast.error("เบราว์เซอร์บล็อกหน้าต่างใหม่ อนุญาต pop-up แล้วกดอีกครั้ง · Allow pop-ups and try again");
      return;
    }
    // Back to the board, where the browser allows it.
    window.opener?.focus();
  };

  return (
    <div className="sp-page">
      <style>{SCRIPT_CSS}</style>
      <header className="sp-pagebar">
        {floating.win ? (
          <button type="button" className="sp-btn" onClick={floating.close}>
            เก็บกลับมาไว้ในแท็บนี้ · Bring it back
          </button>
        ) : (
          <>
            <span className="sp-hint">แชร์จอเฉพาะแท็บหรือหน้าต่างบอร์ด คนดูจะไม่เห็นสคริปต์</span>
            <button
              type="button"
              className="sp-btn sp-btn--go"
              onClick={(e) => void float(e.shiftKey)}
              title="Shift-click for a normal window"
            >
              ลอยหน้าต่าง · Float
            </button>
          </>
        )}
      </header>
      <div className="sp-pagebody">
        {floating.win ? (
          <p className="sp-floating">
            สคริปต์ลอยอยู่แล้ว กลับไปที่แท็บบอร์ดได้เลย
            <br />
            <span className="sp-hint">The script is floating. Go back to the board tab. Coming back here closes it.</span>
          </p>
        ) : (
          <ScriptPanel boardId={boardId} win={window} />
        )}
      </div>
      {floating.win && createPortal(<ScriptPanel boardId={boardId} win={floating.win} />, floating.win.document.body)}
    </div>
  );
}
