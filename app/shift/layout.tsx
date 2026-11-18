import type { ReactNode } from "react";

import { ShiftGlobeScene } from "@/components/shift/next/ShiftGlobeScene";
import { SHIFT_SOURCE_CAPTURE_SCRIPT } from "@/lib/shift/attribution";

export default function ShiftLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Runs during the first page load only: saves ?utm_source before hydration. */}
      <script dangerouslySetInnerHTML={{ __html: SHIFT_SOURCE_CAPTURE_SCRIPT }} />
      <ShiftGlobeScene>{children}</ShiftGlobeScene>
    </>
  );
}
