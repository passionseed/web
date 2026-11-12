"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { GroupInput, GroupPick, MentorGroup } from "@/lib/whiteboard/groups";

const pickKey = (boardId: string) => `whiteboard-mentor-group:${boardId}`;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Something went wrong");
  return body as T;
}

/**
 * The board's mentor groups (staff only), loaded when the Mentor dashboard
 * opens, and which group this staff member is looking at (kept per board in
 * this browser; "mine" at first).
 */
export function useMentorGroups(boardId: string) {
  const [groups, setGroups] = useState<MentorGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pick, setPickState] = useState<GroupPick>("mine");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(pickKey(boardId));
      if (saved) setPickState(saved);
    } catch {
      // Private windows: start on "mine".
    }
    let live = true;
    call<{ groups: MentorGroup[] }>(`/api/whiteboards/${boardId}/groups`)
      .then(({ groups: list }) => live && setGroups(list))
      .catch(() => live && toast.error("โหลดกลุ่มไม่ได้"))
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [boardId]);

  const setPick = useCallback(
    (next: GroupPick) => {
      setPickState(next);
      try {
        window.localStorage.setItem(pickKey(boardId), next);
      } catch {
        // Not remembered; fine.
      }
    },
    [boardId],
  );

  const save = useCallback(
    async (input: GroupInput, id?: string) => {
      const path = id ? `/api/whiteboards/${boardId}/groups/${id}` : `/api/whiteboards/${boardId}/groups`;
      const { group } = await call<{ group: MentorGroup }>(path, { method: id ? "PATCH" : "POST", body: JSON.stringify(input) });
      setGroups((list) => (id ? list.map((g) => (g.id === id ? group : g)) : [...list, group]));
      return group;
    },
    [boardId],
  );

  const remove = useCallback(
    async (id: string) => {
      await call(`/api/whiteboards/${boardId}/groups/${id}`, { method: "DELETE" });
      setGroups((list) => list.filter((g) => g.id !== id));
    },
    [boardId],
  );

  return { groups, loaded, pick, setPick, save, remove };
}
