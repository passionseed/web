"use client";

import { useId } from "react";

import { MOTION_SPRITES, type MotionSpriteName } from "@/bot/assets/island/motion-sprites";
import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { Festival } from "@/lib/shift-island/festival";
import type { SeasonGoal, SeasonView } from "@/lib/supabase/shift-quests/types";

import { FESTIVAL, SEASON, thaiShortDate } from "./copy";
import styles from "./island.module.css";
import { IslandSheet } from "./IslandSheet";
import { PALETTE } from "./sprites";
import world from "./world.module.css";

interface FestivalSheetProps {
  open: boolean;
  onClose: () => void;
  season: SeasonView;
  festival: Festival;
  /** The island goal the lanterns follow (the season's, else the map's); null hides that line. */
  goal: SeasonGoal | null;
  /** The project sheet, which has the season's meter and unlocks. */
  onOpenProject?: () => void;
}

/** One legend line, with the piece of the plaza it explains drawn beside it. */
interface LegendLine {
  key: string;
  sprite: MotionSpriteName | null;
  scale: number;
  text: string;
}

/**
 * From the stage (or its sign): the sign's line, the student's own Demo Day
 * notice if they have one, and at most three legend lines for what the plaza
 * draws. The season's meter and unlocks stay in the project sheet, one tap
 * away. No names, no ranking.
 */
export function FestivalSheet({ open, onClose, season, festival, goal, onOpenProject }: FestivalSheetProps) {
  const headingId = useId();
  const lanterns = goal ?? (festival.lanterns ? { count: festival.lanterns.count, target: festival.lanterns.target } : null);
  const lines: LegendLine[] = [
    { key: "table", sprite: "booth_flag", scale: 2, text: `${FESTIVAL.table(festival.tableBar)} ${FESTIVAL.shownOnly}` },
    { key: "stage", sprite: "star_flag", scale: 2, text: `${FESTIVAL.stageRule(festival.stageBar)} ${FESTIVAL.shownOnly}` },
    ...(lanterns ? [{ key: "lanterns", sprite: "goal_bulb" as const, scale: 4, text: FESTIVAL.lanterns(lanterns.count, lanterns.target) }] : []),
  ];
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={FESTIVAL.title}
    >
      <div className={world.sheetStack}>
        <section className={styles.detail} aria-label={season.name}>
          <p className={styles.seasonWhen}>{FESTIVAL.sign(thaiShortDate(festival.demoDay), festival.daysToDemo, " · ")}</p>
          {season.qualifies ? (
            <p className={styles.notice} data-tone="done">
              {SEASON.qualifies[season.qualifies]}
            </p>
          ) : null}
        </section>
        <section className={styles.festivalLegend} aria-labelledby={headingId}>
          <h3 id={headingId} className={styles.detailHeading}>
            {FESTIVAL.legendHeading}
          </h3>
          <ul className={styles.festivalLines}>
            {lines.map((line) => (
              <li key={line.key} className={styles.festivalLine} data-line={line.key}>
                <span className={styles.festivalGlyph} aria-hidden="true">
                  {line.sprite ? <PixelIcon grid={MOTION_SPRITES[line.sprite]} palette={PALETTE} scale={line.scale} /> : null}
                </span>
                <span>{line.text}</span>
              </li>
            ))}
          </ul>
        </section>
        {onOpenProject ? (
          <button type="button" className={styles.linkButton} onClick={onOpenProject}>
            {FESTIVAL.unlocks}
          </button>
        ) : null}
      </div>
    </IslandSheet>
  );
}
