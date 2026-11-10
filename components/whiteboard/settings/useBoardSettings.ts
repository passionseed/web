"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type BoardSettings, boardSettingsKey, loadBoardSettings, parseBoardSettings, saveBoardSettings } from "@/lib/whiteboard/settings";

/**
 * This board's settings, read before the first paint and saved on every change. Another tab on
 * the same board follows along. Where they are kept is `lib/whiteboard/settings.ts`'s business.
 */
export function useBoardSettings(boardId: string) {
  const [settings, setSettings] = useState<BoardSettings>(() => loadBoardSettings(boardId));
  const loaded = useRef(settings);

  useEffect(() => {
    if (settings === loaded.current) return;
    saveBoardSettings(boardId, settings);
  }, [boardId, settings]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== boardSettingsKey(boardId) || !e.newValue) return;
      try {
        loaded.current = parseBoardSettings(JSON.parse(e.newValue));
        setSettings(loaded.current);
      } catch {
        // Not ours to fix.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [boardId]);

  const update = useCallback((patch: Partial<BoardSettings>) => setSettings((prev) => ({ ...prev, ...patch })), []);

  return { settings, update };
}

export type UpdateBoardSettings = ReturnType<typeof useBoardSettings>["update"];
