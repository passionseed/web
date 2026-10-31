import { AdminBetaRegistrations } from "@/components/admin/AdminBetaRegistrations";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function AdminBetaPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="People"
        title="Beta registrations"
        description="Track the registration funnel and applicant details."
      />
      <AdminBetaRegistrations />
    </div>
  );
}
