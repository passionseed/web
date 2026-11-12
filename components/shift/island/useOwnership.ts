"use client";

import { useEffect, useState } from "react";

import { loadOwnership } from "@/app/shift/island/actions";
import type { OwnershipRow } from "@/lib/shift-island/ownership";

/** Quest 5's ownership checklist on the quest page: loading, loaded (null without a project) or failed. */
export type OwnershipState =
  | { state: "loading" }
  | { state: "ready"; rows: OwnershipRow[] | null }
  | { state: "error" };

const LOADING: OwnershipState = { state: "loading" };

/**
 * Reads the checklist once each time `active` turns on (quest 5's sheet
 * opens), never during render, and drops an answer that arrives after the
 * sheet closed or reopened. Inactive: null, and no server call.
 */
export function useOwnership(active: boolean): OwnershipState | null {
  // One number per opening, so a late answer from an earlier opening is ignored.
  const [opening, setOpening] = useState(0);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setOpening((n) => n + 1);
  }
  const [answer, setAnswer] = useState<{ opening: number; value: OwnershipState } | null>(null);

  useEffect(() => {
    if (!active) return;
    let live = true;
    loadOwnership().then(
      (result) => {
        if (live) setAnswer({ opening, value: result.ok ? { state: "ready", rows: result.data } : { state: "error" } });
      },
      () => {
        if (live) setAnswer({ opening, value: { state: "error" } });
      }
    );
    return () => {
      live = false;
    };
  }, [active, opening]);

  if (!active) return null;
  return answer && answer.opening === opening ? answer.value : LOADING;
}
