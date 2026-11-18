import type { IslandHotspot } from "@/lib/shift-island/picture";

import styles from "./world.module.css";

/** The name a plot's sign shows, or null: a plain plot never has one, and a blank name is no sign. */
export function signName(hotspot: IslandHotspot): string | null {
  if (hotspot.plain) return null;
  return hotspot.name?.trim() || null;
}

/**
 * The signs on the island: each plot's project name under its tree's number,
 * as DOM text because the pixel renderer has no fonts. Only what the database
 * returned: a plot carries a name only when every member shows it and consent
 * is in (staff get every name through their overview), so a sign never says
 * more than the plot sheet's ป้าย line. Never a student's name. Decorative:
 * the plot's tap target carries the same name for screen readers.
 */
export function PlotSigns({ hotspots }: { hotspots: IslandHotspot[] }) {
  const signs = hotspots.flatMap((hotspot) => {
    const name = signName(hotspot);
    return name ? [{ hotspot, name }] : [];
  });
  if (signs.length === 0) return null;
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
