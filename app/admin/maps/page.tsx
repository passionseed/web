import { Suspense } from "react";

import { AdminMapsManagement } from "@/components/admin/AdminMapsManagement";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminLoading } from "@/components/admin/shared/AdminStates";

export const dynamic = "force-dynamic";

/** /admin/maps: find, open and clean up PathLab learning maps. */
export default function AdminMapsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Learning"
        title="PathLabs"
        description="Every learning map on the platform. Search covers all pages, and filters stay in the link so you can share a view."
      />
      <Suspense fallback={<AdminLoading rows={10} label="Loading maps" />}>
        <AdminMapsManagement />
      </Suspense>
    </div>
  );
}
