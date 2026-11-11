"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { GripHorizontal } from "lucide-react";
import { useMemo } from "react";

import type { WhiteboardRole } from "@/lib/whiteboard/core";

import { grainTile } from "../chrome/Grain";
import { PluginBody, pluginBridge, useStablePluginProps, type Channel } from "./PluginHost";
import { pluginById } from "./registry";
import type { BoardPluginMe, BoardPluginPlayer } from "./types";

/** A widget on the canvas has no window to close. */
const noop = () => undefined;

/**
 * An app placed on the canvas (rendered by Excalidraw inside an embeddable
 * element). Its body takes clicks straight away (see `.wb-widget__body` in
 * whiteboard.css), so nobody has to find Excalidraw's activation spot; the
 * title bar is left to the canvas, so dragging it moves, selects and resizes
 * the widget.
 */
export function BoardWidget({
  pluginId,
  api,
  board,
  editable,
  me,
  players,
  channel,
}: {
  pluginId: string;
  api: ExcalidrawImperativeAPI;
  board: { id: string; title: string; role: WhiteboardRole };
  editable: boolean;
  me: BoardPluginMe;
  players: BoardPluginPlayer[];
  channel: Channel;
}) {
  const plugin = pluginById(pluginId);
  const bridge = useMemo(() => pluginBridge(channel, pluginId), [channel, pluginId]);
  const stable = useStablePluginProps(board, me, players);
  if (!plugin) {
    return <div className="wb-widget flex h-full items-center justify-center text-sm"><span className="wb-soft">แอปนี้ไม่มีแล้ว</span></div>;
  }
  // Window-only apps (Spyfall: private cards) never run on the shared canvas, even if pasted there.
  if (!plugin.widget) {
    return (
      <div className="wb-widget flex h-full items-center justify-center p-3 text-center text-sm">
        <span className="wb-soft">เปิด {plugin.name} จากเมนูแอป · Open it from the Apps menu</span>
      </div>
    );
  }
  return (
    <div className="wb-widget flex h-full flex-col overflow-hidden" onWheel={(e) => e.stopPropagation()}>
      <div className="wb-window__bar flex items-center gap-2 px-3 py-2">
        <span className={`${grainTile(plugin.tile)} wb-tile-icon--sm`}>{plugin.icon}</span>
        <span className="wb-window__title min-w-0 flex-1 truncate">{plugin.name}</span>
        <GripHorizontal size={16} className="wb-soft" aria-hidden />
      </div>
      <div className="wb-widget__body min-h-0 flex-1 overflow-y-auto">
        <PluginBody Component={plugin.Component} api={api} editable={editable} {...stable} {...bridge} close={noop} />
      </div>
    </div>
  );
}
