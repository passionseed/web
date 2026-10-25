import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ComponentType, ReactNode } from "react";

import type { WhiteboardRole } from "@/lib/whiteboard/core";

/** What a plugin window gets from the board. */
export type BoardPluginProps = {
  api: ExcalidrawImperativeAPI;
  board: { id: string; title: string; role: WhiteboardRole };
  editable: boolean;
  /** Tell this plugin on everyone else's screen that something changed. */
  broadcast: (payload?: unknown) => void;
  /** Hear this plugin's broadcasts from others. Returns an unsubscribe. */
  onBroadcast: (handler: (payload: unknown) => void) => () => void;
  close: () => void;
};

/**
 * A board window, like a FigJam plugin: opened from the Apps menu, floats
 * over the canvas, can be dragged, and is remembered per board in this browser.
 */
export type BoardPlugin = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  /** Window size in px. */
  width: number;
  height: number;
  Component: ComponentType<BoardPluginProps>;
};
