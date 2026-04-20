import { AdminBetaRegistrations } from "@/components/admin/AdminBetaRegistrations";

export const dynamic = "force-dynamic";

export default function AdminBetaPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">Beta Registrations</h2>
      <p className="text-sm text-muted-foreground">
        Track registration funnel and applicant details.
      </p>
      <AdminBetaRegistrations />
    </div>
  );
}
