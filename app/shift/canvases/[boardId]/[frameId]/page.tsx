import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShiftCanvasDetail } from "@/components/shift/canvases/ShiftCanvasDetail";
import { NoCanvasAccess, StaffShell } from "@/components/shift/canvases/StaffShell";
import { canvasRouteParams } from "@/lib/shift/canvas-chat";
import { canvasPageAccess } from "@/lib/supabase/shift-canvas-access";
import { trendOf } from "@/lib/shift/canvas-snapshots";
import { canvasSnapshots } from "@/lib/supabase/shift-canvas-snapshots";
import { readShiftCanvas } from "@/lib/supabase/shift-canvases";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SHIFT canvas | PassionSeed", robots: { index: false, follow: false } };

export default async function ShiftCanvasPage({ params }: { params: Promise<{ boardId: string; frameId: string }> }) {
  const raw = await params;
  if (!(await canvasPageAccess(`/shift/canvases/${raw.boardId}/${raw.frameId}`))) return <NoCanvasAccess />;
  const ids = canvasRouteParams(raw);
  if (!ids) notFound();
  const [canvas, snapshots] = await Promise.all([
    readShiftCanvas(ids.boardId, ids.frameId),
    canvasSnapshots(ids.boardId, ids.frameId),
  ]);
  if (!canvas) notFound();
  return (
    <StaffShell title={canvas.row.title || "Untitled canvas"} description={`On ${canvas.row.boardTitle}`}>
      <ShiftCanvasDetail row={canvas.row} markdown={canvas.markdown} trend={trendOf(snapshots)} base="/shift/canvases" />
    </StaffShell>
  );
}
