"use client";

import { useCallback, useRef, useState } from "react";

import { newQuestTag, type Quest } from "@/lib/whiteboard/quests";

/** The quest this person is doing on this board, if any. */
export type QuestSession = { questId: string; session: string; startedAt: string };

const key = (boardId: string) => `whiteboard-quest:${boardId}`;

function load(boardId: string): QuestSession | null {
  try {
    const raw = localStorage.getItem(key(boardId));
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<QuestSession>;
    return typeof s.questId === "string" && typeof s.session === "string" && typeof s.startedAt === "string"
      ? { questId: s.questId, session: s.session, startedAt: s.startedAt }
      : null;
  } catch {
    return null;
  }
}

function store(boardId: string, session: QuestSession | null) {
  try {
    if (session) localStorage.setItem(key(boardId), JSON.stringify(session));
    else localStorage.removeItem(key(boardId));
  } catch {
    // Private mode: the session still works until the page closes.
  }
}

/**
 * Start and end a quest session. While one runs, `newElementData` gives the
 * tag that useWhiteboardSync puts on everything this person creates. Kept in
 * localStorage per board, so a reload (or a dropped connection) keeps it going.
 */
export function useQuestSession(boardId: string, meId: string) {
  // The editor only renders in the browser (WhiteboardRoom loads it with ssr: false).
  const [session, setSession] = useState<QuestSession | null>(() => load(boardId));
  const sessionRef = useRef(session);

  const start = useCallback(
    (quest: Pick<Quest, "id">) => {
      const next = { questId: quest.id, session: crypto.randomUUID(), startedAt: new Date().toISOString() };
      store(boardId, next);
      sessionRef.current = next;
      setSession(next);
    },
    [boardId],
  );

  const end = useCallback(() => {
    store(boardId, null);
    sessionRef.current = null;
    setSession(null);
  }, [boardId]);

  // Stable, and reads the live session, so the sync hook never re-subscribes.
  const newElementData = useCallback(() => {
    const s = sessionRef.current;
    return s ? { quest: newQuestTag(s.questId, s.session, meId) } : null;
  }, [meId]);

  return { session, start, end, newElementData };
}
