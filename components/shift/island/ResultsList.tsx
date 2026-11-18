"use client";

import { ChevronRight } from "lucide-react";
import { useId } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";

import { ISLAND, RESULTS } from "./copy";
import styles from "./island.module.css";
import { isFresh, type QuestResult, type ResultOutcome } from "./results";
import { PALETTE, WEB_SPRITES, type WebIcon } from "./sprites";

const OUTCOME_ICON: Record<ResultOutcome, WebIcon> = {
  approved: "check",
  clarification: "bubble",
  declined: "loop",
};

interface ResultsListProps {
  results: readonly QuestResult[];
  /** When the student last looked before this sheet opened (captured on open), for the ใหม่ marks; null: never. */
  since: number | null;
  /** The time the sheet was opened, so the marks hold while it is open. */
  openedAt: number;
  /** Opens a result's quest. */
  onOpen: (ref: BoardRef) => void;
  /** Unread notices in the bot's own inbox (invites, coins, help replies): they still live in Discord. */
  unread: number;
  discordUrl?: string | null;
}

/**
 * ผลจากพี่เลี้ยง, near the top of the chip's sheet: what mentors said about
 * the student's own work, newest first, each one a way back to its quest. The
 * bot's other notices stay in Discord, with a link there. Nothing at all
 * while there is nothing to show: a new result also reaches the next-step
 * card.
 */
export function ResultsList({ results, since, openedAt, onOpen, unread, discordUrl }: ResultsListProps) {
  const headingId = useId();
  if (results.length === 0 && unread === 0) return null;
  return (
    <section className={styles.results} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        {RESULTS.title}
      </h3>
      {results.length > 0 ? (
        <ul className={styles.resultList}>
          {results.map((result) => (
            <li key={result.key}>
              <button type="button" className={styles.result} data-outcome={result.outcome} onClick={() => onOpen(result.ref)}>
                <span className={styles.resultIcon} aria-hidden="true">
                  <PixelIcon grid={WEB_SPRITES[OUTCOME_ICON[result.outcome]]} palette={PALETTE} scale={2} />
                </span>
                <span className={styles.resultText}>
                  <span className={styles.resultTitle}>{result.title}</span>
                  <span className={styles.resultOutcome}>
                    {RESULTS[result.outcome]}
                    {isFresh(result, since, openedAt) ? <span className={styles.resultFresh}>{RESULTS.fresh}</span> : null}
                  </span>
                  {result.feedback ? <span className={styles.resultQuote}>{result.feedback}</span> : null}
                </span>
                <ChevronRight className={styles.resultArrow} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {unread > 0 ? (
        <div className={styles.resultsDiscord}>
          <p className={styles.hint}>{RESULTS.discord(unread)}</p>
          {discordUrl ? (
            <a className={styles.quietButton} href={discordUrl} target="_blank" rel="noopener noreferrer">
              {ISLAND.openDiscord}
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
