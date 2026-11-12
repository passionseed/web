import {
  ADMIN_QUEUE_BY_KEY,
  navBadgeCounts,
  type AdminQueueSnapshot,
} from "@/lib/admin/console";

export interface AdminNavBadge {
  count: number;
  /** A queue behind this badge is "now" urgent: money or a closing window. */
  urgent: boolean;
}

/** Sidebar badge per nav href, with whether any of its work is urgent. */
export function navBadges(
  snapshot: AdminQueueSnapshot | null,
): Record<string, AdminNavBadge> {
  const counts = navBadgeCounts(snapshot);
  const out: Record<string, AdminNavBadge> = {};
  for (const [href, count] of Object.entries(counts)) {
    out[href] = { count, urgent: false };
  }
  for (const queue of snapshot?.queues ?? []) {
    const def = ADMIN_QUEUE_BY_KEY[queue.key];
    if (!def?.badge || !def.navHref || !queue.count) continue;
    if (def.urgency === "now" && out[def.navHref])
      out[def.navHref].urgent = true;
  }
  return out;
}

/** True when any badge queue with "now" urgency has work in it. */
export function hasUrgentAttention(
  snapshot: AdminQueueSnapshot | null,
): boolean {
  return Object.values(navBadges(snapshot)).some((badge) => badge.urgent);
}

/** Badge text: caps at 99+ so the pill keeps its width. */
export function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(Math.max(0, Math.floor(count)));
}

/** Screen reader text for a badge, e.g. "4 waiting". */
export function badgeLabel(count: number): string {
  return `${formatBadgeCount(count)} waiting`;
}
