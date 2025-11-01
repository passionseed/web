/**
 * NorthStarProjectNode - Long-term "North Star" project node
 * Larger than short-term projects with star glow effect
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Star, ChevronRight, Edit, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { JourneyProject } from "@/types/journey";
import {
  SDG_GOALS,
  CAREER_PATHS,
  NORTH_STAR_SHAPES,
  NORTH_STAR_COLORS,
} from "@/constants/sdg";

interface NorthStarProjectNodeProps {
  data: {
    project: JourneyProject;
    icon: string;
    linkedProjectCount: number;
    hasRecentActivity: boolean;
    onViewMilestones: () => void;
    onEdit: () => void;
    onReflect: () => void;
  };
  selected?: boolean;
}

export function NorthStarProjectNode({
  data,
  selected = false,
}: NorthStarProjectNodeProps) {
  const { project, icon, linkedProjectCount, hasRecentActivity } = data;
  const progressPercentage = project.progress_percentage || 0;

  // Extract North Star enhancement data
  const sdgGoals = project.sdg_goals || [];
  const careerPath = project.career_path;
  const northStarShape = project.north_star_shape || "classic";
  const northStarColor = project.north_star_color || "golden";

  // Get SDG details
  const selectedSdgs = SDG_GOALS.filter((sdg) => sdgGoals.includes(sdg.number));
  const careerPathData = CAREER_PATHS.find((cp) => cp.value === careerPath);
  const shapeData = NORTH_STAR_SHAPES.find((s) => s.value === northStarShape);
  const colorData = NORTH_STAR_COLORS.find((c) => c.value === northStarColor);

  // Calculate progress ring offset
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (progressPercentage / 100) * circumference;

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
        aria-label={`North Star Project: ${project.title} - ${progressPercentage}% complete`}
      >
        {/* Star glow effect with custom color */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-60 animate-pulse"
          style={{
            background: colorData
              ? `linear-gradient(to bottom right, ${colorData.color}, ${colorData.glow})`
              : "linear-gradient(to bottom right, rgb(253 224 71), rgb(251 146 60))",
          }}
        />

        {/* Activity pulse */}
        {hasRecentActivity && (
          <div className="absolute top-2 right-2 z-50">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full" />
          </div>
        )}

        {/* Main container */}
        <div
          className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-6 shadow-2xl border-4 border-amber-400 w-72 min-h-56 transition-all duration-300 group-hover:shadow-3xl group-hover:border-amber-500"
          style={{
            backgroundColor: project.color || undefined,
          }}
        >
          {/* Progress ring */}
          <div className="absolute -top-4 -right-4">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-amber-200"
              />
              <circle
                cx="48"
                cy="48"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-amber-500 transition-all duration-500"
                strokeLinecap="round"
              />
              <text
                x="48"
                y="48"
                textAnchor="middle"
                dy=".3em"
                className="text-lg font-bold fill-amber-700"
                transform="rotate(90 48 48)"
              >
                {progressPercentage}%
              </text>
            </svg>
          </div>

          {/* Project icon and header */}
          <div className="flex flex-col items-center mb-3">
            {/* Custom Star Icon */}
            <div
              className="text-5xl mb-2 select-none"
              role="img"
              aria-label="North Star icon"
            >
              {shapeData?.icon || "⭐"}
            </div>

            <div className="w-full text-center">
              <h3 className="text-lg font-bold text-amber-900 truncate px-2">
                {project.title}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                <Badge
                  variant="secondary"
                  className="bg-amber-200 text-amber-800"
                >
                  North Star
                </Badge>
                {careerPathData && (
                  <Badge
                    variant="outline"
                    className="text-xs border-blue-300 text-blue-700 bg-blue-50"
                  >
                    {careerPathData.icon} {careerPathData.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* SDG Goals badges */}
          {selectedSdgs.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-amber-800 mb-1.5">
                🌍 UN SDGs:
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedSdgs.slice(0, 5).map((sdg) => (
                  <div
                    key={sdg.number}
                    className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: sdg.color }}
                    title={`${sdg.number}. ${sdg.title}`}
                  >
                    {sdg.number}
                  </div>
                ))}
                {selectedSdgs.length > 5 && (
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-gray-200 text-gray-700 text-xs font-bold">
                    +{selectedSdgs.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <p className="text-sm text-amber-800 line-clamp-2 mb-3">
              {project.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mb-3">
            <Progress value={progressPercentage} className="h-2 bg-amber-200">
              <div className="h-full bg-amber-500 transition-all" />
            </Progress>
          </div>

          {/* Linked projects count */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 text-sm text-amber-700">
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold">{linkedProjectCount}</span>
              <span>linked project{linkedProjectCount !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onViewMilestones();
              }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/80 hover:bg-white text-amber-700 rounded-lg text-xs font-medium transition-colors shadow-sm"
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
              className="flex items-center justify-center px-3 py-2 bg-white/80 hover:bg-white text-amber-700 rounded-lg transition-colors shadow-sm"
              aria-label="Edit project"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onReflect();
              }}
              className="flex items-center justify-center px-3 py-2 bg-white/80 hover:bg-white text-amber-700 rounded-lg transition-colors shadow-sm"
              aria-label="Add reflection"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shadow for depth */}
        {selected && (
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-48 h-8 bg-black/20 rounded-full blur-xl"
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
