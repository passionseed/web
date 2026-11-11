"use client";

import { useState } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { IslandHotspot } from "@/lib/shift-island/picture";

import { PLOT, stageName } from "./copy";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { PALETTE, treeGrid } from "./sprites";

interface PlotSheetProps {
  hotspot: IslandHotspot | null;
  onClose: () => void;
  /** The student's own plot: close and go to their quest board. */
  onBoard?: () => void;
}

/**
 * A plot on the island: only what the database returned for it. The slot,
 * the stage unless the plot is plain, and the sign when the team chose to
 * show one. Never a member, a profile or a contact path. The student's own
 * plot leads to their quest board.
 */
export function PlotSheet({ hotspot, onClose, onBoard }: PlotSheetProps) {
  // The last plot stays in the sheet while it slides closed, so it never closes empty.
  const [last, setLast] = useState<IslandHotspot | null>(hotspot);
  if (hotspot && hotspot !== last) setLast(hotspot);
  const shown = hotspot ?? last;
  const name = shown?.name?.trim() || null;
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
              <span className={styles.plotTree} aria-hidden="true">
                <PixelIcon grid={treeGrid(shown.stage)} palette={PALETTE} scale={2} />
              </span>
              <p>{PLOT.stage(stageName(shown.stage))}</p>
            </>
          )}
          {name ? <p className={styles.plotSign}>{PLOT.sign(name)}</p> : <p className={styles.hint}>{PLOT.noSign}</p>}
          {shown.mine && onBoard ? (
            <button type="button" className={`ei-button-dawn ${styles.primary}`} onClick={onBoard}>
              <span>{PLOT.toBoard}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </IslandSheet>
  );
}
