"use client";

import type { ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { IslandPageData, IslandProject, ViewerCard } from "@/lib/supabase/shift-quests/types";

import { Avatar } from "./Avatar";
import { FOOTER, HUD, ISLAND, NO_PROJECT, stageName } from "./copy";
import styles from "./island.module.css";
import { IslandDiscordButton } from "./IslandDiscordButton";
import { IslandFooter } from "./IslandFooter";
import { IslandSheet } from "./IslandSheet";
import { SeasonPanel } from "./SeasonPanel";
import { PALETTE, treeGrid } from "./sprites";
import world from "./world.module.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
}

const closer = (onClose: () => void) => (open: boolean) => {
  if (!open) onClose();
};

/** From the chip: the student's tree, today's check-in and the season. */
export function ProjectSheet({
  open,
  onClose,
  project,
  season,
  today,
}: SheetProps & {
  project: Pick<IslandProject, "name" | "stage">;
  season: IslandPageData["island"]["season"];
  /** The check-in card, built by the page so it keeps its handlers. */
  today: ReactNode;
}) {
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={project.name}>
      <div className={world.sheetStack}>
        <p className={world.myTree}>
          <PixelIcon grid={treeGrid(project.stage)} palette={PALETTE} scale={1} />
          <span>{HUD.myTree(stageName(project.stage))}</span>
        </p>
        {today}
        {season ? <SeasonPanel season={season} /> : null}
      </div>
    </IslandSheet>
  );
}

/** From ⋯: how the island is shown, the show-name switch and the account. */
export function MenuSheet({
  open,
  onClose,
  me,
  project,
  whole,
  onToggleWhole,
}: SheetProps & {
  me: ViewerCard;
  project: Pick<IslandProject, "id" | "show_name" | "name_visible"> | null;
  whole: boolean;
  onToggleWhole: () => void;
}) {
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={HUD.menu}>
      <div className={world.sheetStack}>
        <section className={world.menuList} aria-label={HUD.viewHeading}>
          <h3 className={styles.detailHeading}>{HUD.viewHeading}</h3>
          <button type="button" className={styles.quietButton} onClick={onToggleWhole}>
            {whole ? ISLAND.viewClose : ISLAND.viewWhole}
          </button>
        </section>
        {project ? (
          <IslandFooter project={project} me={me} avatar={<Avatar me={me} />} />
        ) : (
          <div className={world.account}>
            <p className={`${styles.hint} ${styles.footerWho}`}>
              <Avatar me={me} />
              <span>{FOOTER.signedInAs(me.name)}</span>
            </p>
            <IslandDiscordButton label={NO_PROJECT.switchAccount} switchAccount variant="quiet" />
          </div>
        )}
      </div>
    </IslandSheet>
  );
}

/** From the envelope: new messages wait in the bot's inbox on Discord, one tap away when the server is known. */
export function InboxSheet({
  open,
  onClose,
  unread,
  discordUrl,
}: SheetProps & { unread: number; discordUrl?: string | null }) {
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={HUD.inboxHeading}>
      <div className={world.sheetStack}>
        <p className={styles.quiet}>{ISLAND.unread(unread)}</p>
        {discordUrl ? (
          <a className={styles.quietButton} href={discordUrl} target="_blank" rel="noopener noreferrer">
            {ISLAND.openDiscord}
          </a>
        ) : null}
      </div>
    </IslandSheet>
  );
}

/** From the bottom bar: the whole quest board, over the island. */
export function BoardSheet({ open, onClose, children }: SheetProps & { children: ReactNode }) {
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={HUD.board}>
      {children}
    </IslandSheet>
  );
}
