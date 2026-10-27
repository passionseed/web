import { ManualPaymentTracker } from "@/components/admin/ceo/ManualPaymentTracker";
import {
  PaymentIntegrationsCard,
  RecentPaymentsCard,
  RecordedRevenueCard,
} from "@/components/admin/ceo/RecordedPayments";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getRecordedPaymentSummary } from "@/lib/supabase/ceo-payments";

export const dynamic = "force-dynamic";

/** /admin/ceo/payments: record family round and camp payments by hand. */
export default async function PaymentsPage() {
  // The layout checks too; this page reads with the service-role client.
  await requireAdmin();
  const summary = await getRecordedPaymentSummary();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="CEO"
        title="Payment tracking"
        description="Record family round and camp payments by hand. The totals come from these entries only."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ManualPaymentTracker />

        <div className="space-y-4">
          {summary ? (
            <>
              <RecordedRevenueCard summary={summary} />
              <RecentPaymentsCard payments={summary.recent} />
            </>
          ) : (
            <AdminErrorState
              title="Could not load recorded payments"
              message="Totals are unavailable right now. Recording a payment still works; reload the page to try again."
            />
          )}
          <PaymentIntegrationsCard />
        </div>
      </div>
    </div>
  );
}
