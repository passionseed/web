"use client";

import type { CSSProperties } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import { BOARD, stageName } from "./copy";
import styles from "./island.module.css";
import { questView, sameRef } from "./model";
import { PALETTE, iconGrid, treeGrid } from "./sprites";
import { QuestTile } from "./QuestTile";

/** Ring radius as a percentage of the ring box. */
const RADIUS = 36;

interface QuestRingProps {
  board: QuestBoard;
  stage: number;
  keynote: BoardRef | null;
  onOpen: (ref: BoardRef) => void;
}

/**
 * The seven main quests in a ring around the student's tree. No numbers and
 * no first or last: any order grows the tree. The ring shows icons only (on a
 * phone the points are about 100px apart); the legend under it names them.
 */
export function QuestRing({ board, stage, keynote, onOpen }: QuestRingProps) {
  return (
    <>
      <Ring board={board} stage={stage} keynote={keynote} onOpen={onOpen} />
      <RingLegend board={board} onOpen={onOpen} />
    </>
  );
}

/** Each main quest's icon beside its name, two columns, tappable like its ring tile. */
function RingLegend({ board, onOpen }: Pick<QuestRingProps, "board" | "onOpen">) {
  return (
    <ul className={styles.legend} aria-label={BOARD.legend}>
      {board.main.map((m) => {
        const ref: BoardRef = { kind: "main", milestone: m.milestone };
        const view = questView(board, ref);
        if (!view) return null;
        return (
          <li key={m.template_id}>
            <button type="button" className={styles.legendItem} data-status={view.status} onClick={() => onOpen(ref)}>
              <PixelIcon grid={iconGrid(view.icon)} palette={PALETTE} scale={1} className={styles.legendIcon} />
              <span className={styles.legendTitle}>{view.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Ring({ board, stage, keynote, onOpen }: QuestRingProps) {
  const count = Math.max(board.main.length, 1);
  return (
    <div className={styles.ring}>
      <div className={styles.ringTree} aria-hidden="true">
        <PixelIcon grid={treeGrid(stage)} palette={PALETTE} scale={3} />
        <span className={styles.ringStage}>{stageName(stage)}</span>
      </div>
      <ul className={styles.ringList}>
        {board.main.map((m, i) => {
          const ref: BoardRef = { kind: "main", milestone: m.milestone };
          const view = questView(board, ref);
          if (!view) return null;
          const angle = ((-90 + (360 / count) * i) * Math.PI) / 180;
          const position = {
            left: `${50 + RADIUS * Math.cos(angle)}%`,
            top: `${50 + RADIUS * Math.sin(angle)}%`,
          } satisfies CSSProperties;
          return (
            <li key={m.template_id} className={styles.ringItem} style={position}>
              <QuestTile
                layout="ring"
                status={view.status}
                icon={view.icon}
                title={view.title}
                owner={view.owner}
                help={view.help}
                keynote={sameRef(keynote, ref)}
                onOpen={() => onOpen(ref)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
