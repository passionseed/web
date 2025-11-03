/**
 * ShortTermProjectNode - Enhanced short-term project node
 * Modern design with dark blue gradient and improved UX/UI
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { ChevronRight, Edit, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyProject, ProjectStatus } from "@/types/journey";

interface ShortTermProjectNodeProps {
  data: {
    project: JourneyProject;
    icon: string;
    hasRecentActivity: boolean;
    isMainQuest: boolean;
    northStarTitle?: string;
    milestone_count?: number;
    completed_milestone_count?: number;
    numericZoom?: number;
    onViewMilestones: () => void;
    onEdit: () => void;
  };
  selected?: boolean;
}

// Priority Indicator Component
const PriorityIndicator = ({ project }: { project: JourneyProject }) => {
  const isMainQuest = project.is_main_quest;
  const isHighPriority = (project.priority || 0) >= 8; // Assuming 1-10 scale

  if (isMainQuest) {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
        <span>⭐</span>
        <span>Main Quest</span>
      </div>
    );
  }

  if (isHighPriority) {
    return (
      <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-2">
        <span>🔸</span>
        <span>High priority</span>
      </div>
    );
  }

  return null;
};

// Milestone Count Component
const MilestoneInfo = ({ milestoneCount, completedCount }: { milestoneCount?: number; completedCount?: number }) => {
  const total = milestoneCount || 0;
  const completed = completedCount || 0;

  return (
    <div className="text-base text-white mb-4">
      {total > 0 ? (
        <span>{total} milestone{total !== 1 ? 's' : ''}</span>
      ) : (
        <span>No milestones yet</span>
      )}
    </div>
  );
};

// Enhanced Progress Bar Component
const EnhancedProgressBar = ({
  progress,
  northStarTitle
}: {
  progress: number;
  northStarTitle?: string;
}) => {
  const calculateNorthStarContribution = () => {
    // Simple calculation - could be enhanced based on actual business logic
    return Math.round(progress * 0.19); // Example calculation
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="opacity-80">progress</span>
        <span className="font-medium">{progress}%</span>
      </div>

      <div className="w-full bg-gray-600 rounded-full h-2">
        <div
          className="bg-white h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {northStarTitle && progress < 100 && (
        <div className="text-sm font-medium">
          finish to +{calculateNorthStarContribution()}% to ⭐ {northStarTitle}
        </div>
      )}
    </div>
  );
};

export const ShortTermProjectNode = React.memo(function ({
  data,
  selected = false,
}: ShortTermProjectNodeProps) {
  const { project, icon, hasRecentActivity, isMainQuest, northStarTitle, milestone_count, completed_milestone_count, numericZoom = 1 } = data;

  const progressPercentage = project.progress_percentage || 0;

  // Calculate zoom-responsive dimensions
  const baseWidth = 320;
  const minWidth = 200;
  const maxWidth = 320;
  const nodeWidth = Math.max(minWidth, Math.min(maxWidth, baseWidth + (numericZoom - 1) * 60));

  // Determine zoom level for progressive disclosure
  const isLowZoom = numericZoom < 0.75;
  const isMediumZoom = numericZoom >= 0.75 && numericZoom < 1.25;
  const isHighZoom = numericZoom >= 1.25;

  // Calculate icon size based on zoom
  const iconSize = Math.max(1.5, Math.min(2, 1.5 + (numericZoom - 1) * 0.25));

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
        className={`relative cursor-pointer group ${
          selected ? "scale-105" : "hover:scale-[1.02]"
        } transition-all duration-200`}
        role="button"
        tabIndex={0}
        aria-label={`Project: ${project.title} - ${progressPercentage}% complete`}
        style={{
          width: `${nodeWidth}px`,
        }}
      >
        {/* Main quest glow effect */}
        {isMainQuest && (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-60 animate-pulse" />
        )}

        {/* Activity pulse indicator */}
        {hasRecentActivity && (
          <div className="absolute top-2 right-2 z-50">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full" />
          </div>
        )}

        {/* Main container with dark blue gradient */}
        <div
          className="
            bg-gradient-to-br from-blue-900 to-blue-950
            rounded-2xl shadow-xl border border-blue-800/50
            text-white
            transition-all duration-300
            group-hover:shadow-2xl
            group-hover:border-blue-700/70
          "
          style={{
            padding: isLowZoom ? '12px' : '24px',
            minHeight: isLowZoom ? 'auto' : '192px',
          }}
        >
          {/* Main quest indicator - hide at low zoom */}
          {isMainQuest && !isLowZoom && (
            <div className="absolute -top-3 -left-3 bg-cyan-500 rounded-full p-2 shadow-lg border-2 border-white transition-all duration-300">
              <Sparkles className="w-4 h-4 text-white fill-white" />
            </div>
          )}

          {/* Header - Always visible */}
          <div className="flex items-center gap-3 mb-3">
            <span
              role="img"
              aria-label="Project icon"
              style={{
                fontSize: `${iconSize}rem`,
                transition: 'font-size 0.3s ease',
              }}
            >
              {icon || '🎯'}
            </span>
            <h3
              className="font-semibold flex-1 leading-tight"
              style={{
                fontSize: isLowZoom ? '0.875rem' : '1.125rem',
                transition: 'font-size 0.3s ease',
              }}
            >
              {project.title}
            </h3>
          </div>

          {/* Priority Indicator - Show at medium+ zoom */}
          <div
            className="transition-all duration-300"
            style={{
              opacity: isLowZoom ? 0 : 1,
              transform: isLowZoom ? 'scale(0.8)' : 'scale(1)',
              maxHeight: isLowZoom ? '0px' : '100px',
              overflow: 'hidden',
            }}
          >
            <PriorityIndicator project={project} />
          </div>

          {/* Milestone Count - Show at medium+ zoom */}
          <div
            className="transition-all duration-300"
            style={{
              opacity: isLowZoom ? 0 : 1,
              transform: isLowZoom ? 'scale(0.8)' : 'scale(1)',
              maxHeight: isLowZoom ? '0px' : '100px',
              overflow: 'hidden',
            }}
          >
            <MilestoneInfo
              milestoneCount={milestone_count}
              completedCount={completed_milestone_count}
            />
          </div>

          {/* Progress Section - Show at medium+ zoom */}
          <div
            className="transition-all duration-300"
            style={{
              marginTop: isLowZoom ? '0' : '24px',
              opacity: isLowZoom ? 0 : 1,
              transform: isLowZoom ? 'scale(0.8)' : 'scale(1)',
              maxHeight: isLowZoom ? '0px' : '200px',
              overflow: 'hidden',
            }}
          >
            <EnhancedProgressBar
              progress={progressPercentage}
              northStarTitle={northStarTitle}
            />
          </div>

          {/* Action Buttons - Show at high zoom only */}
          <div
            className="flex gap-2 transition-all duration-300"
            style={{
              marginTop: isHighZoom ? '16px' : '0',
              opacity: isHighZoom ? 1 : 0,
              transform: isHighZoom ? 'scale(1)' : 'scale(0.8)',
              maxHeight: isHighZoom ? '100px' : '0px',
              overflow: 'hidden',
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                data.onViewMilestones();
              }}
              className="flex-1 text-white hover:bg-white/10 border-0"
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              Milestones
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit();
              }}
              className="text-white hover:bg-white/10 border-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Enhanced shadow for depth when selected */}
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

// Enhanced ShortTermProjectNode - ready for modern journey mapping
