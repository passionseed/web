"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard as QuestBoardData, SeasonGoal } from "@/lib/supabase/shift-quests/types";

import { BOARD, stageName, thaiShortDate } from "./copy";
import { useDraft } from "./drafts";
import styles from "./island.module.css";
import { COMMUNITY_SLUGS, mainTitle, questView, refKey, type QuestView } from "./model";
import { QuestCard } from "./QuestTile";
import { SideBranches } from "./SideBranches";
import { PALETTE, WEB_SPRITES, iconGrid, treeGrid, type IconKey } from "./sprites";
import { useReducedMotion } from "./story/useStorySeen";

export type BoardLane = "main" | "side" | "mine" | "island";

/** Left to right on the strip. */
export const LANES: readonly BoardLane[] = ["main", "side", "mine", "island"];

/** The lane on screen, kept for this tab while the board sheet opens and closes. */
export const LANE_DRAFT = "island-board:lane";

/** Each lane's section, its heading (the ids the board has always had) and its button's icon. */
const LANE: Record<BoardLane, { section: string; heading: string; icon: IconKey }> = {
  main: { section: "island-lane-main", heading: "island-main-quests", icon: "seed" },
  side: { section: "island-lane-side", heading: "island-side-quests", icon: "star" },
  mine: { section: "island-lane-mine", heading: "island-proposed-quests", icon: "scroll" },
  island: { section: "island-lane-island", heading: "island-shared-quests", icon: "heart" },
};

const LANE_NAME: Record<BoardLane, string> = {
  main: BOARD.mainHeading,
  side: BOARD.sideHeading,
  mine: BOARD.laneMine,
  island: BOARD.islandHeading,
};

/** A nav tap's smooth scroll passes the lanes in between: the strip's position is not the student's choice until it lands. */
const SETTLE_MS = 1000;

/** The lane the keynote quest lives in, else the main quests. */
export function startLane(board: QuestBoardData, keynote: BoardRef | null): BoardLane {
  if (keynote?.kind === "proposed") return "mine";
  if (keynote?.kind === "side") {
    const side = board.side.find((s) => s.template_id === keynote.templateId);
    return side && COMMUNITY_SLUGS.has(side.slug) ? "island" : "side";
  }
  return "main";
}

const present = (view: QuestView | null): view is QuestView => view !== null;

