"use client";

import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard as QuestBoardData, SeasonGoal } from "@/lib/supabase/shift-quests/types";

import { BOARD, thaiShortDate } from "./copy";
import styles from "./island.module.css";
import { COMMUNITY_SLUGS, mainTitle, questView, sameRef } from "./model";
import { QuestRing } from "./QuestRing";
import { QuestTile } from "./QuestTile";
import { SideBranches } from "./SideBranches";

interface QuestBoardProps {
  /** The board's anchor (the plot sheet scrolls here). */
  id?: string;
  board: QuestBoardData;
  /** The tree's stage (from the island). */
  stage: number;
  /** The island's shared goal: the season's, else the map's. */
  goal: SeasonGoal | null;
  keynote: BoardRef | null;
  onOpen: (ref: BoardRef) => void;
  onPropose: () => void;
}

/**
 * The quest board. Not a ladder: seven main quests in any order, side quests
 * branching off them, the student's own quests, and the island's shared ones.
 */
export function QuestBoard({ id, board, stage, goal, keynote, onOpen, onPropose }: QuestBoardProps) {
  const community = board.side.filter((s) => COMMUNITY_SLUGS.has(s.slug));

  return (
    <div id={id} className={styles.board}>
      <section className={`ei-card ei-card--static ${styles.card}`} aria-labelledby="island-main-quests">
        <h2 id="island-main-quests" className={styles.sectionHeading}>
          {BOARD.mainHeading}
        </h2>
        <p className={styles.sectionSub}>{BOARD.mainSub}</p>
        <QuestRing board={board} stage={stage} keynote={keynote} onOpen={onOpen} />
      </section>

      <section className={`ei-card ei-card--static ${styles.card}`} aria-labelledby="island-side-quests">
        <h2 id="island-side-quests" className={styles.sectionHeading}>
          {BOARD.sideHeading}
        </h2>
        <p className={styles.sectionSub}>{BOARD.sideSub}</p>
        <SideBranches board={board} keynote={keynote} onOpen={onOpen} />
      </section>

      <section className={`ei-card ei-card--static ${styles.card}`} aria-labelledby="island-proposed-quests">
        <h2 id="island-proposed-quests" className={styles.sectionHeading}>
          {BOARD.proposedHeading}
        </h2>
        {board.proposed.length === 0 ? <p className={styles.sectionSub}>{BOARD.proposedEmpty}</p> : null}
        {board.proposed.length > 0 ? (
          <ul className={styles.laneList}>
            {board.proposed.map((p) => {
              const ref: BoardRef = { kind: "proposed", instanceId: p.instance_id };
              const view = questView(board, ref);
              if (!view) return null;
              return (
                <li key={p.instance_id}>
                  <QuestTile
                    layout="row"
                    status={view.status}
                    icon={view.icon}
                    title={view.title}
                    help={view.help}
                    keynote={sameRef(keynote, ref)}
                    onOpen={() => onOpen(ref)}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
        <button type="button" className={styles.quietButton} onClick={onPropose}>
          {BOARD.propose}
        </button>
      </section>

      <section className={`ei-card ei-card--static ${styles.card}`} aria-labelledby="island-shared-quests">
        <h2 id="island-shared-quests" className={styles.sectionHeading}>
          {BOARD.islandHeading}
        </h2>
        {goal ? <GoalLine board={board} goal={goal} /> : null}
        {!goal && community.length === 0 ? <p className={styles.sectionSub}>{BOARD.islandEmpty}</p> : null}
        {community.length > 0 ? (
          <ul className={styles.laneList}>
            {community.map((s) => {
              const ref: BoardRef = { kind: "side", templateId: s.template_id };
              const view = questView(board, ref);
              if (!view) return null;
              return (
                <li key={s.template_id}>
                  <QuestTile
                    layout="row"
                    status={view.status}
                    icon={view.icon}
                    title={view.title}
                    help={view.help}
                    keynote={sameRef(keynote, ref)}
                    note={view.status === "locked" && view.lockedBy.length > 0 ? BOARD.unlockWhen(view.lockedBy) : null}
                    onOpen={() => onOpen(ref)}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function GoalLine({ board, goal }: { board: QuestBoardData; goal: SeasonGoal }) {
  const title = mainTitle(board, goal.milestone);
  const target = Math.max(goal.target, 1);
  const filled = Math.min(goal.count, target) / target;
  return (
    <div className={styles.goal}>
      <p className={styles.goalLine}>
        {goal.reached
          ? BOARD.goalReached(title, goal.count, goal.target)
          : BOARD.goal(title, goal.count, goal.target, thaiShortDate(goal.deadline))}
      </p>
      <div className={styles.goalMeter} aria-hidden="true">
        <span className={styles.goalMeterFill} style={{ width: `${Math.round(filled * 100)}%` }} />
      </div>
      {goal.unlock ? (
        <p className={styles.sectionSub}>{goal.reached ? BOARD.goalUnlocked(goal.unlock) : BOARD.goalUnlock(goal.unlock)}</p>
      ) : null}
    </div>
  );
}
