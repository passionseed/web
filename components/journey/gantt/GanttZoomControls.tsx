"use client";

import { ZoomLevel } from "@/lib/utils/gantt";

interface GanttZoomControlsProps {
  zoomLevel: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
}

const zoomOptions: Array<{ value: ZoomLevel; label: string; icon: string }> = [
  { value: "day", label: "Day", icon: "📅" },
  { value: "week", label: "Week", icon: "📆" },
  { value: "month", label: "Month", icon: "🗓️" },
  { value: "quarter", label: "Quarter", icon: "📊" },
];

export function GanttZoomControls({
  zoomLevel,
  onZoomChange,
}: GanttZoomControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 mr-2">Zoom:</span>
      {zoomOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onZoomChange(option.value)}
          className={`
            px-3 py-1.5 rounded text-sm font-medium transition-all
            ${
              zoomLevel === option.value
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }
          `}
        >
          <span className="mr-1">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
