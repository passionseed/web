"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { IslandPageData, IslandProject, MyTree, ViewerCard } from "@/lib/supabase/shift-quests/types";

import { AdminReset } from "./AdminReset";
import { Avatar } from "./Avatar";
import { FOOTER, HUD, ISLAND, MENU, NO_PROJECT, treeStageName } from "./copy";
import styles from "./island.module.css";
import { IslandDiscordButton } from "./IslandDiscordButton";
import { IslandFooter } from "./IslandFooter";
import { IslandSheet } from "./IslandSheet";
import { PLAYER_MENU } from "./player/copy";
import { SeasonPanel } from "./SeasonPanel";
import { PALETTE, WEB_SPRITES, styledTree, type WebIcon } from "./sprites";
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
  /** The team's own tree (schema 13): its colours and seed. Absent draws the default tree. */
  tree?: MyTree | null;
  season: IslandPageData["island"]["season"];
  /** The check-in card, built by the page so it keeps its handlers. */
  today: ReactNode;
}

/** The project's tree, today's check-in and the season: the project sheet, and the lower half of the character sheet. */
export function ProjectBody({ project, tree, season, today }: ProjectBodyProps) {
  return (
    <div className={world.sheetStack}>
      <p className={world.myTree}>
        <PixelIcon {...styledTree(project.stage, tree?.equipped, tree?.seed != null)} scale={1} />
        <span>{HUD.myTree(treeStageName(project.stage, tree?.seed != null))}</span>
      </p>
      {today}
      {season ? <SeasonPanel season={season} /> : null}
    </div>
  );
}

/** The student's tree, today's check-in and the season (the character sheet without its stats). */
export function ProjectSheet({ open, onClose, project, tree, season, today }: SheetProps & ProjectBodyProps) {
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={project.name}>
      <ProjectBody project={project} tree={tree} season={season} today={today} />
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
 * One place in the menu's grid: a sheet to open (onClick), a page to go to
 * (href), or a switch (pressed). The page builds the list, so each tile only
 * shows when its place exists (news while the digest is on, the tree from
 * schema 13, ...).
 */
export interface MenuTile {
  id: string;
  icon: WebIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  /** Opens in a new tab (the canvas on the whiteboard). */
  external?: boolean;
  /** A switch (the campfire sound): its state, read by screen readers. */
  pressed?: boolean;
  /** Something waits behind it: a lamp dot, and these words for screen readers. */
  dot?: boolean;
  waiting?: string | null;
  disabled?: boolean;
}

function TileFace({ tile }: { tile: MenuTile }) {
  return (
    <>
      <span className={world.tileIcon} aria-hidden="true">
        <PixelIcon grid={WEB_SPRITES[tile.icon]} palette={PALETTE} scale={2} />
        {tile.dot ? <span className={world.tileDot} /> : null}
      </span>
      <span className={world.tileLabel}>{tile.label}</span>
    </>
  );
}

/** The menu's places as a grid of pixel tiles, four to a row on a phone. */
export function MenuGrid({ tiles, label }: { tiles: readonly MenuTile[]; label: string }) {
  if (tiles.length === 0) return null;
  // What waits behind a tile is read after its name; the dot alone says nothing to a screen reader.
  const name = (tile: MenuTile) => (tile.waiting ? `${tile.label}, ${tile.waiting}` : undefined);
  return (
    <ul className={world.menuGrid} aria-label={label}>
      {tiles.map((tile) => (
        <li key={tile.id}>
          {tile.href ? (
            tile.external ? (
              <a className={`${world.menuTile} ${world.press}`} href={tile.href} target="_blank" rel="noopener" aria-label={name(tile)}>
                <TileFace tile={tile} />
              </a>
            ) : (
              <Link className={`${world.menuTile} ${world.press}`} href={tile.href} aria-label={name(tile)}>
                <TileFace tile={tile} />
              </Link>
            )
          ) : (
            <button
              type="button"
              className={`${world.menuTile} ${world.press}`}
              aria-label={name(tile)}
              aria-pressed={tile.pressed}
              aria-haspopup={tile.pressed === undefined ? "dialog" : undefined}
              disabled={tile.disabled}
              onClick={tile.onClick}
            >
              <TileFace tile={tile} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * From ≡: every place that is not the next step, as a grid of tiles (the page
 * builds them), then the consent step while it waits, how the island is
 * shown, the suggestions link (when an admin set the channel), the admin's
 * own reset, the show-name switch and the account.
 */
export function MenuSheet({
  open,
  onClose,
  me,
  project,
  whole,
  onToggleWhole,
  suggestUrl,
  tiles,
  onConsent,
  consentAiOnly = false,
}: SheetProps & {
  me: ViewerCard;
  project: Pick<IslandProject, "id" | "show_name" | "name_visible"> | null;
  whole: boolean;
  onToggleWhole: () => void;
  /** https://discord.com/channels/<guild>/<suggest channel>; hidden when unset. */
  suggestUrl?: string | null;
  /** The places on the island, built by the page. */
  tiles: readonly MenuTile[];
  /** Opens the consent sheet; the row shows only when given (consent not on file yet, or the AI news line not). */
  onConsent?: () => void;
  /** Consent is on file and only the AI news line waits: the row says so. */
  consentAiOnly?: boolean;
}) {
  const suggestHintId = useId();
  const consentHintId = useId();
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={HUD.menu}>
      <div className={world.sheetStack}>
        {onConsent ? (
          <section className={world.menuList}>
            <MenuRow
              icon="letter"
              label={consentAiOnly ? PLAYER_MENU.aiNews : PLAYER_MENU.consent}
              describedBy={consentHintId}
              onClick={onConsent}
            />
            <p id={consentHintId} className={styles.hint}>
              {consentAiOnly ? PLAYER_MENU.aiNewsHint : PLAYER_MENU.consentHint}
            </p>
          </section>
        ) : null}
        <MenuGrid tiles={tiles} label={MENU.places} />
        <section className={world.menuList} aria-label={HUD.viewHeading}>
          <button type="button" className={styles.quietButton} onClick={onToggleWhole}>
            {whole ? ISLAND.viewClose : ISLAND.viewWhole}
          </button>
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
              <PixelIcon grid={WEB_SPRITES.bulb} palette={PALETTE} scale={1} />
              {HUD.suggest}
            </a>
            <p id={suggestHintId} className={styles.hint}>
              {HUD.suggestHint}
            </p>
          </section>
        ) : null}
        {/* Admins only: the database checks the role again on every reset. */}
        {me.admin ? <AdminReset /> : null}
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

/** From the bottom bar: the whole quest board, over the island. */
export function BoardSheet({ open, onClose, children }: SheetProps & { children: ReactNode }) {
  return (
    <IslandSheet open={open} onOpenChange={closer(onClose)} title={HUD.board}>
      {children}
    </IslandSheet>
  );
}
