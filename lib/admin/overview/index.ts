import "server-only";

/*
 * Server loaders for the admin console overview. Signatures are fixed by the
 * shell contract: every loader resolves (never rejects) so the overview
 * always renders, and marks unreadable parts as null. How the pieces fit
 * together, and how to add a queue or a KPI: docs/features/admin-console.md.
 *
 * Callers must check the admin role first (requireAdmin) because these read
 * with the service role.
 */

export { getAdminQueueSnapshot } from "./queues";
export { getAdminKpis } from "./kpis";
export { ADMIN_OVERVIEW_TAG, expireAdminOverviewKpis } from "./cache";
export { getAdminActivity } from "./activity";
export { getAdminShiftSnapshot } from "./shift";
