"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useMemo } from "react";

import type { WhiteboardRole } from "@/lib/whiteboard/core";

import { pluginBridge, type Channel } from "./PluginHost";
import { pluginById } from "./registry";

/**
 * An app placed on the canvas (rendered by Excalidraw inside an embeddable
 * element). Excalidraw makes it clickable once someone clicks its middle;
 * until then it is a picture that can be moved, resized and deleted.
 */
export function BoardWidget({
  pluginId,
  api,
  board,
  editable,
  channel,
}: {
  pluginId: string;
  api: ExcalidrawImperativeAPI;
  board: { id: string; title: string; role: WhiteboardRole };
  editable: boolean;
  channel: Channel;
}) {
  const plugin = pluginById(pluginId);
  const bridge = useMemo(() => pluginBridge(channel, pluginId), [channel, pluginId]);
  if (!plugin) {
    return <div className="wb-widget flex h-full items-center justify-center text-sm opacity-60">แอปนี้ไม่มีแล้ว</div>;
  }
  const { Component } = plugin;
  return (
    <div className="wb-widget flex h-full flex-col overflow-hidden" onWheel={(e) => e.stopPropagation()}>
      <div className="wb-window__bar flex items-center gap-2 px-3 py-2">
        {plugin.icon}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{plugin.name}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Component api={api} board={board} editable={editable} close={() => undefined} {...bridge} />
      </div>
    </div>
  );
}
