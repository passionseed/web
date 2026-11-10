import Link from "next/link";

import { CEODashboard } from "@/components/admin/ceo/CEODashboard";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/** /admin/ceo: product-market-fit metrics from funnel events. */
export default async function CEODashboardPage() {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="CEO"
        title="CEO dashboard"
        description={
          <>
            Funnel, retention and retro from recorded funnel events. Revenue counts{" "}
            <Link href="/admin/ceo/payments" className="underline underline-offset-4">
              payments entered by hand
            </Link>
            .
          </>
        }
      />
      <CEODashboard />
    </div>
  );
}
