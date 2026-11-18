"use client";

import { useState } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { IslandHotspot } from "@/lib/shift-island/picture";
import { resolveStyle } from "@/lib/shift-island/tree-style";
import type { TeamNews } from "@/lib/supabase/shift-quests/playerTypes";

import { PLOT } from "./copy";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import news from "./news/news.module.css";
import { TeamCard } from "./news/TeamCard";
import { styledTree } from "./sprites";
import { publicRoots, treeStageName } from "./tree/model";
import { TreeCanvas } from "./tree/TreeCanvas";
import { AdminProjectDetails } from "./AdminOverview";
import type { AdminIslandProject } from "@/lib/supabase/shift-quests/adminTypes";

interface PlotSheetProps {
  adminProject?: AdminIslandProject;
  hotspot: IslandHotspot | null;
  onClose: () => void;
  /** The student's own plot: close and go to their quest board. */
  onBoard?: () => void;
  /**
   * The island news for the team on this plot (ข่าวเกาะ), only when the team
   * may appear in it (every member shows their name and consented). Shown
   * only when its slot matches the plot.
   */
  team?: TeamNews | null;
  /** Reviewers and admins: the team card's hide control. The database checks again. */
  staff?: boolean;
}

/**
 * A plot on the island: only what the database returned for it. The slot,
 * the stage unless the plot is plain, and the sign when the team chose to
 * show one. Never a member, a profile or a contact path. Another team's tree
 * shows up close in its colours (only on a plot that is not plain), with
 * roots from the level the island already shows and no recent glow. The
 * student's own plot leads to their quest board (from schema 13 their own
 * plot opens the close-up instead). A team that opted in to the island news
 * gets its AI team card under the plot info: the team's stored summary,
 * never a person.
 */
export function PlotSheet({ hotspot, onClose, onBoard, team, staff = false, adminProject }: PlotSheetProps) {
  // The last plot stays in the sheet while it slides closed, so it never closes empty.
  const [last, setLast] = useState<IslandHotspot | null>(hotspot);
  if (hotspot && hotspot !== last) setLast(hotspot);
  const shown = hotspot ?? last;
  const name = shown?.name?.trim() || null;
  const card = shown && team && team.slot === shown.slot ? team : null;
  return (
    <IslandSheet
      open={!!hotspot}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={shown ? (shown.mine ? PLOT.mine(shown.slot) : PLOT.heading(shown.slot)) : ""}
    >
      {shown ? (
        <div className={styles.plot}>
          {shown.plain ? null : (
            <>
              {shown.mine ? (
                <span className={styles.plotTree} aria-hidden="true">
                  <PixelIcon {...styledTree(shown.stage, shown.style, shown.seeded)} scale={2} />
                </span>
              ) : (
                <TreeCanvas
                  input={{
                    style: resolveStyle(shown.style),
                    stage: shown.stage,
                    seeded: shown.seeded === true,
                    roots: publicRoots(shown.roots),
                  }}
                  scale={2}
                  className={styles.plotCloseup}
                />
              )}
              <p>{PLOT.stage(treeStageName(shown.stage, shown.seeded === true))}</p>
            </>
          )}
          {name ? <p className={styles.plotSign}>{PLOT.sign(name)}</p> : <p className={styles.hint}>{PLOT.noSign}</p>}
          {adminProject && adminProject.slot === shown.slot ? <AdminProjectDetails project={adminProject} /> : null}
          {shown.mine && onBoard ? (
            <button type="button" className={`ei-button-dawn ${styles.primary}`} onClick={onBoard}>
              <span>{PLOT.toBoard}</span>
            </button>
          ) : null}
          {card ? (
            <div className={news.plotNews}>
              <TeamCard team={card} staff={staff} />
            </div>
          ) : null}
        </div>
      ) : null}
    </IslandSheet>
  );
}
