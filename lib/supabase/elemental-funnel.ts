import { FUNNEL_EVENT_TYPE, FUNNEL_HOSTS, type FunnelRow } from "@/lib/hackathon/elemental/funnel";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Elemental funnel events from hackathon_events, for the admin page only
 * (the caller runs requireAdmin first). Rows hold a random browser id and a
 * step name, no names or contacts.
 */
export async function listElementalFunnelRows(sinceIso: string, limit = 50000): Promise<FunnelRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hackathon_events")
    .select("event_data, created_at")
    .eq("event_type", FUNNEL_EVENT_TYPE)
    .in("event_data->>host", FUNNEL_HOSTS)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FunnelRow[];
}
