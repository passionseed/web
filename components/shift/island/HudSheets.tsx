"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { IslandPageData, IslandProject, ViewerCard } from "@/lib/supabase/shift-quests/types";

import { Avatar } from "./Avatar";
import { FOOTER, HUD, ISLAND, NO_PROJECT, stageName } from "./copy";
import styles from "./island.module.css";
import { IslandDiscordButton } from "./IslandDiscordButton";
import { IslandFooter } from "./IslandFooter";
import { IslandSheet } from "./IslandSheet";
import { NEWS } from "./news/copy";
import { PLAYER_MENU } from "./player/copy";
import { PRIZES_UI } from "./prizes/copy";
import { SeasonPanel } from "./SeasonPanel";
import { PALETTE, WEB_SPRITES, treeGrid, type WebIcon } from "./sprites";
import world from "./world.module.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
}

const closer = (onClose: () => void) => (open: boolean) => {
  if (!open) onClose();
};

interface ProjectBodyProps {
  project: Pick<IslandProject, "name" | "stage">;
  season: IslandPageData["island"]["season"];
  /** The check-in card, built by the page so it keeps its handlers. */
  today: ReactNode;
}

/** The project's tree, today's check-in and the season: the project sheet, and the lower half of the character sheet. */
export function ProjectBody({ project, season, today }: ProjectBodyProps) {
  return (
    <div className={world.sheetStack}>
      <p className={world.myTree}>
        <PixelIcon grid={treeGrid(project.stage)} palette={PALETTE} scale={1} />
        <span>{HUD.myTree(stageName(project.stage))}</span>
      </p>
      {today}
      {season ? <SeasonPanel season={season} /> : null}
    </div>
  );
}

/** The student's tree, today's check-in and the season (the character sheet without its stats). */
export function ProjectSheet({ open, onClose, project, season, today }: SheetProps & ProjectBodyProps) {
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={project.name}>
      <ProjectBody project={project} season={season} today={today} />
    </IslandSheet>
  );
}

/** A menu row that opens another sheet, with its pixel icon. */
function MenuRow({ icon, label, describedBy, onClick }: { icon: WebIcon; label: string; describedBy?: string; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.quietButton} ${world.menuRow}`} aria-haspopup="dialog" aria-describedby={describedBy} onClick={onClick}>
      <PixelIcon grid={WEB_SPRITES[icon]} palette={PALETTE} scale={1} />
      <span>{label}</span>
    </button>
  );
}

/**
 * From ⋯: how the island is shown, the island news (when the digest is on),
 * the prizes, the consent step (until it is on file), the suggestions link
 * (when an admin set the channel), the show-name switch and the account.
 */
export function MenuSheet({
  open,
  onClose,
  me,
  project,
  whole,
  onToggleWhole,
  suggestUrl,
  onNews,
  onPrizes,
  onConsent,
  consentAiOnly = false,
}: SheetProps & {
  me: ViewerCard;
  project: Pick<IslandProject, "id" | "show_name" | "name_visible"> | null;
  whole: boolean;
  onToggleWhole: () => void;
  /** https://discord.com/channels/<guild>/<suggest channel>; hidden when unset. */
  suggestUrl?: string | null;
  /** Opens ข่าวเกาะ; the row shows only when given (the digest is on). */
  onNews?: () => void;
  /** Opens the Demo Day prizes. */
  onPrizes?: () => void;
  /** Opens the consent sheet; the row shows only when given (consent not on file yet, or the AI news line not). */
  onConsent?: () => void;
  /** Consent is on file and only the AI news line waits: the row says so. */
  consentAiOnly?: boolean;
}) {
  const suggestHintId = useId();
  const consentHintId = useId();
  const rows = onNews || onPrizes || onConsent;
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={HUD.menu}>
      <div className={world.sheetStack}>
        <section className={world.menuList} aria-label={HUD.viewHeading}>
          <h3 className={styles.detailHeading}>{HUD.viewHeading}</h3>
          <button type="button" className={styles.quietButton} onClick={onToggleWhole}>
            {whole ? ISLAND.viewClose : ISLAND.viewWhole}
          </button>
        </section>
        {rows ? (
          <section className={world.menuList}>
            {onConsent ? (
              <>
                <MenuRow
                  icon="letter"
                  label={consentAiOnly ? PLAYER_MENU.aiNews : PLAYER_MENU.consent}
                  describedBy={consentHintId}
                  onClick={onConsent}
                />
                <p id={consentHintId} className={styles.hint}>
                  {consentAiOnly ? PLAYER_MENU.aiNewsHint : PLAYER_MENU.consentHint}
                </p>
              </>
            ) : null}
            {onNews ? <MenuRow icon="news" label={NEWS.menu} onClick={onNews} /> : null}
            {onPrizes ? <MenuRow icon="trophy" label={PRIZES_UI.menu} onClick={onPrizes} /> : null}
          </section>
        ) : null}
        <section className={world.menuList}>
          <Link className={styles.quietButton} href="/shift/island/guide">
            <span aria-hidden="true">📖 </span>
            {HUD.guide}
          </Link>
        </section>
        {suggestUrl ? (
          <section className={world.menuList}>
            <a
              className={styles.quietButton}
              href={suggestUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby={suggestHintId}
            >
              <span aria-hidden="true">💡 </span>
              {HUD.suggest}
            </a>
            <p id={suggestHintId} className={styles.hint}>
              {HUD.suggestHint}
            </p>
          </section>
        ) : null}
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
