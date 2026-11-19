"use client";

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
  /** The tap is on its way (starting the quest, waking up): the button waits. */
  pending?: boolean;
  /** The page decides what a tap does (step.action): start then open, open, or wake. */
  onTap: (step: NextStep) => void;
}

/**
 * A number kept on one line with the word after it (a no-break space
 * between them), so a wrapped title never leaves the noun alone on its
 * second line ("... อีก 5 / คน"). For the eye only: the card's accessible
 * name keeps the plain text.
 */
export function keepCounts(text: string): string {
  return text.replace(/(\d) (?=\S)/g, "$1 ");
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
    case "reviewed":
      return NEXT_STEP.reviewed(step.title);
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
    case "reviewed":
      return step.milestone != null ? NEXT_STEP.grew : NEXT_STEP.passed;
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

/** The card's one button, in the student's words for what the tap does; null with nothing to tap. */
export function nextAction(step: NextStep): string | null {
  if (!step.action) return null;
  switch (step.kind) {
    case "resting":
      return NEXT_STEP.action.wake;
    case "reviewed":
      return NEXT_STEP.action.reviewed;
    case "answer":
      return NEXT_STEP.action.answer;
    case "retry":
      return NEXT_STEP.action.retry;
    case "go":
      return NEXT_STEP.action.go;
    case "start":
    case "waiting":
      return step.action === "start" ? NEXT_STEP.action.start : NEXT_STEP.action.go;
  }
}

/**
 * The island's one gold element and its one main action, at the bottom of the
 * screen: the next step (nextStep), said in one headline and one line, with
 * one verb button that says what the tap does. With nothing to tap (work
 * waiting on a mentor, nothing else free) the card is plain words.
 */
export function NextStepCard({ board, step, intended = null, pending = false, onTap }: NextStepCardProps) {
  const view = step.ref ? questView(board, step.ref) : null;
  const icon: IconKey = view?.icon ?? "moon";
  const grid = iconGrid(icon);
  const line = nextLine(step, intended);
  const label = nextAction(step);

  return (
    <section className={`dawn-keynote ${styles.keynote}`} data-island-glow="" data-kind={step.kind} aria-label={nextHeadline(step)}>
      <span className={styles.keynoteGlow} aria-hidden="true" />
      <div className={styles.keynoteHead}>
        <span className={styles.keynoteIcon} aria-hidden="true">
          <PixelIcon grid={grid} palette={PALETTE} scale={iconScale(grid, 32)} />
        </span>
        <span className={styles.keynoteText}>
          <span className={styles.keynoteTitle}>{keepCounts(nextHeadline(step))}</span>
          {line ? <span className={styles.keynoteLine}>{line}</span> : null}
        </span>
      </div>
      {label ? (
        <button
          type="button"
          className={`ei-button-dawn ${styles.primary}`}
          aria-haspopup={step.ref && step.action !== "wake" ? "dialog" : undefined}
          disabled={pending}
          aria-busy={pending}
          onClick={() => onTap(step)}
        >
          <span>{label}</span>
        </button>
      ) : null}
    </section>
  );
}
