"use client";

import { useState } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import { PROJECT_ROUTES, type BoardSide, type ProjectRoute, type QuestBoard } from "@/lib/supabase/shift-quests/types";

import { ALL_ROUTES, BOARD, ROUTE_NAMES } from "./copy";
import styles from "./island.module.css";
import { COMMUNITY_SLUGS, mainTitle, questView, sameRef, sideGroups } from "./model";
import { QuestTile } from "./QuestTile";
import { PALETTE, iconGrid, mainIcon } from "./sprites";

type RouteFilter = ProjectRoute | "all";

/** A route chip shows quests meant for that route or for every route. */
export function matchesRoute(side: BoardSide, filter: RouteFilter): boolean {
  if (filter === "all") return true;
  return side.route_keys === null || side.route_keys.includes(filter);
}

interface SideBranchesProps {
  board: QuestBoard;
  keynote: BoardRef | null;
  onOpen: (ref: BoardRef) => void;
}

/**
 * Side quests hanging off the main quest they branch from. The route chips
 * start on the project's route; quests meant for other routes show under
 * ทุกเส้นทาง (route is a soft filter, any route may take any side quest).
 */
export function SideBranches({ board, keynote, onOpen }: SideBranchesProps) {
  const [filter, setFilter] = useState<RouteFilter>(board.project?.route ?? "all");
  const branchable = board.side.filter((s) => !COMMUNITY_SLUGS.has(s.slug));
  const visible = branchable.filter((s) => matchesRoute(s, filter));
  const groups = sideGroups(visible);

  return (
    <div className={styles.sideBranches}>
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => {
          if (value) setFilter(value as RouteFilter);
        }}
        aria-label={BOARD.routeFilter}
        className={styles.routeChips}
      >
        <ToggleGroupItem value="all" className={styles.routeChip}>
          {ALL_ROUTES}
        </ToggleGroupItem>
        {PROJECT_ROUTES.map((route) => (
          <ToggleGroupItem key={route} value={route} className={styles.routeChip}>
            {ROUTE_NAMES[route]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {branchable.length === 0 ? <p className={styles.quiet}>{BOARD.sideNone}</p> : null}
      {branchable.length > 0 && groups.length === 0 ? <p className={styles.quiet}>{BOARD.sideEmpty}</p> : null}

      {groups.map((group) => (
        <section key={group.branchOf ?? "free"} className={styles.branch}>
          <h3 className={styles.branchHeading} data-free={group.branchOf === null ? "true" : undefined}>
            {/* The parent main quest's icon, as in the ring and its legend. */}
            {group.branchOf === null ? null : (
              <PixelIcon grid={iconGrid(mainIcon(group.branchOf))} palette={PALETTE} scale={1} className={styles.branchIcon} />
            )}
            <span>{branchHeading(board, group.branchOf)}</span>
          </h3>
          <ul className={styles.branchList}>
            {group.items.map((s) => {
              const ref: BoardRef = { kind: "side", templateId: s.template_id };
              const view = questView(board, ref);
              if (!view) return null;
              return (
                <li key={s.template_id} className={styles.branchRow}>
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
        </section>
      ))}
    </div>
  );
}

function branchHeading(board: QuestBoard, branchOf: number | null): string {
  return branchOf === null ? BOARD.branchFree : BOARD.branchOf(mainTitle(board, branchOf));
}
