import "server-only";

import { revalidateTag } from "next/cache";

/**
 * Cache tag on the overview KPIs (`getAdminKpis` in ./kpis.ts, cached for
 * 5 minutes). Expire it after any write that moves revenue or SHIFT seats.
 */
export const ADMIN_OVERVIEW_TAG = "admin-overview";

/**
 * For route handlers: expire the cached overview KPIs now, so the next
 * overview load recomputes them. `{ expire: 0 }` instead of "max" because an
 * admin who just verified a payment should not see the old number once while
 * the cache refreshes in the background.
 *
 * Server actions call `updateTag(ADMIN_OVERVIEW_TAG)` from "next/cache"
 * instead; Next 16 throws if updateTag runs in a route handler.
 *
 * Never throws: the write already succeeded, and the cache expires on its own
 * within 5 minutes, so a failure here is logged, not returned to the admin.
 */
export function expireAdminOverviewKpis(): void {
  try {
    revalidateTag(ADMIN_OVERVIEW_TAG, { expire: 0 });
  } catch (error) {
    console.error("Failed to expire the admin overview KPI cache:", error);
  }
}
