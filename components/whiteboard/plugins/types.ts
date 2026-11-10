import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ComponentType, ReactNode } from "react";

import type { WhiteboardRole } from "@/lib/whiteboard/core";

/** The signed-in person looking at the board. */
export type BoardPluginMe = { id: string; name: string; avatarUrl: string | null };

/** Someone online on this board now (deduped by userId, includes me). */
export type BoardPluginPlayer = { userId: string; name: string; avatarUrl: string | null };

/** What a plugin window gets from the board. */
export type BoardPluginProps = {
  api: ExcalidrawImperativeAPI;
  board: { id: string; title: string; role: WhiteboardRole };
  editable: boolean;
  me: BoardPluginMe;
  players: BoardPluginPlayer[];
  /** Tell this plugin on everyone else's screen that something changed. */
  broadcast: (payload?: unknown) => void;
  /** Hear this plugin's broadcasts from others. Returns an unsubscribe. */
  onBroadcast: (handler: (payload: unknown) => void) => () => void;
  close: () => void;
};

/**
 * A board app, like a FigJam plugin: opened from the Apps menu as a window that
 * floats over the canvas (dragged, remembered per board in this browser), and,
 * when it has a widget size, placed on the canvas itself as a widget that
 * everyone sees and that moves and zooms with the board.
 */
export type BoardPlugin = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  /** Window size in px. */
  width: number;
  height: number;
  /** Size on the canvas when placed as a widget; leave out for window-only apps. */
  widget?: { width: number; height: number };
  /** Loaded lazily (registry.tsx), so an app's code only downloads once it is opened. */
  Component: ComponentType<BoardPluginProps>;
};
