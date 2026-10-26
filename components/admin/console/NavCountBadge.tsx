import type { AdminNavBadge } from "./nav-badges";
import { badgeLabel, formatBadgeCount } from "./nav-badges";

/**
 * Quiet count pill for a sidebar item. Amber only when the item is selected
 * or its work is urgent; muted otherwise. Screen readers hear "4 waiting".
 */
export function NavCountBadge({
  badge,
  active = false,
}: {
  badge?: AdminNavBadge;
  active?: boolean;
}) {
  if (!badge || badge.count <= 0) return null;
  return (
    <span
      className="admin-nav-badge"
      data-tone={active || badge.urgent ? "accent" : "muted"}
    >
      <span aria-hidden="true">{formatBadgeCount(badge.count)}</span>
      <span className="sr-only">{`, ${badgeLabel(badge.count)}`}</span>
    </span>
  );
}
