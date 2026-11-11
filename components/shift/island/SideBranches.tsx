"use client";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import { PROJECT_ROUTES, type BoardSide, type ProjectRoute, type QuestBoard } from "@/lib/supabase/shift-quests/types";

import { ALL_ROUTES, BOARD, ROUTE_NAMES } from "./copy";
import { useDraft } from "./drafts";
import styles from "./island.module.css";
import { COMMUNITY_SLUGS, mainTitle, questView, refKey, sideGroups, type QuestView } from "./model";
import { QuestCard } from "./QuestTile";
import { PALETTE, iconGrid, mainIcon } from "./sprites";

type RouteFilter = ProjectRoute | "all";

/** The route chips' choice, kept for this tab while the board sheet opens and closes. */
export const ROUTE_DRAFT = "island-board:route";

/** A route chip shows quests meant for that route or for every route. */
export function matchesRoute(side: BoardSide, filter: RouteFilter): boolean {
  if (filter === "all") return true;
  return side.route_keys === null || side.route_keys.includes(filter);
}

/** The project's route, or every route when the keynote is a side quest for another route (so it shows). */
function startRoute(board: QuestBoard, keynote: BoardRef | null): RouteFilter {
  const route = board.project?.route ?? "all";
  if (keynote?.kind !== "side") return route;
  const side = board.side.find((s) => s.template_id === keynote.templateId);
  return side && !matchesRoute(side, route) ? "all" : route;
}

interface SideBranchesProps {
  board: QuestBoard;
  keynote: BoardRef | null;
  onOpen: (ref: BoardRef) => void;
  /** From the empty lane to the main quests. */
  onMain: () => void;
}

/**
 * Side quests in groups under the main quest they branch from, as pinned
 * cards. The route chips start on the project's route; quests meant for other
 * routes show under ทุกเส้นทาง (route is a soft filter, any route may take any
 * side quest).
 */
export function SideBranches({ board, keynote, onOpen, onMain }: SideBranchesProps) {
  const [filter, setFilter] = useDraft<RouteFilter>(ROUTE_DRAFT, startRoute(board, keynote));
  const branchable = board.side.filter((s) => !COMMUNITY_SLUGS.has(s.slug));
  const groups = sideGroups(branchable.filter((s) => matchesRoute(s, filter)));

  // Side quests may not be published yet: no chips, one way back to the main quests.
  if (branchable.length === 0) {
    return (
      <div className={styles.laneEmpty}>
        <p className={styles.laneSub}>{BOARD.sideNone}</p>
        <button type="button" className={styles.laneAction} onClick={onMain}>
          {BOARD.toMain}
        </button>
      </div>
    );
  }

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

      {groups.length === 0 ? <p className={styles.laneSub}>{BOARD.sideEmpty}</p> : null}

      {groups.map((group) => {
        const views = group.items
          .map((s) => questView(board, { kind: "side", templateId: s.template_id }))
          .filter((view): view is QuestView => view !== null);
        return (
          <section key={group.branchOf ?? "free"} className={styles.branch}>
            <h3 className={styles.branchHeading}>
              {/* The parent main quest's icon, as on its card in the main lane. */}
              {group.branchOf === null ? (
                <span className={styles.branchFree} aria-hidden="true" />
              ) : (
                <PixelIcon grid={iconGrid(mainIcon(group.branchOf))} palette={PALETTE} scale={1} className={styles.branchIcon} />
              )}
              <span className={styles.branchText}>{branchHeading(board, group.branchOf)}</span>
            </h3>
            <ul className={styles.cards}>
              {views.map((view) => (
                <li key={refKey(view.ref)}>
                  <QuestCard view={view} keynote={keynote} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function branchHeading(board: QuestBoard, branchOf: number | null): string {
  return branchOf === null ? BOARD.branchFree : BOARD.branchOf(mainTitle(board, branchOf));
}
