/**
 * UniversityGoalNode - ReactFlow node for University Goals
 * Special node type for university targets
 */

import React from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import { GraduationCap, MapPin, Building2, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NorthStar, NorthStarStatus } from "@/types/journey";
import { NORTH_STAR_COLORS } from "@/constants/sdg";

export type ZoomLevel = "low" | "medium" | "high";

interface UniversityGoalNodeProps {
  data: {
    northStar: NorthStar;
    linkedProjectCount?: number;
    hasRecentActivity?: boolean;
    onClick?: () => void;
    onEdit?: () => void;
    onViewDetails?: () => void;
    onUpdateProgress?: () => void;
    onCreateProject?: () => void;
    onQuickStatusChange?: (newStatus: NorthStarStatus) => void;
  };
  selected?: boolean;
}

/**
 * Calculate timeframe from creation to 3 years later
 */
const calculateTimeframe = (createdAt: string) => {
  const created = new Date(createdAt);
  const threeYearsLater = new Date(created);
  threeYearsLater.setFullYear(created.getFullYear() + 3);

  const now = new Date();
  const diffTime = threeYearsLater.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);

  if (diffDays <= 0) {
    return "Goal period completed";
  }

  return `in ${diffYears} year${diffYears !== 1 ? 's' : ''} (${diffDays} days)`;
};

export const UniversityGoalNode = React.memo(function UniversityGoalNode({
  data,
  selected = false,
}: UniversityGoalNodeProps) {
  const {
    northStar,
    linkedProjectCount = 0,
    hasRecentActivity = false,
    onEdit,
    onCreateProject
  } = data;

  // Optimize zoom handling
  const zoom = useStore((s) => s.transform[2]);

  const progressPercentage = northStar.progress_percentage || 0;
  
  // Status-based visual effects
  const nodeOpacity = northStar.status === 'archived' ? 'opacity-60' :
                      northStar.status === 'on_hold' ? 'opacity-80' :
                      'opacity-100';

  const filterEffect = northStar.status === 'archived' ? 'grayscale(60%)' : 'none';

  const handleClick = () => {
    if (data.onClick) {
      data.onClick();
    }
  };

  return (
    <div className="relative">
      {/* Floating edge handles */}
      <Handle
        type="source"
        position={Position.Bottom}
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
        className={`relative cursor-pointer group ${selected ? "scale-105" : "hover:scale-102"} transition-all duration-300 ${nodeOpacity}`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`University Goal: ${northStar.title} - ${progressPercentage}% progress`}
        style={{
          filter: filterEffect,
          opacity: zoom < 0.5 ? Math.max(0.4, zoom * 1.2) : 1
        }}
      >
        {/* Large circular background with university theme */}
        <div
          className="relative rounded-full flex flex-col items-center justify-center text-center transition-all duration-300 overflow-hidden"
          style={{
            width: `${Math.max(280, Math.min(360, 300 + (zoom - 1) * 20))}px`,
            height: `${Math.max(280, Math.min(360, 300 + (zoom - 1) * 20))}px`,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 50%, #1e3a8a 100%)', // Blue theme for university
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            border: '4px solid #60a5fa'
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10" 
               style={{ 
                 backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
               }} 
          />

          {/* Hover Edit Icon */}
          {onEdit && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/30 transition-colors"
                title="Edit University Goal"
              >
                <ExternalLink className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Activity pulse indicator */}
          {hasRecentActivity && (
            <div className="absolute top-4 left-4 z-50">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping" />
              <div className="absolute top-0 left-0 w-3 h-3 bg-blue-400 rounded-full" />
            </div>
          )}

          {/* Centered Icon */}
          <div className="mb-4 transition-all duration-300 bg-blue-900/50 p-6 rounded-full border border-blue-400/30">
            <GraduationCap 
              className="text-blue-200"
              size={Math.max(60, Math.min(100, 80 + (zoom - 1) * 20))}
            />
          </div>

          {/* Title - Always Visible */}
          <h3 className="text-2xl font-bold text-white mb-2 px-4 leading-tight font-serif tracking-wide">
            {northStar.title}
          </h3>

          {/* Timeframe - Always Visible */}
          <p className="text-blue-200 text-base mb-6 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Target University
          </p>

          {/* Medium Zoom (>= 0.75): Tags and Creation Date */}
          {zoom >= 0.75 && (
            <div
              className="transition-all duration-300 ease-in-out"
              style={{
                opacity: Math.min(1, (zoom - 0.75) / 0.25),
                transform: `scale(${Math.min(1, 0.8 + (zoom - 0.75) * 0.8)})`
              }}
            >
              {/* Tags removed as they are not in NorthStar type */}
            </div>
          )}

          {/* High Zoom (>= 1.25): Progress */}
          {zoom >= 1.25 && (
            <div
              className="text-blue-200 text-sm transition-all duration-300 ease-in-out mt-2"
              style={{
                opacity: Math.min(1, (zoom - 1.25) / 0.25),
                transform: `scale(${Math.min(1, 0.8 + (zoom - 1.25) * 0.8)})`
              }}
            >
              Admission Probability: {progressPercentage}%
            </div>
          )}
        </div>

        {/* Dotted line to "+ add project" button */}
        {onCreateProject && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 flex flex-col items-center">
            {/* Dotted line */}
            <div
              className="w-0.5 h-16 my-2"
              style={{
                backgroundImage: 'linear-gradient(to bottom, white 50%, transparent 50%)',
                backgroundSize: '1px 8px',
                backgroundRepeat: 'repeat-y',
                opacity: 0.6
              }}
            />

            {/* Add project button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onCreateProject();
              }}
              variant="outline"
              size="sm"
              className="bg-slate-800/95 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              add requirement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
