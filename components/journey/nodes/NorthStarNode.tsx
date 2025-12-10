/**
 * NorthStarNode - ReactFlow node for North Star entities
 * Displays North Stars from the north_stars table (not projects)
 * Redesigned with minimalist circular design and zoom-based progressive disclosure
 */

import React from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NorthStar, NorthStarStatus } from "@/types/journey";
import { NORTH_STAR_COLORS } from "@/constants/sdg";
import { StarSVG } from "@/components/ui/star-generator";
import { StarConfig } from "@/lib/utils/svg-star";

export type ZoomLevel = "low" | "medium" | "high";

interface NorthStarNodeProps {
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

/**
 * Format creation date
 */
const formatCreationDate = (createdAt: string) => {
  const date = new Date(createdAt);
  return `set at ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`;
};

export const NorthStarNode = React.memo(function NorthStarNode({
  data,
  selected = false,
}: NorthStarNodeProps) {
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
  const colorData = NORTH_STAR_COLORS.find((c) => c.value === northStar.north_star_color);

  // Get star config from metadata, or use default
  const starConfig: StarConfig = {
    coreSize: 60,
    flareCount: 5,
    seed: northStar.id,
    rotation: 0,
    innerRadiusRatio: 0.5,
    glowIntensity: 1,
    ...northStar.metadata?.starConfig
  };

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
        aria-label={`North Star: ${northStar.title} - ${progressPercentage}% progress`}
        style={{
          filter: filterEffect,
          opacity: zoom < 0.5 ? Math.max(0.4, zoom * 1.2) : 1
        }}
      >
        {/* Large circular background with navy gradient */}
        <div
          className="relative rounded-full flex flex-col items-center justify-center text-center transition-all duration-300"
          style={{
            width: `${Math.max(280, Math.min(360, 300 + (zoom - 1) * 20))}px`,
            height: `${Math.max(280, Math.min(360, 300 + (zoom - 1) * 20))}px`,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Hover Edit Icon */}
          {onEdit && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/30 transition-colors"
                title="Edit North Star"
              >
                <Pencil className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Activity pulse indicator */}
          {hasRecentActivity && (
            <div className="absolute top-4 left-4 z-50">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
              <div className="absolute top-0 left-0 w-3 h-3 bg-emerald-400 rounded-full" />
            </div>
          )}

          {/* Centered Star Icon */}
          <div className="mb-4 transition-all duration-300">
            <StarSVG
              config={starConfig}
              color={colorData?.color || "#FFD700"}
              glowColor={colorData?.glow || "#FFA500"}
              size={Math.max(80, Math.min(160, 120 + (zoom - 1) * 20))}
            />
          </div>

          {/* Title - Always Visible */}
          <h3 className="text-2xl font-bold text-white mb-2 px-4 leading-tight">
            {northStar.title}
          </h3>

          {/* Timeframe - Always Visible */}
          <p className="text-slate-300 text-base mb-6">
            {calculateTimeframe(northStar.created_at)}
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

              {/* Creation Date */}
              <p className="text-slate-400 text-sm mb-4">
                {formatCreationDate(northStar.created_at)}
              </p>
            </div>
          )}

          {/* High Zoom (>= 1.25): Progress */}
          {zoom >= 1.25 && (
            <div
              className="text-slate-300 text-sm transition-all duration-300 ease-in-out"
              style={{
                opacity: Math.min(1, (zoom - 1.25) / 0.25),
                transform: `scale(${Math.min(1, 0.8 + (zoom - 1.25) * 0.8)})`
              }}
            >
              progress {progressPercentage}% from {linkedProjectCount} project{linkedProjectCount !== 1 ? 's' : ''}
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
              add project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
