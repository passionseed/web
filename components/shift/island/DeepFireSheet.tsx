"use client";

import type { DeepFire } from "@/lib/supabase/shift-quests/types";

import { DEEPFIRE } from "./copy";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import world from "./world.module.css";

interface DeepFireSheetProps {
  open: boolean;
  onClose: () => void;
  deepfire: DeepFire;
  /** A SHIFT cohort round is in session: shift-voice records voice time in every voice room this week. */
  cohortWeek?: boolean;
}

/**
 * From the deep fire (กองไฟโฟกัส): one button, จุดไฟ, to the Discord lobby
 * where joining builds a voice room for the student alone, locked, and gone
 * when they leave. While the bot that builds the rooms is away the button is
 * greyed with a line to try again soon (never a time). No count and no
 * names: the island keeps nothing about who sits at it. The fine print says
 * who can see the room, and in a SHIFT cohort week that shift-voice records
 * voice time there too. It is a room for one, never a 1:1 channel: the bot
 * disconnects anyone else who ends up inside.
 */
export function DeepFireSheet({ open, onClose, deepfire, cohortWeek = false }: DeepFireSheetProps) {
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={DEEPFIRE.title}
      description={DEEPFIRE.body}
    >
      <div className={world.sheetStack}>
        {deepfire.live ? (
          <a
            className={`ei-button-dawn ${styles.primary} ${styles.campfireJoin}`}
            href={deepfire.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {DEEPFIRE.join}
          </a>
        ) : (
          <>
            <p className={styles.quiet} role="status">
              {DEEPFIRE.asleep}
            </p>
            <button type="button" className={`ei-button-dawn ${styles.primary}`} disabled>
              {DEEPFIRE.join}
            </button>
          </>
        )}
        <p className={styles.hint}>{DEEPFIRE.fine}</p>
        {cohortWeek ? <p className={styles.hint}>{DEEPFIRE.cohort}</p> : null}
      </div>
    </IslandSheet>
  );
}
