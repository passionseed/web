import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Service-role client type. Only the overview loaders use it, and only from
 * pages and routes that have already checked the admin role.
 */
export type ServiceDb = ReturnType<typeof createAdminClient>;

/**
 * Creates the service-role client on first use. A missing env var throws
 * inside the loader that asked, so allSettled turns it into a null count
 * instead of a broken page.
 */
export function lazyServiceDb(): () => ServiceDb {
  let db: ServiceDb | null = null;
  return () => (db ??= createAdminClient());
}

/** Head count builder: ids only, exact count, no rows shipped back. */
export function headCount(db: ServiceDb, table: string) {
  return db.from(table).select("id", { count: "exact", head: true });
}
