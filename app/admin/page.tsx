import { checkAdminAccess } from "@/utils/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await checkAdminAccess();

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and platform settings
          </p>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
}
