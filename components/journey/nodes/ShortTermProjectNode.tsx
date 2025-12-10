/**
 * ShortTermProjectNode - Compact project card with inverse zoom scaling
 * 
 * Features:
 * - Inverse zoom: nodes appear the same visual size at any zoom level
 * - Compact glassmorphism design
 * - Short truncated title
 * - Progress shown as compact circular indicator
 */

import React from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import { ChevronRight, Edit, Sparkles, Target } from "lucide-react";
import { JourneyProject, NorthStar } from "@/types/journey";
import { NORTH_STAR_COLORS } from "@/constants/sdg";

interface ShortTermProjectNodeProps {
  data: {
    project: JourneyProject;
    icon: string;
    hasRecentActivity: boolean;
    isMainQuest: boolean;
    northStar?: NorthStar;
    milestone_count?: number;
    completed_milestone_count?: number;
    onViewMilestones: () => void;
    onEdit: () => void;
  };
  selected?: boolean;
}

// Circular progress indicator
const CircularProgress = ({ progress, size = 32 }: { progress: number; size?: number }) => {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90">
        {progress}%
      </span>
    </div>
  );
};

export const ShortTermProjectNode = React.memo(function ({
  data,
  selected = false,
}: ShortTermProjectNodeProps) {
  // Optimize zoom handling
  const zoom = useStore((s) => s.transform[2]);
  const isLowZoom = zoom < 0.8;
  const isHighZoom = zoom >= 1.2;
  const isVeryHighZoom = zoom >= 1.5;

  const { project, northStar, icon, hasRecentActivity, isMainQuest, milestone_count } = data;

  const progressPercentage = project.progress_percentage || 0;
  const northStarColor = northStar ? NORTH_STAR_COLORS.find(c => c.value === northStar.north_star_color)?.color : null;

  // Partial inverse scaling - nodes grow with zoom but not 1:1
  // At zoom 1: scale 1, at zoom 2: scale ~0.85 (grows to ~1.7x instead of 2x)
  const inverseScale = Math.max(0.85, 1 / Math.pow(zoom, 0.3));
  
  // Base node width - larger for better visibility
  const nodeWidth = 260;

  // Determine detail level based on zoom
  const showDetails = isLowZoom === false; // showDetails was numericZoom >= 0.8 which is roughly !isLowZoom
  const showActions = isHighZoom; 
  const showFullDetails = isVeryHighZoom; 

  return (
    <div 
      className="relative"
      style={{
        transform: `scale(${inverseScale})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Hidden handles for connections */}
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

      {/* North Star Direction Beam */}
      {northStar && northStarColor && (
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-0.5 h-20 pointer-events-none z-0">
          <div 
            className="w-full h-full"
            style={{
              background: `linear-gradient(to top, ${northStarColor}60, transparent)`,
            }}
          />
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: northStarColor }}
          />
        </div>
      )}

      <div
        className={`relative cursor-move group transition-all duration-200 ${
          selected ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900" : ""
        }`}
        style={{ width: `${nodeWidth}px` }}
      >
        {/* Main quest glow */}
        {isMainQuest && (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/40 to-blue-500/40 rounded-xl blur-lg animate-pulse" />
        )}

        {/* Card Container - Glassmorphism */}
        <div
          className={`
            relative overflow-hidden
            bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-950/90
            backdrop-blur-xl
            rounded-xl
            border border-white/10
            shadow-xl shadow-black/20
            transition-all duration-300
            group-hover:border-white/20
            group-hover:shadow-2xl
            group-hover:shadow-blue-500/10
          `}
          style={{ padding: showFullDetails ? '18px' : '14px' }}
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          {/* Activity indicator */}
          {hasRecentActivity && (
            <div className="absolute top-2 right-2 z-10">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full" />
            </div>
          )}

          {/* Main Quest Badge */}
          {isMainQuest && (
            <div className="absolute -top-1 -left-1 z-10">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full p-1.5 shadow-lg">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
          )}

          {/* Header Row */}
          <div className="relative flex items-start gap-3 mb-2">
            {/* Icon */}
            <span className={`flex-shrink-0 mt-0.5 ${showFullDetails ? 'text-3xl' : 'text-2xl'}`}>
              {icon || '🎯'}
            </span>
            
            {/* Title - Show short_title if available, full title at high zoom */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-white leading-tight ${showFullDetails ? 'text-base' : 'text-sm'} ${showFullDetails ? '' : 'line-clamp-2'}`}>
                {showActions 
                  ? project.title 
                  : (project.short_title || project.title)
                }
              </h3>
              {/* Show short title as subtitle at high zoom */}
              {showActions && project.short_title && (
                <p className="text-xs text-slate-400 mt-0.5">
                  ({project.short_title})
                </p>
              )}
            </div>

            {/* Progress Circle */}
            <CircularProgress progress={progressPercentage} size={showFullDetails ? 44 : 36} />
          </div>

          {/* Goal Section - Show at very high zoom */}
          {showFullDetails && project.goal && (
            <div className="mt-3 p-2 bg-white/5 rounded-lg">
              <p className="text-xs font-medium text-blue-400 mb-1">🎯 Goal</p>
              <p className="text-xs text-slate-300 line-clamp-3">{project.goal}</p>
            </div>
          )}

          {/* Why Section - Show at very high zoom */}
          {showFullDetails && project.why && (
            <div className="mt-2 p-2 bg-white/5 rounded-lg">
              <p className="text-xs font-medium text-purple-400 mb-1">💡 Why</p>
              <p className="text-xs text-slate-300 line-clamp-2">{project.why}</p>
            </div>
          )}

          {/* Details Section */}
          {showDetails && (
            <div className="mt-3 pt-2 border-t border-white/5">
              {/* Milestone Badge */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Target className="w-3 h-3" />
                <span>
                  {milestone_count || 0} milestone{(milestone_count || 0) !== 1 ? 's' : ''}
                </span>
                {northStar && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-blue-400 truncate max-w-[100px]" title={northStar.title}>
                      ⭐ {northStar.title}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons - Row layout to prevent overlap */}
          <div
            className={`
              mt-2 pt-2 border-t border-white/5
              flex items-center gap-2
              transition-all duration-200
              ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
            style={{ height: showActions ? 'auto' : (selected ? 'auto' : '0'), overflow: 'hidden' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onViewMilestones();
              }}
              className="flex items-center justify-center gap-1 py-1.5 px-3 
                         bg-white/5 hover:bg-white/10 rounded-lg 
                         text-xs text-slate-300 hover:text-white 
                         transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
              <span>Milestones</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Just clicking the node selects it and opens the panel
                // The panel now has inline editing
              }}
              className="flex items-center justify-center gap-1 py-1.5 px-3 
                         bg-white/5 hover:bg-white/10 rounded-lg 
                         text-xs text-slate-300 hover:text-white 
                         transition-colors"
              title="View details and edit in panel"
            >
              <Edit className="w-3 h-3" />
              <span>Details</span>
            </button>
          </div>
        </div>

        {/* Selected shadow */}
        {selected && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-blue-500/20 rounded-full blur-md" />
        )}
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !border-2 !border-white !shadow-lg hover:!bg-blue-400 transition-colors"
        style={{
          left: -8,
          width: '16px',
          height: '16px',
          borderRadius: '50%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-emerald-500 !border-2 !border-white !shadow-lg hover:!bg-emerald-400 transition-colors"
        style={{
          right: -8,
          width: '16px',
          height: '16px',
          borderRadius: '50%'
        }}
      />
    </div>
  );
});
