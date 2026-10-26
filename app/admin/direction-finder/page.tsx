import { AdminDirectionFinder } from "@/components/admin/AdminDirectionFinder";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function AdminDirectionFinderPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Tools & archive"
        title="Direction finder"
        description="Review AI guidance sessions and generated results."
      />
      <AdminDirectionFinder />
    </div>
  );
}
