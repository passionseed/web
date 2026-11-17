"use client";

import type { ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { CharacterStats, IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";
import type { IslandPageData, IslandProject, MyTree, ViewerCard } from "@/lib/supabase/shift-quests/types";

import { ConsentBanner } from "../consent/ConsentBanner";
import { InviteFriends } from "../InviteFriends";
import { ProjectInvites } from "../NoProject";
import { ProjectBody } from "../HudSheets";
import { ShowNameSwitch } from "../IslandFooter";
import { IslandSheet } from "../IslandSheet";
import { PALETTE, WEB_SPRITES } from "../sprites";
import { treeWaiting } from "../tree/TreePill";
import world from "../world.module.css";
import { CHARACTER, coinNumber } from "./copy";
import { PixelAvatar } from "./PixelAvatar";
import styles from "./player.module.css";

interface CharacterSheetProps {
  open: boolean;
  onClose: () => void;
  me: ViewerCard;
  /** null: the stats could not be read; the sheet keeps the tree, the team and the foot. */
  stats: CharacterStats | null;
  project: Pick<IslandProject, "name" | "stage">;
  tree?: MyTree | null;
  projectId?: string;
  invites?: IslandPageData["invites"];
  consent?: IslandConsent | null;
  onOpenWallet: () => void;
  onOpenConsent: () => void;
  /** Opens the team's tree up close: the tree line becomes a button, with a lamp dot while a gift or the seed waits. */
  onOpenTree?: () => void;
  /** The project's show-name switch (team consent). */
  showName?: Pick<IslandProject, "id" | "show_name" | "name_visible"> | null;
  /** ผลจากพี่เลี้ยง (ResultsList), right under the header; built by the page so it keeps its handlers. */
  results?: ReactNode;
  /** What has no place on the island (MenuFoot): the last thing in the sheet. */
  foot?: ReactNode;
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

/**
 * From the HUD chip, the island's one door to everything that is not the next
 * step: who you are and the tree's stage, the consent step while it waits,
 * what mentors said (ResultsList), the tree, coins, the team, then the short
 * menu (MenuFoot) and who is signed in. Progress only: no ranking, no
 * comparison with anyone.
 */
export function CharacterSheet({
  open,
  onClose,
  me,
  stats,
  project,
  projectId,
  invites,
  tree,
  consent,
  onOpenWallet,
  onOpenConsent,
  onOpenTree,
  showName = null,
  results = null,
  foot = null,
}: CharacterSheetProps) {
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const waiting = onOpenTree && tree ? treeWaiting(tree) : null;
  const stage = stats?.stage ?? project.stage;
  return (
    <IslandSheet open={open} onOpenChange={onOpenChange} title={stats ? CHARACTER.title : project.name}>
      <div className={world.sheetStack}>
        <ConsentBanner consent={consent} onOpen={onOpenConsent} />

        <div className={styles.charHead}>
          {/* The name is right beside it: the picture adds nothing for a screen reader. */}
          <PixelAvatar name={me.name} url={me.avatarUrl} size={64} decorative />
          <div className={styles.charWho}>
            <p className={styles.charName}>{me.name}</p>
            {/* One line of progress: the team's tree, which only a mentor's approval grows. */}
            <p className={styles.charLevel}>{CHARACTER.level(stage)}</p>
            <Cells filled={stage} total={7} />
          </div>
        </div>

        {results}

        <ProjectBody project={project} tree={tree} onTree={onOpenTree} waiting={waiting} />

        {stats ? (
          <button type="button" className={styles.coinRow} aria-haspopup="dialog" onClick={onOpenWallet}>
            <span className={styles.coinRowMain}>
              <PixelIcon grid={WEB_SPRITES.coin} palette={PALETTE} scale={2} />
              <span>
                {stats.coins.live || stats.coins.balance !== 0 ? CHARACTER.coinRow(coinNumber(stats.coins.balance)) : CHARACTER.coinsOff}
              </span>
            </span>
            <span className={styles.coinRowAction}>{CHARACTER.coinOpen}</span>
          </button>
        ) : null}

        <h3 className={styles.projectHeading}>{project.name}</h3>
        {invites?.length ? <ProjectInvites invites={invites} /> : null}
        {projectId && !me.staff ? <InviteFriends key={projectId} projectId={projectId} /> : null}
        {showName ? <ShowNameSwitch project={showName} /> : null}

        {foot}
      </div>
    </IslandSheet>
  );
}
