import { AdminEmptyState } from "@/components/admin/shared/AdminStates";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { CanvasChat } from "@/components/admin/shift-canvases/CanvasChat";
import { ShiftCanvasTable } from "@/components/admin/shift-canvases/ShiftCanvasTable";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { listShiftCanvases } from "@/lib/supabase/shift-canvases";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/canvases");

export default async function AdminShiftCanvasesPage() {
  await requireAdmin();
  const canvases = await listShiftCanvases();

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Canvases"
        description="Every SHIFT project canvas across whiteboards, with its team and progress. Open one to read it, or ask Claude about all of them."
      />
      {canvases.length === 0 ? (
        <AdminEmptyState
          title="No SHIFT canvases yet"
          description="Canvases appear here once a student adds one from the SHIFT tab of a whiteboard's kit."
        />
      ) : (
        <>
          <ShiftCanvasTable canvases={canvases} />
          <CanvasChat scope={{ all: true }} subject={`all ${canvases.length} canvases`} />
        </>
      )}
    </div>
  );
}
