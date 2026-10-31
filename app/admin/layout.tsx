import { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminAccountMenu } from "@/components/admin/console/AdminAccountMenu";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import "./admin.css";

export const dynamic = "force-dynamic";

function metadataText(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();
  // Only display strings reach the browser, not the whole auth user.
  const name =
    metadataText(user.user_metadata, "full_name") ??
    metadataText(user.user_metadata, "name");

  return (
    <AdminShell
      accountMenu={<AdminAccountMenu name={name} email={user.email ?? null} />}
    >
      {children}
    </AdminShell>
  );
}
