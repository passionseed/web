"use client";

import type { CSSProperties } from "react";

import type { IslandPicture } from "@/lib/shift-island/picture";

import { PixelAvatar } from "./PixelAvatar";
import styles from "./player.module.css";

/** The island's pin sprite is 9x9 native pixels, drawn at the scene's glyph scale. */
const PIN = 9;

const pct = (value: number) => `${Math.round(value * 10_000) / 10_000}%`;

/**
 * Where the marker goes, in percent of the picture: over the scene's pin
 * (left, top and size from scene.marker), or above the top centre of the
 * viewer's plot when there is no scene. Null without a plot of one's own.
 */
export function markerBox(picture: Pick<IslandPicture, "width" | "height" | "mine" | "scene">): { style: CSSProperties; anchor: "pin" | "top" } | null {
  if (!picture.mine || picture.width <= 0 || picture.height <= 0) return null;
  const pin = picture.scene?.marker ?? null;
  if (pin) {
    return {
      anchor: "pin",
      style: {
        left: pct((pin.x / picture.width) * 100),
        top: pct((pin.y / picture.height) * 100),
        width: pct(((PIN * pin.scale) / picture.width) * 100),
      },
    };
  }
  const mine = picture.mine;
  return {
    anchor: "top",
    style: { left: pct(mine.x + mine.w / 2), top: pct(mine.y), width: pct((PIN / picture.width) * 100) },
  };
}

/**
 * The viewer's own Discord picture over their own plot's pin, so they can
 * see which tree is theirs. Only the viewer's page draws it (IslandHome
 * passes `me`); it never reaches the map, the scene or anyone else's island.
 * Decorative: the plot button already says "แปลงของคุณ".
 */
export function PlotMarker({ picture, me }: { picture: Pick<IslandPicture, "width" | "height" | "mine" | "scene">; me: { name: string; avatarUrl: string | null } }) {
  const box = markerBox(picture);
  if (!box) return null;
  return (
    <span className={styles.marker} style={box.style} data-anchor={box.anchor} data-testid="plot-marker" aria-hidden="true">
      <PixelAvatar name={me.name} url={me.avatarUrl} size={16} decorative fill />
    </span>
  );
}
