import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { ICON_PALETTE } from "@/components/shift/poster/pixel/pixelIcons";
import { RisoIcon, type RisoIconName } from "@/components/shift/poster/RisoIcons";
import type { ShiftArtKind } from "@/components/shift/theme";

import { PIXEL_GLYPHS } from "./pixelGlyphs";

/**
 * One icon, drawn in the round's own hand: a pixel sprite on pixel rounds,
 * two riso plates everywhere else. `ink` only tints the riso plate; sprites
 * keep their fixed palette so they match the posters.
 */
export function ShiftIcon({
  kind,
  name,
  ink,
  size = 48,
  className = "",
}: {
  kind: ShiftArtKind;
  name: RisoIconName;
  ink: string;
  size?: number;
  className?: string;
}) {
  if (kind === "pixel") {
    const grid = PIXEL_GLYPHS[name];
    const cells = Math.max(grid.length, ...grid.map((row) => row.length));
    // Whole pixels only, so every sprite edge lands on the device grid.
    const scale = Math.max(2, Math.floor(size / cells));
    return (
      <span
        className={`flex shrink-0 items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <PixelIcon grid={grid} palette={ICON_PALETTE} scale={scale} />
      </span>
    );
  }
  return <RisoIcon name={name} ink={ink} size={size} className={className} />;
}
