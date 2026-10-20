import type { ReactNode } from "react";

import { ShiftGlobeScene } from "@/components/shift/next/ShiftGlobeScene";

export default function ShiftLayout({ children }: { children: ReactNode }) {
  return <ShiftGlobeScene>{children}</ShiftGlobeScene>;
}
