/**
 * Inline SVG pixel art from a grid (pixel-art.ts). Crisp at any scale
 * (shape-rendering: crispEdges), no network request, safe inside the profile
 * card PNG export. Used for badge glyphs, the avatar, and the host fallback
 * when its webp fails.
 */
import { memo } from "react";
import type { BadgeIcon } from "@/lib/radar-guide/story";
import { BADGE_GLYPHS, gridRuns, gridSize, type PixelGrid, type PixelPalette } from "./pixel-art";

export interface PixelSpriteProps {
  grid: PixelGrid;
  palette: PixelPalette;
  /** Rendered width in px; height follows the grid's aspect. */
  width: number;
  className?: string;
  title?: string;
}

export const PixelSprite = memo(function PixelSprite({ grid, palette, width, className, title }: PixelSpriteProps) {
  const { w, h } = gridSize(grid);
  const runs = gridRuns(grid, palette);
  return (
    <svg
      className={className}
      width={width}
      height={(width * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  );
});

export interface PixelIconProps {
  icon: BadgeIcon;
  size?: number;
  /** Main colour (`#` cells); defaults to the career accent via currentColor. */
  color?: string;
  /** Second colour (`o` cells). */
  color2?: string;
  className?: string;
}

/** An 8x8 badge glyph. */
export function PixelIcon({ icon, size = 24, color = "currentColor", color2 = "#ff8a4c", className }: PixelIconProps) {
  return <PixelSprite grid={BADGE_GLYPHS[icon]} palette={{ "#": color, o: color2 }} width={size} className={className} />;
}
