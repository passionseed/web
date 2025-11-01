/**
 * ShortTermProjectNode - Short-term project node
 * Medium-sized island with progress indicators
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Target, ChevronRight, Edit, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { JourneyProject, ProjectStatus } from "@/types/journey";

interface ShortTermProjectNodeProps {
  data: {
    project: JourneyProject;
    icon: string;
    hasRecentActivity: boolean;
    isMainQuest: boolean;
    northStarTitle?: string;
    onViewMilestones: () => void;
    onEdit: () => void;
  };
  selected?: boolean;
}

const statusColors: Record<
  ProjectStatus,
  { bg: string; text: string; border: string }
> = {
  not_started: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-400",
  },
  planning: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-400",
  },
  in_progress: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-400",
  },
  on_hold: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-400",
  },
  completed: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-400",
  },
  archived: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-300",
  },
};

const statusLabels: Record<ProjectStatus, string> = {
  not_started: "Not Started",
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

export const ShortTermProjectNode = React.memo(function ({
  data,
  selected = false,
}: ShortTermProjectNodeProps) {
  const { project, icon, hasRecentActivity, isMainQuest, northStarTitle } = data;

  const progressPercentage = project.progress_percentage || 0;
  const statusStyle = statusColors[project.status];

  return (
    <div className="relative">
      {/* Dynamic connection handles - position calculated automatically for floating edges */}
      <Handle
        type="source"
        position={Position.Top}
        id="source"
        className="opacity-0"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="opacity-0"
        style={{ pointerEvents: "none" }}
      />

      <div
        className={`relative cursor-pointer group ${selected ? "scale-110" : ""} transition-transform duration-300`}
        role="button"
        tabIndex={0}
        aria-label={`Project: ${project.title} - ${statusLabels[project.status]} - ${progressPercentage}% complete`}
      >
        {/* Main quest glow */}
        {isMainQuest && (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-60 animate-pulse" />
        )}

        {/* Activity pulse */}
        {hasRecentActivity && (
          <div className="absolute top-2 right-2 z-50">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full" />
          </div>
        )}

        {/* Main container */}
        <div
          className={`relative ${statusStyle.bg} rounded-2xl p-4 shadow-xl border-3 ${statusStyle.border} w-64 min-h-44 transition-all duration-300 group-hover:shadow-2xl ${isMainQuest ? "border-4 border-cyan-500" : ""}`}
          style={{
            backgroundColor: project.color || undefined,
          }}
        >
          {/* Main quest indicator */}
          {isMainQuest && (
            <div className="absolute -top-3 -left-3 bg-cyan-500 rounded-full p-2 shadow-lg border-2 border-white">
              <Sparkles className="w-4 h-4 text-white fill-white" />
            </div>
          )}

          {/* Header with emoji icon */}
          <div className="flex flex-col items-center mb-3">
            {/* Emoji icon */}
            <div className="text-4xl mb-2 select-none" role="img" aria-label="Project icon">
              {icon}
            </div>

            <div className="w-full text-center">
              <h3
                className={`text-base font-bold ${statusStyle.text} truncate px-2`}
              >
                {project.title}
              </h3>
              <Badge
                variant="secondary"
                className={`mt-1 ${statusStyle.bg} ${statusStyle.text} text-xs`}
              >
                {statusLabels[project.status]}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p
              className={`text-sm ${statusStyle.text} line-clamp-2 mb-3 opacity-80`}
            >
              {project.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs font-medium ${statusStyle.text}`}>
                Progress
              </span>
              <span className={`text-xs font-bold ${statusStyle.text}`}>
                {progressPercentage}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2">
              <div
                className={`h-full ${isMainQuest ? "bg-cyan-500" : "bg-blue-500"} transition-all`}
              />
            </Progress>
          </div>

          {/* North Star link */}
          {northStarTitle && (
            <div className="mb-3 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="truncate">{northStarTitle}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onViewMilestones();
              }}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/80 hover:bg-white ${statusStyle.text} rounded-lg text-xs font-medium transition-colors shadow-sm`}
              aria-label="View milestones"
            >
              <ChevronRight className="w-4 h-4" />
              Milestones
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit();
              }}
              className={`flex items-center justify-center px-3 py-2 bg-white/80 hover:bg-white ${statusStyle.text} rounded-lg transition-colors shadow-sm`}
              aria-label="Edit project"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shadow for depth */}
        {selected && (
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-black/20 rounded-full blur-lg"
              style={{
                animation: "shadow-pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        )}
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 cursor-grab active:cursor-grabbing"
        style={{ 
          left: -15,
          width: '30px',
          height: '30px',
          borderRadius: '50%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="bg-green-500 border-2 border-white shadow-lg hover:bg-green-600 cursor-grab active:cursor-grabbing"
        style={{ 
          right: -15,
          width: '30px',
          height: '30px',
          borderRadius: '50%'
        }}
      />
    </div>
  );
});

function Star({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
