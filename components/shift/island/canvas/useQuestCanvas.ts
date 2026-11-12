"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadQuestCanvas } from "@/app/shift/island/actions";
import { questGuide, type CanvasLinkState, type QuestCanvasContext } from "@/lib/shift-island/quest-canvas";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";

type Target = { ref: BoardRef; slug: string | null };

const NO_ZONES: QuestCanvasContext = { state: "no_zones" };
const UNLINKED: QuestCanvasContext = { state: "unlinked" };
const ERROR: QuestCanvasContext = { state: "error" };

/** A stable key for one request: the quest (ref and slug) and the link it was made under. */
function requestKey(target: Target, link: CanvasLinkState): string {
  return JSON.stringify({ ref: target.ref, slug: target.slug, linkedAt: link.linked ? link.linkedAt : null });
}

/**
 * The linked canvas as one quest sees it. Loads once per open quest (and
 * again on reload() or when the link changes), never during render, and drops
 * answers that arrive for a quest that is no longer open. A null target, a
 * quest whose guide has no zones, or no link gives its state straight away,
 * with no server call.
 */
export function useQuestCanvas(
  target: Target | null,
  link: CanvasLinkState
): { context: QuestCanvasContext | null; loading: boolean; reload: () => void } {
  const local: QuestCanvasContext | null =
    !target || questGuide({ kind: target.ref.kind, slug: target.slug }).zones.length === 0
      ? NO_ZONES
      : !link.linked
        ? UNLINKED
        : null;
  const key = local || !target ? null : requestKey(target, link);

  const [nonce, setNonce] = useState(0);
  const [answer, setAnswer] = useState<{ key: string; nonce: number; context: QuestCanvasContext } | null>(null);
  const ticket = useRef(0);

  useEffect(() => {
    if (!key) return;
    const mine = ++ticket.current;
    const { ref, slug } = JSON.parse(key) as Target;
    loadQuestCanvas({ ref, slug }).then(
      (result) => {
        if (mine !== ticket.current) return;
        setAnswer({ key, nonce, context: result.ok ? result.data : ERROR });
      },
      () => {
        if (mine !== ticket.current) return;
        setAnswer({ key, nonce, context: ERROR });
      }
    );
    return () => {
      // A newer request (or closing the quest) makes this one stale.
      if (mine === ticket.current) ticket.current += 1;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (local) return { context: local, loading: false, reload };
  const fresh = answer && answer.key === key ? answer : null;
  return {
    // A reload keeps showing the last answer for this quest until the new one lands.
    context: fresh?.context ?? null,
    loading: !fresh || fresh.nonce !== nonce,
    reload,
  };
}
