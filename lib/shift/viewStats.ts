import type { SourceCount } from "@/lib/shift/applicationStats";

export interface ShiftViewStats {
  totalViews: number;
  sources: SourceCount[];
}
