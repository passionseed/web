"use client";

import { useEffect, useState } from "react";

export type QuestPerson = { name: string; avatarUrl: string | null };

/**
 * Discord names and pictures for the people in the Quest dashboard, loaded when
 * it opens (and again when someone new appears), so opening the board stays fast.
 * Until they arrive, and for anyone without Discord, callers fall back to profile names.
 */
export function useQuestPeople(boardId: string, ids: string[]): Record<string, QuestPerson> {
  const [people, setPeople] = useState<Record<string, QuestPerson>>({});
  const key = [...new Set(ids)].sort().join(",");

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/whiteboards/${boardId}/quest-people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: key.split(",") }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { people?: Record<string, QuestPerson> } | null) => {
        if (data?.people) setPeople((old) => ({ ...old, ...data.people }));
      })
      .catch(() => {
        // Profile names stay; nothing to tell the person.
      });
    return () => controller.abort();
  }, [boardId, key]);

  return people;
}
