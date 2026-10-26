import { Suspense } from "react";

import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminLoading } from "@/components/admin/shared/AdminStates";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/** /admin/users: search accounts and manage their roles. */
export default async function AdminUsersPage() {
  // The layout checks too; the page needs the admin's ID for the self-demotion guard.
  const admin = await requireAdmin();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="People"
        title="Users"
        description="Search accounts and manage roles. Giving someone admin access asks you to confirm first, and you cannot remove your own admin role."
      />
      <Suspense fallback={<AdminLoading rows={8} label="Loading users" />}>
        <AdminUserManagement currentUserId={admin.id} />
      </Suspense>
    </div>
  );
}
