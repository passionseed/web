/**
 * NorthStarNode - ReactFlow node for North Star entities
 * Displays North Stars from the north_stars table (not projects)
 * More prominent and aspirational than project nodes
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Pencil, Info, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NorthStar } from "@/types/journey";
import { SDG_GOALS, CAREER_PATHS, NORTH_STAR_COLORS } from "@/constants/sdg";
import { StarSVG } from "@/components/ui/star-generator";
import { StarConfig } from "@/lib/utils/svg-star";

interface NorthStarNodeProps {
  data: {
    northStar: NorthStar;
    linkedProjectCount?: number;
    hasRecentActivity?: boolean;
    onClick?: () => void;
    onEdit?: () => void;
    onViewDetails?: () => void;
    onUpdateProgress?: () => void;
  };
  selected?: boolean;
}

export const NorthStarNode = React.memo(function NorthStarNode({
  data,
  selected = false,
}: NorthStarNodeProps) {
  const { northStar, linkedProjectCount = 0, hasRecentActivity = false, onEdit, onViewDetails, onUpdateProgress } = data;
  const progressPercentage = northStar.progress_percentage || 0;

  // Get visual customization data
  const selectedSdgs = SDG_GOALS.filter((sdg) =>
    northStar.sdg_goals?.includes(sdg.number)
  );
  const careerPathData = CAREER_PATHS.find((cp) => cp.value === northStar.career_path);
  const colorData = NORTH_STAR_COLORS.find((c) => c.value === northStar.north_star_color);

  // Get star config from metadata, or use default
  const starConfig: StarConfig = northStar.metadata?.starConfig || {
    coreSize: 60,
    flareCount: 5,
    seed: northStar.id,
  };

  // Status styling
  const statusStyles = {
    active: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-500",
      label: "Active"
    },
    achieved: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-500",
      label: "Achieved"
    },
    on_hold: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-500",
      label: "On Hold"
    },
    archived: {
      bg: "bg-gray-50",
      text: "text-gray-500",
      border: "border-gray-400",
      label: "Archived"
    },
  };

  const statusStyle = statusStyles[northStar.status] || statusStyles.active;

  // Progress ring calculation
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (progressPercentage / 100) * circumference;

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
        className={`relative cursor-pointer group ${selected ? "scale-105" : "hover:scale-102"} transition-all duration-300`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`North Star: ${northStar.title} - ${progressPercentage}% progress, ${statusStyle.label}`}
      >
        {/* Glow effect with custom color */}
        <div
          className="absolute inset-0 rounded-3xl blur-3xl opacity-50 animate-pulse"
          style={{
            background: colorData
              ? `linear-gradient(135deg, ${colorData.color}, ${colorData.glow})`
              : 'linear-gradient(135deg, #FFD700, #FFA500)',
            animationDuration: '3s',
          }}
        />

        {/* Activity pulse indicator */}
        {hasRecentActivity && (
          <div className="absolute top-3 right-3 z-50">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full" />
          </div>
        )}

        {/* Main container - larger than projects */}
        <div
          className={`relative rounded-3xl p-7 shadow-2xl border-[5px] w-80 min-h-64 transition-all duration-300 group-hover:shadow-3xl ${statusStyle.border}`}
          style={{
            background: colorData
              ? `linear-gradient(to bottom right, ${colorData.color}15, ${colorData.glow}10)`
              : 'linear-gradient(to bottom right, rgb(254 252 232), rgb(254 249 195))',
          }}
        >
          {/* Progress ring in top-right */}
          <div className="absolute -top-6 -right-6">
            <svg className="w-28 h-28 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="56"
                cy="56"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r="50"
                stroke={colorData?.color || "#FFD700"}
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-500"
                strokeLinecap="round"
              />
              {/* Percentage text */}
              <text
                x="56"
                y="56"
                textAnchor="middle"
                dy=".35em"
                className="text-xl font-bold"
                fill={colorData?.color || "#FFD700"}
                transform="rotate(90 56 56)"
              >
                {progressPercentage}%
              </text>
            </svg>
          </div>

          {/* Status badge in top-left */}
          <div className="absolute top-3 left-3">
            <Badge
              variant="outline"
              className={`${statusStyle.bg} ${statusStyle.text} border-2 ${statusStyle.border}`}
            >
              {statusStyle.label}
            </Badge>
          </div>

          {/* Hover Edit Icon */}
          {onEdit && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                title="Edit North Star"
              >
                <Pencil className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          )}

          {/* North Star icon */}
          <div className="flex flex-col items-center mt-4 mb-4">
            <div className="mb-3">
              <StarSVG
                config={starConfig}
                color={colorData?.color || "#FFD700"}
                glowColor={colorData?.glow || "#FFA500"}
                size={96}
              />
            </div>

            {/* Title */}
            <h3
              className="text-xl font-bold text-center px-2 mb-2 leading-tight"
              style={{ color: colorData?.color || '#92400e' }}
              title={northStar.title}
            >
              {northStar.title}
            </h3>

            {/* Career path badge */}
            {careerPathData && (
              <Badge
                variant="outline"
                className="text-xs border-blue-400 text-blue-700 bg-blue-50 mb-2"
              >
                {careerPathData.icon} {careerPathData.label}
              </Badge>
            )}
          </div>

          {/* Description */}
          {northStar.description && (
            <p className="text-sm text-gray-700 text-center line-clamp-2 mb-4 px-2">
              {northStar.description}
            </p>
          )}

          {/* SDG Goals badges */}
          {selectedSdgs.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-600 mb-2 text-center">
                🌍 UN SDG Goals
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {selectedSdgs.slice(0, 5).map((sdg) => (
                  <div
                    key={sdg.number}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-md hover:scale-110 transition-transform cursor-help"
                    style={{ backgroundColor: sdg.color }}
                    title={`${sdg.number}. ${sdg.title}\n${sdg.description}`}
                    aria-label={`SDG ${sdg.number}: ${sdg.title}`}
                  >
                    {sdg.number}
                  </div>
                ))}
                {selectedSdgs.length > 5 && (
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center bg-gray-300 text-gray-700 text-xs font-bold shadow-md cursor-help"
                    title={`And ${selectedSdgs.length - 5} more: ${selectedSdgs.slice(5).map(s => s.number).join(', ')}`}
                  >
                    +{selectedSdgs.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Linked projects count */}
          {linkedProjectCount > 0 && (
            <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">
                {linkedProjectCount} project{linkedProjectCount !== 1 ? "s" : ""} working toward this
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            {onEdit && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {onViewDetails && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
              >
                <Info className="w-3 h-3 mr-1" />
                Details
              </Button>
            )}
            {northStar.status !== 'achieved' && onUpdateProgress && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateProgress();
                }}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Progress
              </Button>
            )}
          </div>

          {/* "Why" preview on hover */}
          {northStar.why && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center pointer-events-none">
              <div className="text-xs font-semibold text-gray-500 mb-2 text-center">
                WHY THIS MATTERS
              </div>
              <p className="text-sm text-gray-800 text-center line-clamp-6 italic">
                "{northStar.why}"
              </p>
            </div>
          )}
        </div>

        {/* Shadow for depth when selected */}
        {selected && (
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-56 h-10 rounded-full blur-2xl"
              style={{
                background: colorData?.glow || '#FFA500',
                opacity: 0.4,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
});
