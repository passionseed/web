import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { ShiftCanvasDetail } from "@/components/shift/canvases/ShiftCanvasDetail";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { canvasRouteParams } from "@/lib/shift/canvas-chat";
import { trendOf } from "@/lib/shift/canvas-snapshots";
import { canvasSnapshots } from "@/lib/supabase/shift-canvas-snapshots";
import { readShiftCanvas } from "@/lib/supabase/shift-canvases";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/canvases");

export default async function AdminShiftCanvasPage({ params }: { params: Promise<{ boardId: string; frameId: string }> }) {
  await requireAdmin();
  const ids = canvasRouteParams(await params);
  if (!ids) notFound();
  const [canvas, snapshots] = await Promise.all([
    readShiftCanvas(ids.boardId, ids.frameId),
    canvasSnapshots(ids.boardId, ids.frameId),
  ]);
  if (!canvas) notFound();

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader eyebrow="SHIFT canvas" title={canvas.row.title || "Untitled canvas"} description={`On ${canvas.row.boardTitle}`} />
      <ShiftCanvasDetail row={canvas.row} markdown={canvas.markdown} trend={trendOf(snapshots)} base="/admin/shift/canvases" />
    </div>
  );
}
