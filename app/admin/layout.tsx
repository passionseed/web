import { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { UserNav } from "@/components/user-nav";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AdminShell accountMenu={<UserNav user={user} />}>{children}</AdminShell>
  );
}
