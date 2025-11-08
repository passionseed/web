"use client";

import { ProjectMilestone } from "@/types/journey";
import { TimelineBounds, ZoomLevel, isMilestoneActive } from "@/lib/utils/gantt";
import { GanttBar } from "./GanttBar";

interface GanttRowProps {
  milestone: ProjectMilestone;
  rowIndex: number;
  rowHeight: number;
  bounds: TimelineBounds;
  containerWidth: number;
  zoomLevel: ZoomLevel;
  onUpdate?: (milestoneId: string, updates: Partial<ProjectMilestone>) => Promise<void>;
  onProgressUpdate?: (updatedMilestone?: ProjectMilestone) => void;
  onClick?: () => void;
}

export function GanttRow({
  milestone,
  rowIndex,
  rowHeight,
  bounds,
  containerWidth,
  zoomLevel,
  onUpdate,
  onProgressUpdate,
  onClick,
}: GanttRowProps) {
  // Calculate if this milestone is active (overlaps with today)
  const isActive = isMilestoneActive(milestone);

  return (
    <div
      className="absolute left-0 right-0 hover:bg-slate-800/20 transition-colors"
      style={{
        top: rowIndex * rowHeight,
        height: rowHeight,
      }}
    >
      <GanttBar
        milestone={milestone}
        bounds={bounds}
        containerWidth={containerWidth}
        zoomLevel={zoomLevel}
        isActive={isActive}
        onUpdate={onUpdate}
        onProgressUpdate={onProgressUpdate}
        onClick={onClick}
      />
    </div>
  );
}
