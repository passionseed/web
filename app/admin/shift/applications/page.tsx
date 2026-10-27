import { Suspense } from "react";

import { AdminShiftApplications } from "@/components/admin/AdminShiftApplications";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminLoading } from "@/components/admin/shared/AdminStates";
import { adminMetadata } from "@/lib/admin/metadata";
import { getEffectiveCohort } from "@/lib/content/shift-cohort";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/applications");

/**
 * Filters live in the URL (?cohort, status, paid, q, sort, id), so the
 * overview and the command palette can open this list already filtered.
 */
export default function AdminShiftApplicationsPage() {
  // The cohort taking applications today in Bangkok, or the newest one.
  const defaultCohort = getEffectiveCohort().name;

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Applications"
        description="Review applicants, mark payment, and move accepted kids into the tracker."
      />
      <Suspense fallback={<AdminLoading rows={6} rowClassName="h-12" label="Loading applications" />}>
        <AdminShiftApplications defaultCohort={defaultCohort} />
      </Suspense>
    </div>
  );
}
