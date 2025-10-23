/**
 * MilestoneNode - Individual milestone node for project milestone maps
 * Circular node with progress indicator and journal preview
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { CheckCircle, Circle, Clock, Ban, Forward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProjectMilestone, MilestoneStatus } from "@/types/journey";

interface MilestoneNodeProps {
  data: {
    milestone: ProjectMilestone;
    latestJournalPreview?: string;
    onOpenProgress: () => void;
  };
  selected?: boolean;
}

const statusConfig: Record<
  MilestoneStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  not_started: {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    label: "Not Started",
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    label: "In Progress",
  },
  blocked: {
    icon: Ban,
    color: "text-red-500",
    bgColor: "bg-red-50",
    label: "Blocked",
  },
  completed: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50",
    label: "Completed",
  },
  skipped: {
    icon: Forward,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    label: "Skipped",
  },
};

export function MilestoneNode({ data, selected = false }: MilestoneNodeProps) {
  const { milestone, latestJournalPreview } = data;
  const config = statusConfig[milestone.status];
  const StatusIcon = config.icon;

  // Calculate progress ring
  const progressPercentage =
    (milestone as any).progress_percentage || (milestone.status === "completed" ? 100 : 0);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (progressPercentage / 100) * circumference;

  // Get custom style or use defaults
  const nodeStyle = milestone.style || {};
  const backgroundColor = nodeStyle.backgroundColor || config.bgColor;
  const borderColor = nodeStyle.borderColor || config.color;

  return (
    <div className="relative">
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-blue-500/50 border-2 border-blue-400"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-green-500/50 border-2 border-green-400"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 bg-blue-500/50 border-2 border-blue-400"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-green-500/50 border-2 border-green-400"
        style={{ pointerEvents: "none" }}
      />

      <div
        className={`relative cursor-pointer group ${selected ? "scale-110" : ""} transition-transform duration-300`}
        onClick={() => data.onOpenProgress()}
        role="button"
        tabIndex={0}
        aria-label={`${milestone.title} - ${config.label} - ${progressPercentage}% complete`}
      >
        {/* Glow effect for in-progress */}
        {milestone.status === "in_progress" && (
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-40 animate-pulse" />
        )}

        {/* Main circular container */}
        <div
          className={`relative rounded-full w-32 h-32 ${backgroundColor} border-4 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105`}
          style={{
            borderColor: borderColor,
          }}
        >
          {/* Progress ring */}
          <svg
            className="absolute inset-0 w-full h-full transform -rotate-90"
            style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.1))" }}
          >
            <circle
              cx="64"
              cy="64"
              r="40"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="64"
              cy="64"
              r="40"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={config.color}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
            <StatusIcon className={`w-8 h-8 ${config.color} mb-1`} />
            <div className={`text-2xl font-bold ${config.color}`}>
              {progressPercentage}%
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-40">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
            <div className="text-sm font-bold text-gray-800 text-center truncate">
              {milestone.title}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Badge variant="secondary" className={`text-xs ${config.bgColor} ${config.color}`}>
                {config.label}
              </Badge>
            </div>
            {latestJournalPreview && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2 text-center">
                {latestJournalPreview}
              </div>
            )}
          </div>
        </div>

        {/* Shadow for depth */}
        {selected && (
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-black/20 rounded-full blur-md"
              style={{
                animation: "shadow-pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
