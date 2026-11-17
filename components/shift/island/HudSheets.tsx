"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { IslandPageData, IslandProject, MyTree, ViewerCard } from "@/lib/supabase/shift-quests/types";

import { AdminReset } from "./AdminReset";
import { Avatar } from "./Avatar";
import { FOOTER, HUD, ISLAND, MENU, NO_PROJECT, treeStageName } from "./copy";
import styles from "./island.module.css";
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
  /** Opens the team's tree up close: the tree line becomes a button. */
  onTree?: () => void;
  /** What waits at the tree (a gift, the seed): a lamp dot, and these words for screen readers. */
  waiting?: string | null;
}

/** The project's tree, today's check-in and the season: the project sheet, and the lower half of the character sheet. */
export function ProjectBody({ project, tree, season, today, onTree, waiting = null }: ProjectBodyProps) {
  const name = HUD.myTree(treeStageName(project.stage, tree?.seed != null));
  const icon = <PixelIcon {...styledTree(project.stage, tree?.equipped, tree?.seed != null)} scale={1} />;
  return (
    <div className={world.sheetStack}>
      {onTree ? (
        <button
          type="button"
          className={`${world.menuItem} ${world.treeLine}`}
          aria-haspopup="dialog"
          aria-label={waiting ? `${name}, ${waiting}` : undefined}
          onClick={onTree}
        >
          <span className={world.itemIcon} aria-hidden="true">
            {icon}
            {waiting ? <span className={world.itemDot} data-testid="tree-line-dot" /> : null}
          </span>
          <span className={world.itemLabel}>{name}</span>
          <ChevronRight className={world.itemArrow} aria-hidden="true" />
        </button>
      ) : (
        <p className={world.myTree}>
          {icon}
          <span>{name}</span>
        </p>
      )}
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
 * One line of the menu: a sheet to open (onClick), a page to go to (href), a
 * switch (pressed) or something done right there (action). The page builds
 * the list, so a line only shows when its place exists (the news while the
 * digest is on, ...). Places that stand on the island are not lines here.
 */
export interface MenuItem {
  id: string;
  icon: WebIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  /** A switch (the campfire sound): its state, read by screen readers. */
  pressed?: boolean;
  /** A switch's state in short words at the end of the line (screen readers hear `pressed`). */
  state?: string;
  /** Done right there, nothing opens (ขอพัก): no arrow. */
  action?: boolean;
  disabled?: boolean;
}

function ItemFace({ item }: { item: MenuItem }) {
  const opens = item.pressed === undefined && !item.action;
  return (
    <>
      <span className={world.itemIcon} aria-hidden="true">
        <PixelIcon grid={WEB_SPRITES[item.icon]} palette={PALETTE} scale={1} />
      </span>
      <span className={world.itemLabel}>{item.label}</span>
      {item.state ? (
        <span className={world.itemState} aria-hidden="true">
          {item.state}
        </span>
      ) : null}
      {opens ? <ChevronRight className={world.itemArrow} aria-hidden="true" /> : null}
    </>
  );
}

/** The menu as a short list, one line per thing, like a game's pause menu. */
export function MenuList({ items, label }: { items: readonly MenuItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={world.menuItems} aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          {item.href ? (
            <Link className={world.menuItem} href={item.href}>
              <ItemFace item={item} />
            </Link>
          ) : (
            <button
              type="button"
              className={world.menuItem}
              aria-pressed={item.pressed}
              aria-haspopup={item.pressed === undefined && !item.action ? "dialog" : undefined}
              disabled={item.disabled}
              onClick={item.onClick}
            >
              <ItemFace item={item} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * From ≡: a short list of what has no place on the island (the guide, the
 * story again, the news, the sound, rest), then the island view and the
 * suggestions link as quiet words, the admin's tools folded away, and who is
 * signed in. The team, the tree, coins, prizes, the campfire and Demo Day
 * live on the island itself (the chip, the plot, the plaza).
 */
export function MenuSheet({
  open,
  onClose,
  me,
  claimed,
  whole,
  onToggleWhole,
  suggestUrl,
  items,
  onConsent,
  consentAiOnly = false,
}: SheetProps & {
  me: ViewerCard;
  /** The viewer has a plot: the footer's switch-account words differ before one. */
  claimed: boolean;
  whole: boolean;
  onToggleWhole: () => void;
  /** https://discord.com/channels/<guild>/<suggest channel>; hidden when unset. */
  suggestUrl?: string | null;
  /** The menu's lines, built by the page. */
  items: readonly MenuItem[];
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
        <MenuList items={items} label={HUD.menu} />
        <div className={world.menuQuiet}>
          <button type="button" className={styles.linkButton} onClick={onToggleWhole}>
            {whole ? ISLAND.viewClose : ISLAND.viewWhole}
          </button>
          {suggestUrl ? (
            <>
              <a className={styles.linkButton} href={suggestUrl} target="_blank" rel="noopener noreferrer" aria-describedby={suggestHintId}>
                {HUD.suggest}
              </a>
              <span id={suggestHintId} className="sr-only">
                {HUD.suggestHint}
              </span>
            </>
          ) : null}
        </div>
        {/* Admins only, folded: the database checks the role again on every reset. */}
        {me.admin ? (
          <details className={world.adminTools}>
            <summary>{MENU.adminTools}</summary>
            <AdminReset />
          </details>
        ) : null}
        <IslandFooter me={me} avatar={<Avatar me={me} />} switchLabel={claimed ? FOOTER.switchAccount : NO_PROJECT.switchAccount} />
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
