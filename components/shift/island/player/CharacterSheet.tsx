"use client";

import type { ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { CharacterStats, IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";
import type { IslandPageData, IslandProject, ViewerCard } from "@/lib/supabase/shift-quests/types";

import { ConsentBanner } from "../consent/ConsentBanner";
import { ProjectBody } from "../HudSheets";
import { IslandSheet } from "../IslandSheet";
import { PALETTE, WEB_SPRITES, iconGrid, type IconKey } from "../sprites";
import world from "../world.module.css";
import { CHARACTER, coinNumber } from "./copy";
import { PixelAvatar } from "./PixelAvatar";
import styles from "./player.module.css";

interface CharacterSheetProps {
  open: boolean;
  onClose: () => void;
  me: ViewerCard;
  /** null: the stats could not be read; the sheet is the project sheet as before. */
  stats: CharacterStats | null;
  project: Pick<IslandProject, "name" | "stage">;
  season: IslandPageData["island"]["season"];
  /** The check-in card, built by the page so it keeps its handlers. */
  today: ReactNode;
  consent?: IslandConsent | null;
  onOpenWallet: () => void;
  onOpenConsent: () => void;
}

/** A pixel progress bar: `total` cells, the first `filled` lit. Decorative; the line beside it says the number. */
export function Cells({ filled, total, tone, size }: { filled: number; total: number; tone?: "lamp"; size?: "pip" }) {
  const lit = Math.min(Math.max(Math.trunc(filled) || 0, 0), total);
  return (
    <span className={styles.cells} data-tone={tone} data-size={size} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={styles.cell} data-filled={i < lit ? "true" : undefined} />
      ))}
    </span>
  );
}

/** The quest board's lane icons (QuestBoard.tsx LANE), so a stat and its lane look the same. */
function Stat({ icon, heading, children }: { icon: IconKey; heading: string; children: ReactNode }) {
  return (
    <section className={styles.stat}>
      <h3 className={styles.statHeading}>
        <PixelIcon grid={iconGrid(icon)} palette={PALETTE} scale={1} />
        <span>{heading}</span>
      </h3>
      {children}
    </section>
  );
}

/**
 * From the HUD chip: "ตัวละครของฉัน". The student's own picture and name,
 * the tree stage as the level (the team's main quests), today's check-in
 * right under it (the one daily action, never two screens down), then
 * progress for the real work: the main quests the student took part in,
 * side quests, community value and days of making. Progress only: no
 * ranking, no comparison with anyone. A coin row opens the wallet; the tree
 * and the season stay underneath.
 */
export function CharacterSheet({
  open,
  onClose,
  me,
  stats,
  project,
  season,
  today,
  consent,
  onOpenWallet,
  onOpenConsent,
}: CharacterSheetProps) {
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const body = <ProjectBody project={project} season={season} today={today} />;
  const restOfProject = <ProjectBody project={project} season={season} today={null} />;

  if (!stats) {
    return (
      <IslandSheet open={open} onOpenChange={onOpenChange} title={project.name}>
        {body}
      </IslandSheet>
    );
  }

  const stage = stats.stage;
  return (
    <IslandSheet open={open} onOpenChange={onOpenChange} title={CHARACTER.title}>
      <div className={world.sheetStack}>
        <ConsentBanner consent={consent} onOpen={onOpenConsent} />

        <div className={styles.charHead}>
          {/* The name is right beside it: the picture adds nothing for a screen reader. */}
          <PixelAvatar name={me.name} url={me.avatarUrl} size={64} decorative />
          <div className={styles.charWho}>
            <p className={styles.charName}>{me.name}</p>
            <p className={styles.charLevel}>{CHARACTER.level(stage)}</p>
            <Cells filled={stage} total={7} />
          </div>
        </div>

        {today}

        <p className={styles.statSub}>{CHARACTER.teamVsMine}</p>

        <div className={styles.stats}>
          <Stat icon="seed" heading={CHARACTER.mainHeading}>
            <p className={styles.statLine}>{CHARACTER.mainMine(stats.main.mine)}</p>
            <Cells filled={stats.main.mine} total={7} />
          </Stat>
          <Stat icon="star" heading={CHARACTER.sideHeading}>
            <p className={styles.statLine}>{CHARACTER.sideTeam(stats.side.team)}</p>
            <p className={styles.statSub}>{CHARACTER.mine(stats.side.mine)}</p>
          </Stat>
          <Stat icon="heart" heading={CHARACTER.communityHeading}>
            <p className={styles.statLine}>{CHARACTER.communityTeam(stats.community.milestones)}</p>
            <Cells filled={stats.community.milestones} total={2} size="pip" />
            <p className={styles.statSub}>{CHARACTER.communityMine(stats.community.mine)}</p>
            <p className={styles.statSub}>{CHARACTER.thanks(stats.community.thanks)}</p>
          </Stat>
          <Stat icon="check" heading={CHARACTER.checkinHeading}>
            <p className={styles.statLine}>{CHARACTER.week(stats.checkins.thisWeek)}</p>
            <p className={styles.statSub}>{CHARACTER.days(stats.checkins.daysActive)}</p>
            {stats.checkins.run > 0 ? <p className={styles.statSub}>{CHARACTER.run(stats.checkins.run)}</p> : null}
          </Stat>
        </div>

        <button type="button" className={styles.coinRow} aria-haspopup="dialog" onClick={onOpenWallet}>
          <span className={styles.coinRowMain}>
            <PixelIcon grid={WEB_SPRITES.coin} palette={PALETTE} scale={2} />
            <span>
              {stats.coins.live || stats.coins.balance !== 0 ? CHARACTER.coinRow(coinNumber(stats.coins.balance)) : CHARACTER.coinsOff}
            </span>
          </span>
          <span className={styles.coinRowAction}>{CHARACTER.coinOpen}</span>
        </button>

        <h3 className={styles.projectHeading}>{project.name}</h3>
        {restOfProject}
      </div>
    </IslandSheet>
  );
}
