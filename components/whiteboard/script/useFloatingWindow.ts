"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DocumentPictureInPicture = { requestWindow(options: { width: number; height: number }): Promise<Window> };

const SIZE = { width: 360, height: 540 };

/**
 * A window outside the tab: Document Picture-in-Picture, which floats on top (Chrome, Edge,
 * and Arc if it supports it), or a plain popup where that is missing or `popup` is asked for.
 * Sharing the tab or the browser window in Discord does not show it.
 */
export function useFloatingWindow({ name, title, css }: { name: string; title: string; css: string }) {
  const [win, setWin] = useState<Window | null>(null);
  // Picture-in-Picture can use up the click, so after one failure go straight to the popup.
  const pipFailed = useRef(false);

  const open = useCallback(
    async ({ popup = false } = {}) => {
      const pip = (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture })
        .documentPictureInPicture;
      let next: Window | null = null;
      if (pip && !popup && !pipFailed.current) {
        next = await pip.requestWindow(SIZE).catch(() => {
          pipFailed.current = true;
          return null;
        });
      }
      next ??= window.open("", name, `popup,width=${SIZE.width},height=${SIZE.height}`);
      if (!next) return false;

      const doc = next.document;
      doc.title = title;
      doc.head.querySelector("style[data-floating]")?.remove();
      const style = doc.createElement("style");
      style.dataset.floating = "";
      style.textContent = css;
      doc.head.append(style);
      // A popup left open from before a reload still holds the old page.
      doc.body.replaceChildren();
      setWin(next);
      return true;
    },
    [name, title, css],
  );

  const close = useCallback(() => setWin(null), []);

  // Notices when it is closed from its own title bar; closes it when the board unmounts or `close` runs.
  useEffect(() => {
    if (!win) return;
    const gone = () => setWin(null);
    win.addEventListener("pagehide", gone);
    const poll = setInterval(() => win.closed && gone(), 500);
    return () => {
      clearInterval(poll);
      win.removeEventListener("pagehide", gone);
      win.close();
    };
  }, [win]);

  return { win, open, close };
}
