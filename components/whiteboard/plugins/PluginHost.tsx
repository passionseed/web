"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { WhiteboardRole } from "@/lib/whiteboard/core";

import type { BoardEvent } from "../useWhiteboardSync";
import { PluginWindow, type WindowPos } from "./PluginWindow";
import { pluginById } from "./registry";

type Channel = { send: (event: string, payload: unknown) => void; on: (event: BoardEvent, fn: (payload: unknown) => void) => () => void };
type OpenWindows = Record<string, WindowPos>;

const storageKey = (boardId: string) => `whiteboard-plugins:${boardId}`;

/** Which windows are open on a board and where, remembered in this browser. */
export function usePluginWindows(boardId: string) {
  const [open, setOpen] = useState<OpenWindows>({});
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(boardId)) ?? "{}") as OpenWindows;
      const known = Object.fromEntries(Object.entries(saved).filter(([id]) => pluginById(id)));
      setOpen(known);
      setOrder(Object.keys(known));
    } catch {
      // Nothing saved yet.
    }
  }, [boardId]);

  const save = useCallback(
    (next: OpenWindows) => {
      setOpen(next);
      try {
        localStorage.setItem(storageKey(boardId), JSON.stringify(next));
      } catch {
        // Storage blocked: windows just won't be remembered.
      }
    },
    [boardId],
  );

  const focus = useCallback((id: string) => setOrder((o) => [...o.filter((x) => x !== id), id]), []);

  const toggle = useCallback(
    (id: string) => {
      if (open[id]) {
        const { [id]: _closed, ...rest } = open;
        return save(rest);
      }
      const plugin = pluginById(id);
      if (!plugin) return;
      // Open near the top right, below the toolbar, stepping each new window a little.
      const step = Object.keys(open).length * 28;
      save({ ...open, [id]: { x: Math.max(16, window.innerWidth - plugin.width - 80 - step), y: 72 + step } });
      focus(id);
    },
    [open, save, focus],
  );

  return { open, order, save, toggle, focus };
}

/** Renders the open plugin windows for a board. */
export function PluginHost({
  api,
  board,
  editable,
  channel,
  windows,
}: {
  api: ExcalidrawImperativeAPI;
  board: { id: string; title: string; role: WhiteboardRole };
  editable: boolean;
  channel: Channel;
  windows: ReturnType<typeof usePluginWindows>;
}) {
  const { open, order, save, toggle, focus } = windows;
  const { send, on } = channel;

  // Each plugin hears only its own broadcasts.
  const bridges = useMemo(() => {
    const make = (id: string) => ({
      broadcast: (payload?: unknown) => send("plugin", { id, payload: payload ?? null }),
      onBroadcast: (handler: (payload: unknown) => void) =>
        on("plugin", (msg) => {
          const m = msg as { id?: string; payload?: unknown };
          if (m?.id === id) handler(m.payload);
        }),
    });
    return new Map(Object.keys(open).map((id) => [id, make(id)]));
    // Bridges only change when the set of open windows does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(open).join(","), send, on]);

  return (
    <>
      {Object.entries(open).map(([id, pos]) => {
        const plugin = pluginById(id);
        const bridge = bridges.get(id);
        if (!plugin || !bridge) return null;
        const { Component } = plugin;
        return (
          <PluginWindow
            key={id}
            title={plugin.name}
            icon={plugin.icon}
            width={plugin.width}
            height={plugin.height}
            pos={pos}
            z={20 + order.indexOf(id)}
            onFocus={() => focus(id)}
            onMove={(next) => save({ ...open, [id]: next })}
            onClose={() => toggle(id)}
          >
            <Component api={api} board={board} editable={editable} close={() => toggle(id)} {...bridge} />
          </PluginWindow>
        );
      })}
    </>
  );
}
