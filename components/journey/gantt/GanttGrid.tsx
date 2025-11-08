"use client";

import { TimelineBounds, ZoomLevel, getTimelineIntervals, dateToPosition } from "@/lib/utils/gantt";

interface GanttGridProps {
  bounds: TimelineBounds;
  zoomLevel: ZoomLevel;
  containerWidth: number;
  rowCount: number;
  rowHeight: number;
}

export function GanttGrid({
  bounds,
  zoomLevel,
  containerWidth,
  rowCount,
  rowHeight,
}: GanttGridProps) {
  const intervals = getTimelineIntervals(bounds, zoomLevel);
  const totalHeight = rowCount * rowHeight;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Vertical grid lines for time intervals */}
      {intervals.map((interval, index) => {
        const x = dateToPosition(interval.date, bounds, containerWidth);
        return (
          <div
            key={index}
            className="absolute top-0 bottom-0 border-l border-slate-800"
            style={{ left: x }}
          />
        );
      })}

      {/* Horizontal grid lines for rows */}
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 border-b border-slate-800"
          style={{ top: (index + 1) * rowHeight }}
        />
      ))}

      {/* Weekend highlighting (optional - shows weekends in a slightly different color) */}
      {zoomLevel === "day" && (
        <>
          {intervals
            .filter((interval) => {
              const day = interval.date.getDay();
              return day === 0 || day === 6; // Sunday or Saturday
            })
            .map((interval, index) => {
              const x = dateToPosition(interval.date, bounds, containerWidth);
              const nextDate = new Date(interval.date);
              nextDate.setDate(nextDate.getDate() + 1);
              const nextX = dateToPosition(nextDate, bounds, containerWidth);
              const width = nextX - x;

              return (
                <div
                  key={`weekend-${index}`}
                  className="absolute top-0 bg-slate-800/30"
                  style={{
                    left: x,
                    width,
                    height: totalHeight,
                  }}
                />
              );
            })}
        </>
      )}
    </div>
  );
}
