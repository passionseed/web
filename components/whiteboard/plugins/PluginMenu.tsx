"use client";

import { AppWindow } from "lucide-react";

import { PLUGINS } from "./registry";
import type { BoardPlugin } from "./types";

/**
 * Apps that are games go under "เกม · Games" in the Apps menu. A plugin can say
 * so itself with `category: "game"`; these ids are the ones registered today.
 */
const GAME_IDS = new Set(["spyfall"]);
export const isGame = (p: BoardPlugin) => (p as BoardPlugin & { category?: string }).category === "game" || GAME_IDS.has(p.id);

/** The registry split into games and other apps, in registry order. */
export const GAME_PLUGINS = PLUGINS.filter(isGame);
export const APP_PLUGINS = PLUGINS.filter((p) => !isGame(p));

/**
 * Rows for board apps in the Apps menu. Editors place an app that has a widget
 * size on the board, where everyone sees it; anyone can open any app as a
 * window just for themselves.
 */
export function PluginRows({
  plugins,
  open,
  onToggle,
  onPlace,
  onDone,
}: {
  plugins: BoardPlugin[];
  open: Record<string, unknown>;
  onToggle: (id: string) => void;
  /** Set when the viewer may edit the board. */
  onPlace?: (plugin: BoardPlugin) => void;
  /** Called after a pick, to close the menu. */
  onDone: () => void;
}) {
  const pick = (fn: () => void) => {
    fn();
    onDone();
  };

  return (
    <>
      {plugins.map((p) => {
        const placeable = Boolean(onPlace && p.widget);
        const isOpen = Boolean(open[p.id]);
        return (
          <div key={p.id} className="flex items-stretch gap-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(() => (placeable ? onPlace!(p) : onToggle(p.id)))}
              className={`wb-row min-w-0 flex-1 ${!placeable && isOpen ? "wb-row--on" : ""}`}
            >
              <span className="wb-row__icon">{p.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block text-xs opacity-60">
                  {placeable ? "วางบนบอร์ดให้ทุกคนเห็น · " : !placeable && isOpen ? "เปิดอยู่ กดเพื่อปิด · " : ""}
                  {p.description}
                </span>
              </span>
            </button>
            {placeable && (
              <button
                type="button"
                role="menuitem"
                aria-label={isOpen ? `ปิดหน้าต่าง ${p.name} · Close window` : `เปิด ${p.name} เป็นหน้าต่าง เห็นคนเดียว · Open as a window`}
                title={isOpen ? "ปิดหน้าต่าง · Close window" : "เปิดเป็นหน้าต่าง (เห็นคนเดียว) · Open as a window"}
                onClick={() => pick(() => onToggle(p.id))}
                className={`wb-row__side ${isOpen ? "wb-row__side--on" : ""}`}
              >
                <AppWindow className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
