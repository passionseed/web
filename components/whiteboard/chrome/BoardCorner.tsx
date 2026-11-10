"use client";

import { memo } from "react";

import { BoardTitle, SaveStatus } from "../BoardChrome";
import type { SaveState } from "../useWhiteboardSync";

/**
 * The top-left card, like FigJam's: Excalidraw's menu button sits in its left
 * slot (see .wb-corner--left in whiteboard.css), then the board name and the
 * save state.
 */
export const BoardCorner = memo(function BoardCorner({
  boardId,
  title,
  canRename,
  onRenamed,
  saveState,
  connected,
  readOnly,
}: {
  boardId: string;
  title: string;
  canRename: boolean;
  onRenamed: (title: string) => void;
  saveState: SaveState;
  connected: boolean;
  readOnly: boolean;
}) {
  return (
    <div className="wb-corner wb-corner--left">
      <BoardTitle boardId={boardId} title={title} canRename={canRename} onRenamed={onRenamed} />
      <SaveStatus state={saveState} connected={connected} readOnly={readOnly} />
    </div>
  );
});
