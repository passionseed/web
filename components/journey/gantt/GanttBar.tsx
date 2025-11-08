"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ProjectMilestone } from "@/types/journey";
import {
  TimelineBounds,
  ZoomLevel,
  calculateGanttBar,
  positionToDate,
  snapToGrid,
  getMilestoneStatusColor,
  formatDuration,
  calculateDuration,
} from "@/lib/utils/gantt";
import { GanttProgressPopover } from "./GanttProgressPopover";
import { Zap } from "lucide-react";

interface GanttBarProps {
  milestone: ProjectMilestone;
  bounds: TimelineBounds;
  containerWidth: number;
  zoomLevel: ZoomLevel;
  isActive?: boolean;
  onUpdate?: (
    milestoneId: string,
    updates: Partial<ProjectMilestone>
  ) => Promise<void>;
  onProgressUpdate?: (updatedMilestone?: ProjectMilestone) => void;
  onClick?: () => void;
}

type DragMode = "move" | "resize-left" | "resize-right" | null;

export function GanttBar({
  milestone,
  bounds,
  containerWidth,
  zoomLevel,
  isActive = false,
  onUpdate,
  onProgressUpdate,
  onClick,
}: GanttBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [tempPosition, setTempPosition] = useState<{
    x: number;
    width: number;
  } | null>(null);

  const barRef = useRef<HTMLDivElement>(null);

  const bar = calculateGanttBar(milestone, bounds, containerWidth, 0, 60);
  const colors = getMilestoneStatusColor(milestone.status);

  const currentX = tempPosition?.x ?? bar.x;
  const currentWidth = tempPosition?.width ?? bar.width;

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent, mode: DragMode) => {
    if (!onUpdate) return;

    e.stopPropagation();
    setIsDragging(true);
    setDragMode(mode);
    setDragStartX(e.clientX);
  };

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging || !dragMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;

      if (dragMode === "move") {
        setTempPosition({
          x: Math.max(0, bar.x + deltaX),
          width: bar.width,
        });
      } else if (dragMode === "resize-left") {
        const newX = Math.max(0, bar.x + deltaX);
        const newWidth = bar.width - deltaX;
        if (newWidth >= 20) {
          setTempPosition({
            x: newX,
            width: newWidth,
          });
        }
      } else if (dragMode === "resize-right") {
        const newWidth = Math.max(20, bar.width + deltaX);
        setTempPosition({
          x: bar.x,
          width: newWidth,
        });
      }
    };

    const handleMouseUp = async () => {
      if (tempPosition && onUpdate) {
        // Convert pixel positions back to dates
        const newStartDate = snapToGrid(
          positionToDate(tempPosition.x, bounds, containerWidth),
          zoomLevel
        );
        const newEndDate = snapToGrid(
          positionToDate(
            tempPosition.x + tempPosition.width,
            bounds,
            containerWidth
          ),
          zoomLevel
        );

        // Update the milestone
        await onUpdate(milestone.id, {
          start_date: newStartDate.toISOString(),
          due_date: newEndDate.toISOString(),
        });
      }

      setIsDragging(false);
      setDragMode(null);
      setTempPosition(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragMode,
    dragStartX,
    tempPosition,
    bar,
    bounds,
    containerWidth,
    zoomLevel,
    onUpdate,
    milestone.id,
  ]);

  const duration = calculateDuration(bar.startDate, bar.endDate);
  const showDetails = currentWidth > 100; // Show text only if bar is wide enough

  // Active milestone styling - add glow effect for milestones happening today
  const activeStyles = isActive
    ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-blue-500/30"
    : "";

  return (
    <div
      ref={barRef}
      className={`absolute group cursor-pointer transition-all ${
        isDragging ? "z-30 opacity-80" : "z-10"
      }`}
      style={{
        left: currentX,
        width: currentWidth,
        top: "50%",
        transform: "translateY(-50%)",
        height: 40,
      }}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick?.();
        }
      }}
    >
      {/* Resize Handle - Left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 ${
          onUpdate ? "block" : "hidden"
        }`}
        onMouseDown={(e) => handleMouseDown(e, "resize-left")}
      />

      {/* Main Bar */}
      <div
        className={`h-full rounded border-2 ${colors.bg} ${colors.border} ${colors.text} ${activeStyles} relative overflow-hidden`}
        onMouseDown={(e) => onUpdate && handleMouseDown(e, "move")}
        style={{
          cursor: onUpdate ? "move" : "pointer",
        }}
      >
        {/* Progress Fill */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-blue-600/30 transition-all"
          style={{
            width: `${milestone.progress_percentage}%`,
          }}
        />

        {/* Content */}
        <div className="relative h-full px-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {showDetails && (
              <div className="text-sm font-medium truncate">
                {milestone.title}
              </div>
            )}
            <div className="text-xs opacity-75">
              {formatDuration(duration)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showDetails && milestone.progress_percentage > 0 && (
              <div className="text-xs font-semibold">
                {milestone.progress_percentage}%
              </div>
            )}

            {/* Quick Update Button - Only show if active and progress update handler exists */}
            {isActive && onProgressUpdate && (
              <GanttProgressPopover
                milestone={milestone}
                onUpdate={onProgressUpdate}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 active:bg-white/20"
                  title="Quick progress update"
                >
                  <Zap className="w-4 h-4 text-blue-400" />
                </button>
              </GanttProgressPopover>
            )}
          </div>
        </div>

        {/* Hover Tooltip */}
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-40">
          <div className="font-medium text-sm">{milestone.title}</div>
          <div className="text-xs text-slate-400 mt-1">
            {format(bar.startDate, "MMM d, yyyy")} →{" "}
            {format(bar.endDate, "MMM d, yyyy")}
          </div>
          <div className="text-xs text-slate-400">
            Duration: {formatDuration(duration)}
          </div>
          {milestone.progress_percentage > 0 && (
            <div className="text-xs text-slate-400">
              Progress: {milestone.progress_percentage}%
            </div>
          )}
          {milestone.estimated_hours && (
            <div className="text-xs text-slate-400">
              Estimated: {milestone.estimated_hours}h
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle - Right */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 ${
          onUpdate ? "block" : "hidden"
        }`}
        onMouseDown={(e) => handleMouseDown(e, "resize-right")}
      />
    </div>
  );
}
