"use client";

import { format } from "date-fns";
import { TimelineBounds, dateToPosition } from "@/lib/utils/gantt";

interface GanttTodayMarkerProps {
  bounds: TimelineBounds;
  containerWidth: number;
  height: number;
}

export function GanttTodayMarker({
  bounds,
  containerWidth,
  height,
}: GanttTodayMarkerProps) {
  const today = new Date();

  // Check if today is within the timeline bounds
  if (today < bounds.start || today > bounds.end) {
    return null;
  }

  const x = dateToPosition(today, bounds, containerWidth);

  return (
    <div
      className="absolute top-0 pointer-events-none z-10"
      style={{ left: x, height }}
    >
      {/* Vertical line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/70" />

      {/* Top indicator */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />

      {/* Label */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded shadow-lg whitespace-nowrap">
        Today
        <div className="text-xs opacity-80">{format(today, "MMM d")}</div>
      </div>
    </div>
  );
}
