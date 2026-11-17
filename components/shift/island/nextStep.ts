/**
 * The island's one next step, as data: what the gold card says and where a
 * tap on it leads. Pure and client-safe; the rules stay in the database and
 * in lib/supabase/shift-quests/board.ts.
 */
import { keynoteQuest, mainTileStatus, starterQuest, type BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import { questView, type QuestKind } from "./model";

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
  | "resting";

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
  /**
   * The day's check-in is still open and the tap leads to work, so the tap
   * opens the check-in first. Never while resting, and never just to look at
   * work that is waiting on a mentor.
   */
  checksIn: boolean;
}

export interface IslandDay {
  /** From shift_quest_island: only "any today" matters. */
  tapsToday: number;
  resting: boolean;
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
    checksIn,
  };
}

/**
 * The one next step, first match wins:
 * resting → a mentor asked for more → a quest in progress → waiting on a
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
        checksIn: false,
      }
    );
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
