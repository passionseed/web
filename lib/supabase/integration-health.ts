import { createAdminClient } from "@/utils/supabase/admin";

/**
 * When the last Instagram webhook event was stored, for the integration
 * health check. Reads one timestamp, nothing else.
 */
export async function latestMetaWebhookEventAt(): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("meta_webhook_events")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.created_at as string | undefined) ?? null;
}
