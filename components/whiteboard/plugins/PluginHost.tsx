"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WhiteboardRole } from "@/lib/whiteboard/core";

import type { BoardEvent } from "../useWhiteboardSync";
import { fitToViewport, PluginWindow, type WindowPos } from "./PluginWindow";
import { pluginById } from "./registry";
import type { BoardPlugin, BoardPluginMe, BoardPluginPlayer, BoardPluginProps } from "./types";

export type Channel = { send: (event: string, payload: unknown) => void; on: (event: BoardEvent, fn: (payload: unknown) => void) => () => void };
type OpenWindows = Record<string, WindowPos>;

const storageKey = (boardId: string) => `whiteboard-plugins:${boardId}`;

/** A plugin's own slice of the board channel: it only hears its own broadcasts. */
export function pluginBridge(channel: Channel, id: string) {
  return {
    broadcast: (payload?: unknown) => channel.send("plugin", { id, payload: payload ?? null }),
    onBroadcast: (handler: (payload: unknown) => void) =>
      channel.on("plugin", (msg) => {
        const m = msg as { id?: string; payload?: unknown };
        if (m?.id === id) handler(m.payload);
      }),
  };
}

/** Which windows are open on a board and where, remembered in this browser. */
export function usePluginWindows(boardId: string) {
  const [open, setOpen] = useState<OpenWindows>({});
  const [order, setOrder] = useState<string[]>([]);
  // The newest set of windows, updated as soon as it is written. Two windows can move in the
  // same frame (both pushed back on screen by one resize); each write builds on the one before
  // it, not on the last render.
  const current = useRef<OpenWindows>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(boardId)) ?? "{}") as OpenWindows;
      const known = Object.fromEntries(Object.entries(saved).filter(([id]) => pluginById(id)));
      current.current = known;
      setOpen(known);
      setOrder(Object.keys(known));
    } catch {
      // Nothing saved yet.
    }
  }, [boardId]);

  const save = useCallback(
    (next: OpenWindows) => {
      current.current = next;
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

  /** Moves (or minimizes) one open window. */
  const move = useCallback(
    (id: string, pos: WindowPos) => {
      if (current.current[id]) save({ ...current.current, [id]: pos });
    },
    [save],
  );

  const toggle = useCallback(
    (id: string) => {
      const now = current.current;
      if (now[id]) {
        const { [id]: _closed, ...rest } = now;
        return save(rest);
      }
      const plugin = pluginById(id);
      if (!plugin) return;
      // Open near the top right, below the toolbar, stepping each new window a little.
      const step = Object.keys(now).length * 28;
      const at = { x: Math.max(16, window.innerWidth - plugin.width - 80 - step), y: 72 + step };
      save({ ...now, [id]: fitToViewport(at, plugin.width, plugin.height) });
      focus(id);
    },
    [save, focus],
  );

  return { open, order, save, move, toggle, focus };
}

/**
 * Keeps `board`, `me` and `players` the same objects while their contents are,
 * so memoized plugins skip the board's frequent re-renders.
 */
export function useStablePluginProps(
  board: BoardPluginProps["board"],
  me: BoardPluginMe,
  players: BoardPluginPlayer[],
) {
  const stableBoard = useMemo(() => ({ id: board.id, title: board.title, role: board.role }), [board.id, board.title, board.role]);
  const stableMe = useMemo(() => ({ id: me.id, name: me.name, avatarUrl: me.avatarUrl }), [me.id, me.name, me.avatarUrl]);
  const playersKey = JSON.stringify(players.map((p) => [p.userId, p.name, p.avatarUrl]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stablePlayers = useMemo(() => players, [playersKey]);
  return { board: stableBoard, me: stableMe, players: stablePlayers };
}

/** The plugin itself, re-rendered only when its own props change. */
export const PluginBody = memo(function PluginBody({
  Component,
  ...props
}: BoardPluginProps & { Component: BoardPlugin["Component"] }) {
  return <Component {...props} />;
});

type Bridge = ReturnType<typeof pluginBridge>;

/** One open window, with callbacks that stay stable across board re-renders. */
function OpenWindow({
  id,
  plugin,
  pos,
  z,
  bridge,
  onFocus,
  onMove,
  onClose,
  ...props
}: Omit<BoardPluginProps, "close" | "broadcast" | "onBroadcast"> & {
  id: string;
  plugin: BoardPlugin;
  pos: WindowPos;
  z: number;
  bridge: Bridge;
  onFocus: (id: string) => void;
  onMove: (id: string, pos: WindowPos) => void;
  onClose: (id: string) => void;
}) {
  const close = useCallback(() => onClose(id), [onClose, id]);
  const move = useCallback((next: WindowPos) => onMove(id, next), [onMove, id]);
  const focus = useCallback(() => onFocus(id), [onFocus, id]);
  return (
    <PluginWindow
      title={plugin.name}
      icon={plugin.icon}
      tile={plugin.tile}
      width={plugin.width}
      height={plugin.height}
      pos={pos}
      z={z}
      onFocus={focus}
      onMove={move}
      onClose={close}
    >
      <PluginBody Component={plugin.Component} {...props} {...bridge} close={close} />
    </PluginWindow>
  );
}

/** Renders the open plugin windows for a board. */
export function PluginHost({
  api,
  board,
  editable,
  me,
  players,
  channel,
  windows,
}: {
  api: ExcalidrawImperativeAPI;
  board: { id: string; title: string; role: WhiteboardRole };
  editable: boolean;
  me: BoardPluginMe;
  players: BoardPluginPlayer[];
  channel: Channel;
  windows: ReturnType<typeof usePluginWindows>;
}) {
  const { open, order, move, toggle, focus } = windows;
  const stable = useStablePluginProps(board, me, players);
  const openIds = Object.keys(open).join(",");
  // Bridges only change when the set of open windows does.
  const bridges = useMemo(
    () => new Map(openIds.split(",").filter(Boolean).map((id) => [id, pluginBridge(channel, id)])),
    [openIds, channel],
  );

  // toggle and move are stable (they read the newest windows themselves), so the callbacks
  // handed to plugins never change.
  const onClose = toggle;
  const onMove = move;

  return (
    <>
      {Object.entries(open).map(([id, pos]) => {
        const plugin = pluginById(id);
        const bridge = bridges.get(id);
        if (!plugin || !bridge) return null;
        return (
          <OpenWindow
            key={id}
            id={id}
            plugin={plugin}
            pos={pos}
            z={20 + order.indexOf(id)}
            bridge={bridge}
            onFocus={focus}
            onMove={onMove}
            onClose={onClose}
            api={api}
            editable={editable}
            {...stable}
          />
        );
      })}
    </>
  );
}
