"use client";

import type { CampfireSummary } from "@/lib/supabase/shift-quests/types";

import { CAMPFIRE } from "./copy";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import type { CampfireNamesState } from "./useCampfire";
import world from "./world.module.css";

interface CampfireSheetProps {
  open: boolean;
  onClose: () => void;
  summary: CampfireSummary;
  /** Loaded when the sheet opens (useCampfire's loadNames); idle reads as loading. */
  names: CampfireNamesState;
}

/**
 * From the campfire: who is in the SHIFT coworking voice channel right now,
 * by the name Discord shows in the server, and the way in. Names only: no
 * avatars, no plots, no projects. It is a group room, never a 1:1 channel.
 */
export function CampfireSheet({ open, onClose, summary, names }: CampfireSheetProps) {
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={CAMPFIRE.title}
      description={CAMPFIRE.body}
    >
      <div className={world.sheetStack}>
        <CampfireNamesList names={names} count={summary.count} />
        <a
          className={`ei-button-dawn ${styles.primary} ${styles.campfireJoin}`}
          href={summary.joinUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {CAMPFIRE.join}
        </a>
        <p className={styles.hint}>{CAMPFIRE.fine}</p>
      </div>
    </IslandSheet>
  );
}

function CampfireNamesList({ names, count }: { names: CampfireNamesState; count: number }) {
  switch (names.state) {
    case "idle":
    case "loading":
      return (
        <p className={styles.quiet} role="status" aria-busy="true">
          {CAMPFIRE.loading}
        </p>
      );
    case "error":
      // The count still came with the page: say it, then that the names did not load.
      return (
        <div className={styles.campfireNames}>
          {count > 0 ? <p className={styles.campfireCount}>{CAMPFIRE.count(count)}</p> : null}
          <p className={styles.hint} role="status">
            {CAMPFIRE.error}
          </p>
        </div>
      );
    case "ready":
      if (names.names.length === 0) return <p className={styles.quiet}>{CAMPFIRE.empty}</p>;
      return (
        <div className={styles.campfireNames}>
          {/* The server lists at most 50 names; the count is everyone. */}
          <p className={styles.campfireCount}>{CAMPFIRE.count(Math.max(count, names.names.length))}</p>
          <ul className={styles.campfireList} aria-label={CAMPFIRE.listLabel}>
            {names.names.map((name, i) => (
              // Display names repeat; join order is the only stable key.
              <li key={i} className={styles.campfireName}>
                {name}
              </li>
            ))}
          </ul>
        </div>
      );
  }
}
