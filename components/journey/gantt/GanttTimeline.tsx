"use client";

import { format } from "date-fns";
import { TimelineBounds, ZoomLevel, getTimelineIntervals, dateToPosition } from "@/lib/utils/gantt";

interface GanttTimelineProps {
  bounds: TimelineBounds;
  zoomLevel: ZoomLevel;
  containerWidth: number;
}

export function GanttTimeline({ bounds, zoomLevel, containerWidth }: GanttTimelineProps) {
  const intervals = getTimelineIntervals(bounds, zoomLevel);

  return (
    <div className="relative h-full">
      {/* Month/Year Labels (Top Row) */}
      <div className="absolute top-0 left-0 right-0 h-10 flex border-b border-slate-700">
        {getMonthLabels(bounds, containerWidth).map((month, index) => (
          <div
            key={index}
            className="flex-shrink-0 px-2 flex items-center justify-center text-xs font-semibold text-slate-300 border-r border-slate-700 bg-slate-900"
            style={{
              left: month.x,
              width: month.width,
              position: "absolute",
            }}
          >
            {month.label}
          </div>
        ))}
      </div>

      {/* Day/Week Labels (Bottom Row) */}
      <div className="absolute top-10 left-0 right-0 h-10 flex">
        {intervals.map((interval, index) => {
          const x = dateToPosition(interval.date, bounds, containerWidth);
          const nextX = index < intervals.length - 1
            ? dateToPosition(intervals[index + 1].date, bounds, containerWidth)
            : containerWidth;
          const width = nextX - x;

          return (
            <div
              key={index}
              className="flex-shrink-0 px-1 flex flex-col items-center justify-center text-xs border-r border-slate-700 hover:bg-slate-700/30 transition-colors"
              style={{
                left: x,
                width,
                position: "absolute",
              }}
            >
              <div className="font-medium text-slate-300">{interval.label}</div>
              {interval.sublabel && (
                <div className="text-xs text-slate-500">{interval.sublabel}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Generate month/year labels for the top row of the timeline
 */
function getMonthLabels(bounds: TimelineBounds, containerWidth: number) {
  const labels: Array<{ label: string; x: number; width: number }> = [];
  const currentDate = new Date(bounds.start);
  currentDate.setDate(1); // Start of month

  while (currentDate <= bounds.end) {
    const monthStart = new Date(currentDate);
    const monthEnd = new Date(currentDate);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0); // Last day of current month

    const x = dateToPosition(monthStart, bounds, containerWidth);
    const nextX = dateToPosition(
      monthEnd < bounds.end ? monthEnd : bounds.end,
      bounds,
      containerWidth
    );

    labels.push({
      label: format(monthStart, "MMMM yyyy"),
      x,
      width: Math.max(nextX - x, 0),
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return labels;
}
