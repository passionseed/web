/**
 * The island's one next step, as data: what the gold card says and where a
 * tap on it leads. Pure and client-safe; the rules stay in the database and
 * in lib/supabase/shift-quests/board.ts.
 */
import { keynoteQuest, mainTileStatus, starterQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import { canStart, questView, type QuestKind, type QuestView } from "./model";

export type NextStepKind =
  /** Nothing open: the first main quest the student can start. */
  | "start"
  /** Nothing open, and a main quest of the student's was declined: try it again. */
  | "retry"
  /** A quest in progress (active or paused). */
  | "go"
  /** A mentor asked for more on the student's work. */
  | "answer"
  /** The only open work is with a mentor; `ref` may point at a quest to start meanwhile. */
  | "waiting"
  /** The student is resting: a tap wakes them. */
  | "resting"
  /** A mentor passed the student's work since they last looked: a tap shows the result. */
  | "reviewed";

/**
 * What the card's one button does: start the quest and open it, open it, or
 * wake the student. Null: nothing to do but wait (the card is plain text).
 */
export type NextAction = "start" | "open" | "wake";

export interface NextStep {
  kind: NextStepKind;
  /** The quest a tap opens; null only while resting with nothing open. */
  ref: BoardRef | null;
  kindOfQuest: QuestKind | null;
  /** The headline's quest title ("" when there is none). */
  title: string;
  /** Main quests only: 1..7. */
  milestone: number | null;
  /** The student's own instance, so the day's check-in is filed under it. Null before a quest is started. */
  instanceId: string | null;
  /** The mentor's latest words on this quest (answer and retry). Never a teammate's work. */
  feedback: string | null;
  /** waiting: the quest that is with a mentor, when the card points at another one to start meanwhile. */
  waitingTitle: string | null;
  /** The card's one button; null when there is nothing to tap (waiting, nothing free). */
  action: NextAction | null;
  /**
   * The day's check-in is still open and the tap leads to work, so the tap
   * counts as the day's check-in. Never while resting, and never just to look
   * at work that is waiting on a mentor or at a result.
   */
  checksIn: boolean;
}

export interface IslandDay {
  /** From shift_quest_island: only "any today" matters. */
  tapsToday: number;
  resting: boolean;
  /**
   * The newest approval of the student's own work that they have not seen on
   * this browser yet (results.ts, useResultsSeen). Null or absent: none.
   */
  approved?: BoardRef | null;
}

/** The student's own declined main quest with the lowest milestone, if nothing else is open. */
function declinedMain(board: QuestBoard): number | null {
  const declined = board.main
    .filter((m) => mainTileStatus(m) === "declined")
    .map((m) => m.milestone)
    .sort((a, b) => a - b);
  return declined[0] ?? null;
}

function stepFor(
  board: QuestBoard,
  ref: BoardRef,
  kind: NextStepKind,
  checksIn: boolean,
  extra: Partial<Pick<NextStep, "waitingTitle">> = {},
): NextStep | null {
  const view = questView(board, ref);
  if (!view) return null;
  const action = actionFor(view, kind, extra.waitingTitle ?? null);
  const review = view.mine?.latest_review ?? null;
  const feedback = (kind === "answer" || kind === "retry") && review?.feedback?.trim() ? review.feedback.trim() : null;
  return {
    kind,
    ref,
    kindOfQuest: view.kind,
    title: view.title,
    milestone: ref.kind === "main" ? ref.milestone : null,
    // A retry starts a new round: the old instance is closed.
    instanceId: kind === "retry" ? null : view.instanceId,
    feedback,
    waitingTitle: extra.waitingTitle ?? null,
    action,
    checksIn,
  };
}

/** The card's button for a step: an untouched quest starts on the tap, waiting alone has none. */
function actionFor(view: QuestView, kind: NextStepKind, waitingTitle: string | null): NextAction | null {
  if (kind === "resting") return "wake";
  if (kind === "waiting" && !waitingTitle) return null;
  if ((kind === "start" || kind === "waiting") && canStart(view)) return "start";
  return "open";
}

/**
 * The one next step, first match wins:
 * resting → a fresh approval to see → a mentor asked for more → a quest in progress → waiting on a
 * mentor (and a main quest to start meanwhile) → a declined main quest to try
 * again → the first main quest to start. Null when there is nothing left to
 * do (all seven passed, nothing open): the page shows the board instead.
 */
export function nextStep(board: QuestBoard, day: IslandDay): NextStep | null {
  const keynote = keynoteQuest(board);
  const dayOpen = day.tapsToday === 0 && !day.resting;

  if (day.resting) {
    const resting = keynote ? stepFor(board, keynote, "resting", false) : null;
    return (
      resting ?? {
        kind: "resting",
        ref: null,
        kindOfQuest: null,
        title: "",
        milestone: null,
        instanceId: null,
        feedback: null,
        waitingTitle: null,
        action: "wake",
        checksIn: false,
      }
    );
  }

  if (day.approved) {
    const seen = stepFor(board, day.approved, "reviewed", false);
    if (seen) return seen;
  }

  if (keynote) {
    const view = questView(board, keynote);
    if (view?.status === "clarification") return stepFor(board, keynote, "answer", dayOpen);
    if (view?.status === "submitted") {
      const meanwhile = starterQuest(board);
      if (meanwhile) return stepFor(board, meanwhile, "waiting", dayOpen, { waitingTitle: view.title });
      return stepFor(board, keynote, "waiting", false);
    }
    if (view) return stepFor(board, keynote, "go", dayOpen);
  }

  const retry = declinedMain(board);
  if (retry != null) return stepFor(board, { kind: "main", milestone: retry }, "retry", dayOpen);

  const start = starterQuest(board);
  return start ? stepFor(board, start, "start", dayOpen) : null;
}
