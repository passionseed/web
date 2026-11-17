"use client";

import { ChevronRight } from "lucide-react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import { NEXT_STEP } from "./copy";
import styles from "./island.module.css";
import { questView } from "./model";
import type { NextStep } from "./nextStep";
import { PALETTE, iconGrid, iconScale, type IconKey } from "./sprites";

interface NextStepCardProps {
  board: QuestBoard;
  step: NextStep;
  /** What the student meant to do today, kept on this browser for them only (useDayIntention). */
  intended?: string | null;
  /** The page decides what a tap does: the check-in first, waking up, or the quest. */
  onTap: (step: NextStep) => void;
}

/** The headline: what to do next, in the student's words for it. */
export function nextHeadline(step: NextStep): string {
  switch (step.kind) {
    case "start":
      return NEXT_STEP.start(step.title);
    case "retry":
      return NEXT_STEP.retry(step.title);
    case "go":
      return NEXT_STEP.go(step.title);
    case "answer":
      return NEXT_STEP.answer(step.title);
    case "waiting":
      return step.waitingTitle ? NEXT_STEP.meanwhile(step.title) : NEXT_STEP.waiting(step.title);
    case "resting":
      return NEXT_STEP.resting;
  }
}

/** The one line under the headline: the mentor's words, where the quest stands, or which quest it is. */
export function nextLine(step: NextStep, intended: string | null = null): string | null {
  switch (step.kind) {
    case "answer":
    case "retry":
      if (step.feedback) return NEXT_STEP.said(step.feedback);
      break;
    case "waiting":
      return step.waitingTitle ? NEXT_STEP.sent(step.waitingTitle) : NEXT_STEP.sentOnly;
    case "resting":
      return NEXT_STEP.restingLine;
    case "go":
      if (intended && !step.checksIn) return NEXT_STEP.intended(intended);
      break;
    case "start":
      break;
  }
  if (step.milestone != null) return NEXT_STEP.main(step.milestone);
  if (step.kindOfQuest === "side") return NEXT_STEP.side;
  if (step.kindOfQuest === "proposed") return NEXT_STEP.proposed;
  return null;
}

/**
 * The island's one gold element and its one main action, at the bottom of the
 * screen: the next step (nextStep), said in one headline and one line, opened
 * with one tap. While the day's check-in is open a lamp dot sits on the icon
 * and the tap opens the check-in first, then the quest.
 */
export function NextStepCard({ board, step, intended = null, onTap }: NextStepCardProps) {
  const view = step.ref ? questView(board, step.ref) : null;
  const icon: IconKey = view?.icon ?? "moon";
  const grid = iconGrid(icon);
  const line = nextLine(step, intended);

  return (
    <button
      type="button"
      className={`dawn-keynote ${styles.keynote}`}
      data-island-glow=""
      data-kind={step.kind}
      aria-haspopup={step.checksIn || step.ref ? "dialog" : undefined}
      onClick={() => onTap(step)}
    >
      <span className={styles.keynoteGlow} aria-hidden="true" />
      <span className={styles.keynoteIcon} aria-hidden="true">
        <PixelIcon grid={grid} palette={PALETTE} scale={iconScale(grid, 32)} />
        {step.checksIn ? <span className={styles.keynoteDot} data-testid="next-check-in" /> : null}
      </span>
      <span className={styles.keynoteText}>
        <span className={styles.keynoteTitle}>{nextHeadline(step)}</span>
        {line ? <span className={styles.keynoteLine}>{line}</span> : null}
        {step.checksIn ? <span className="sr-only">{NEXT_STEP.checkIn}</span> : null}
      </span>
      <ChevronRight className={styles.keynoteArrow} aria-hidden="true" />
    </button>
  );
}
