import { AdminUserManagement } from "@/components/admin/AdminUserManagement";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">User Management</h2>
      <p className="text-sm text-muted-foreground">
        Manage accounts and role assignments.
      </p>
      <AdminUserManagement />
    </div>
  );
}
