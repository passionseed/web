"use client";

import { ChevronRight } from "lucide-react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { starterQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import { KEYNOTE, tileChip } from "./copy";
import styles from "./island.module.css";
import { questView } from "./model";
import { PALETTE, iconGrid, iconScale } from "./sprites";

interface KeynoteCardProps {
  board: QuestBoard;
  keynote: BoardRef | null;
  onOpen: (ref: BoardRef) => void;
}

/**
 * The one gold element on the screen and the page's one main call to action:
 * the caller's own open quest that needs them most (keynoteQuest), or, with
 * nothing open, the first main quest they can start (starterQuest). Hidden
 * only when there is neither.
 */
export function KeynoteCard({ board, keynote, onOpen }: KeynoteCardProps) {
  const target = keynote ?? starterQuest(board);
  if (!target) return null;
  const view = questView(board, target);
  if (!view) return null;
  const grid = iconGrid(view.icon);
  const headline = !keynote
    ? KEYNOTE.start(view.title)
    : view.status === "submitted"
      ? KEYNOTE.waiting(view.title)
      : KEYNOTE.next(view.title);
  // The chip only when the headline does not already say where the quest stands.
  const chip = keynote && view.status !== "submitted" ? tileChip(view.status, view.owner) : null;

  return (
    <button
      type="button"
      className={`dawn-keynote ${styles.keynote}`}
      data-island-glow=""
      data-starter={keynote ? undefined : "true"}
      onClick={() => onOpen(target)}
    >
      <span className={styles.keynoteGlow} aria-hidden="true" />
      <span className={styles.keynoteIcon} aria-hidden="true">
        <PixelIcon grid={grid} palette={PALETTE} scale={iconScale(grid, 32)} />
      </span>
      <span className={styles.keynoteText}>
        <span className={styles.keynoteTitle}>{headline}</span>
        {chip ? (
          <span className={styles.chip} data-status={view.status}>
            {chip}
          </span>
        ) : null}
      </span>
      <ChevronRight className={styles.keynoteArrow} aria-hidden="true" />
    </button>
  );
}
