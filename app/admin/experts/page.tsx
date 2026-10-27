import { Suspense } from "react";

import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminLoading } from "@/components/admin/shared/AdminStates";
import { ExpertQueueClient } from "./ExpertQueueClient";

export const dynamic = "force-dynamic";

export default function AdminExpertsPage() {
  return (
    <div className="space-y-2">
      <AdminPageHeader
        eyebrow="People"
        title="Expert submissions"
        description="Review expert career interviews. Approving one generates a PathLab from it."
      />
      <Suspense fallback={<AdminLoading rows={5} rowClassName="h-[76px]" label="Loading expert submissions" />}>
        <ExpertQueueClient />
      </Suspense>
    </div>
  );
}
