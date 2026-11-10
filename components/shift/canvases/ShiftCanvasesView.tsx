import { AdminEmptyState } from "@/components/admin/shared/AdminStates";
import type { ShiftCanvasRow } from "@/lib/supabase/shift-canvases";

import { CanvasChat } from "./CanvasChat";
import { type CanvasBase, ShiftCanvasTable } from "./ShiftCanvasTable";

/** Every SHIFT canvas with Claude for all of them; the admin and staff pages wrap it in their own header. */
export function ShiftCanvasesView({ canvases, base }: { canvases: ShiftCanvasRow[]; base: CanvasBase }) {
  if (canvases.length === 0) {
    return (
      <AdminEmptyState
        title="No SHIFT canvases yet"
        description="Canvases appear here once a student adds one from the SHIFT tab of a whiteboard's kit."
      />
    );
  }
  return (
    <div className="space-y-4">
      <ShiftCanvasTable canvases={canvases} base={base} />
      <CanvasChat scope={{ all: true }} subject={`all ${canvases.length} canvases`} />
    </div>
  );
}
