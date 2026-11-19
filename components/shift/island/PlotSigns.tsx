import { useMemo, type CSSProperties } from "react";

import type { IslandScene } from "@/bot/src/quests/island/scene";
import { BOARD, boardInk, signposts } from "@/lib/shift-island/live/signposts";
import type { LightPhase } from "@/lib/shift-island/live/types";
import type { IslandHotspot } from "@/lib/shift-island/picture";

import styles from "./world.module.css";

/** The name a plot's sign shows, or null: a plain plot never has one, and a blank name is no sign. */
export function signName(hotspot: IslandHotspot): string | null {
  if (hotspot.plain) return null;
  return hotspot.name?.trim() || null;
}

/** The slots whose sign shows a name: the living island hangs their boards on longer posts. */
export function signedSlots(hotspots: readonly IslandHotspot[]): number[] {
  return hotspots.filter((hotspot) => signName(hotspot) != null).map((hotspot) => hotspot.slot);
}

/** The living island's signposts, while it draws them: the scene, the hour and CSS px per native pixel. */
export interface SignpostView {
  scene: IslandScene;
  phase: LightPhase;
  scale: number;
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * The signs on the island: each plot's project name, as DOM text because the
 * pixel renderer has no fonts. While the living island draws its signposts
 * (`posts`), each name is a small wooden board hanging from its plot's post,
 * in the post's own wood and paint under the hour's light, one native pixel
 * to the outline. Over the PNG (which keeps the bot's tags), the line sits
 * under the tag as before. Only what the database returned: a plot carries a
 * name only when every member shows it and consent is in (staff get every
 * name through their overview), so a sign never says more than the plot
 * sheet's ป้าย line. Never a student's name. Decorative: the plot's tap
 * target carries the same name for screen readers.
 */
export function PlotSigns({ hotspots, posts = null }: { hotspots: IslandHotspot[]; posts?: SignpostView | null }) {
  const signs = hotspots.flatMap((hotspot) => {
    const name = signName(hotspot);
    return name ? [{ hotspot, name }] : [];
  });
  const scene = posts?.scene ?? null;
  // Where each board hangs, worked out once per scene and set of names (the engine draws the same posts).
  const slotsKey = signs.map(({ hotspot }) => hotspot.slot).join(",");
  const hangs = useMemo(() => {
    if (!scene) return null;
    const hung = slotsKey ? slotsKey.split(",").map(Number) : [];
    return new Map(signposts(scene, { hung }).flatMap((post) => (post.hang ? [[post.slot, post.hang] as const] : [])));
  }, [scene, slotsKey]);
  if (signs.length === 0) return null;

  if (posts && scene && hangs) {
    const ink = boardInk(posts.phase);
    const look = {
      "--sign-px": `${posts.scale}px`,
      "--sign-face": ink.face,
      "--sign-lip": ink.lip,
      "--sign-edge": ink.edge,
      "--sign-ink": ink.ink,
    } as CSSProperties;
    return (
      <div className={styles.plotSigns} style={look} aria-hidden="true" data-testid="plot-signs" data-hung="true">
        {signs.map(({ hotspot, name }) => {
          const hang = hangs.get(hotspot.slot);
          if (!hang) return null;
          return (
            <span
              key={hotspot.slot}
              className={styles.signHang}
              // A strip as wide as the widest board, centred on the post: the board centres in it by layout, never a transform.
              style={{
                left: pct(hang.cx - BOARD.maxW / 2, scene.width),
                top: pct(hang.y, scene.height),
                width: pct(BOARD.maxW, scene.width),
              }}
            >
              <span className={styles.signBoard} data-slot={hotspot.slot} style={{ minWidth: `calc(var(--sign-px) * ${hang.minW})` }}>
                {name}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.plotSigns} aria-hidden="true" data-testid="plot-signs">
      {signs.map(({ hotspot, name }) => (
        <span
          key={hotspot.slot}
          className={styles.plotSign}
          data-slot={hotspot.slot}
          // Under the hotspot's box (the tree and its number tag), centred on it.
          style={{ left: `${hotspot.x + hotspot.w / 2}%`, top: `${hotspot.y + hotspot.h}%` }}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