interface QuestBoardProps {
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
 * The quest board as a notice board that fits a phone: four lanes the student
 * swipes between (or picks above), each a grid of pinned quest cards. Not a
 * ladder: seven main quests in any order, side quests branching off them, the
 * student's own quests, and the island's shared ones. Every lane stays in the
 * DOM and the accessibility tree; only the strip's scroll position changes.
 */
export function QuestBoard({ board, stage, goal, keynote, onOpen, onPropose }: QuestBoardProps) {
  const [lane, setLane] = useDraft<BoardLane>(LANE_DRAFT, startLane(board, keynote));
  const active = Math.max(LANES.indexOf(lane), 0);
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const startAt = useRef(active);
  const scheduled = useRef(false);
  const frame = useRef(0);
  const landing = useRef<{ index: number; until: number } | null>(null);

  // Open on the remembered lane without an animation; after that the nav and the swipe move the strip.
  useLayoutEffect(() => {
    const strip = track.current;
    if (strip) strip.scrollLeft = startAt.current * strip.clientWidth;
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onScroll = useCallback(() => {
    if (scheduled.current) return;
    scheduled.current = true;
    frame.current = requestAnimationFrame(() => {
      scheduled.current = false;
      const strip = track.current;
      if (!strip || strip.clientWidth <= 0) return;
      const at = Math.min(LANES.length - 1, Math.max(0, Math.round(strip.scrollLeft / strip.clientWidth)));
      const target = landing.current;
      if (target) {
        if (at !== target.index && Date.now() < target.until) return;
        landing.current = null;
      }
      setLane(LANES[at]);
    });
  }, [setLane]);

  /**
   * Moves the strip to a lane. From a lane button (or the side lane's link to
   * the main quests) focus goes to the lane's heading too, so a screen reader
   * reads on in the lane that was chosen, not in the first lane of the DOM.
   */
  const go = (index: number, focusLane = true) => {
    setLane(LANES[index]);
    const strip = track.current;
    if (!strip) return;
    landing.current = { index, until: Date.now() + SETTLE_MS };
    strip.scrollTo?.({ left: index * strip.clientWidth, behavior: reduced ? "auto" : "smooth" });
    if (focusLane) document.getElementById(LANE[LANES[index]].heading)?.focus({ preventScroll: true });
  };

  const mains = board.main.map((m) => questView(board, { kind: "main", milestone: m.milestone })).filter(present);
  const passed = board.main.filter((m) => m.done).length;
  const proposed = board.proposed.map((p) => questView(board, { kind: "proposed", instanceId: p.instance_id })).filter(present);
  const community = board.side
    .filter((s) => COMMUNITY_SLUGS.has(s.slug))
    .map((s) => questView(board, { kind: "side", templateId: s.template_id }))
    .filter(present);
  const cards = (views: QuestView[]) =>
    views.map((view) => (
      <li key={refKey(view.ref)}>
        <QuestCard view={view} keynote={keynote} onOpen={onOpen} />
      </li>
    ));

  return (
    <div className={styles.board}>
      <div role="group" aria-label={BOARD.lanes} className={styles.laneNav}>
        {LANES.map((id, index) => (
          <button
            key={id}
            type="button"
            className={styles.laneButton}
            aria-pressed={index === active}
            aria-controls={LANE[id].section}
            onClick={() => go(index)}
          >
            <PixelIcon grid={iconGrid(LANE[id].icon)} palette={PALETTE} scale={1} className={styles.laneIcon} />
            <span className={styles.laneName}>{LANE_NAME[id]}</span>
            {/* The space keeps the name "เควสต์หลัก ผ่าน 1/7"; a grid drops it on screen. */}
            {id === "main" ? <> <span className={styles.laneCount}>{BOARD.passed(passed)}</span></> : null}
          </button>
        ))}
      </div>

      <div className={styles.cork}>
        <div ref={track} className={styles.lanes} data-vaul-no-drag="" onScroll={onScroll}>
          <section id={LANE.main.section} className={styles.lane} aria-labelledby={LANE.main.heading}>
            <h2 id={LANE.main.heading} className="sr-only" tabIndex={-1}>
              {BOARD.mainHeading}
            </h2>
            <p className={styles.laneSub}>{BOARD.mainSub}</p>
            <ul className={styles.cards}>
              {cards(mains)}
              <TreeCell stage={stage} />
            </ul>
          </section>

          <section id={LANE.side.section} className={styles.lane} aria-labelledby={LANE.side.heading}>
            <h2 id={LANE.side.heading} className="sr-only" tabIndex={-1}>
              {BOARD.sideHeading}
            </h2>
            <p className={styles.laneSub}>{BOARD.sideSub}</p>
            <SideBranches board={board} keynote={keynote} onOpen={onOpen} onMain={() => go(0)} />
          </section>

          <section id={LANE.mine.section} className={styles.lane} aria-labelledby={LANE.mine.heading}>
            <h2 id={LANE.mine.heading} className="sr-only" tabIndex={-1}>
              {BOARD.proposedHeading}
            </h2>
            {proposed.length === 0 ? <p className={styles.laneSub}>{BOARD.proposedEmpty}</p> : null}
            {proposed.length > 0 ? <ul className={styles.cards}>{cards(proposed)}</ul> : null}
            <button type="button" className={styles.laneAction} onClick={onPropose}>
              <PixelIcon grid={WEB_SPRITES.scroll} palette={PALETTE} scale={1} className={styles.laneIcon} />
              {BOARD.propose}
            </button>
          </section>

          <section id={LANE.island.section} className={styles.lane} aria-labelledby={LANE.island.heading}>
            <h2 id={LANE.island.heading} className="sr-only" tabIndex={-1}>
              {BOARD.islandHeading}
            </h2>
            {goal ? <GoalLine board={board} goal={goal} /> : null}
            {!goal && community.length === 0 ? <p className={styles.laneSub}>{BOARD.islandEmpty}</p> : null}
            {community.length > 0 ? <ul className={styles.cards}>{cards(community)}</ul> : null}
          </section>
        </div>
      </div>
    </div>
  );
}

/** The eighth cell of the main lane: the tree the seven quests grow, as the level. */
function TreeCell({ stage }: { stage: number }) {
  const level = Math.min(Math.max(Number.isFinite(stage) ? Math.trunc(stage) : 0, 0), 7);
  return (
    <li className={styles.treeCell}>
      <PixelIcon grid={treeGrid(level)} palette={PALETTE} scale={2} className={styles.treeSprite} />
      <span className={styles.treeText}>
        <span className={styles.treeName}>{stageName(level)}</span>
        {/* A number never wraps away from its word: "ต้นไม้ขั้น 3" and "จาก 7" break as pairs. */}
        <span>{BOARD.tree(level).replace(/ (?=\d)/g, " ")}</span>
      </span>
    </li>
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
        <p className={styles.goalUnlock}>{goal.reached ? BOARD.goalUnlocked(goal.unlock) : BOARD.goalUnlock(goal.unlock)}</p>
      ) : null}
    </div>
  );
}
