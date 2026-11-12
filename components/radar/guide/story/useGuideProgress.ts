"use client";

/**
 * Game layer on top of useGuideState (lib/radar-guide/guide-state.ts): the
 * badge toast queue, the "+XP" pop, the level map nodes and the profile card.
 * For pages that run the story outside the shell (cover, standalone demos);
 * the shell provider can use it too instead of its own queue.
 *
 * Progress stays a per-viewer convenience in localStorage (try/catch inside
 * guide-state); demo mode keeps it in memory.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { useGuideState } from "@/lib/radar-guide/guide-state";
import {
  buildProfileCard,
  levelMap,
  type BadgeDef,
  type LevelNode,
  type ProfileCard,
  type ProgressAction,
  type StepResult,
} from "@/lib/radar-guide/story";
import { BADGE_TOAST_MS } from "./BadgeToast";

export const XP_POP_MS = 1400;

export interface ToastQueue {
  current: BadgeDef | null;
  queue: readonly BadgeDef[];
}

/** Pure queue helpers (tested): badges toast one at a time, in the order earned, never twice. */
export function enqueueBadges(q: ToastQueue, badges: readonly BadgeDef[]): ToastQueue {
  const seen = new Set([q.current?.id, ...q.queue.map((b) => b.id)]);
  const fresh = badges.filter((b) => !seen.has(b.id));
  if (!fresh.length) return q;
  if (q.current) return { current: q.current, queue: [...q.queue, ...fresh] };
  return { current: fresh[0], queue: [...q.queue, ...fresh.slice(1)] };
}

export function dismissBadge(q: ToastQueue): ToastQueue {
  if (!q.current && !q.queue.length) return q;
  return { current: q.queue[0] ?? null, queue: q.queue.slice(1) };
}

export interface UseGuideProgress {
  state: ReturnType<typeof useGuideState>["state"];
  xp: ReturnType<typeof useGuideState>["xp"];
  dispatch(action: ProgressAction): StepResult;
  /** Badge on screen now, or null. */
  toast: BadgeDef | null;
  dismissToast(): void;
  /** XP gained by the last action, shown for XP_POP_MS; `xpPopId` changes on every pop. */
  xpPop: number | null;
  xpPopId: number;
  levels(currentKey?: string): LevelNode[];
  profile: ProfileCard;
}

export function useGuideProgress(
  entry: Pick<GuideIndexEntry, "slug" | "nameTh" | "pages" | "story">,
  options: { demo?: boolean } = {}
): UseGuideProgress {
  const [toasts, setToasts] = useState<ToastQueue>({ current: null, queue: [] });
  const [xpPop, setXpPop] = useState<{ n: number; id: number } | null>(null);
  const popTimer = useRef<number | null>(null);

  const onEarned = useCallback((badges: BadgeDef[]) => setToasts((q) => enqueueBadges(q, badges)), []);
  const { state, dispatch: rawDispatch, xp } = useGuideState(entry, { demo: options.demo, onEarned });

  const dispatch = useCallback(
    (action: ProgressAction) => {
      const result = rawDispatch(action);
      if (result.xpGained > 0) {
        setXpPop((prev) => ({ n: result.xpGained, id: (prev?.id ?? 0) + 1 }));
        if (popTimer.current !== null) window.clearTimeout(popTimer.current);
        popTimer.current = window.setTimeout(() => setXpPop(null), XP_POP_MS);
      }
      return result;
    },
    [rawDispatch]
  );

  // Auto-dismiss the toast on screen.
  const onScreen = toasts.current;
  useEffect(() => {
    if (!onScreen) return;
    const id = window.setTimeout(() => setToasts(dismissBadge), BADGE_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [onScreen]);

  useEffect(
    () => () => {
      if (popTimer.current !== null) window.clearTimeout(popTimer.current);
    },
    []
  );

  const dismissToast = useCallback(() => setToasts(dismissBadge), []);
  const levels = useCallback((currentKey?: string) => levelMap(state, entry.pages, currentKey), [state, entry.pages]);
  const profile = useMemo(() => buildProfileCard(state, entry), [state, entry]);

  return {
    state,
    xp,
    dispatch,
    toast: onScreen,
    dismissToast,
    xpPop: xpPop?.n ?? null,
    xpPopId: xpPop?.id ?? 0,
    levels,
    profile,
  };
}
