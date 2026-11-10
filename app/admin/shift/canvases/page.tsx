import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { ShiftCanvasesView } from "@/components/shift/canvases/ShiftCanvasesView";
import { SnapshotNowButton } from "@/components/shift/canvases/SnapshotNowButton";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { latestChanges } from "@/lib/supabase/shift-canvas-snapshots";
import { listShiftCanvases } from "@/lib/supabase/shift-canvases";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/canvases");

export default async function AdminShiftCanvasesPage() {
  await requireAdmin();
  const [canvases, changes] = await Promise.all([listShiftCanvases(), latestChanges()]);

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Canvases"
        actions={<SnapshotNowButton />}
        description={
          <>
            Every SHIFT project canvas across whiteboards, with its team, nicknames and Discord. Open one to read it, or ask
            Claude about all of them. SHIFT staff and mentors see the same at <Link href="/shift/canvases" className="underline">/shift/canvases</Link>.{" "}
            <Link href="/shift/canvas-guide#admins" className="underline">
              Guide
            </Link>
          </>
        }
      />
      <ShiftCanvasesView canvases={canvases} base="/admin/shift/canvases" changes={Object.fromEntries(changes)} />
    </div>
  );
}
