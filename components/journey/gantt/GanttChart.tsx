"use client";

import { useState, useRef, useEffect } from "react";
import { ProjectMilestone } from "@/types/journey";
import {
  calculateTimelineBounds,
  calculateContainerWidth,
  ZoomLevel,
} from "@/lib/utils/gantt";
import { GanttTimeline } from "./GanttTimeline";
import { GanttGrid } from "./GanttGrid";
import { GanttRow } from "./GanttRow";
import { GanttTodayMarker } from "./GanttTodayMarker";
import { GanttDependencyArrows } from "./GanttDependencyArrows";
import { GanttZoomControls } from "./GanttZoomControls";

interface GanttChartProps {
  milestones: ProjectMilestone[];
  projectGoal?: string | null;
  onMilestoneUpdate?: (
    milestoneId: string,
    updates: Partial<ProjectMilestone>
  ) => Promise<void>;
  onMilestoneClick?: (milestone: ProjectMilestone) => void;
  onProgressUpdate?: (updatedMilestone?: ProjectMilestone) => void;
}

export function GanttChart({
  milestones,
  projectGoal,
  onMilestoneUpdate,
  onMilestoneClick,
  onProgressUpdate,
}: GanttChartProps) {
  // Persist zoom level in localStorage to maintain across re-renders
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ganttZoomLevel");
      return (saved as ZoomLevel) || "week";
    }
    return "week";
  });

  // Save zoom level to localStorage when it changes
  const handleZoomChange = (level: ZoomLevel) => {
    setZoomLevel(level);
    if (typeof window !== "undefined") {
      localStorage.setItem("ganttZoomLevel", level);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate timeline bounds and container width
  const bounds = calculateTimelineBounds(milestones);
  const totalWidth = calculateContainerWidth(bounds, zoomLevel);

  // Update container width on mount and zoom change
  useEffect(() => {
    setContainerWidth(totalWidth);
  }, [totalWidth]);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current && containerWidth > 0) {
      const today = new Date();
      const daysFromStart = Math.floor(
        (today.getTime() - bounds.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const scrollPosition =
        (daysFromStart / bounds.totalDays) * containerWidth - 200;
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [containerWidth, bounds]);

  const rowHeight = 60;
  const timelineHeight = 80;
  const labelWidth = 280;

  if (milestones.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center">
          <p className="text-lg">No milestones yet</p>
          <p className="text-sm mt-2">Create your first milestone to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* Project Goal Header */}
      {projectGoal && (
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">
                Project Goal
              </div>
              <div className="text-base text-slate-200 font-medium">
                {projectGoal}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
        <div className="text-sm text-slate-300">
          <span className="font-medium">{milestones.length}</span> milestones •{" "}
          <span className="font-medium">{bounds.totalDays}</span> days
        </div>
        <GanttZoomControls zoomLevel={zoomLevel} onZoomChange={handleZoomChange} />
      </div>

      {/* Gantt Chart Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Labels Column */}
        <div
          className="flex-shrink-0 bg-slate-800 border-r border-slate-700"
          style={{ width: labelWidth }}
        >
          {/* Timeline Header Spacer */}
          <div
            className="border-b border-slate-700 bg-slate-900"
            style={{ height: timelineHeight }}
          />

          {/* Milestone Labels */}
          <div className="overflow-y-auto h-full">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className="border-b border-slate-700 px-4 py-3 hover:bg-slate-700/30 cursor-pointer transition-colors"
                style={{ height: rowHeight }}
                onClick={() => onMilestoneClick?.(milestone)}
              >
                <div className="flex items-start gap-2 h-full">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {milestone.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {milestone.status.replace("_", " ")}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">#{index + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline and Bars */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative bg-slate-900"
        >
          <div style={{ width: containerWidth, position: "relative" }}>
            {/* Timeline Header */}
            <div
              className="sticky top-0 z-20 bg-slate-800 border-b border-slate-700"
              style={{ height: timelineHeight }}
            >
              <GanttTimeline
                bounds={bounds}
                zoomLevel={zoomLevel}
                containerWidth={containerWidth}
              />
            </div>

            {/* Chart Area */}
            <div className="relative" style={{ minHeight: rowHeight * milestones.length }}>
              {/* Background Grid */}
              <GanttGrid
                bounds={bounds}
                zoomLevel={zoomLevel}
                containerWidth={containerWidth}
                rowCount={milestones.length}
                rowHeight={rowHeight}
              />

              {/* Today Marker */}
              <GanttTodayMarker
                bounds={bounds}
                containerWidth={containerWidth}
                height={rowHeight * milestones.length}
              />

              {/* Milestone Rows */}
              {milestones.map((milestone, index) => (
                <GanttRow
                  key={milestone.id}
                  milestone={milestone}
                  rowIndex={index}
                  rowHeight={rowHeight}
                  bounds={bounds}
                  containerWidth={containerWidth}
                  zoomLevel={zoomLevel}
                  onUpdate={onMilestoneUpdate}
                  onProgressUpdate={onProgressUpdate}
                  onClick={() => onMilestoneClick?.(milestone)}
                />
              ))}

              {/* Dependency Arrows */}
              <GanttDependencyArrows
                milestones={milestones}
                bounds={bounds}
                containerWidth={containerWidth}
                rowHeight={rowHeight}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
