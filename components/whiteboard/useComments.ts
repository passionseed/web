"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { WhiteboardComment } from "@/lib/supabase/whiteboards";

import { boardApi, type BoardEvent } from "./useWhiteboardSync";

export type Thread = WhiteboardComment & { replies: WhiteboardComment[] };

type Channel = {
  send: (event: string, payload: unknown) => void;
  on: (event: BoardEvent, handler: (payload: unknown) => void) => () => void;
};

type Shown = { name: string; avatarUrl: string | null } | undefined;

/**
 * Comment threads for a board, kept in sync with everyone else on it. `shownAs`
 * gives an author's name and picture as the board shows people (their Discord),
 * when known.
 */
export function useComments(boardId: string, channel: Channel, shownAs?: (userId: string) => Shown) {
  const [comments, setComments] = useState<WhiteboardComment[]>([]);
  const { send, on } = channel;

  const refresh = useCallback(async () => {
    try {
      const { comments: list } = await boardApi<{ comments: WhiteboardComment[] }>(`/api/whiteboards/${boardId}/comments`);
      setComments(list);
    } catch {
      // Keep what we have; the next change tries again.
    }
  }, [boardId]);

  useEffect(() => {
    void refresh();
    return on("comments", () => void refresh());
  }, [on, refresh]);

  const threads = useMemo<Thread[]>(() => {
    const replies = new Map<string, WhiteboardComment[]>();
    const shown = (c: WhiteboardComment): WhiteboardComment => {
      const p = shownAs?.(c.authorId);
      return p ? { ...c, authorName: p.name, authorAvatar: p.avatarUrl ?? c.authorAvatar } : c;
    };
    for (const raw of comments) {
      const c = shown(raw);
      if (!c.parentId) continue;
      const list = replies.get(c.parentId);
      if (list) list.push(c);
      else replies.set(c.parentId, [c]);
    }
    return comments
      .filter((c) => !c.parentId)
      .map((c) => ({ ...shown(c), replies: replies.get(c.id) ?? [] }));
  }, [comments, shownAs]);

  const mutate = useCallback(
    async (path: string, init: RequestInit) => {
      try {
        const result = await boardApi<{ id?: string }>(path, init);
        await refresh();
        send("comments", {});
        return result;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
        return null;
      }
    },
    [refresh, send],
  );

  // Stable between renders, so the editor only re-renders when comments change.
  return useMemo(() => {
    const base = `/api/whiteboards/${boardId}/comments`;
    return {
      threads,
      addThread: (x: number, y: number, body: string) =>
        mutate(base, { method: "POST", body: JSON.stringify({ x, y, body }) }),
      reply: (parentId: string, body: string) =>
        mutate(base, { method: "POST", body: JSON.stringify({ parentId, body }) }),
      resolve: (id: string, resolved: boolean) =>
        mutate(`${base}/${id}`, { method: "PATCH", body: JSON.stringify({ resolved }) }),
      remove: (id: string) => mutate(`${base}/${id}`, { method: "DELETE" }),
    };
  }, [boardId, mutate, threads]);
}

export type CommentsApi = ReturnType<typeof useComments>;
