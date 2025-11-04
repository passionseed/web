/**
 * MilestoneNorthStarNode - ReactFlow node for milestone North Stars
 * Exact copy of the main journey North Star design, adapted for milestone context
 */

import React, { useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectWithMilestones } from "@/types/journey";
import { StarSVG } from "@/components/ui/star-generator";
import { StarConfig } from "@/lib/utils/svg-star";

interface MilestoneNorthStarData {
  title: string;
  description?: string;
  why?: string;
  created_at?: string;
  updated_at?: string;
  created_from_milestone?: boolean;
}

interface MilestoneNorthStarNodeProps {
  data: {
    northStar: MilestoneNorthStarData;
    project: ProjectWithMilestones;
    numericZoom?: number;
    onClick?: () => void;
    onEdit?: () => void;
  };
  selected?: boolean;
}

/**
 * Calculate timeframe from creation to 3 years later
 */
const calculateTimeframe = (createdAt?: string) => {
  if (!createdAt) return "in 3 years";
  
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
const formatCreationDate = (createdAt?: string) => {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  return `set at ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`;
};

export const MilestoneNorthStarNode = React.memo(function MilestoneNorthStarNode({
  data,
  selected = false,
}: MilestoneNorthStarNodeProps) {
  const {
    northStar,
    project,
    numericZoom = 1,
    onEdit
  } = data;

  // Memoize star config for performance
  const starConfig: StarConfig = useMemo(() => ({
    coreSize: 60,
    flareCount: 5,
    seed: northStar.title,
  }), [northStar.title]);

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
        className={`relative cursor-pointer group ${selected ? "scale-105" : "hover:scale-102"} transition-all duration-300 opacity-100`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Milestone North Star: ${northStar.title}`}
      >
        {/* Smaller fixed-size circular background with navy gradient */}
        <div
          className="relative rounded-full flex flex-col items-center justify-center text-center transition-colors duration-300"
          style={{
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
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

          {/* Centered Star Icon - Fixed Size */}
          <div className="mb-3">
            <StarSVG
              config={starConfig}
              color="#F59E0B"
              glowColor="#F97316"
              size={80}
            />
          </div>

          {/* Title - Always Visible, Smaller */}
          <h3 className="text-lg font-bold text-white mb-2 px-3 leading-tight">
            {northStar.title}
          </h3>

          {/* Timeframe - Always Visible, Smaller */}
          <p className="text-slate-300 text-sm mb-3">
            {calculateTimeframe(northStar.created_at)}
          </p>

          {/* Creation Date - Always Visible */}
          <p className="text-slate-400 text-xs mb-2">
            {formatCreationDate(northStar.created_at)}
          </p>

          {/* Description - Always Visible if present */}
          {northStar.description && (
            <p className="text-slate-300 text-xs px-3 leading-relaxed">
              {northStar.description}
            </p>
          )}
        </div>

      {/* Visible connection handles for dragging lines to milestones */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="bg-amber-500 border-2 border-white shadow-lg hover:bg-amber-600 cursor-grab active:cursor-grabbing"
        style={{
          right: -15,
          width: '30px',
          height: '30px',
          borderRadius: '50%'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="bg-amber-500 border-2 border-white shadow-lg hover:bg-amber-600 cursor-grab active:cursor-grabbing"
        style={{
          bottom: -15,
          width: '30px',
          height: '30px',
          borderRadius: '50%'
        }}
      />
      </div>
    </div>
  );
});