import { AdminMapsManagement } from "@/components/admin/AdminMapsManagement";

export const dynamic = "force-dynamic";

export default function AdminMapsPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">Maps Management</h2>
      <p className="text-sm text-muted-foreground">
        Review, filter, and maintain learning maps.
      </p>
      <AdminMapsManagement />
    </div>
  );
}
