import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import {
  PAYMENT_RECORDER_ROLE,
  paymentRecorderIds,
  summarizeRecordedPayments,
  type PaymentEventRow,
  type RecordedPaymentSummary,
} from "@/lib/supabase/ceo-dashboard";

/**
 * Server loader for /admin/ceo/payments. Reads manually recorded payments
 * (funnel_events, event 'payment_convert') with the service-role client, so
 * call it only after requireAdmin(). Resolves to null on failure so the page
 * can show an error state instead of a misleading ฿0. Only rows an admin
 * recorded count (see PAYMENT_RECORDER_ROLE).
 */
export async function getRecordedPaymentSummary(now: Date = new Date()): Promise<RecordedPaymentSummary | null> {
  try {
    const db = createAdminClient();
    const [payments, recorders] = await Promise.all([
      db
        .from("funnel_events")
        .select("event_timestamp, metadata")
        .eq("event_name", "payment_convert")
        .order("event_timestamp", { ascending: false })
        .limit(2000),
      db.from("user_roles").select("user_id").eq("role", PAYMENT_RECORDER_ROLE),
    ]);
    const error = payments.error ?? recorders.error;
    if (error) {
      console.error("Failed to load recorded payments:", error.message);
      return null;
    }
    return summarizeRecordedPayments(
      (payments.data ?? []) as PaymentEventRow[],
      paymentRecorderIds(recorders.data),
      now,
    );
  } catch (error) {
    console.error("Failed to load recorded payments:", error);
    return null;
  }
}
