"use client";

import { Sidebar } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Flag } from "lucide-react";
import { memo } from "react";

import { QuestDashboard, questSectionId, type Person } from "./QuestDashboard";

export const QUEST_SIDEBAR = "quest-dashboard";

/** Opens the Quest dashboard, optionally scrolled to one quest. */
export function openQuestPanel(api: ExcalidrawImperativeAPI, questId?: string) {
  api.toggleSidebar({ name: QUEST_SIDEBAR, force: true });
  if (questId) {
    requestAnimationFrame(() =>
      document.getElementById(questSectionId(questId))?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  }
}

/**
 * The Quest dashboard as a panel of its own (not a tab of the board kit), for
 * the board's owner, site admins and quest reviewers. Opened from the board
 * menu or a quest's card on the board.
 */
export const QuestSidebar = memo(function QuestSidebar({
  api,
  boardId,
  people,
  nameOf,
}: {
  api: ExcalidrawImperativeAPI;
  boardId: string;
  people: Person[];
  nameOf: (id: string) => string;
}) {
  return (
    <Sidebar name={QUEST_SIDEBAR} className="whiteboard-kit wb-quest-sidebar">
      <Sidebar.Header>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Flag className="h-4 w-4 text-emerald-600" /> Quest Dashboard
        </span>
      </Sidebar.Header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <QuestDashboard api={api} boardId={boardId} people={people} nameOf={nameOf} />
      </div>
    </Sidebar>
  );
});
