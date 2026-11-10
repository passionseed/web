import type { Metadata } from "next";

import { ShiftCanvasesView } from "@/components/shift/canvases/ShiftCanvasesView";
import { NoCanvasAccess, StaffShell } from "@/components/shift/canvases/StaffShell";
import { canvasPageAccess } from "@/lib/supabase/shift-canvas-access";
import { listShiftCanvases } from "@/lib/supabase/shift-canvases";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SHIFT canvases | PassionSeed", robots: { index: false, follow: false } };

/** /shift/canvases: every student's project canvas, for SHIFT staff and mentors. */
export default async function ShiftCanvasesPage() {
  if (!(await canvasPageAccess("/shift/canvases"))) return <NoCanvasAccess />;
  const canvases = await listShiftCanvases();
  return (
    <StaffShell
      title="SHIFT canvases"
      description="Every student's project canvas, with their team, nickname and Discord. Open one to read it, or ask Claude about all of them."
    >
      <ShiftCanvasesView canvases={canvases} base="/shift/canvases" />
    </StaffShell>
  );
}
