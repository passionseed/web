"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { AwayState } from "@/lib/supabase/shift-quests/playerTypes";

import { readStorySeen } from "../story/useStorySeen";

/** A beat after the island shows, so the card never lands in the same frame as the world. */
export const ARRIVAL_MS = 600;

interface ReturnArrival {
  /** The return card is due (shift_quest_away_state's ask_return). */
  due: boolean;
  /** The crossing is on screen (useVoyage().open). */
  voyageOpen: boolean;
  /** The story is on screen (StoryLauncher's onOpenChange). */
  storyOpen: boolean;
  /**
   * Anything else is open, or the student already tapped into work (the
   * check-in): the card then waits for the next page load.
   */
  busy: boolean;
  /** Opens the card: called at most once per page. */
  onArrive: () => void;
  /**
   * "Decided for this page", held by a parent that outlives this screen: IslandApp swaps the
   * no-plot island for the claimed one after a claim, and a card passed before it stays passed.
   * Absent: this screen's own.
   */
  decided?: RefObject<boolean>;
}

/**
 * When the return card opens: once per page, on arrival, after the crossing
 * and the story (a browser that has not seen the story plays it first, as
 * StoryLauncher's autoOpen does), and only while nothing else is open and the
 * student has not tapped into work yet. Never between the check-in tap and
 * the work: anything opened or tapped first passes the card for this page.
 */
export function useReturnArrival({ due, voyageOpen, storyOpen, busy, onArrive, decided: shared }: ReturnArrival): void {
  // Decided for this page: opened, or passed.
  const own = useRef(false);
  const decided = shared ?? own;
  const storyPlayed = useRef(false);
  const arrive = useRef(onArrive);
  useEffect(() => {
    arrive.current = onArrive;
  });

  useEffect(() => {
    if (storyOpen) storyPlayed.current = true;
  }, [storyOpen]);

  useEffect(() => {
    if (decided.current) return;
    if (!due || busy) {
      decided.current = true;
      return;
    }
    // The crossing and the story come first. An unseen story is about to open by itself.
    if (voyageOpen || storyOpen || (!storyPlayed.current && !readStorySeen())) return;
    const timer = window.setTimeout(() => {
      decided.current = true;
      arrive.current();
    }, ARRIVAL_MS);
    return () => window.clearTimeout(timer);
  }, [due, voyageOpen, storyOpen, busy, decided]);
}

/**
 * The return card for one island screen: the stretch it opened for (kept
 * while it slides closed), or null before it opens or when it never does.
 * Never for staff. `onOpen` shows it (the screen's own panel).
 */
export function useReturnCard({
  away,
  staff,
  voyageOpen,
  storyOpen,
  busy,
  onOpen,
  decided,
}: Omit<ReturnArrival, "due" | "onArrive"> & { away: AwayState | null | undefined; staff: boolean; onOpen: () => void }): string | null {
  const [from, setFrom] = useState<string | null>(null);
  const due = staff ? null : (away?.askReturn?.gapFrom ?? null);
  useReturnArrival({
    due: due != null,
    voyageOpen,
    storyOpen,
    busy,
    decided,
    onArrive: () => {
      setFrom(due);
      onOpen();
    },
  });
  return from;
}
