"use client";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { SeasonView } from "@/lib/supabase/shift-quests/types";

import { SEASON, thaiShortDate, unlockLine } from "./copy";
import styles from "./island.module.css";
import { HELP_FLAG, PALETTE } from "./sprites";

const CELLS = 7;

interface SeasonPanelProps {
  season: SeasonView;
}

/**
 * The season, inside the project sheet: name, Demo Day and days left, a
 * 7-cell meter of the stages counted for Demo Day with flags at the table and
 * stage bars, the island goal and the unlocks. No names, no ranking.
 */
export function SeasonPanel({ season }: SeasonPanelProps) {
  const date = thaiShortDate(season.demo_day);
  return (
    <section className={styles.detail} aria-label={season.name}>
      <div className={styles.seasonText}>
        <span className={styles.seasonName}>{season.name}</span>
        <span className={styles.seasonWhen}>
          {SEASON.demoDay(date)} · {SEASON.daysLeft(season.days_to_demo)}
        </span>
      </div>
      <SeasonMeter season={season} />
      {season.qualifies ? (
        <p className={styles.notice} data-tone="done">
          {SEASON.qualifies[season.qualifies]}
        </p>
      ) : null}
      <ul className={styles.seasonFacts}>
        <li>{SEASON.table(season.table_bar)}</li>
        <li>{SEASON.stage(season.stage_bar)}</li>
        {season.goal ? <li>{SEASON.goal(season.goal.count, season.goal.target)}</li> : null}
      </ul>
      {!season.qualifies && season.days_to_demo >= 0 ? <p className={styles.hint}>{SEASON.wip}</p> : null}
      <div className={styles.detailBlock}>
        <h3 className={styles.detailHeading}>{SEASON.unlocksHeading}</h3>
        {season.unlocks.length === 0 ? (
          <p className={styles.hint}>{SEASON.noUnlocks}</p>
        ) : (
          <ul className={styles.seasonFacts}>
            {season.unlocks.map((unlock) => (
              <li key={unlock.id} data-earned={unlock.earned ? "true" : undefined}>
                {unlockLine(unlock)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SeasonMeter({ season }: { season: SeasonView }) {
  const count = Math.min(Math.max(Math.trunc(season.stage_at_cutoff), 0), CELLS);
  return (
    <span className={styles.meter} data-size="large" role="img" aria-label={SEASON.meter(count)}>
      {Array.from({ length: CELLS }, (_, i) => {
        const cell = i + 1;
        const flag = cell === season.table_bar || cell === season.stage_bar;
        return (
          <span key={cell} className={styles.meterCell} data-filled={cell <= count ? "true" : undefined}>
            {flag ? <PixelIcon grid={HELP_FLAG} palette={PALETTE} scale={2} className={styles.meterFlag} /> : null}
          </span>
        );
      })}
    </span>
  );
}
